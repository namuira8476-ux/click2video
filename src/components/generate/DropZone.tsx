"use client";

import { useRef, useState } from "react";
import type { Slot } from "@/lib/templates/schema";
import { postForm } from "@/lib/client/fetcher";

export type SlotValue = {
  value: string; // assetId | sample:<path>
  previewUrl: string;
  name: string;
  kind: Slot["kind"];
};

type UploadResponse = {
  asset: { id: string; kind: Slot["kind"]; url: string; bytes: number; width?: number; height?: number; durationSec?: number; name: string };
};

const ACCEPT: Record<Slot["kind"], string> = {
  image: "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif",
  video: "video/mp4,video/quicktime,.mp4,.mov",
  audio: "audio/wav,audio/mpeg,audio/mp3,.wav,.mp3",
};
const LIMIT: Record<Slot["kind"], string> = {
  image: "JPG · PNG · WEBP · 30MB 이하 · 256~5760px",
  video: "MP4 · MOV · 50MB 이하 · 2~15초",
  audio: "WAV · MP3 · 15MB 이하 · 2~15초",
};

async function probe(file: File, kind: Slot["kind"]): Promise<{ durationSec?: number; width?: number; height?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (kind === "image") return {};
    return await new Promise((resolve) => {
      const el = document.createElement(kind === "video" ? "video" : "audio") as HTMLVideoElement;
      el.preload = "metadata";
      el.onloadedmetadata = () =>
        resolve({ durationSec: Number.isFinite(el.duration) ? el.duration : undefined, width: el.videoWidth || undefined, height: el.videoHeight || undefined });
      el.onerror = () => resolve({});
      el.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export function DropZone({
  slot,
  value,
  onChange,
  disabled,
}: {
  slot: Slot;
  value: SlotValue | undefined;
  onChange: (v: SlotValue | undefined) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const meta = await probe(file, slot.kind);
      const form = new FormData();
      form.append("file", file);
      if (meta.durationSec) form.append("durationSec", String(meta.durationSec));
      if (meta.width) form.append("width", String(meta.width));
      if (meta.height) form.append("height", String(meta.height));
      const res = await postForm<UploadResponse>("/api/uploads", form);
      onChange({ value: res.asset.id, previewUrl: res.asset.url, name: res.asset.name, kind: res.asset.kind });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-bold">
          {slot.label}
          {slot.required && <span className="text-accent ml-1">*</span>}
        </label>
        <span className="text-[11px] text-muted">{LIMIT[slot.kind]}</span>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !disabled) void handleFile(f);
        }}
        className={`relative rounded-card border border-dashed transition overflow-hidden ${drag ? "border-accent bg-accent/5" : "border-border bg-card hover:border-muted"} ${disabled ? "opacity-50" : "cursor-pointer"}`}
      >
        {value ? (
          <div className="flex items-center gap-3 p-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-black shrink-0 flex items-center justify-center">
              {value.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : value.kind === "video" ? (
                <video src={value.previewUrl} muted className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🎤</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{value.name}</div>
              <div className="text-[11px] text-muted">{value.value.startsWith("sample:") ? "샘플 자산" : "업로드 완료"}</div>
            </div>
            <button
              type="button"
              className="text-xs text-muted hover:text-danger px-2 py-1"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
            >
              삭제
            </button>
          </div>
        ) : (
          <div className="p-5 text-center">
            <div className="text-2xl mb-1">{slot.kind === "image" ? "📷" : slot.kind === "video" ? "🎬" : "🎤"}</div>
            <div className="text-sm">{busy ? "업로드 중…" : "파일을 끌어다 놓거나 클릭해서 선택"}</div>
            {slot.hint && <div className="text-[11px] text-muted mt-1">{slot.hint}</div>}
          </div>
        )}
        {busy && (
          <div className="absolute inset-x-0 bottom-0 progress indeterminate">
            <div />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[slot.kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
