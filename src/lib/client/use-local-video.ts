"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LocalVideoError,
  clearFailure,
  deleteLocalVideo,
  getLocalVideo,
  isAutoSaveSkipped,
  lastFailure,
  saveLocalVideo,
  setAutoSaveSkipped,
  type LocalVideoErrorKind,
} from "./local-videos";

export type LocalVideoStatus =
  /** 기기 저장소를 확인하는 중 (src 없음 — 원격 파일을 먼저 받지 않도록) */
  | "checking"
  /** 이 기기에 사본이 있다 */
  | "local"
  /** 원격 영상을 받아 기기에 저장하는 중 */
  | "saving"
  /** 결과가 아직 없다 */
  | "none"
  /** 저장에 실패해 원격 주소로 재생한다 */
  | "failed"
  /** 이 브라우저에서는 기기 저장을 쓸 수 없다 */
  | "unavailable"
  /** 사용자가 이 기기에서 지웠다 — 다시 저장하기 전까지 자동 저장하지 않는다 */
  | "skipped";

export type LocalVideoState = {
  /** 재생할 주소. checking 동안은 null */
  src: string | null;
  /** 기기 사본의 blob 주소 (다운로드용). 없으면 null */
  localUrl: string | null;
  status: LocalVideoStatus;
  bytes?: number;
  error?: string;
  errorKind?: LocalVideoErrorKind;
};

const CHECK_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new LocalVideoError("기기 저장소가 응답하지 않습니다.", "unavailable", false)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * 작업 하나의 결과 영상을 이 기기 사본 우선으로 돌려준다.
 * `remoteUrl` 이 생기면(작업 완료) 받아 저장한다. 저장이 이 화면에서 끝나면 재생 중인 원격 영상은
 * 그대로 두고(바꾸면 처음부터 다시 재생된다) 다운로드용 `localUrl` 만 채운다.
 */
export function useLocalVideo(jobId: string, remoteUrl: string | null, opts: { priority?: boolean } = {}) {
  const [state, setState] = useState<LocalVideoState>({ src: null, localUrl: null, status: "checking" });
  const [version, setVersion] = useState(0);
  const force = useRef(false);
  const priority = Boolean(opts.priority);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const forced = force.current;
    force.current = false;

    (async () => {
      let saved = null;
      try {
        saved = await withTimeout(getLocalVideo(jobId), CHECK_TIMEOUT_MS);
      } catch (e) {
        const err = e instanceof LocalVideoError ? e : new LocalVideoError("기기 저장소를 읽지 못했습니다.", "unavailable", false);
        if (!cancelled) setState({ src: remoteUrl, localUrl: null, status: remoteUrl ? "unavailable" : "none", error: err.message, errorKind: err.kind });
        return;
      }
      if (cancelled) return;
      if (saved) {
        objectUrl = URL.createObjectURL(saved.blob);
        return setState({ src: objectUrl, localUrl: objectUrl, status: "local", bytes: saved.bytes });
      }
      if (!remoteUrl) return setState({ src: null, localUrl: null, status: "none" });
      if (!forced && isAutoSaveSkipped(jobId)) return setState({ src: remoteUrl, localUrl: null, status: "skipped" });
      const prev = lastFailure(jobId);
      if (!forced && prev) return setState({ src: remoteUrl, localUrl: null, status: "failed", error: prev.message, errorKind: prev.kind });

      setState({ src: remoteUrl, localUrl: null, status: "saving" });
      try {
        const row = await saveLocalVideo(jobId, remoteUrl, { priority });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(row.blob);
        setState({ src: remoteUrl, localUrl: objectUrl, status: "local", bytes: row.bytes });
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof LocalVideoError ? e : new LocalVideoError("기기에 저장하지 못했습니다.", "unknown", false);
        setState({ src: remoteUrl, localUrl: null, status: err.kind === "unavailable" ? "unavailable" : "failed", error: err.message, errorKind: err.kind });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [jobId, remoteUrl, version, priority]);

  /** 실패했거나 지운 뒤 다시 기기에 저장한다. */
  const retry = useCallback(() => {
    setAutoSaveSkipped(jobId, false);
    clearFailure(jobId);
    force.current = true;
    setVersion((v) => v + 1);
  }, [jobId]);

  /** 이 기기에서 지우고, 다시 저장하기 전까지 자동으로 받지 않는다. */
  const remove = useCallback(async () => {
    setAutoSaveSkipped(jobId, true);
    await deleteLocalVideo(jobId);
    setVersion((v) => v + 1);
  }, [jobId]);

  return { ...state, retry, remove };
}
