import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  type Env,
  type VideoModel,
  submitStill,
  submitVideo,
  pollVeo,
  pollGenericJob,
  validateDuration,
  VEO_MODEL_ID,
  SEEDANCE_MODEL_ID,
} from "./kie";
import { saveJob, getJob, updateJobState, listRecentJobs, type JobRecord } from "./jobs";

function textResult(obj: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj) }], isError };
}

export class KieMcpAgent extends McpAgent<Env> {
  server = new McpServer({ name: "kie-mcp", version: "1.0.0" });

  async init() {
    this.server.tool(
      "generate_still",
      "Submit a still-image generation job to kie.ai using Google's Nano Banana model. " +
        "Use mode='text' for pure text-to-image generation, or mode='edit' to edit/restyle an existing " +
        "image supplied via reference_image_url (e.g. swap a background, change an object, apply a style). " +
        "This only SUBMITS the job and returns immediately with a job_id — the image is not ready yet. " +
        "Call job_status with that job_id to check progress and get the final image URL.",
      {
        prompt: z.string().describe("Text description of the image to generate or the edit to apply."),
        mode: z
          .enum(["text", "edit"])
          .describe("'text' = generate a new image from the prompt alone. 'edit' = edit the image at reference_image_url using the prompt."),
        reference_image_url: z
          .string()
          .url()
          .optional()
          .describe("Publicly reachable URL of the source image to edit. Required when mode='edit', ignored for mode='text'."),
        aspect_ratio: z
          .string()
          .default("9:16")
          .describe("Output aspect ratio, e.g. '9:16', '16:9', '1:1', '4:3'. Defaults to '9:16' (vertical/mobile)."),
      },
      async ({ prompt, mode, reference_image_url, aspect_ratio }) => {
        if (mode === "edit" && !reference_image_url) {
          return textResult({ error: "reference_image_url is required when mode='edit'." }, true);
        }
        try {
          const taskId = await submitStill(this.env, {
            prompt,
            mode,
            referenceImageUrl: reference_image_url,
            aspectRatio: aspect_ratio,
          });
          const model = mode === "edit" ? "google/nano-banana-edit" : "google/nano-banana";
          const job: JobRecord = {
            id: taskId,
            type: "still",
            model,
            state: "pending",
            createdAt: new Date().toISOString(),
          };
          await saveJob(this.env, job);
          return textResult({ job_id: taskId, type: "still", model, state: "pending" });
        } catch (err) {
          return textResult({ error: (err as Error).message }, true);
        }
      }
    );

    this.server.tool(
      "generate_video",
      "Submit an image-to-video generation job to kie.ai. Choose model='seedance' (ByteDance Seedance 1.5 Pro, " +
        "duration 4-12 seconds, any integer) or model='veo-3.1' (Google Veo 3.1, duration must be exactly 4, 6, or 8 seconds). " +
        "start_image_url is animated into a video following the prompt. This only SUBMITS the job and returns a job_id " +
        "immediately — the video is not ready yet. Call job_status with that job_id to check progress and get the final video URL.",
      {
        model: z.enum(["seedance", "veo-3.1"]).describe("Which video model to use. Determines the valid duration range."),
        prompt: z.string().describe("Text description of the motion/action/camera movement for the video."),
        start_image_url: z.string().url().describe("Publicly reachable URL of the starting image to animate into video."),
        duration: z
          .number()
          .describe("Video length in seconds. seedance: any integer 4-12. veo-3.1: must be 4, 6, or 8."),
        aspect_ratio: z
          .string()
          .default("9:16")
          .describe("Output aspect ratio, e.g. '9:16', '16:9', '1:1'. Defaults to '9:16' (vertical/mobile)."),
      },
      async ({ model, prompt, start_image_url, duration, aspect_ratio }) => {
        const durationError = validateDuration(model as VideoModel, duration);
        if (durationError) {
          return textResult({ error: durationError }, true);
        }
        try {
          const taskId = await submitVideo(this.env, {
            model: model as VideoModel,
            prompt,
            startImageUrl: start_image_url,
            duration,
            aspectRatio: aspect_ratio,
          });
          const modelId = model === "veo-3.1" ? VEO_MODEL_ID : SEEDANCE_MODEL_ID;
          const job: JobRecord = {
            id: taskId,
            type: "video",
            model: modelId,
            state: "pending",
            createdAt: new Date().toISOString(),
          };
          await saveJob(this.env, job);
          return textResult({ job_id: taskId, type: "video", model: modelId, state: "pending" });
        } catch (err) {
          return textResult({ error: (err as Error).message }, true);
        }
      }
    );

    this.server.tool(
      "job_status",
      "Check the status of a previously submitted still-image or video job by its job_id. " +
        "Returns state ('pending', 'completed', or 'failed'). When completed, returns result_urls with the " +
        "final media URL(s) prominently. Safe to call repeatedly while a job is pending.",
      {
        job_id: z.string().describe("The job_id returned by generate_still or generate_video."),
      },
      async ({ job_id }) => {
        const job = await getJob(this.env, job_id);
        if (!job) {
          return textResult({ error: `No job found with id ${job_id}` }, true);
        }
        if (job.state !== "pending") {
          return textResult({ job_id, state: job.state, result_urls: job.resultUrls, error: job.error });
        }
        try {
          const result = job.model === VEO_MODEL_ID ? await pollVeo(this.env, job_id) : await pollGenericJob(this.env, job_id);
          if (result.state === "completed") {
            await updateJobState(this.env, job_id, { state: "completed", resultUrls: result.resultUrls });
            return textResult({ job_id, state: "completed", result_urls: result.resultUrls });
          }
          if (result.state === "failed") {
            await updateJobState(this.env, job_id, { state: "failed", error: result.error });
            return textResult({ job_id, state: "failed", error: result.error });
          }
          return textResult({ job_id, state: "pending" });
        } catch (err) {
          return textResult({ error: (err as Error).message }, true);
        }
      }
    );

    this.server.tool(
      "list_recent_jobs",
      "List the last 20 submitted jobs (both still-image and video) with their id, type, model, last-known " +
        "state, and creation time. State shown is the last known value from submission/last check, not a live " +
        "poll — call job_status on a specific job_id for a fresh check.",
      {},
      async () => {
        const jobs = await listRecentJobs(this.env);
        return textResult({
          jobs: jobs.map((j) => ({
            job_id: j.id,
            type: j.type,
            model: j.model,
            state: j.state,
            created_at: j.createdAt,
          })),
        });
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const token = request.headers.get("X-MCP-Token");
    if (!token || token !== env.MCP_AUTH_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return KieMcpAgent.serve("/mcp", { binding: "KIE_MCP_AGENT" }).fetch(request, env, ctx);
  },
};
