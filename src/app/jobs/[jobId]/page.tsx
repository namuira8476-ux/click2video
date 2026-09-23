import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { JobView } from "@/components/jobs/JobView";
import { UID_COOKIE, verifyCookieValue } from "@/lib/identity";
import { serializeJob } from "@/lib/jobs/serialize";
import { getJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export default async function JobPage(props: PageProps<"/jobs/[jobId]">) {
  const { jobId } = await props.params;
  const uid = await verifyCookieValue((await cookies()).get(UID_COOKIE)?.value);
  const job = uid ? await getJob(jobId, uid) : undefined;
  if (!job) notFound();
  return <JobView id={jobId} initial={await serializeJob(job, { withPoster: true })} />;
}
