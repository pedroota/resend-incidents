import { type JobsOptions, Queue, type RepeatOptions, Worker } from "bullmq"
import type { JsonValue } from "@api/common/json/types"
import { logger } from "@api/common/logger/client"
import { createQueueConnection } from "./connection"

export type JobProcessor = (payload: JsonValue) => Promise<void>

export interface QueuedJob {
  name: string
  data: JsonValue
  opts?: JobsOptions
}

export interface JobQueueOptions {
  defaultJobOptions?: JobsOptions
  concurrency?: number
}

// 5 attempts with exponential backoff; failed jobs kept for inspection.
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 10_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: false
}

const DEFAULT_CONCURRENCY = 10

export interface JobQueue {
  readonly name: string
  registerProcessors(jobProcessors: Record<string, JobProcessor>): void
  // A stable `jobId` in opts dedupes while the job still exists.
  enqueue(jobName: string, data: JsonValue, opts?: JobsOptions): Promise<void>
  // One round trip for fan-outs; same `jobId` dedupe as `enqueue`.
  enqueueBulk(jobs: QueuedJob[]): Promise<void>
  upsertScheduler(
    schedulerId: string,
    repeat: RepeatOptions,
    jobName: string
  ): Promise<void>
  startWorker(): void
  close(): Promise<void>
}

export function createJobQueue(
  name: string,
  options: JobQueueOptions = {}
): JobQueue {
  const queue = new Queue(name, {
    connection: createQueueConnection(`queue:${name}`),
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...options.defaultJobOptions }
  })

  const processors = new Map<string, JobProcessor>()
  let worker: Worker | undefined

  return {
    name,

    registerProcessors(jobProcessors) {
      for (const [jobName, jobProcessor] of Object.entries(jobProcessors)) {
        processors.set(jobName, jobProcessor)
      }
    },

    async enqueue(jobName, data, opts) {
      await queue.add(jobName, data, opts)
    },

    async enqueueBulk(jobs) {
      if (jobs.length === 0) {
        return
      }

      await queue.addBulk(jobs)
    },

    async upsertScheduler(schedulerId, repeat, jobName) {
      await queue.upsertJobScheduler(schedulerId, repeat, { name: jobName })
    },

    startWorker() {
      if (worker) {
        return
      }

      worker = new Worker(
        name,
        async (job) => {
          const processor = processors.get(job.name)

          if (!processor) {
            throw new Error(
              `No processor registered for job "${job.name}" on queue "${name}"`
            )
          }

          await processor(job.data)
        },
        {
          connection: createQueueConnection(`worker:${name}`),
          concurrency: options.concurrency ?? DEFAULT_CONCURRENCY
        }
      )

      worker.on("failed", (job, error) => {
        logger.warn("Queue job failed", {
          queue: name,
          id: job?.id,
          jobName: job?.name,
          attemptsMade: job?.attemptsMade,
          error
        })
      })

      worker.on("error", (error) => {
        logger.error("Queue worker error", { queue: name, error })
      })
    },

    async close() {
      await worker?.close()
      worker = undefined
      await queue.close()
    }
  }
}
