"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { KeyDialog } from "@/components/KeyDialog";
import { fetcher, formatCredits } from "@/lib/client/fetcher";
import { KEY_CHANGED_EVENT, getKey, maskedKey } from "@/lib/client/key-store";

type Me = {
  user: { id: string };
  byok: boolean;
  hasKey: boolean;
  requiresBrowserKey: boolean;
  keySource: "browser" | "server" | "none";
  mock: boolean;
  unlimited?: boolean;
  credits?: number | null;
};

const TABS: { href: string; label: string }[] = [
  { href: "/", label: "전체" },
  { href: "/?category=effects", label: "이펙트" },
  { href: "/?category=commerce", label: "광고·커머스" },
  { href: "/?category=edit", label: "편집" },
  { href: "/?category=smallbiz", label: "소상공인 광고" },
];

/** 키는 브라우저에만 있으므로 서버 렌더와 값이 다르다 — 마운트 후에만 읽어 하이드레이션 불일치를 피한다. */
function useLocalKey() {
  const [key, setLocal] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setLocal(getKey());
    sync();
    window.addEventListener(KEY_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(KEY_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return key;
}

export function Header() {
  const pathname = usePathname();
  const [dialog, setDialog] = useState(false);
  const localKey = useLocalKey();
  const { data } = useSWR<Me>("/api/me", fetcher, { refreshInterval: 30000 });
  const mounted = localKey !== null;
  const hasKey = Boolean(localKey);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/" className="font-black tracking-[3px] text-sm sm:text-base whitespace-nowrap">
          CLICK<span className="text-accent">2</span>VIDEO
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-full text-muted hover:text-text hover:bg-card transition">
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {data?.mock && (
            <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border border-accent/40 text-accent" title="데모 모드 — 실제 영상이 생성되지 않습니다">
              데모
            </span>
          )}

          {/* 브라우저 키가 필요한 모드(BYOK)면 크레딧 대신 내 키 상태를 보여준다 */}
          {data && !data.requiresBrowserKey ? (
            <span className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-card border border-border">
              <span className="text-muted mr-1">크레딧</span>
              <span className="font-bold">{data.unlimited ? "무제한" : formatCredits(data.credits ?? 0)}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setDialog(true)}
              className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition ${
                mounted && hasKey ? "bg-card border-border text-muted hover:text-text" : "border-accent text-accent hover:bg-accent/10"
              }`}
              title={hasKey ? "등록된 fal.ai 키 — 클릭해서 교체하거나 삭제" : "내 fal.ai 키를 등록하면 바로 만들 수 있습니다"}
            >
              {!mounted ? "🔑 …" : hasKey ? <>🔑 <span className="font-mono">{maskedKey(localKey!)}</span></> : "🔑 fal 키 연결"}
            </button>
          )}

          <Link
            href="/jobs"
            className={`text-sm px-3 py-1.5 rounded-full border transition ${pathname.startsWith("/jobs") ? "border-accent text-accent" : "border-border text-muted hover:text-text"}`}
          >
            내 작업
          </Link>
        </div>
      </div>
      <KeyDialog open={dialog} onClose={() => setDialog(false)} />
    </header>
  );
}
