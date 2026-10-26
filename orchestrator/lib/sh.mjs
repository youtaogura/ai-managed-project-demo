import { execFile } from 'node:child_process';

// シェルを介さずにコマンドを実行する（引数のインジェクションを避けるため）
export function run(cmd, args, { cwd, env, input, allowFail = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      args,
      { cwd, env: env ?? process.env, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && !allowFail) {
          const e = new Error(`${cmd} ${args.join(' ')} failed: ${stderr || err.message}`.trim());
          e.stdout = stdout;
          e.stderr = stderr;
          e.code = err.code;
          return reject(e);
        }
        resolve({ ok: !err, code: err ? err.code : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

export const log = (...args) => console.log(new Date().toISOString(), ...args);
export const warn = (...args) => console.warn(new Date().toISOString(), '[warn]', ...args);
