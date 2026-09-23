import { JobError } from "@/lib/jobs/service";
import { ensureUser } from "@/lib/db";
import { requiresBrowserKey } from "@/lib/h3";
import { uidFrom } from "@/lib/identity";

export const FAL_KEY_HEADER = "x-fal-key";

/**
 * 제어문자(개행·NUL 등)가 섞여 있는가.
 *
 * 정규식 문자 클래스로 쓰면 소스에 원시 제어 바이트가 박혀 파일이 바이너리로 취급되고
 * (diff·grep 에서 사라지고 포매터가 정규화하면 가드가 조용히 무력화된다) 코드포인트로 검사한다.
 */
function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

/**
 * 요청에 실려 온 사용자의 fal API 키.
 *
 * 키는 **이 요청을 처리하는 동안 메모리에만** 존재한다 — DB 에 저장하지 않고, 로그에 찍지 않고,
 * 응답에 되돌려주지 않는다. 브라우저가 매 요청 헤더로 보낸다.
 *
 * 형식 검사는 방어용이다: fal 키는 `<uuid>:<hex>` 모양이지만 형식이 바뀔 수 있어 느슨하게 보고,
 * 헤더에 넣을 수 없는 문자만 확실히 막는다(로그 인젝션·헤더 분리 방지).
 */
export function falKeyFrom(req: Request): string {
  const raw = req.headers.get(FAL_KEY_HEADER);
  if (!raw) return "";
  const key = raw.trim();
  if (key === "") return "";
  if (key.length > 400 || hasControlChars(key)) throw new JobError(400, "API 키 형식이 올바르지 않습니다.");
  return key;
}

/** 키를 화면·로그에 보여줄 때만 쓰는 표기. 원본은 절대 그대로 쓰지 않는다. */
export function maskKey(key: string): string {
  if (!key) return "(없음)";
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

/**
 * 이 요청의 소유자. 프록시가 발급한 서명 쿠키에서만 읽는다 —
 * 브라우저가 보낸 값을 그대로 쓰면 남의 id 를 넣어 남의 작업을 볼 수 있다.
 */
export async function requireUid(req: Request): Promise<string> {
  const uid = await uidFrom(req);
  if (!uid) throw new JobError(400, "세션 쿠키가 없습니다. 페이지를 새로고침해 주세요.");
  return uid;
}

/** 소유자 id 를 확인하고 users 행까지 보장한다 (작업 생성·업로드처럼 행이 필요한 경로). */
export async function requireUser(req: Request): Promise<string> {
  const uid = await requireUid(req);
  await ensureUser(uid);
  return uid;
}

/** 브라우저 키가 필요한 모드인데 키 없이 생성 계열 API 를 부르면 여기서 막는다. */
export function requireKeyIfNeeded(key: string): void {
  if (requiresBrowserKey() && key === "") {
    throw new JobError(401, "fal.ai API 키를 먼저 등록해 주세요. 오른쪽 위 ‘fal 키 연결’ 버튼에서 입력할 수 있습니다.");
  }
}
