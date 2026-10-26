// 偽 gh / claude が共有する状態ファイル（$FAKE_STATE）の読み書き。
// オーケストレーターは複数のジョブを並列に動かすので、複数のプロセスが同時にこのファイルを読み書きする。
// - 書き込みは一時ファイル + rename で原子的に行う（読み手が書きかけの JSON を読まないように）
// - 読み取り→変更→書き込みはロック（mkdir）の中で行う（他プロセスの更新を上書きしないように）
const fs = require('fs');

const file = process.env.FAKE_STATE;
const lockDir = `${file}.lock`;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function read() {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function write(state) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

let held = false;

function lock() {
  if (held) return;
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      held = true;
      process.on('exit', unlock);
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > deadline) throw new Error(`状態ファイルのロックを取得できません: ${lockDir}`);
      sleep(5);
    }
  }
}

function unlock() {
  if (!held) return;
  held = false;
  try {
    fs.rmdirSync(lockDir);
  } catch {
    // すでに無い
  }
}

// ロックの中で最新の状態を読み、fn で変更して書き戻す
function update(fn) {
  lock();
  try {
    const state = read();
    const result = fn(state);
    write(state);
    return result;
  } finally {
    unlock();
  }
}

module.exports = { read, write, lock, unlock, update };
