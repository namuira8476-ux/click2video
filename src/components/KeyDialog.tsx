"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSWRConfig } from "swr";
import { postWithKey } from "@/lib/client/fetcher";
import { clearKey, getKey, isRemembered, looksLikeFalKey, maskedKey, setKey } from "@/lib/client/key-store";

type Verify = { ok: boolean; reason?: string; message?: string };

/**
 * fal API 키 등록 대화상자.
 *
 * 사용자에게 정직해야 하는 지점이라 문구를 나눠 적는다: 저장은 브라우저에만 하지만
 * 생성 요청마다 키가 서버를 거쳐 fal 로 간다 — "브라우저에만 저장됩니다" 한 줄만 쓰면 절반만 사실이다.
 */
export function KeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 헤더는 backdrop-blur 를 쓰는데, backdrop-filter 는 자손 fixed 요소의 컨테이닝 블록이 된다 —
  // 그대로 두면 모달이 헤더 높이 안에 갇힌다. body 로 포털시켜야 화면 전체를 덮는다.
  // 열릴 때만 마운트한다. 그래야 저장된 키를 effect 없이 초기값으로 읽을 수 있다(스토리지는 클라이언트 전용).
  // open 은 클릭으로만 켜지므로 이 시점에는 항상 브라우저다 — 서버 렌더와 어긋나지 않는다.
  if (!open || typeof document === "undefined") return null;
  return createPortal(<Dialog onClose={onClose} />, document.body);
}

function Dialog({ onClose }: { onClose: () => void }) {
  const { mutate } = useSWRConfig();
  const [saved, setSaved] = useState(() => getKey());
  const [remember, setRemember] = useState(() => isRemembered());
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const key = value.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postWithKey<Verify>("/api/key/verify", key);
      if (!r.ok) {
        setError(r.message ?? "키를 확인할 수 없습니다.");
        return;
      }
      setKey(key, remember);
      await mutate(() => true); // 키가 바뀌면 캐시된 응답(데모 배지 등)이 그대로 남는다
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "키를 확인할 수 없습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    clearKey();
    setSaved("");
    await mutate(() => true);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-xl font-bold">fal.ai API 키</h2>
          <p className="text-sm text-muted mt-1">
            이 서비스는 <b>회원님의 fal.ai 계정</b>으로 영상을 만듭니다. 키를 한 번 등록하면 바로 쓸 수 있습니다.
          </p>
        </div>

        {saved && (
          <div className="text-sm rounded-lg border border-border px-3 py-2 flex items-center justify-between">
            <span>
              등록된 키 <span className="font-mono">{maskedKey(saved)}</span>
            </span>
            <button type="button" onClick={() => void remove()} className="text-xs text-muted hover:text-text underline">
              삭제
            </button>
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-sm text-muted">{saved ? "새 키로 교체" : "키 입력"}</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            placeholder="00000000-0000-0000-0000-000000000000:0123abcd…"
            className="w-full rounded-lg bg-bg border border-border px-3 py-2 font-mono text-sm"
          />
        </label>
        {value && !looksLikeFalKey(value) && <p className="text-xs text-muted">fal 키 형식(uuid:hex)과 달라 보입니다. 그대로 확인해 볼 수 있습니다.</p>}
        {error && <p className="text-sm text-danger">{error}</p>}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />이 기기에 기억하기 (끄면 탭을 닫을 때 지워집니다)
        </label>

        <div className="flex gap-2">
          <button type="button" disabled={busy || !value.trim()} onClick={() => void save()} className="btn-accent flex-1 py-2.5 disabled:opacity-40">
            {busy ? "확인 중…" : "확인하고 저장"}
          </button>
          <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer noopener" className="btn-ghost px-4 py-2.5 text-sm">
            키 발급받기 ↗
          </a>
        </div>

        <ul className="text-[11px] leading-relaxed text-muted space-y-1 border-t border-border pt-3">
          <li>· 키는 이 브라우저(세션/로컬 저장소)에만 보관하며 서버 데이터베이스에 저장하지 않습니다.</li>
          <li>· 생성 요청마다 키가 HTTPS 로 서버를 거쳐 fal.ai 로 전달되며, 처리하는 동안에만 메모리에서 사용합니다.</li>
          <li>· 생성 요금은 회원님의 fal.ai 계정에 직접 청구됩니다. 예상 금액은 만들기 전에 표시됩니다.</li>
          <li>· 작업 목록은 브라우저 쿠키로 구분합니다. 브라우저 데이터를 지우면 지난 작업이 보이지 않습니다.</li>
        </ul>
      </div>
    </div>
  );
}
