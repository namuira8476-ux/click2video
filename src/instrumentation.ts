export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { loadTemplates } = await import("./lib/templates/loader");
  loadTemplates(); // 정의가 틀리면 여기서 즉시 실패

  // 인터벌 러너는 장수명 Node 프로세스에서만 돈다.
  // Cloudflare Workers 는 요청 사이에 타이머가 살아 있지 않아 크론(`* * * * *`)이 tickOnce() 를 부른다.
  const { hasFileSystem } = await import("./lib/runtime");
  if (!hasFileSystem()) return;
  const { startRunner } = await import("./lib/jobs/runner");
  startRunner();
}
