import { cookies } from "next/headers";
import { JobList } from "@/components/jobs/JobList";
import { UID_COOKIE, verifyCookieValue } from "@/lib/identity";
import { serializeJob } from "@/lib/jobs/serialize";
import { listJobs } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  // 서버 렌더도 소유자 범위여야 한다 — API 만 막으면 이 HTML 에 남의 작업이 그대로 박힌다.
  const uid = await verifyCookieValue((await cookies()).get(UID_COOKIE)?.value);
  const jobs = uid ? await Promise.all((await listJobs(uid)).map((j) => serializeJob(j, { withPoster: true }))) : [];
  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-3xl">내 작업</h1>
        <p className="text-muted text-sm mt-1">생성 중인 작업은 자동으로 갱신됩니다.</p>
      </div>
      <JobList initial={jobs} />
    </div>
  );
}
