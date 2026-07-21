import { Worker, Job } from "bullmq";
import {
  QUEUE_NAMES,
  bullMQConnection,
  areQueuesEnabled,
} from "../config/queue";
import { WORKER_TUNING } from "../config/workerTuning";
import logger from "../config/logger";
import {
  runCommunicationJob,
  CommunicationJobData,
} from "../services/communication/deliver.service";

export type { CommunicationJobData };

const communicationWorker = areQueuesEnabled
  ? new Worker<CommunicationJobData>(
      QUEUE_NAMES.NOTIFICATIONS,
      async (job: Job<CommunicationJobData>) => {
        logger.info(`Processing communication job ${job.id}`, {
          jobType: job.data.jobType,
          logId: job.data.logId,
        });
        // allowThrowOnRetryable defaults to true — retryable failures throw
        // here so BullMQ's exponential backoff (3 attempts) picks them up.
        return runCommunicationJob(job.data);
      },
      {
        connection: bullMQConnection,
        concurrency: WORKER_TUNING.COMMUNICATION.CONCURRENCY,
      },
    )
  : null;

if (communicationWorker) {
  communicationWorker.on("completed", (job: Job, result: any) => {
    logger.info(`Communication job ${job.id} completed`, {
      jobType: job.data.jobType,
      success: result?.success,
    });
  });

  communicationWorker.on("failed", (job: Job | undefined, error: Error) => {
    logger.error(`Communication job ${job?.id} failed:`, {
      jobType: job?.data?.jobType,
      logId: job?.data?.logId,
      error: error.message,
    });
  });
}

// Shutdown is owned by workers/index.ts, which closes every worker once.

export default communicationWorker;
