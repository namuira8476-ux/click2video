"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { PublicJob } from "@/lib/jobs/serialize";
import { fetcher, formatUsd, postJson } from "@/lib/client/fetcher";

const STEPS: { key: PublicJob["status"][]; label: string }[] = [
  { key: ["queued"], label: "대기" },
  { key: ["uploading"], label: "업로드" },
  { key: ["submitting"], label: "제출" },
  { key: ["running"], label: "생성 중" },
  { key: ["downloading"], label: "다운로드" },
  { key: ["succeeded"], label: "완료" },
];

const DONE: PublicJob["status"][] = ["succeeded", "failed", "cancelled"];

function stepIndex(s: PublicJob["status"]) {
  const i = STEPS.findIndex((st) => st.key.includes(s));
  return i === -1 ? STEPS.length - 1 : i;
}

function elapsed(job: PublicJob) {
  const end = job.finishedAt ?? Date.now();
  const s = Math.max(0, Math.floor((end - job.createdAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function JobView({ id, initial }: { id: string; initial: PublicJob }) {
  const { data, mutate } = useSWR<{ job: PublicJob }>(`/api/jobs/${id}`, fetcher, {
    fallbackData: { job: initial },
    refreshInterval: (d) => (d && DONE.includes(d.job.status) ? 0 : 3000),
  });
  const job = data?.job ?? initial;
  const stepping = useRef(false);

  // 내 키는 브라우저에만 있으므로 서버가 혼자 작업을 진행시킬 수 없다.
  // 이 화면이 열려 있는 동안 한 칸씩 밀어 준다. 탭을 닫으면 멈추고, 다시 열면 이어서 진행된다.
  useEffect(() => {
    if (DONE.includes(job.status) || stepping.current) return;
    stepping.current = true;
    void postJson<{ job: PublicJob }>(`/api/jobs/${id}/step`, {})
      .then((r) => mutate({ job: r.job }, { revalidate: false }))
      .catch(() => {})
      .finally(() => {
        stepping.current = false;
      });
  }, [id, job.status, job.updatedAt, mutate]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const idx = stepIndex(job.status);
  const active = !DONE.includes(job.status);

  async function cancel() {
    setCancelling(true);
    try {
      const r = await postJson<{ job: PublicJob }>(`/api/jobs/${id}/cancel`, {});
      await mutate({ job: r.job });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="py-6 space-y-6">
      <nav className="text-xs text-muted">
        <Link href="/jobs" className="hover:text-text">
          내 작업
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">{job.templateName}</span>
      </nav>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-8 items-start">
        <section className="rounded-card border border-border bg-card overflow-hidden">
          {job.status === "succeeded" && job.resultUrl ? (
            <video src={job.resultUrl} poster={job.posterUrl ?? undefined} controls autoPlay muted loop playsInline className="w-full max-h-[70vh] bg-black" />
          ) : job.status === "succeeded" ? (
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {job.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.posterUrl} alt="" className="absolute inset-0 w-full h-full object-contain opacity-70" />
              )}
              <span className="relative text-xs font-bold px-3 py-1.5 rounded-full bg-black/70 border border-accent/40 text-accent">MOCK 결과 (result.mp4 없음)</span>
            </div>
          ) : (
            <div className="aspect-video bg-black flex flex-col items-center justify-center gap-3 p-6 text-center">
              {job.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.posterUrl} alt="" className="w-24 h-24 object-cover rounded-lg opacity-60" />
              )}
              {job.status === "failed" ? (
                <>
                  <div className="text-danger font-bold">생성에 실패했습니다</div>
                  <div className="text-sm text-muted max-w-md">{job.errorMessage}</div>
                  <div className="text-xs text-muted">생성이 시작되지 않았다면 fal.ai 요금도 청구되지 않습니다.</div>
                </>
              ) : job.status === "cancelled" ? (
                <div className="text-muted">취소된 작업입니다.</div>
              ) : (
                <>
                  <div className="font-bold">{STEPS[idx].label}…</div>
                  <div className="text-xs text-muted">
                    보통 30초~3분 걸립니다 · 경과 {elapsed(job)}
                    {job.queuePosition != null && ` · 대기 순번 ${job.queuePosition}`}
                  </div>
                  <div className="progress indeterminate w-64">
                    <div />
                  </div>
                </>
              )}
            </div>
          )}
          <div className="p-4 border-t border-border">
            <ol className="flex items-center gap-1 text-[11px]">
              {STEPS.map((s, i) => {
                const state = job.status === "failed" || job.status === "cancelled" ? (i < idx ? "done" : "off") : i < idx ? "done" : i === idx ? "now" : "off";
                return (
                  <li key={s.label} className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full border ${state === "done" ? "border-accent/40 text-accent" : state === "now" ? "border-accent bg-accent text-accent-ink font-bold" : "border-border text-muted"}`}>
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && <span className="text-border">—</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-card border border-border bg-card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">템플릿</span>
              <Link href={`/t/${job.templateId}`} className="hover:text-accent">
                {job.templateName}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">설정</span>
              <span>
                {job.resolution} · {job.duration}초 · {job.ratio}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">예상 요금</span>
              <span title="회원님의 fal.ai 계정에 청구됩니다">
                {formatUsd(job.estimatedUsd)}
                {job.refunded && <span className="text-accent ml-1">(환불)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">상태</span>
              <span className="font-bold">{job.status}</span>
            </div>
            {job.mock && <div className="text-[11px] text-accent">데모 모드에서 만든 작업입니다 (실제 생성 아님).</div>}
          </div>

          <div className="flex flex-col gap-2">
            {job.status === "succeeded" && job.resultUrl && (
              <a href={job.resultUrl} download={`click2video-${job.id}.mp4`} className="btn-accent text-center py-3">
                ⬇ 다운로드
              </a>
            )}
            <Link href={`/t/${job.templateId}`} className="btn-ghost text-center py-3 text-sm">
              같은 템플릿으로 다시 만들기
            </Link>
            {active && (
              <button type="button" onClick={cancel} disabled={cancelling} className="btn-ghost py-3 text-sm text-danger">
                {cancelling ? "취소 중…" : "작업 취소 (환불)"}
              </button>
            )}
          </div>

          <div className="rounded-card border border-border bg-card overflow-hidden">
            <button type="button" onClick={() => setShowPrompt((v) => !v)} className="w-full text-left px-4 py-3 text-sm font-bold flex justify-between">
              사용된 프롬프트 <span className="text-muted">{showPrompt ? "▴" : "▾"}</span>
            </button>
            {showPrompt && (
              <div className="px-4 pb-4 space-y-3 text-xs">
                <pre className="whitespace-pre-wrap text-muted leading-relaxed">{job.renderedPrompt}</pre>
                {job.expandedPrompt && (
                  <>
                    <div className="font-bold text-text">보강된 프롬프트</div>
                    <pre className="whitespace-pre-wrap text-muted leading-relaxed">{job.expandedPrompt}</pre>
                  </>
                )}
                {job.requestSnapshot && <pre className="whitespace-pre-wrap text-muted/70 leading-relaxed">{JSON.stringify(job.requestSnapshot, null, 2)}</pre>}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
