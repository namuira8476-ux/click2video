/**
 * Node 전용(네이티브) 모듈을 번들러의 정적 분석을 피해 가져온다.
 *
 * 왜 필요한가: `better-sqlite3` 와 `sharp` 는 `.node` 바이너리라 Cloudflare Workers 에서 실행되지 않는다.
 * 그런데 평범한 `import`/`require` 로 쓰면 Next 의 트레이서가 서버 의존성으로 잡아
 * OpenNext 가 Worker 번들에 넣으려다 빌드가 깨진다(EPERM symlink better-sqlite3).
 * 여기서는 지정자를 런타임에 만들어 트레이서가 따라올 수 없게 하고, 로컬에서만 호출한다.
 */
export function nodeRequire<T = unknown>(specifier: string): T {
  // 보안: eval 에 넘기는 것은 상수 문자열 "require" 뿐이고 사용자 입력은 들어가지 않는다.
  // 모듈 지정자는 eval 이 아니라 반환된 require 함수의 인자로만 쓰이며, 호출부는 모두 이 파일 안의 고정 문자열이다.
  // eslint-disable-next-line no-eval
  const req = eval("require") as (id: string) => T;
  return req(specifier);
}

/** 이 런타임에서 네이티브 모듈을 쓸 수 있는가 (로컬 Node = yes, Workers = no) */
export function canUseNativeModules(): boolean {
  try {
    // eslint-disable-next-line no-eval
    return typeof eval("require") === "function" && typeof process !== "undefined" && !!process.versions?.node;
  } catch {
    return false;
  }
}
