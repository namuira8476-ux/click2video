import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Cloudflare 빌드·배포.
 *
 *   npm run cf:build                       # 빌드 + 번들 정리 + 비밀값 검사
 *   npm run cf:deploy [-- --build]         # (빌드 후) 배포
 *   npm run cf:secret -- SESSION_SECRET    # 워커 시크릿 등록 (값은 stdin 으로만)
 *   npm run cf:migrate                     # D1 에 drizzle 마이그레이션 적용
 *
 * ── 왜 이렇게 복잡한가 ───────────────────────────────────────────────────────
 * `@opennextjs/cloudflare` 는 빌드할 때 `.env`, `.env.{mode}`, `.env.local` 을 읽어
 * production·development·test **세 모드의 값을 전부** 워커 번들(`next-env.mjs`)에 넣는다.
 * 런타임은 production 만 쓰지만, 나머지 두 모드에도 로컬 `.env` 의 실제 키가 그대로 들어간다.
 * 또 빌드 프로세스 환경에 있던 값은 env 파일에 **빈 칸으로 적힌 키**를 채운다(dotenvx).
 * 실제로 이 경로로 fal 키와 Cloudflare API 토큰이 배포본에 들어갔다.
 *
 * 그래서 (1) 빌드는 비밀값을 뺀 환경에서 돌리고, (2) 빌드 직후 `next-env.mjs` 를
 * 허용 목록으로 다시 쓰고, (3) 배포 전에 **실제 비밀값을 번들 전체 바이트와 대조**해
 * 하나라도 나오면 중단한다. (정규식 검사는 JSON 따옴표 형식을 놓쳐 실제로 뚫렸다.)
 */

const ROOT = process.cwd();
const LOCAL_CONFIG = "wrangler.local.jsonc";
const configArgs = fs.existsSync(path.join(ROOT, LOCAL_CONFIG)) ? ["--config", LOCAL_CONFIG] : [];

/** 런타임(production)에 필요한, 비밀이 아닌 변수만 번들에 남긴다. */
// ALLOW_SERVER_KEY·MOCK_FAL 은 일부러 뺀다 — 로컬 .env.local 의 개발용 값이 배포 모드를 바꾸면 안 된다.
const RUNTIME_ALLOWLIST = new Set([
  "BYOK_MODE",
  "MOCK_FAIL_RATE",
  "CREDIT_MARKUP",
  "PRICE_OUTPUT_480P",
  "PRICE_OUTPUT_768P",
  "FAL_PROMPT_EXPANSION",
  "UNLIMITED_CREDITS",
  "RUNNER_CONCURRENCY",
  "STORAGE_DIR",
  "DATABASE_PATH",
  "PUBLIC_BASE_URL",
]);

const SECRET_NAME = /KEY|TOKEN|SECRET|PASSWORD|ACCOUNT_ID|CREDENTIAL/i;

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/** 배포 자격증명(.env.deploy) — wrangler 호출에만 넘긴다. 빌드에는 절대 넘기지 않는다. */
function deployEnv(): NodeJS.ProcessEnv {
  const creds = parseEnvFile(".env.deploy");
  if (!creds.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[cf] .env.deploy 에 CLOUDFLARE_API_TOKEN 이 없습니다. `npx wrangler login` 세션이 있으면 그것을 씁니다.");
  }
  return { ...process.env, ...creds };
}

/** 빌드용 환경 — 비밀처럼 보이는 이름은 전부 뺀다(빈 칸 키를 dotenvx 가 채우지 못하게). */
function buildEnv(): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) if (!SECRET_NAME.test(k) || k === "PATH") env[k] = v;
  return env as NodeJS.ProcessEnv;
}

/** 로컬에 있는 실제 비밀값들 — 번들 대조용. 8자 미만은 오탐이 많아 제외. */
function knownSecretValues(): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  for (const file of [".env", ".env.local", ".env.deploy", ".env.development", ".env.development.local", ".env.production.local"]) {
    for (const [k, v] of Object.entries(parseEnvFile(file))) {
      if (SECRET_NAME.test(k) && v.length >= 8) out.push({ name: `${file}:${k}`, value: v });
    }
  }
  for (const k of ["FAL_KEY", "CLOUDFLARE_API_TOKEN", "SESSION_SECRET"]) {
    const v = process.env[k];
    if (v && v.length >= 8) out.push({ name: `process.env:${k}`, value: v });
  }
  return out;
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv, input?: string) {
  const r = spawnSync(cmd, args, { stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"], env, shell: true, input });
  if (r.status !== 0) {
    console.error(`[cf] 실패: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

function assertConfigFilled() {
  const file = configArgs.length ? LOCAL_CONFIG : "wrangler.jsonc";
  const text = fs.readFileSync(path.join(ROOT, file), "utf8");
  if (/<YOUR_[A-Z0-9_]+>/.test(text)) {
    console.error(`[cf] ${file} 에 자리표시자(<YOUR_…>)가 남아 있습니다. README 의 "내 Cloudflare 에 배포" 를 따라 채우세요.`);
    process.exit(1);
  }
  console.log(`[cf] 설정 파일: ${file}`);
}

/** 빌드 산출물의 env 스냅샷을 허용 목록만 남기도록 다시 쓴다. */
function sanitizeBundleEnv() {
  const file = path.join(ROOT, ".open-next/cloudflare/next-env.mjs");
  if (!fs.existsSync(file)) throw new Error("next-env.mjs 가 없습니다. 빌드가 끝났는지 확인하세요.");
  const text = fs.readFileSync(file, "utf8");
  const modes: Record<string, Record<string, string>> = {};
  for (const m of text.matchAll(/export const (\w+) = (\{.*?\});?$/gm)) modes[m[1]] = JSON.parse(m[2]);
  if (!modes.production) throw new Error("next-env.mjs 형식이 예상과 다릅니다 (production export 없음).");

  const production: Record<string, string> = {};
  const dropped: string[] = [];
  for (const [k, v] of Object.entries(modes.production)) {
    if (RUNTIME_ALLOWLIST.has(k)) production[k] = v;
    else dropped.push(k);
  }
  // 워커는 NEXTJS_ENV 가 없으면 production 만 읽는다 — development/test 는 비운다.
  const next =
    `export const production = ${JSON.stringify(production)};\n` +
    `export const development = {};\n` +
    `export const test = {};\n`;
  fs.writeFileSync(file, next);
  console.log(`[cf] next-env.mjs 정리: production ${Object.keys(production).length}개 유지, 제거 ${dropped.length}개${dropped.length ? ` (${dropped.join(", ")})` : ""}, development/test 비움`);

  // standalone 서버용으로 복사된 env 파일도 지운다 (워커는 쓰지 않는다).
  const sf = path.join(ROOT, ".open-next/server-functions/default");
  if (fs.existsSync(sf)) {
    for (const f of fs.readdirSync(sf)) {
      if (f.startsWith(".env")) {
        fs.rmSync(path.join(sf, f));
        console.log(`[cf] 제거: .open-next/server-functions/default/${f}`);
      }
    }
  }
}

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** 로컬의 실제 비밀값이 빌드 산출물 어디에든 바이트 그대로 있으면 중단한다. */
function assertNoSecretsInBundle() {
  const dir = path.join(ROOT, ".open-next");
  if (!fs.existsSync(dir)) throw new Error(".open-next 가 없습니다. 먼저 빌드하세요.");
  const secrets = knownSecretValues();
  const needles = secrets.flatMap((s) => {
    const parts = [s.value];
    // fal 키(uuid:hex)는 조각만으로도 식별 가능하다
    if (s.value.includes(":")) parts.push(...s.value.split(":").filter((x) => x.length >= 16));
    return parts.map((v) => ({ name: s.name, buf: Buffer.from(v) }));
  });
  const hits: string[] = [];
  let scanned = 0;
  for (const file of walk(dir)) {
    const buf = fs.readFileSync(file);
    scanned++;
    for (const n of needles) if (buf.includes(n.buf)) hits.push(`${path.relative(ROOT, file)} ← ${n.name}`);
  }
  if (hits.length) {
    console.error("[cf] 배포 중단 — 빌드 산출물에 로컬 비밀값이 들어 있습니다:\n  " + [...new Set(hits)].join("\n  "));
    process.exit(1);
  }
  console.log(`[cf] 비밀값 대조 통과 (${secrets.length}개 값 × ${scanned}개 파일)`);
}

function build() {
  // 빌드는 비밀값을 뺀 환경에서 — 설정 파일은 템플릿이든 local 이든 빌드 결과에 영향이 없다.
  run("npx", ["opennextjs-cloudflare", "build", ...configArgs], buildEnv());
  sanitizeBundleEnv();
  assertNoSecretsInBundle();
}

const [cmd = "deploy", ...rest] = process.argv.slice(2);

if (cmd === "build") {
  build();
} else if (cmd === "check") {
  // 정리하지 않고 현재 산출물만 대조한다 (검사 자체가 동작하는지 확인할 때).
  assertNoSecretsInBundle();
} else if (cmd === "secret") {
  const name = rest[0];
  if (!name) throw new Error("사용법: npm run cf:secret -- <NAME>  (값은 stdin 으로)");
  // 값은 인자로 받지 않는다 — 셸 히스토리와 프로세스 목록에 남는다.
  const value = fs.readFileSync(0, "utf8").trim();
  if (!value) throw new Error("stdin 으로 값을 넣어 주세요.");
  run("npx", ["wrangler", "secret", "put", name, ...configArgs], deployEnv(), `${value}\n`);
  console.log(`[cf] secret ${name} 등록 완료`);
} else if (cmd === "migrate") {
  assertConfigFilled();
  run("npx", ["wrangler", "d1", "migrations", "apply", "click2video", "--remote", ...configArgs], deployEnv());
} else if (cmd === "deploy" || cmd === "--build") {
  assertConfigFilled();
  if (cmd === "--build" || rest.includes("--build")) build();
  else {
    // 이미 빌드된 산출물이라도 한 번 더 정리·대조한다 (직접 cf:build 를 돌렸을 수 있다).
    sanitizeBundleEnv();
    assertNoSecretsInBundle();
  }
  run("npx", ["opennextjs-cloudflare", "deploy", ...configArgs], deployEnv());
} else {
  console.error(`알 수 없는 명령: ${cmd}`);
  process.exit(1);
}
