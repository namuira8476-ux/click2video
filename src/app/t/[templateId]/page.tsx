import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateForm } from "@/components/generate/GenerateForm";
import { getTemplate, toPublicTemplate } from "@/lib/templates/loader";
import { CATEGORY_LABEL } from "@/lib/templates/schema";

export const dynamic = "force-dynamic";

export default async function TemplatePage(props: PageProps<"/t/[templateId]">) {
  const { templateId } = await props.params;
  const base = getTemplate(templateId);
  if (!base) notFound();
  const t = toPublicTemplate(base);
  const samples = t.slots.filter((s) => s.source === "user" && t.sampleInputs[s.key]).map((s) => ({ key: s.key, kind: s.kind, label: s.label, src: t.sampleInputs[s.key] }));

  return (
    <div className="py-6">
      <nav className="text-xs text-muted mb-4">
        <Link href="/" className="hover:text-text">
          템플릿
        </Link>
        <span className="mx-2">/</span>
        <span>{CATEGORY_LABEL[t.category]}</span>
        <span className="mx-2">/</span>
        <span className="text-text">{t.name}</span>
      </nav>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-8 items-start">
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {t.badges.map((b) => (
                <span key={b} className="text-xs px-2 py-0.5 rounded-md bg-card border border-border">
                  {b}
                </span>
              ))}
              <span className="text-xs text-muted">{CATEGORY_LABEL[t.category]}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl">{t.name}</h1>
            <p className="text-muted mt-2">{t.tagline}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-card border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 text-xs font-bold text-muted border-b border-border">BEFORE · 입력 샘플</div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {samples.length > 0 ? (
                  samples.map((s) => (
                    <figure key={s.key} className={`space-y-1 ${s.kind === "audio" ? "col-span-2" : ""}`}>
                      {s.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.src} alt={s.label} className="w-full aspect-square object-cover rounded-lg bg-black" />
                      ) : s.kind === "video" ? (
                        <video src={s.src} muted loop playsInline controls preload="metadata" className="w-full aspect-square object-cover rounded-lg bg-black" />
                      ) : (
                        <audio src={s.src} controls preload="metadata" className="w-full" />
                      )}
                      <figcaption className="text-[11px] text-muted">
                        {s.kind === "video" ? "🎬 " : s.kind === "audio" ? "🎤 " : ""}
                        {s.label}
                      </figcaption>
                    </figure>
                  ))
                ) : (
                  <div className="col-span-2 text-sm text-muted py-6 text-center">✍️ 문구만 입력하면 됩니다 (샘플 자산 없음)</div>
                )}
              </div>
            </div>
            <div className="rounded-card border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 text-xs font-bold text-muted border-b border-border">AFTER · 결과 예시</div>
              <div className="p-3">
                {t.preview ? (
                  <video src={t.preview} poster={t.thumbnail ?? undefined} controls muted loop playsInline className="w-full rounded-lg bg-black" />
                ) : (
                  <div className="relative aspect-[9/16] max-h-80 mx-auto rounded-lg overflow-hidden bg-black">
                    {t.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-center px-4">
                      결과 예시 준비 중
                      <br />
                      <span className="text-[11px] text-muted">FAL_KEY 설정 후 npm run previews</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-4 text-sm space-y-2">
            <div className="font-bold">이 템플릿이 하는 일</div>
            <ul className="text-muted space-y-1">
              {t.slots.map((s) => (
                <li key={s.key}>
                  • {s.label}
                  {s.source === "textImage" ? (
                    <span className="ml-1 text-[11px]">(입력한 문구를 이미지로 변환해 그대로 표시)</span>
                  ) : s.source !== "user" ? (
                    <span className="ml-1 text-[11px]">(운영자 고정 자산)</span>
                  ) : null}
                  {s.hint && <span className="ml-1 text-[11px]">— {s.hint}</span>}
                </li>
              ))}
              <li>
                • 기본 {t.defaults.resolution} · {t.defaults.duration === "clip" ? "입력 영상 길이" : `${t.defaults.duration}초`} · 화면비 {t.defaults.ratio}
              </li>
            </ul>
          </div>
        </section>

        <aside className="lg:sticky lg:top-20">
          <GenerateForm template={t} />
        </aside>
      </div>
    </div>
  );
}
