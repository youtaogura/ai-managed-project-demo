import { config } from './config.mjs';
import { log, run } from './sh.mjs';

const gh = async (args, opts) => (await run('gh', args, opts)).stdout;
const ghJson = async (args, opts) => JSON.parse((await gh(args, opts)) || 'null');

// DRY_RUN のときは書き込み系を実行せずにログだけ出す
async function mutate(description, fn) {
  if (config.dryRun) {
    log(`[dry-run] ${description}`);
    return null;
  }
  return fn();
}

async function graphql(query, variables = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [k, v] of Object.entries(variables)) {
    args.push(typeof v === 'number' ? '-F' : '-f', `${k}=${v}`);
  }
  const res = await ghJson(args);
  if (res?.errors?.length) throw new Error(`GraphQL error: ${JSON.stringify(res.errors)}`);
  return res.data;
}

// ---------- Project ----------

let projectMeta = null;

export async function getProject({ refresh = false } = {}) {
  if (projectMeta && !refresh) return projectMeta;
  const ownerField = config.projectOwnerType === 'organization' ? 'organization' : 'user';
  const data = await graphql(
    `query($owner: String!, $number: Int!) {
      ${ownerField}(login: $owner) {
        projectV2(number: $number) {
          id
          title
          fields(first: 50) {
            nodes { ... on ProjectV2SingleSelectField { id name options { id name } } }
          }
        }
      }
    }`,
    { owner: config.projectOwner, number: config.projectNumber },
  );
  const project = data?.[ownerField]?.projectV2;
  if (!project) throw new Error(`Project #${config.projectNumber} (${config.projectOwner}) が見つかりません`);
  const field = project.fields.nodes.find((f) => f?.name === config.statusField);
  if (!field) throw new Error(`Project に "${config.statusField}" フィールドがありません`);
  projectMeta = {
    id: project.id,
    title: project.title,
    statusFieldId: field.id,
    options: Object.fromEntries(field.options.map((o) => [o.name, o.id])),
  };
  return projectMeta;
}

// Project 上の Issue アイテムを { itemId, status, issue: {number,title,labels,state} } の配列で返す
export async function listItems() {
  const { id } = await getProject();
  const items = [];
  let cursor = null;
  do {
    const data = await graphql(
      `query($id: ID!, $cursor: String) {
        node(id: $id) {
          ... on ProjectV2 {
            items(first: 100, after: $cursor) {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                fieldValueByName(name: "${config.statusField}") {
                  ... on ProjectV2ItemFieldSingleSelectValue { name }
                }
                content {
                  ... on Issue {
                    number title state
                    repository { nameWithOwner }
                    labels(first: 20) { nodes { name } }
                  }
                }
              }
            }
          }
        }
      }`,
      cursor ? { id, cursor } : { id },
    );
    const page = data.node.items;
    for (const n of page.nodes) {
      const c = n.content;
      if (!c?.number || c.repository?.nameWithOwner?.toLowerCase() !== config.repo.toLowerCase()) continue;
      items.push({
        itemId: n.id,
        status: n.fieldValueByName?.name ?? null,
        issue: { number: c.number, title: c.title, state: c.state, labels: c.labels.nodes.map((l) => l.name) },
      });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return items;
}

// Issue の「blocked by」（GitHub の Issue の依存関係）を { number, title, state, stateReason } の配列で返す
export async function listBlockedBy(number) {
  const res = await ghJson(['api', `repos/${config.repo}/issues/${number}/dependencies/blocked_by?per_page=100`]);
  if (!Array.isArray(res)) return [];
  return res.map((i) => ({ number: i.number, title: i.title, state: i.state, stateReason: i.state_reason ?? null }));
}

export async function setStatus(item, statusName) {
  let meta = await getProject();
  // 起動後に Project の Status の選択肢が変更されていることがあるので、見つからなければ取り直す
  if (!meta.options[statusName]) meta = await getProject({ refresh: true });
  const optionId = meta.options[statusName];
  if (!optionId) throw new Error(`Status に "${statusName}" という選択肢がありません`);
  return mutate(`#${item.issue.number}: status ${item.status} -> ${statusName}`, async () => {
    await graphql(
      `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $project, itemId: $item, fieldId: $field,
          value: { singleSelectOptionId: $option }
        }) { projectV2Item { id } }
      }`,
      { project: meta.id, item: item.itemId, field: meta.statusFieldId, option: optionId },
    );
    item.status = statusName;
  });
}

// ---------- Issue / Label ----------

export async function ensureLabels() {
  const defs = [
    [config.labels.clarification, 'D93F0B', 'エージェントからの質問待ち'],
    [config.labels.failed, 'B60205', 'エージェントの実行が失敗'],
  ];
  for (const [name, color, desc] of defs) {
    await mutate(`ensure label ${name}`, () =>
      gh(['label', 'create', name, '--repo', config.repo, '--color', color, '--description', desc, '--force']),
    );
  }
}

export const addLabel = (issue, label) =>
  mutate(`#${issue}: add label ${label}`, () => gh(['issue', 'edit', String(issue), '--repo', config.repo, '--add-label', label]));

export const commentIssue = (issue, body) =>
  mutate(`#${issue}: comment "${body.slice(0, 60)}..."`, () =>
    gh(['issue', 'comment', String(issue), '--repo', config.repo, '--body-file', '-'], { input: body }),
  );

export const closeIssue = (issue) =>
  mutate(`#${issue}: close`, () =>
    gh(['issue', 'close', String(issue), '--repo', config.repo, '--reason', 'completed'], { allowFail: true }),
  );

// ---------- Pull Request ----------

export async function findOpenPr(branch) {
  const prs = await ghJson(['pr', 'list', '--repo', config.repo, '--head', branch, '--state', 'open', '--json', 'number,url,title']);
  return prs?.[0] ?? null;
}

export async function prFiles(number) {
  const pr = await ghJson(['pr', 'view', String(number), '--repo', config.repo, '--json', 'files']);
  return pr.files.map((f) => f.path);
}

// PR のチェック一覧 [{ name, bucket }]（bucket: pass | fail | pending | skipping | cancel）
export async function prChecks(number) {
  const res = await run('gh', ['pr', 'checks', String(number), '--repo', config.repo, '--json', 'name,bucket'], {
    allowFail: true,
  });
  try {
    return JSON.parse(res.stdout || '[]');
  } catch {
    return []; // チェックが1件も無いとき gh は JSON ではなくメッセージを返す
  }
}

// 必須チェックだけで判定する。{ state: 'pass' | 'fail' | 'pending', failed, missing }
export function evaluateChecks(checks, required) {
  const failed = [];
  const missing = [];
  let pending = false;
  for (const name of required) {
    // 同名のチェックが複数返ってきた場合は、最後のもの（最新の実行）を使う
    const runs = checks.filter((c) => c.name === name);
    const latest = runs[runs.length - 1];
    if (!latest) {
      missing.push(name);
      pending = true;
    } else if (['fail', 'cancel'].includes(latest.bucket)) failed.push(name);
    else if (latest.bucket === 'pending') pending = true;
  }
  if (failed.length) return { state: 'fail', failed, missing };
  if (pending) return { state: 'pending', failed, missing };
  return { state: 'pass', failed, missing };
}

export const mergePr = (number) =>
  mutate(`PR #${number}: squash merge`, () => gh(['pr', 'merge', String(number), '--repo', config.repo, '--squash']));

export const commentPr = (number, body) =>
  mutate(`PR #${number}: comment`, () =>
    gh(['pr', 'comment', String(number), '--repo', config.repo, '--body-file', '-'], { input: body }),
  );

export async function authStatus() {
  return run('gh', ['auth', 'status'], { allowFail: true });
}
