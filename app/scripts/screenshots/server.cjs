// CommonJS にしているのは Jest（テスト）と node（撮影）の両方から読むため
// expo export --platform web の出力（静的書き出し）を配信する
const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, join, normalize, sep } = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** URL のパスから dist 内のファイルを探す。見つからなければ index.html。dist の外は読まない。 */
function resolveRequestPath(distDir, urlPath) {
  const root = normalize(distDir);
  const fallback = join(root, 'index.html');
  const pathname = safeDecode(urlPath.split('?')[0].split('#')[0]);
  const segments = pathname.split(/[\\/]+/).filter((s) => s !== '' && s !== '.');
  if (segments.includes('..')) return fallback;
  const relative = segments.join('/');
  const inside = (path) => path === root || path.startsWith(root + sep);

  const candidates = [];
  if (relative === '') {
    candidates.push(fallback);
  } else {
    candidates.push(join(root, relative), join(root, `${relative}.html`), join(root, relative, 'index.html'));
    // 動的ルート（/reading/abc → reading/[id].html）
    const parent = segments.slice(0, -1).join('/');
    const dynamicName = (name) => (name.startsWith('[') && name.endsWith('].html') ? name : null);
    const dir = join(root, parent);
    if (segments.length > 1 && existsSync(dir) && statSync(dir).isDirectory()) {
      const names = readdirSafe(dir).filter((n) => dynamicName(n) !== null);
      for (const name of names) candidates.push(join(dir, name));
    }
  }
  for (const candidate of candidates) {
    const path = normalize(candidate);
    if (inside(path) && isFile(path)) return path;
  }
  return fallback;
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function createStaticServer(distDir) {
  return createServer((req, res) => {
    const file = resolveRequestPath(distDir, req.url ?? '/');
    if (!isFile(file)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
}

module.exports = { resolveRequestPath, createStaticServer };
