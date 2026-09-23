import { handleError, json } from "@/lib/api";
import { loadTemplates, toPublicTemplate } from "@/lib/templates/loader";

export async function GET() {
  try {
    return json({ templates: loadTemplates().map(toPublicTemplate) });
  } catch (e) {
    return handleError(e);
  }
}
