"use client";

import { useSearchParams } from "next/navigation";
import type { PublicTemplate } from "@/lib/templates/loader";
import { TemplateCard } from "./TemplateCard";

const CATS: { key: string; label: string }[] = [
  { key: "", label: "전체" },
  { key: "effects", label: "이펙트" },
  { key: "commerce", label: "광고·커머스" },
  { key: "edit", label: "편집" },
  { key: "smallbiz", label: "소상공인 광고" },
];

export function TemplateGrid({ templates }: { templates: PublicTemplate[] }) {
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  const list = category ? templates.filter((t) => t.category === category) : templates;
  return (
    <section>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {CATS.map((c) => (
          <a
            key={c.key}
            href={c.key ? `/?category=${c.key}` : "/"}
            className={`text-sm px-3 py-1.5 rounded-full border whitespace-nowrap transition ${category === c.key ? "border-accent text-accent bg-accent/10" : "border-border text-muted hover:text-text"}`}
          >
            {c.label}
          </a>
        ))}
        <span className="ml-auto text-xs text-muted">{list.length}개 템플릿</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((t) => (
          <TemplateCard key={t.id} t={t} />
        ))}
      </div>
    </section>
  );
}
