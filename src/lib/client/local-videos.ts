/**
 * 결과 영상을 **이 기기(브라우저)** 에 보관한다.
 *
 * 배포본은 R2 없이 fal 이 호스팅하는 주소를 그대로 쓰는데, 그 주소는 영구 보관이 아니다.
 * 그래서 완성되면 브라우저가 영상을 받아 IndexedDB 에 넣고, "내 작업"은 이 사본을 재생한다.
 * 서버를 거치지 않는다 — fal 미디어 주소는 CORS 를 허용하고(`access-control-allow-origin: *`),
 * 로컬 개발 모드의 `/api/files/…`·`/samples/…` 는 같은 오리진이다.
 *
 * 브라우저 저장소는 사용자가 사이트 데이터를 지우면 함께 지워지고, 저장 공간이 부족하거나
 * 오래 방문하지 않으면 브라우저가 비울 수 있다. 보존 요청(persist)은 다운로드 같은 사용자 동작에서만 한다
 * (Firefox 는 권한 팝업을 띄운다).
 */
const DB_NAME = "c2v-local";
const STORE = "videos";
/** 이보다 큰 파일은 저장하지 않는다 (H3 결과는 보통 수 MB~수십 MB). */
const MAX_BYTES = 150 * 1024 * 1024;
/** 목록을 열었을 때 한꺼번에 받지 않도록 동시에 받는 개수 */
const CONCURRENCY = 2;
const OPEN_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 3 * 60 * 1000;
/** 사용자가 "이 기기에서 지우기"를 누른 작업 — 다시 자동 저장하지 않는다 */
const SKIP_KEY = "c2v.localVideo.skip";

export type LocalVideo = { jobId: string; blob: Blob; savedAt: number; bytes: number; source: string };

export type LocalVideoErrorKind = "unavailable" | "quota" | "too-large" | "gone" | "network" | "not-video" | "unknown";

/** 사용자에게 보여 줄 한국어 문구와, 다시 시도해도 소용없는지(permanent)를 함께 갖는다. */
export class LocalVideoError extends Error {
  constructor(
    message: string,
    readonly kind: LocalVideoErrorKind,
    readonly permanent: boolean,
  ) {
    super(message);
    this.name = "LocalVideoError";
  }
}

function toLocalError(e: unknown): LocalVideoError {
  if (e instanceof LocalVideoError) return e;
  const name = (e as { name?: string })?.name ?? "";
  if (name === "QuotaExceededError") return new LocalVideoError("기기 저장 공간이 부족합니다. 다운로드해서 보관하세요.", "quota", true);
  if (name === "AbortError" || name === "TimeoutError") return new LocalVideoError("영상을 받는 데 너무 오래 걸려 중단했습니다.", "network", false);
  if (e instanceof TypeError) return new LocalVideoError("원본 영상에 연결하지 못했습니다 (네트워크 또는 만료된 링크).", "network", false);
  return new LocalVideoError("기기에 저장하지 못했습니다.", "unknown", false);
}

/* ---------- IndexedDB ---------- */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new LocalVideoError("이 브라우저에서는 기기 저장을 쓸 수 없습니다.", "unavailable", true));
      return;
    }
    // 일부 브라우저(Safari)는 open 이 아무 이벤트도 내지 않고 멈출 때가 있다
    const timer = setTimeout(() => reject(new LocalVideoError("기기 저장소가 응답하지 않습니다.", "unavailable", false)), OPEN_TIMEOUT_MS);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      clearTimeout(timer);
      reject(new LocalVideoError("이 브라우저에서는 기기 저장을 쓸 수 없습니다.", "unavailable", true));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "jobId" });
    };
    req.onsuccess = () => {
      clearTimeout(timer);
      const db = req.result;
      // 연결이 끊기면(iOS 백그라운드 복귀, 사이트 데이터 삭제) 다음 호출에서 다시 연다
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      clearTimeout(timer);
      reject(new LocalVideoError("이 브라우저에서는 기기 저장을 쓸 수 없습니다 (시크릿 창·사이트 데이터 차단 등).", "unavailable", true));
    };
  }).catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>, retried = false): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      let result: T;
      req.onsuccess = () => {
        result = req.result;
      };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error ?? req.error);
      t.onabort = () => reject(t.error ?? req.error ?? new DOMException("aborted", "AbortError"));
    });
  } catch (e) {
    // 캐시된 연결이 이미 닫혀 있었으면 한 번만 다시 연다
    const name = (e as { name?: string })?.name;
    if (!retried && (name === "InvalidStateError" || name === "UnknownError")) {
      dbPromise = null;
      return tx(mode, run, true);
    }
    throw toLocalError(e);
  }
}

export async function getLocalVideo(jobId: string): Promise<LocalVideo | null> {
  const row = await tx<LocalVideo | undefined>("readonly", (s) => s.get(jobId));
  return row ?? null;
}

export async function deleteLocalVideo(jobId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(jobId));
}

/* ---------- 자동 저장 제외 · 실패 기억 ---------- */

function readSkip(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SKIP_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function isAutoSaveSkipped(jobId: string): boolean {
  return readSkip().has(jobId);
}

export function setAutoSaveSkipped(jobId: string, skip: boolean) {
  const s = readSkip();
  if (skip) s.add(jobId);
  else s.delete(jobId);
  try {
    localStorage.setItem(SKIP_KEY, JSON.stringify([...s]));
  } catch {
    /* 저장소를 못 쓰면 이번 세션에서만 */
  }
}

/** 이번 세션에서 영구 실패한 작업 — 목록을 다시 열 때마다 파일 전체를 다시 받지 않게 */
const failures = new Map<string, LocalVideoError>();

export function lastFailure(jobId: string): LocalVideoError | undefined {
  return failures.get(jobId);
}

export function clearFailure(jobId: string) {
  failures.delete(jobId);
}

/* ---------- 받기 + 저장 (동시 개수 제한 대기열) ---------- */

type Task = { jobId: string; url: string; resolve: (v: LocalVideo) => void; reject: (e: unknown) => void };
const queue: Task[] = [];
let running = 0;
const inflight = new Map<string, Promise<LocalVideo>>();

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const t = queue.shift()!;
    running++;
    download(t.jobId, t.url)
      .then(t.resolve, t.reject)
      .finally(() => {
        running--;
        pump();
      });
  }
}

async function download(jobId: string, url: string): Promise<LocalVideo> {
  const existing = await getLocalVideo(jobId);
  if (existing) return existing;

  const signal = typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined;
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", signal });
  } catch (e) {
    throw toLocalError(e);
  }
  if (res.status === 403 || res.status === 404 || res.status === 410) {
    throw new LocalVideoError("원본 영상 링크가 만료돼 기기에 저장할 수 없습니다.", "gone", true);
  }
  if (!res.ok) throw new LocalVideoError(`원본 영상을 받지 못했습니다 (${res.status}).`, "unknown", false);
  const type = res.headers.get("content-type") ?? "";
  if (type && !type.startsWith("video/") && type !== "application/octet-stream" && type !== "binary/octet-stream") {
    throw new LocalVideoError("영상 파일이 아니어서 저장하지 않았습니다.", "not-video", true);
  }
  const tooBig = new LocalVideoError("영상이 너무 커서 기기에 저장하지 않았습니다. 다운로드해서 보관하세요.", "too-large", true);
  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw tooBig;

  let blob: Blob;
  try {
    blob = await res.blob();
  } catch (e) {
    throw toLocalError(e);
  }
  if (blob.size === 0) throw new LocalVideoError("빈 파일을 받았습니다.", "unknown", false);
  if (blob.size > MAX_BYTES) throw tooBig;

  const row: LocalVideo = {
    jobId,
    blob: blob.type.startsWith("video/") ? blob : new Blob([blob], { type: "video/mp4" }),
    savedAt: Date.now(),
    bytes: blob.size,
    source: url,
  };
  await tx("readwrite", (s) => s.put(row));
  return row;
}

/**
 * 원격 주소에서 영상을 받아 이 기기에 저장한다. 이미 있으면 그대로 돌려준다.
 * 같은 작업을 여러 화면이 요청하면 한 번만 받는다. `priority` 는 대기열 맨 앞으로 보낸다(상세 화면).
 */
export function saveLocalVideo(jobId: string, url: string, opts: { priority?: boolean } = {}): Promise<LocalVideo> {
  const existing = inflight.get(jobId);
  if (existing) {
    if (opts.priority) {
      const i = queue.findIndex((t) => t.jobId === jobId);
      if (i > 0) queue.unshift(...queue.splice(i, 1));
    }
    return existing;
  }
  const p = new Promise<LocalVideo>((resolve, reject) => {
    const task: Task = { jobId, url, resolve, reject };
    if (opts.priority) queue.unshift(task);
    else queue.push(task);
    pump();
  })
    .then((row) => {
      failures.delete(jobId);
      return row;
    })
    .catch((e) => {
      const err = toLocalError(e);
      if (err.permanent) failures.set(jobId, err);
      throw err;
    })
    .finally(() => inflight.delete(jobId));
  inflight.set(jobId, p);
  return p;
}

/** 브라우저에 저장소를 지우지 말아 달라고 요청한다. 사용자 동작(다운로드 클릭 등) 안에서만 부른다. */
export async function requestPersist(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${Math.round(n / 1024)}KB`;
  return `${n}B`;
}
