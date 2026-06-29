import { Response } from "express";
import mongoose from "mongoose";

/**
 * Export Stream Utility
 * Handles large dataset exports using cursor-based streaming
 * Avoids memory issues by processing records one at a time
 */

export interface StreamExportOptions {
  model: any; // Mongoose model
  query: any; // MongoDB query filter
  populate?: string | string[] | any; // Mongoose populate options
  select?: string; // Fields to select
  sort?: any; // Sort options
  limit?: number; // Max records to export
  sanitize?: (doc: any) => any; // Sanitization function
  batchSize?: number; // Cursor batch size (default: 100)
}

/**
 * Stream export to JSON
 * Writes data as JSON array with proper formatting
 */
export async function streamJSONExport(
  res: Response,
  options: StreamExportOptions,
): Promise<void> {
  const {
    model,
    query,
    populate,
    select,
    sort,
    limit,
    sanitize,
    batchSize = 100,
  } = options;

  // Build query
  let cursor = model.find(query);

  if (select) {
    cursor = cursor.select(select);
  }

  if (populate) {
    cursor = cursor.populate(populate);
  }

  if (sort) {
    cursor = cursor.sort(sort);
  }

  if (limit) {
    cursor = cursor.limit(limit);
  }

  // Use cursor for streaming
  cursor = cursor.batchSize(batchSize).cursor();

  // Set headers for JSON streaming
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  // Start JSON array
  res.write('{"data":[');

  let isFirst = true;
  let count = 0;

  try {
    for await (const doc of cursor) {
      // Write comma separator (except for first item)
      if (!isFirst) {
        res.write(",");
      } else {
        isFirst = false;
      }

      // Sanitize and convert to plain object
      let record = doc.toObject ? doc.toObject() : doc;

      if (sanitize) {
        record = sanitize(record);
      }

      // Write record as JSON
      res.write(JSON.stringify(record));
      count++;

      // Optional: flush every N records to prevent buffering
      if (count % batchSize === 0) {
        // Allow event loop to process
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    // Close JSON array and add metadata
    res.write("],");
    res.write(
      `"metadata":{"count":${count},"exportedAt":"${new Date().toISOString()}"}`,
    );
    res.write("}");
    res.end();
  } catch (error: any) {
    // Handle streaming errors
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Export failed",
        error: error.message,
      });
    } else {
      // Headers already sent - close malformed JSON
      res.write("]}");
      res.end();
    }
  }
}

/**
 * Stream export to CSV
 * Writes data as CSV with headers
 */
export async function streamCSVExport(
  res: Response,
  options: StreamExportOptions,
  fields: { key: string; label: string }[],
): Promise<void> {
  const {
    model,
    query,
    populate,
    select,
    sort,
    limit,
    sanitize,
    batchSize = 100,
  } = options;

  // Build query
  let cursor = model.find(query);

  if (select) {
    cursor = cursor.select(select);
  }

  if (populate) {
    cursor = cursor.populate(populate);
  }

  if (sort) {
    cursor = cursor.sort(sort);
  }

  if (limit) {
    cursor = cursor.limit(limit);
  }

  // Use cursor for streaming
  cursor = cursor.batchSize(batchSize).cursor();

  // Set headers for CSV streaming
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Content-Disposition", 'attachment; filename="export.csv"');

  // Write CSV header row
  const headerRow = fields.map((f) => escapeCsvValue(f.label)).join(",");
  res.write(headerRow + "\n");

  let count = 0;

  try {
    for await (const doc of cursor) {
      // Sanitize and convert to plain object
      let record = doc.toObject ? doc.toObject() : doc;

      if (sanitize) {
        record = sanitize(record);
      }

      // Extract field values in order
      const values = fields.map((f) => {
        const value = getNestedValue(record, f.key);
        return escapeCsvValue(value);
      });

      // Write CSV row
      res.write(values.join(",") + "\n");
      count++;

      // Flush periodically
      if (count % batchSize === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Export failed",
        error: error.message,
      });
    } else {
      res.end();
    }
  }
}

/**
 * Stream export with progress tracking
 * Useful for large exports with client-side progress bars
 */
export async function streamJSONExportWithProgress(
  res: Response,
  options: StreamExportOptions,
  totalCount?: number,
): Promise<void> {
  const {
    model,
    query,
    populate,
    select,
    sort,
    limit,
    sanitize,
    batchSize = 100,
  } = options;

  // Get total count if not provided
  if (totalCount === undefined) {
    totalCount = await model.countDocuments(query);
  }

  // Build query
  let cursor = model.find(query);

  if (select) {
    cursor = cursor.select(select);
  }

  if (populate) {
    cursor = cursor.populate(populate);
  }

  if (sort) {
    cursor = cursor.sort(sort);
  }

  if (limit) {
    cursor = cursor.limit(limit);
    totalCount = Math.min(totalCount, limit);
  }

  cursor = cursor.batchSize(batchSize).cursor();

  // Set headers for Server-Sent Events (SSE) streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let count = 0;

  try {
    // Send initial progress event
    res.write(
      `event: progress\ndata: ${JSON.stringify({ current: 0, total: totalCount, percentage: 0 })}\n\n`,
    );

    for await (const doc of cursor) {
      // Sanitize and convert to plain object
      let record = doc.toObject ? doc.toObject() : doc;

      if (sanitize) {
        record = sanitize(record);
      }

      // Send data event
      res.write(`event: data\ndata: ${JSON.stringify(record)}\n\n`);
      count++;

      // Send progress event every N records
      if (count % batchSize === 0 || count === totalCount) {
        const percentage = Math.round((count / totalCount) * 100);
        res.write(
          `event: progress\ndata: ${JSON.stringify({ current: count, total: totalCount, percentage })}\n\n`,
        );
      }

      // Flush periodically
      if (count % batchSize === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    // Send completion event
    res.write(
      `event: complete\ndata: ${JSON.stringify({ count, exportedAt: new Date().toISOString() })}\n\n`,
    );
    res.end();
  } catch (error: any) {
    // Send error event
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`,
    );
    res.end();
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * Neutralise CSV formula injection.
 * Cells starting with = + - @ TAB or CR are prefixed with a leading single
 * quote so Excel / LibreOffice Calc do not evaluate them as formulae.
 */
function sanitizeFormulaInjection(str: string): string {
  if (str.length > 0 && /^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escape CSV value (handle quotes, commas, newlines, and formula injection)
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Convert to string
  let str: string;

  // Handle dates
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    // Handle objects/arrays
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // Neutralise formula injection before quote-wrapping
  str = sanitizeFormulaInjection(str);

  // Escape quotes and wrap in quotes if needed
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({ user: { email: 'test@test.com' } }, 'user.email') => 'test@test.com'
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }

    // Handle array indexing: items[0].name
    if (key.includes("[")) {
      const match = key.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        const [, arrayKey, index] = match;
        value = value[arrayKey];
        if (Array.isArray(value)) {
          value = value[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        value = value[key];
      }
    } else {
      value = value[key];
    }
  }

  return value;
}

/**
 * Sanitize export record
 * Remove sensitive fields for common models
 */
export function sanitizeExportRecord(modelName: string, record: any): any {
  const sanitized = { ...record };

  switch (modelName) {
    case "User":
      // Remove sensitive user data
      delete sanitized.passwordHash;
      delete sanitized.password;
      delete sanitized.twoFactorAuth;
      delete sanitized.loginAttempts;
      delete sanitized.resetPasswordToken;
      delete sanitized.resetPasswordExpire;
      break;

    case "Payment":
      // Mask payment secrets
      if (sanitized.paymentIntentId) {
        sanitized.paymentIntentId = `***${sanitized.paymentIntentId.slice(-8)}`;
      }
      delete sanitized.clientSecret;
      delete sanitized.cvv;
      break;

    case "Payout":
      // Mask bank account
      if (sanitized.bankAccount) {
        sanitized.bankAccount = {
          ...sanitized.bankAccount,
          accountNumber: `****${sanitized.bankAccount.accountNumber?.slice(-4) || ""}`,
        };
      }
      break;

    // Add more models as needed
  }

  return sanitized;
}
