"use client";

import Link from "next/link";
import useSWR from "swr";
import type { PublicJob } from "@/lib/jobs/serialize";
import { fetcher, formatUsd, timeAgo } from "@/lib/client/fetcher";

const STATUS_LABEL: Record<PublicJob["status"], string> = {
  queued: "대기",
  uploading: "업로드",
  submitting: "제출",
  running: "생성 중",
  downloading: "다운로드",
  succeeded: "완료",
  failed: "실패",
  cancelled: "취소",
};

export function JobList({ initial }: { initial: PublicJob[] }) {
  const { data } = useSWR<{ jobs: PublicJob[] }>("/api/jobs", fetcher, {
    fallbackData: { jobs: initial },
    refreshInterval: (d) => (d?.jobs.some((j) => !["succeeded", "failed", "cancelled"].includes(j.status)) ? 3000 : 0),
  });
  const jobs = data?.jobs ?? initial;

  if (jobs.length === 0) {
    return (
      <div className="rounded-card border border-border bg-card p-12 text-center space-y-3">
        <div className="text-3xl">🎬</div>
        <div className="font-bold">아직 만든 영상이 없습니다</div>
        <p className="text-sm text-muted">템플릿을 고르고 사진 한 장만 올려 보세요.</p>
        <Link href="/" className="btn-accent inline-block px-5 py-2.5 text-sm">
          템플릿 보러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {jobs.map((j) => (
        <Link key={j.id} href={`/jobs/${j.id}`} className="card block">
          <div className="card-thumb relative aspect-[9/16] rounded-card overflow-hidden bg-card border border-border">
            {j.resultUrl ? (
              <video src={j.resultUrl} poster={j.posterUrl ?? undefined} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
            ) : j.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={j.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1b1b22] to-[#2a2a36]" />
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full border ${
                j.status === "succeeded" ? "border-accent/50 text-accent bg-black/60" : j.status === "failed" ? "border-danger/50 text-danger bg-black/60" : "border-white/20 text-text bg-black/60"
              }`}
            >
              {STATUS_LABEL[j.status]}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="font-extrabold leading-tight">{j.templateName}</div>
              <div className="text-[11px] text-muted mt-1">
                약 {formatUsd(j.estimatedUsd)} · {timeAgo(j.createdAt)}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
