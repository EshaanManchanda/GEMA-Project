import { Worker } from 'worker_threads';
import path from 'path';
import logger from '../config/logger';

/**
 * JSON Worker Pool Utility
 *
 * Manages a pool of worker threads for async JSON parsing.
 * Automatically routes small payloads to sync parsing, large to workers.
 *
 * Usage:
 * const data = await parseJSONAsync(largeJsonString);
 */

const WORKER_POOL_SIZE = 2; // Small pool, workers are reused
const PARSE_THRESHOLD_BYTES = 100 * 1024; // 100KB - use workers above this
const WORKER_TIMEOUT_MS = 5000; // 5 second timeout

interface WorkerPoolItem {
  worker: Worker;
  busy: boolean;
}

class JSONWorkerPool {
  private pool: WorkerPoolItem[] = [];
  private workerPath: string;
  private initialized = false;

  constructor() {
    // Worker file path (needs to be .js in production after compilation)
    const ext = process.env.NODE_ENV === 'production' ? '.js' : '.ts';
    this.workerPath = path.join(__dirname, '..', 'workers', `json-parser.worker${ext}`);
  }

  /**
   * Initialize worker pool lazily
   */
  private initializePool(): void {
    if (this.initialized) return;

    try {
      for (let i = 0; i < WORKER_POOL_SIZE; i++) {
        const worker = new Worker(this.workerPath);
        this.pool.push({ worker, busy: false });
      }
      this.initialized = true;
      logger.debug(`JSON worker pool initialized with ${WORKER_POOL_SIZE} workers`);
    } catch (error) {
      logger.error('Failed to initialize JSON worker pool:', error);
      this.initialized = false;
    }
  }

  /**
   * Get available worker from pool
   */
  private getAvailableWorker(): Worker | null {
    if (!this.initialized) {
      this.initializePool();
    }

    const available = this.pool.find(item => !item.busy);
    if (available) {
      available.busy = true;
      return available.worker;
    }

    return null;
  }

  /**
   * Release worker back to pool
   */
  private releaseWorker(worker: Worker): void {
    const item = this.pool.find(item => item.worker === worker);
    if (item) {
      item.busy = false;
    }
  }

  /**
   * Parse JSON asynchronously using worker thread
   */
  async parseAsync<T = any>(jsonString: string): Promise<T> {
    const worker = this.getAvailableWorker();

    // Fallback to sync if no workers available (pool exhausted)
    if (!worker) {
      logger.debug('Worker pool exhausted, falling back to sync JSON.parse');
      return JSON.parse(jsonString) as T;
    }

    return new Promise<T>((resolve, reject) => {
      let completed = false;

      const cleanup = () => {
        if (!completed) {
          completed = true;
          this.releaseWorker(worker);
        }
      };

      // Timeout handler
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`JSON parse timeout after ${WORKER_TIMEOUT_MS}ms`));
      }, WORKER_TIMEOUT_MS);

      // Message handler
      const messageHandler = (result: any) => {
        clearTimeout(timeout);
        cleanup();

        if (result.success) {
          resolve(result.data as T);
        } else {
          reject(new Error(result.error || 'JSON parse error'));
        }
      };

      // Error handler
      const errorHandler = (error: Error) => {
        clearTimeout(timeout);
        cleanup();
        reject(error);
      };

      worker.once('message', messageHandler);
      worker.once('error', errorHandler);

      // Send data to worker
      worker.postMessage(jsonString);
    });
  }

  /**
   * Terminate all workers (for graceful shutdown)
   */
  async terminate(): Promise<void> {
    const terminatePromises = this.pool.map(item => item.worker.terminate());
    await Promise.all(terminatePromises);
    this.pool = [];
    this.initialized = false;
    logger.debug('JSON worker pool terminated');
  }
}

// Singleton instance
const workerPool = new JSONWorkerPool();

/**
 * Smart JSON parser that routes to sync or async based on size
 *
 * @param jsonString - JSON string to parse
 * @returns Parsed object
 *
 * Performance:
 * - Small payloads (< 100KB): Sync parsing (faster, no overhead)
 * - Large payloads (>= 100KB): Worker thread (non-blocking)
 *
 * Example:
 * const cachedData = await parseJSONAsync(redisValue);
 */
export async function parseJSONAsync<T = any>(jsonString: string): Promise<T> {
  const sizeBytes = Buffer.byteLength(jsonString, 'utf8');

  // Small payloads: use sync parsing (faster)
  if (sizeBytes < PARSE_THRESHOLD_BYTES) {
    return JSON.parse(jsonString) as T;
  }

  // Large payloads: use worker thread (non-blocking)
  try {
    return await workerPool.parseAsync<T>(jsonString);
  } catch (error) {
    // Fallback to sync on worker error
    logger.warn('Worker parse failed, falling back to sync:', error);
    return JSON.parse(jsonString) as T;
  }
}

/**
 * Gracefully terminate worker pool (call on server shutdown)
 */
export async function terminateWorkerPool(): Promise<void> {
  await workerPool.terminate();
}

export default { parseJSONAsync, terminateWorkerPool };
