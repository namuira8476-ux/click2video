import { errorJson, handleError, json } from "@/lib/api";
import { getTemplate, toPublicTemplate } from "@/lib/templates/loader";

export async function GET(_req: Request, ctx: RouteContext<"/api/templates/[id]">) {
  try {
    const { id } = await ctx.params;
    const t = getTemplate(id);
    if (!t) return errorJson(404, "템플릿을 찾을 수 없습니다.");
    return json({ template: toPublicTemplate(t) });
  } catch (e) {
    return handleError(e);
  }
}
