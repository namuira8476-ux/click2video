import Link from "next/link";
import { Suspense } from "react";
import { TemplateGrid } from "@/components/TemplateGrid";
import { TemplateCard } from "@/components/TemplateCard";
import { loadTemplates, toPublicTemplate } from "@/lib/templates/loader";

export const dynamic = "force-dynamic";

export default function Home() {
  const templates = loadTemplates().map(toPublicTemplate);
  const featured = templates.filter((t) => t.ready).slice(0, 3);
  return (
    <div className="py-8 space-y-10">
      <section className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
        <div>
          <p className="text-accent text-xs font-bold tracking-[3px] mb-3">MINIMAX H3-MAX · ONE-CLICK TEMPLATES</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            클릭 한 번으로,
            <br />
            프리미엄 영상
          </h1>
          <p className="text-muted mt-4 text-base sm:text-lg max-w-md">
            사진이나 영상 하나면 충분합니다. 프롬프트는 저희가 준비했으니 템플릿을 고르고 만들기만 누르세요.
          </p>
          <div className="mt-6 flex gap-3 text-xs text-muted">
            <span className="px-3 py-1.5 rounded-full border border-border">{templates.length}개 템플릿</span>
            <span className="px-3 py-1.5 rounded-full border border-border">5~15초 · 768P</span>
            <span className="px-3 py-1.5 rounded-full border border-border">스테레오 오디오 포함</span>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {featured.map((t) => (
            <div key={t.id} className="w-40 sm:w-48 shrink-0">
              <TemplateCard t={t} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-[#141416] to-[#0f1a08] p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end gap-6">
          <div className="lg:w-1/3">
            <p className="text-accent text-xs font-bold tracking-[3px] mb-2">FOR SMALL BUSINESS</p>
            <h2 className="text-2xl sm:text-3xl">소상공인 광고 만들기</h2>
            <p className="text-muted text-sm mt-2">
              가게 사진과 한국어 문구만 넣으면 됩니다. 가게 이름, 메뉴명, 이벤트 문구가 영상 안에 그대로 표시되고, 사장님이 직접 말하는 인사 영상도 만들 수 있습니다.
            </p>
            <Link href="/?category=smallbiz" className="inline-block mt-4 btn-ghost text-sm px-4 py-2">
              소상공인 템플릿 전체 보기
            </Link>
          </div>
          <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {templates
              .filter((t) => t.category === "smallbiz")
              .slice(0, 4)
              .map((t) => (
                <TemplateCard key={t.id} t={t} />
              ))}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <TemplateGrid templates={templates} />
      </Suspense>
    </div>
  );
}
