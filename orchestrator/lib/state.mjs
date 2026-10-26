import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { config } from './config.mjs';

// 差し戻し回数など、GitHub 上に持たない小さな状態を保存する
const file = () => path.join(config.dataDir, 'state.json');

function load() {
  if (!existsSync(file())) return { issues: {} };
  try {
    return JSON.parse(readFileSync(file(), 'utf8'));
  } catch {
    return { issues: {} };
  }
}

function save(state) {
  mkdirSync(config.dataDir, { recursive: true });
  const tmp = `${file()}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, file());
}

export function getIssueState(issue) {
  return load().issues[issue] ?? { rework: 0 };
}

export function updateIssueState(issue, patch) {
  const state = load();
  state.issues[issue] = { ...(state.issues[issue] ?? { rework: 0 }), ...patch };
  save(state);
  return state.issues[issue];
}

export function clearIssueState(issue) {
  const state = load();
  delete state.issues[issue];
  save(state);
}
