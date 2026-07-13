import type { Env } from "./kie";

export interface JobRecord {
  id: string;
  type: "still" | "video";
  model: string;
  state: "pending" | "completed" | "failed";
  createdAt: string;
  resultUrls?: string[];
  error?: string;
}

const INDEX_KEY = "job_index";
const MAX_INDEX = 20;

function jobKey(id: string): string {
  return `job:${id}`;
}

export async function saveJob(env: Env, job: JobRecord): Promise<void> {
  await env.JOBS_KV.put(jobKey(job.id), JSON.stringify(job));

  const raw = await env.JOBS_KV.get(INDEX_KEY);
  const index: string[] = raw ? JSON.parse(raw) : [];
  const next = [job.id, ...index.filter((id) => id !== job.id)].slice(0, MAX_INDEX);
  await env.JOBS_KV.put(INDEX_KEY, JSON.stringify(next));
}

export async function getJob(env: Env, id: string): Promise<JobRecord | null> {
  const raw = await env.JOBS_KV.get(jobKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function updateJobState(
  env: Env,
  id: string,
  patch: Partial<Pick<JobRecord, "state" | "resultUrls" | "error">>
): Promise<void> {
  const job = await getJob(env, id);
  if (!job) return;
  await env.JOBS_KV.put(jobKey(id), JSON.stringify({ ...job, ...patch }));
}

export async function listRecentJobs(env: Env): Promise<JobRecord[]> {
  const raw = await env.JOBS_KV.get(INDEX_KEY);
  const index: string[] = raw ? JSON.parse(raw) : [];
  const jobs = await Promise.all(index.map((id) => getJob(env, id)));
  return jobs.filter((j): j is JobRecord => j !== null);
}
