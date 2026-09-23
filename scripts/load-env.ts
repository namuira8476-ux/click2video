import fs from "node:fs";
import path from "node:path";

/** Next 밖(tsx 스크립트)에서도 .env / .env.local 을 읽는다. 이미 설정된 값은 덮어쓰지 않는다. */
for (const name of [".env", ".env.local"]) {
  const p = path.resolve(process.cwd(), name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
