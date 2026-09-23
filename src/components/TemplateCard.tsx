"use client";

import Link from "next/link";
import { useRef } from "react";
import type { PublicTemplate } from "@/lib/templates/loader";
import { CATEGORY_LABEL } from "@/lib/templates/schema";
import { formatCredits } from "@/lib/client/fetcher";

export function TemplateCard({ t }: { t: PublicTemplate }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <Link
      href={`/t/${t.id}`}
      className="card group block"
      onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    >
      <div className="card-thumb relative aspect-[9/16] rounded-card overflow-hidden bg-card border border-border">
        {t.preview ? (
          <video ref={videoRef} src={t.preview} poster={t.thumbnail ?? undefined} muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
        ) : t.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.thumbnail} alt={t.name} className="kenburns absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1b1b22] to-[#2a2a36]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1">
          {t.badges.map((b) => (
            <span key={b} className="text-[11px] px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10">
              {b}
            </span>
          ))}
        </div>
        {!t.ready && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full bg-black/70 border border-white/15 text-muted">
            {t.readyReason ?? "준비 중"}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="text-[11px] text-muted mb-0.5">{CATEGORY_LABEL[t.category]}</div>
          <div className="font-extrabold leading-tight">{t.name}</div>
          <div className="text-xs text-muted mt-1 line-clamp-2">{t.tagline}</div>
          <div className="mt-2 text-[11px] font-bold text-accent">✨ {formatCredits(t.baseCredits)} 크레딧~</div>
        </div>
      </div>
    </Link>
  );
}
