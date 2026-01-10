import mongoose from 'mongoose';
import logger from '../config/logger';

/**
 * Mongoose Slow Query Logger Plugin
 *
 * Logs queries exceeding threshold to help identify performance bottlenecks.
 * Useful for finding N+1 problems, missing indexes, and inefficient queries.
 *
 * Performance impact: < 1ms overhead per query
 *
 * Usage in database.ts:
 * mongoose.plugin(slowQueryPlugin, { threshold: 100 });
 */

interface SlowQueryOptions {
  threshold?: number; // Milliseconds (default: 100ms)
  logStackTrace?: boolean; // Include stack trace for debugging (default: false)
}

interface QueryMetadata {
  collection: string;
  operation: string;
  filter?: any;
  options?: any;
  duration: number;
}

/**
 * Plugin function that adds slow query logging to all schemas
 */
export function slowQueryPlugin(schema: mongoose.Schema, options: SlowQueryOptions = {}) {
  const threshold = options.threshold || 100; // Default 100ms
  const logStackTrace = options.logStackTrace || false;

  // Hook into query execution
  const queryOperations = [
    'count',
    'countDocuments',
    'deleteMany',
    'deleteOne',
    'estimatedDocumentCount',
    'find',
    'findOne',
    'findOneAndDelete',
    'findOneAndRemove',
    'findOneAndReplace',
    'findOneAndUpdate',
    'remove',
    'replaceOne',
    'update',
    'updateMany',
    'updateOne'
  ];

  queryOperations.forEach(operation => {
    // Pre-hook: Record start time
    schema.pre(operation as any, function (this: any) {
      this._startTime = Date.now();
    });

    // Post-hook: Check duration and log if slow
    schema.post(operation as any, function (this: any) {
      if (!this._startTime) return;

      const duration = Date.now() - this._startTime;

      if (duration >= threshold) {
        const metadata: QueryMetadata = {
          collection: this.mongooseCollection?.name || 'unknown',
          operation,
          filter: sanitizeFilter(this.getFilter()),
          options: sanitizeOptions(this.getOptions()),
          duration
        };

        logger.warn('Slow Query Detected', {
          ...metadata,
          threshold: `${threshold}ms`,
          exceedsBy: `${duration - threshold}ms`
        });

        // Optional: Log stack trace for debugging in development
        if (logStackTrace && process.env.NODE_ENV === 'development') {
          const stack = new Error().stack;
          logger.debug('Slow Query Stack Trace:', stack);
        }
      }

      // Cleanup
      delete this._startTime;
    });
  });

  // Hook into aggregation pipeline
  schema.pre('aggregate', function (this: any) {
    this._startTime = Date.now();
  });

  schema.post('aggregate', function (this: any, result: any) {
    if (!this._startTime) return;

    const duration = Date.now() - this._startTime;

    if (duration >= threshold) {
      const pipeline = this.pipeline();

      logger.warn('Slow Aggregation Detected', {
        collection: this._model?.collection?.name || 'unknown',
        operation: 'aggregate',
        pipelineStages: pipeline.length,
        pipeline: sanitizePipeline(pipeline),
        duration,
        threshold: `${threshold}ms`,
        exceedsBy: `${duration - threshold}ms`
      });

      if (logStackTrace && process.env.NODE_ENV === 'development') {
        const stack = new Error().stack;
        logger.debug('Slow Aggregation Stack Trace:', stack);
      }
    }

    delete this._startTime;
  });
}

/**
 * Sanitize filter object for logging (remove sensitive data)
 */
function sanitizeFilter(filter: any): any {
  if (!filter || typeof filter !== 'object') return filter;

  const sanitized = { ...filter };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'ssn', 'creditCard'];
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Sanitize query options for logging
 */
function sanitizeOptions(options: any): any {
  if (!options || typeof options !== 'object') return options;

  // Only log relevant options
  const { limit, skip, sort, projection, populate } = options;
  return { limit, skip, sort, projection, populate };
}

/**
 * Sanitize aggregation pipeline for logging
 */
function sanitizePipeline(pipeline: any[]): any {
  if (!Array.isArray(pipeline)) return pipeline;

  // Limit pipeline size in logs (first 3 stages only)
  const maxStages = 3;
  if (pipeline.length > maxStages) {
    return [
      ...pipeline.slice(0, maxStages),
      { _truncated: `... ${pipeline.length - maxStages} more stages` }
    ];
  }

  return pipeline;
}

/**
 * Enable slow query logging globally
 * Call this in database.ts after mongoose is initialized
 */
export function enableSlowQueryLogging(options?: SlowQueryOptions): void {
  mongoose.plugin(slowQueryPlugin, options);
  logger.info(`Slow query logging enabled (threshold: ${options?.threshold || 100}ms)`);
}

export default { slowQueryPlugin, enableSlowQueryLogging };
