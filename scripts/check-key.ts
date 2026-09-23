import "./load-env";
import { fal } from "@fal-ai/client";

async function main() {
  const key = process.env.FAL_KEY ?? "";
  console.log("FAL_KEY loaded:", key ? `${key.slice(0, 6)}**** (${key.length} chars)` : "(empty)");
  if (!key) process.exit(1);
  const f = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "ping.png", { type: "image/png" });
  try {
    const url = await fal.storage.upload(f);
    console.log("upload ok:", url.replace(/\/[^/]+$/, "/…"));
  } catch (e) {
    const err = e as { status?: number; message: string };
    console.log("upload FAILED:", err.status ?? "", err.message);
    process.exit(1);
  }
}
main();
