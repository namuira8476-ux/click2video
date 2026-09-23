import fs from "node:fs";
import path from "node:path";

/** 배포 자격증명은 .env 가 아니라 .env.deploy 에 둔다 (.env 는 빌드 번들에 스냅샷된다). */
function readDeployEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const p = path.resolve(process.cwd(), ".env.deploy");
  if (!fs.existsSync(p)) return out;
  for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    const eq = line.indexOf("=");
    if (eq <= 0 || line.startsWith("#")) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
const deploy = readDeployEnv();

/**
 * 계정에서 R2 를 켠 뒤 실행한다. 버킷을 만들고 `wrangler.local.jsonc`(없으면 `wrangler.jsonc`)에 바인딩을 넣는다.
 * (R2 활성화 자체는 API 로 할 수 없다 — 대시보드에서 약관에 동의해야 한다.)
 *
 *   npm run cf:enable-r2
 *   npm run cf:deploy -- --build
 *
 * 바인딩(MEDIA)이 생기면 앱이 자동으로 R2 저장소를 쓴다:
 * 업로드 원본과 생성 결과가 R2 에 보관되고, 결과 영상이 fal URL 만료와 무관해진다.
 */
const BUCKET = "click2video-media";
const token = deploy.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "";
const account = deploy.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "";
if (!token || !account) {
  console.error("[r2] .env.deploy 에 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID 가 필요합니다 (.env.deploy.example 참고).");
  process.exit(1);
}

const api = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets`;

async function main() {
  const res = await fetch(api, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: BUCKET }),
  });
  const body = (await res.json()) as { success: boolean; errors?: { code: number; message: string }[] };

  if (!body.success) {
    const err = body.errors?.[0];
    if (err?.code === 10042) {
      console.error("[r2] 계정에 R2 가 아직 켜져 있지 않습니다.");
      console.error("     Cloudflare 대시보드 → R2 에서 활성화(약관 동의)한 뒤 다시 실행하세요.");
      process.exit(1);
    }
    if (err && /already exists/i.test(err.message)) {
      console.log("[r2] 버킷이 이미 있습니다:", BUCKET);
    } else {
      console.error("[r2] 버킷 생성 실패:", JSON.stringify(body.errors));
      process.exit(1);
    }
  } else {
    console.log("[r2] 버킷 생성:", BUCKET);
  }

  // 실제 배포 설정은 gitignore 된 wrangler.local.jsonc 에 있다. 없으면 템플릿 wrangler.jsonc.
  const localPath = path.resolve(process.cwd(), "wrangler.local.jsonc");
  const wranglerPath = fs.existsSync(localPath) ? localPath : path.resolve(process.cwd(), "wrangler.jsonc");
  const cfgName = path.basename(wranglerPath);
  let cfg = fs.readFileSync(wranglerPath, "utf8");
  if (cfg.includes('"r2_buckets"')) {
    console.log(`[r2] ${cfgName} 에 바인딩이 이미 있습니다.`);
  } else {
    cfg = cfg.replace(
      '  "d1_databases": [',
      `  // 업로드 원본과 생성 결과를 보관한다. 없으면 fal URL 을 그대로 쓰며 영구 보관이 되지 않는다.
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "${BUCKET}"
    }
  ],
  "d1_databases": [`,
    );
    fs.writeFileSync(wranglerPath, cfg);
    console.log(`[r2] ${cfgName} 에 MEDIA 바인딩 추가`);
  }

  console.log("\n다음: npm run cf:deploy -- --build");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
