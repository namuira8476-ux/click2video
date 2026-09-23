/**
 * 사용자의 fal API 키는 **이 브라우저에만** 둔다. 서버 DB 에 저장하지 않는다.
 *
 * 기본은 sessionStorage(탭을 닫으면 사라짐)이고, "이 기기에 기억"을 고르면 localStorage 로 올린다.
 * 사파리 프라이빗 모드 등에서는 스토리지 접근 자체가 예외를 던지므로 전부 try/catch 로 감싼다.
 */
const KEY = "c2v.falKey";
const REMEMBER = "c2v.falKey.remember";

/** 키가 바뀌었음을 같은 탭의 컴포넌트들에 알린다 (storage 이벤트는 다른 탭에서만 온다). */
export const KEY_CHANGED_EVENT = "c2v:key-changed";

function read(store: Storage | undefined, k: string): string | null {
  try {
    return store?.getItem(k) ?? null;
  } catch {
    return null;
  }
}

function safeStores(): { session?: Storage; local?: Storage } {
  if (typeof window === "undefined") return {};
  try {
    return { session: window.sessionStorage, local: window.localStorage };
  } catch {
    return {};
  }
}

export function getKey(): string {
  const { session, local } = safeStores();
  return (read(session, KEY) ?? read(local, KEY) ?? "").trim();
}

export function isRemembered(): boolean {
  return read(safeStores().local, REMEMBER) === "1";
}

export function setKey(key: string, remember: boolean): void {
  const { session, local } = safeStores();
  const v = key.trim();
  try {
    session?.setItem(KEY, v);
    if (remember) {
      local?.setItem(KEY, v);
      local?.setItem(REMEMBER, "1");
    } else {
      local?.removeItem(KEY);
      local?.removeItem(REMEMBER);
    }
  } catch {
    /* 스토리지를 못 쓰면 이 탭 메모리로만 동작한다 */
  }
  notify();
}

export function clearKey(): void {
  const { session, local } = safeStores();
  try {
    session?.removeItem(KEY);
    local?.removeItem(KEY);
    local?.removeItem(REMEMBER);
  } catch {
    /* ignore */
  }
  notify();
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(KEY_CHANGED_EVENT));
}

export function maskedKey(key = getKey()): string {
  if (!key) return "";
  return key.length <= 8 ? "****" : `${key.slice(0, 4)}****${key.slice(-4)}`;
}

/**
 * fal 키의 겉모양(`<uuid>:<hex>`) 1차 검사. 형식이 바뀔 수 있으니 실패해도 막지는 않고
 * "이 모양이 아닌 것 같다"는 경고에만 쓴다.
 */
export function looksLikeFalKey(key: string): boolean {
  return /^[0-9a-f-]{8,}:[0-9a-f]{16,}$/i.test(key.trim());
}
