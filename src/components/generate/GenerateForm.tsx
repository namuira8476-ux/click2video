"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { PublicOption, PublicSelectValue, PublicTemplate } from "@/lib/templates/loader";
import { ApiClientError, fetcher, formatUsd, postForm, postJson } from "@/lib/client/fetcher";
import { KEY_CHANGED_EVENT, getKey } from "@/lib/client/key-store";
import { KeyDialog } from "@/components/KeyDialog";
import { renderTextImageBlob } from "@/lib/client/text-image";
import { DropZone, type SlotValue } from "./DropZone";

type Estimate = {
  credits: number;
  usd: number;
  breakdown: { outputUsd: number; refUsd: number; refTokens: number };
  generation: { resolution: string; duration: number; ratio: string; promptExpansion: string };
  errors: string[];
};

const RATIO_LABEL: Record<string, string> = {
  adaptive: "자동 (입력 영상·사진 비율에 맞춤)",
  "21:9": "21:9 시네마",
  "16:9": "16:9 가로",
  "4:3": "4:3",
  "1:1": "1:1 정사각",
  "3:4": "3:4",
  "9:16": "9:16 세로",
};

function defaultOptions(t: PublicTemplate): Record<string, string | boolean> {
  const o: Record<string, string | boolean> = {};
  for (const opt of t.options) {
    if (opt.type === "select") {
      const firstUsable = opt.values.find((v) => v.available !== false);
      o[opt.key] = opt.values.some((v) => v.value === opt.default && v.available !== false) ? opt.default : (firstUsable?.value ?? opt.default);
    } else if (opt.type === "toggle") o[opt.key] = opt.default;
    else o[opt.key] = "";
  }
  return o;
}

function visible(opt: PublicOption, options: Record<string, string | boolean>) {
  if (!("showWhen" in opt) || !opt.showWhen) return true;
  return options[opt.showWhen.key] === opt.showWhen.equals;
}

export function GenerateForm({ template: t }: { template: PublicTemplate }) {
  const router = useRouter();
  const userSlots = useMemo(() => t.slots.filter((s) => s.source === "user"), [t]);
  const [slots, setSlots] = useState<Record<string, SlotValue | undefined>>({});
  const [options, setOptions] = useState<Record<string, string | boolean>>(() => defaultOptions(t));
  const [consent, setConsent] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resolution, setResolution] = useState<string>(t.defaults.resolution);
  const [ratio, setRatio] = useState<string>(t.defaults.ratio);
  const [duration, setDuration] = useState<string>(t.defaults.duration === "clip" ? "clip" : String(t.defaults.duration));
  const [promptExpansion, setPromptExpansion] = useState("balanced");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [keyDialog, setKeyDialog] = useState(false);
  // 키는 브라우저에만 있으므로 마운트 후에 읽는다 (서버 렌더와 값이 달라 하이드레이션이 깨진다).
  const [hasKey, setHasKey] = useState(false);
  // 데모 모드나 로컬 서버 키 모드에서는 브라우저 키 없이 만든다 — 서버가 알려 준다.
  const { data: me } = useSWR<{ requiresBrowserKey: boolean }>("/api/me", fetcher);
  const needKey = (me?.requiresBrowserKey ?? false) && !hasKey;
  useEffect(() => {
    const sync = () => setHasKey(Boolean(getKey()));
    sync();
    window.addEventListener(KEY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(KEY_CHANGED_EVENT, sync);
  }, []);
  const seq = useRef(0);

  const mainOptions = t.options.filter((o) => o.key !== "extra");
  const extraOption = t.options.find((o) => o.key === "extra");
  const hasVideoInput = t.slots.some((s) => s.kind === "video");
  // 샘플 자산이 있거나, 자산 없이 문구만으로 만드는 템플릿(예: 키네틱 타이포)이면 예시 문구로 채워서 바로 돌려볼 수 있게 한다
  const hasSample =
    userSlots.some((s) => t.sampleInputs[s.key]) ||
    (userSlots.every((s) => !s.required) && t.options.some((o) => o.type === "text" && o.required && o.placeholder));

  const body = useCallback(
    () => ({
      templateId: t.id,
      slots: Object.fromEntries(Object.entries(slots).filter(([, v]) => v).map(([k, v]) => [k, v!.value])),
      options,
      consent,
      resolution,
      ratio,
      duration: duration === "clip" ? undefined : Number(duration),
      promptExpansion,
    }),
    [t.id, slots, options, consent, resolution, ratio, duration, promptExpansion],
  );

  useEffect(() => {
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const r = await postJson<Estimate>("/api/estimate", body());
        if (id === seq.current) setEstimate(r);
      } catch (e) {
        if (id === seq.current) {
          const msg = e instanceof ApiClientError ? e.errors : [(e as Error).message];
          setEstimate({ credits: 0, usd: 0, breakdown: { outputUsd: 0, refUsd: 0, refTokens: 0 }, generation: { resolution, duration: 0, ratio, promptExpansion }, errors: msg });
        }
      } finally {
        if (id === seq.current) setEstimating(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [body, resolution, ratio, promptExpansion]);

  function useSamples() {
    const next: Record<string, SlotValue | undefined> = {};
    for (const s of userSlots) {
      const p = t.sampleInputs[s.key];
      if (p) next[s.key] = { value: `sample:${p}`, previewUrl: p, name: p.split("/").pop() ?? "sample", kind: s.kind };
    }
    setSlots(next);
    // 템플릿의 sampleOptions 로 채우고, 나머지 필수 텍스트는 placeholder 의 예시("예: …")로 채운다
    setOptions((prev) => {
      const filled = { ...prev };
      for (const [k, v] of Object.entries(t.sampleOptions ?? {})) if (!String(prev[k] ?? "").trim()) filled[k] = v;
      for (const o of t.options) {
        if (o.type === "text" && o.required && !String(filled[o.key] ?? "").trim() && o.placeholder) {
          filled[o.key] = o.placeholder.replace(/^예\s*:\s*/, "").split(" / ")[0];
        }
      }
      return filled;
    });
    if (t.requiresConsent) setConsent(true);
  }

  /**
   * 문구(textImage) 슬롯을 브라우저 캔버스로 그려 업로드하고 슬롯 값(assetId)으로 바꾼다.
   * 서버 렌더러는 네이티브 모듈이라 Cloudflare 에서 돌지 않으므로 배포 환경에서는 이 경로가 필수다.
   */
  async function renderTextSlots(): Promise<Record<string, string>> {
    const extra: Record<string, string> = {};
    for (const slot of t.slots) {
      if (slot.source !== "textImage" || !slot.optionKey) continue;
      const text = String(options[slot.optionKey] ?? "").trim();
      if (!text) continue;
      const blob = await renderTextImageBlob(text, slot.textStyle === "light" ? "light" : "dark");
      const form = new FormData();
      form.append("file", new File([blob], `${slot.key}.png`, { type: "image/png" }));
      const r = await postForm<{ asset: { id: string } }>("/api/uploads", form);
      extra[slot.key] = r.asset.id;
    }
    return extra;
  }

  async function submit() {
    setSubmitting(true);
    setSubmitErrors([]);
    try {
      const textSlots = await renderTextSlots();
      const r = await postJson<{ job: { id: string } }>("/api/jobs", { ...body(), slots: { ...body().slots, ...textSlots } });
      router.push(`/jobs/${r.job.id}`);
    } catch (e) {
      setSubmitErrors(e instanceof ApiClientError ? e.errors : [(e as Error).message]);
      setSubmitting(false);
    }
  }

  const errors = submitErrors.length ? submitErrors : (estimate?.errors ?? []);
  const ready = t.ready && !submitting && !estimating && estimate !== null && estimate.errors.length === 0;
  // 키가 없어도 여기까지(샘플 채우기 → 견적 확인)는 되게 두고, 만들기 직전에만 키를 요구한다.

  return (
    <div className="space-y-6">
      <KeyDialog open={keyDialog} onClose={() => setKeyDialog(false)} />
      {!t.ready && (
        <div className="rounded-card border border-border bg-card p-4 text-sm text-muted">이 템플릿은 아직 준비 중입니다. {t.readyReason}.</div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">1. 자산 올리기</h2>
          {hasSample && (
            <button type="button" onClick={useSamples} className="btn-ghost text-sm px-3 py-1.5">
              샘플 값으로 채우기
            </button>
          )}
        </div>
        {userSlots.map((s) => (
          <DropZone key={s.key} slot={s} value={slots[s.key]} onChange={(v) => setSlots((p) => ({ ...p, [s.key]: v }))} disabled={!t.ready} />
        ))}
      </section>

      {mainOptions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg">2. 옵션</h2>
          {mainOptions.filter((o) => visible(o, options)).map((o) => (
            <OptionField
              key={o.key}
              opt={o}
              value={options[o.key]}
              onChange={(v) => setOptions((p) => ({ ...p, [o.key]: v }))}
              imageBound={t.slots.some((s) => s.source === "textImage" && s.optionKey === o.key)}
            />
          ))}
        </section>
      )}

      <section className="rounded-card border border-border overflow-hidden">
        <button type="button" onClick={() => setDetailOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold bg-card">
          디테일 조정
          <span className="text-muted">{detailOpen ? "▴" : "▾"}</span>
        </button>
        {detailOpen && (
          <div className="p-4 grid sm:grid-cols-2 gap-4 text-sm">
            {t.mode === "first-last" ? (
              <div className="space-y-1">
                <span className="text-muted">화면비</span>
                <div className="field text-muted">첫 사진의 비율을 그대로 따릅니다</div>
              </div>
            ) : (
              <label className="space-y-1">
                <span className="text-muted">화면비</span>
                <select className="field" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                  {t.allow.ratios.map((r) => (
                    <option key={r} value={r}>
                      {RATIO_LABEL[r] ?? r}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="space-y-1">
              <span className="text-muted">길이</span>
              <select className="field" value={duration} onChange={(e) => setDuration(e.target.value)}>
                {t.defaults.duration === "clip" && <option value="clip">입력 영상 길이에 맞춤</option>}
                {t.allow.durations.map((d) => (
                  <option key={d} value={String(d)}>
                    {d}초
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className="text-muted">해상도</span>
              <div className="flex gap-2">
                {t.allow.resolutions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition ${resolution === r ? "border-accent text-accent bg-accent/10" : "border-border text-muted"}`}
                  >
                    {r}
                    {r === "480P" && hasVideoInput && <span className="block text-[10px]">절약 모드</span>}
                  </button>
                ))}
              </div>
            </div>
            <label className="space-y-1">
              <span className="text-muted">프롬프트 보강</span>
              <select className="field" value={promptExpansion} onChange={(e) => setPromptExpansion(e.target.value)}>
                <option value="balanced">균형 (약 1초)</option>
                <option value="quality">품질 (최대 30초)</option>
              </select>
            </label>
            {extraOption && extraOption.type === "text" && (
              <label className="space-y-1 sm:col-span-2">
                <span className="text-muted">{extraOption.label}</span>
                <input
                  className="field"
                  maxLength={extraOption.maxLen}
                  placeholder={extraOption.placeholder ?? "예: 조금 더 밝게"}
                  value={String(options.extra ?? "")}
                  onChange={(e) => setOptions((p) => ({ ...p, extra: e.target.value }))}
                />
              </label>
            )}
          </div>
        )}
      </section>

      {t.requiresConsent && (
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1 accent-[#c8ff3d]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            본인이거나 사용 허락을 받은 인물·음성입니다. <span className="text-muted">타인의 얼굴이나 목소리를 무단으로 사용하지 않습니다.</span>
          </span>
        </label>
      )}

      {errors.length > 0 && (
        <ul className="rounded-card border border-danger/40 bg-danger/5 p-3 text-sm text-danger space-y-1">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="sticky bottom-4">
        <button
          type="button"
          disabled={!ready}
          onClick={() => (needKey ? setKeyDialog(true) : submit())}
          className="btn-accent w-full py-4 text-base shadow-xl"
        >
          {submitting
            ? "작업 등록 중…"
            : estimating || !estimate
              ? "견적 계산 중…"
              : needKey
                ? `🔑 내 fal 키 넣고 만들기 · 약 ${formatUsd(estimate.usd)}`
                : `✨ 만들기 · 약 ${formatUsd(estimate.usd)}`}
        </button>
        {estimate && estimate.errors.length === 0 && (
          <p className="text-[11px] text-muted text-center mt-2">
            출력 ${estimate.breakdown.outputUsd.toFixed(2)} + 레퍼런스 ${estimate.breakdown.refUsd.toFixed(2)} = ${estimate.usd.toFixed(2)} · {estimate.generation.resolution} ·{" "}
            {estimate.generation.duration}초 · 회원님의 fal.ai 계정에 청구
          </p>
        )}
      </div>
    </div>
  );
}

function PreviewTile({ v, selected, onSelect }: { v: PublicSelectValue; selected: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const off = v.available === false;
  const isVideo = v.kind === "video";
  return (
    <button
      type="button"
      disabled={off}
      onClick={onSelect}
      onMouseEnter={() => void ref.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const el = ref.current;
        if (el) {
          el.pause();
          el.currentTime = 0;
        }
      }}
      className={`relative text-left rounded-xl overflow-hidden border transition ${selected ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-muted"} ${off ? "opacity-40 cursor-not-allowed" : ""}`}
      title={off ? "준비 중" : "마우스를 올리면 재생됩니다"}
    >
      <div className={`${isVideo ? "aspect-[9/16] max-h-44" : "aspect-square"} w-full bg-black`}>
        {isVideo ? (
          <video ref={ref} src={v.previewUrl} muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.previewUrl} alt={v.label} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="px-2 py-1.5 text-xs">
        <div className={`font-bold truncate ${selected ? "text-accent" : ""}`}>{v.label}</div>
        {v.durationSec ? <div className="text-[10px] text-muted">{Math.round(v.durationSec)}초</div> : null}
      </div>
      {selected && <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-accent-ink">선택</span>}
    </button>
  );
}

function OptionField({
  opt,
  value,
  onChange,
  imageBound,
}: {
  opt: PublicOption;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
  /** 이 텍스트가 이미지로 렌더링되어 영상에 그대로 표시됨 */
  imageBound?: boolean;
}) {
  if (opt.type === "select" && opt.values.some((v) => v.previewUrl)) {
    return (
      <div className="space-y-1.5">
        <span className="text-sm font-bold">{opt.label}</span>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {opt.values.map((v) =>
            v.previewUrl ? (
              <PreviewTile key={v.value} v={v} selected={value === v.value} onSelect={() => onChange(v.value)} />
            ) : (
              <button
                key={v.value}
                type="button"
                disabled={v.available === false}
                onClick={() => onChange(v.value)}
                className={`rounded-xl border text-xs px-2 py-3 ${value === v.value ? "border-accent text-accent" : "border-border text-muted"}`}
              >
                {v.label}
              </button>
            ),
          )}
        </div>
      </div>
    );
  }
  if (opt.type === "select") {
    return (
      <div className="space-y-1.5">
        <span className="text-sm font-bold">{opt.label}</span>
        <div className="flex flex-wrap gap-2">
          {opt.values.map((v) => {
            const off = v.available === false;
            return (
              <button
                key={v.value}
                type="button"
                disabled={off}
                onClick={() => onChange(v.value)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${value === v.value ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-text"} ${off ? "opacity-40 cursor-not-allowed" : ""}`}
                title={off ? "준비 중" : undefined}
              >
                {v.label}
                {v.durationSec ? <span className="ml-1 text-[10px] opacity-70">{Math.round(v.durationSec)}s</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (opt.type === "toggle") {
    return (
      <label className="flex items-center gap-3 text-sm cursor-pointer">
        <input type="checkbox" className="accent-[#c8ff3d]" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {opt.label}
      </label>
    );
  }
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold">
        {opt.label}
        {opt.required && <span className="text-accent ml-1">*</span>}
      </span>
      <input className="field" maxLength={opt.maxLen} placeholder={opt.placeholder} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      {imageBound && <span className="block text-[11px] text-muted">✍️ 입력한 글자가 이미지로 변환되어 영상에 그대로 표시됩니다. 한국어·영어 모두 가능.</span>}
    </label>
  );
}
