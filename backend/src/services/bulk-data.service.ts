import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/error";
import { cacheService } from "./cache.service";
import { RelationshipResolver } from "../utils/relationship-resolver";
import {
  ModelName,
  ImportOptions,
  ValidationReport,
  ValidationSummary,
  ValidationError,
  ValidationWarning,
  ImportResult,
  ImportSummary,
  ImportError,
  ExportOptions,
  ExportResult,
  ExportMetadata,
  ValidationContext,
  ResolvedRecord,
  DependencyGraph,
  BulkOperationAudit,
} from "../types/bulk-import.types";

// Import models
import User from "../models/User";
import Category from "../models/Category";
import Event from "../models/Event";
import { Blog } from "../models/Blog";
import Collection from "../models/Collection";
import Coupon from "../models/Coupon";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Payout from "../models/Payout";
import CommissionTransaction from "../models/CommissionTransaction";
import logger from "../config/logger";

/**
 * Bulk Data Service
 * Handles import/export for all supported models
 */
class BulkDataService {
  private relationshipResolver: RelationshipResolver;
  private readonly VALIDATION_TTL = 3600; // 1 hour in seconds

  constructor() {
    this.relationshipResolver = new RelationshipResolver();
  }

  /**
   * Get model class by name
   */
  private getModel(modelName: ModelName): any {
    const models: Record<ModelName, any> = {
      Category,
      User,
      Event,
      Blog,
      Collection,
      Coupon,
      Order,
      Payment,
      Payout,
      CommissionTransaction,
    };

    return models[modelName];
  }

  /**
   * Get dependency order for imports
   * Models with no dependencies first, then models that depend on them
   */
  private getDependencyOrder(): ModelName[] {
    return [
      "Category", // No dependencies
      "User", // No dependencies
      "Event", // Depends on: Category, User (vendor)
      "Blog", // Depends on: BlogCategory (separate model)
      "Collection", // Depends on: Event
      "Coupon", // Depends on: Event, Category, User
      "Order", // Depends on: User, Event
      "Payment", // Depends on: Order
      "Payout", // Depends on: User (vendor)
      "CommissionTransaction", // Depends on: Order, User
    ];
  }

  /**
   * Step 1: Validate import data without DB changes
   */
  async validateImport(
    data: any[],
    options: ImportOptions,
    userId: string,
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    const validationId = `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const resolvedData: ResolvedRecord[] = [];

    // Clear resolver cache
    this.relationshipResolver.clearCache();

    // Validate each record
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const row = i + 1;

      try {
        // Resolve relationships
        const resolved = await this.resolveRelationshipsForModel(
          options.model,
          record,
          row,
          errors,
        );

        // Business validation
        const businessErrors = await this.validateBusinessRules(
          options.model,
          resolved || record,
          row,
        );

        errors.push(...businessErrors);

        // Uniqueness check for upsert
        if (options.mode === "upsert") {
          const uniqueWarning = await this.checkUniqueConstraints(
            options.model,
            resolved || record,
            options.matchBy,
            row,
          );
          if (uniqueWarning) warnings.push(uniqueWarning);
        }

        resolvedData.push({
          original: record,
          resolved: resolved || record,
          index: row,
        });
      } catch (error: any) {
        errors.push({
          row,
          message: error.message || "Unknown validation error",
          severity: "error",
        });
      }
    }

    // Calculate summary
    const summary: ValidationSummary = {
      totalRecords: data.length,
      validRecords:
        data.length - errors.filter((e) => e.severity === "error").length,
      invalidRecords: errors.filter((e) => e.severity === "error").length,
      warnings: warnings.length,
    };

    const expiresAt = new Date(Date.now() + this.VALIDATION_TTL * 1000);

    const report: ValidationReport = {
      valid: summary.invalidRecords === 0,
      validationId,
      summary,
      errors,
      warnings,
      expiresAt,
    };

    // Store validation context in Redis
    const context: ValidationContext = {
      validationId,
      userId,
      options,
      data,
      resolvedData,
      report,
      createdAt: new Date(),
      expiresAt,
    };

    await cacheService.set(
      `bulk-import:validation:${validationId}`,
      JSON.stringify(context),
      { ttl: this.VALIDATION_TTL },
    );

    logger.info(
      `✓ Validation complete: ${validationId} (${Date.now() - startTime}ms)`,
    );

    return report;
  }

  /**
   * Step 2: Execute import with transaction
   */
  async executeImport(
    validationId: string,
    userId: string,
  ): Promise<ImportResult> {
    const startTime = Date.now();

    // Retrieve validation context from Redis
    const contextData = await cacheService.get(
      `bulk-import:validation:${validationId}`,
    );

    if (!contextData) {
      throw new AppError("Validation context not found or expired", 400);
    }

    const context: ValidationContext = JSON.parse(contextData as string);

    // Verify user matches
    if (context.userId !== userId) {
      throw new AppError("Unauthorized: User mismatch", 403);
    }

    // Check if validation passed
    if (!context.report.valid && !context.options.allowPartialSuccess) {
      throw new AppError("Cannot execute import: Validation failed", 400);
    }

    const Model = this.getModel(context.options.model);
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Process each validated record
      for (const resolvedRecord of context.resolvedData) {
        const { resolved, index } = resolvedRecord;

        try {
          // Check if record has validation errors
          const hasErrors = context.report.errors.some(
            (e) => e.row === index && e.severity === "error",
          );

          if (hasErrors) {
            skipped++;
            errors.push({
              row: index,
              action: "skip",
              message: "Record has validation errors",
            });
            continue;
          }

          // Upsert logic
          const result = await this.upsertRecord(
            Model,
            resolved,
            context.options,
            session,
          );

          if (result.action === "create") created++;
          else if (result.action === "update") updated++;
        } catch (error: any) {
          if (!context.options.allowPartialSuccess) {
            throw error; // Abort transaction
          }

          // Log error and continue
          errors.push({
            row: index,
            action: "skip",
            message: error.message || "Unknown error",
            data: resolved,
          });
          skipped++;
        }
      }

      await session.commitTransaction();

      // Create audit log
      await this.createAuditLog({
        action: "bulk_import",
        model: context.options.model,
        userId,
        timestamp: new Date(),
        recordCount: context.data.length,
        options: context.options,
        duration: `${(Date.now() - startTime) / 1000}s`,
        success: true,
      });

      // Delete validation context
      await cacheService.delete(`bulk-import:validation:${validationId}`);

      return {
        success: true,
        summary: {
          totalProcessed: context.data.length,
          created,
          updated,
          failed: errors.length,
          skipped,
        },
        errors,
        duration: `${(Date.now() - startTime) / 1000}s`,
      };
    } catch (error: any) {
      await session.abortTransaction();

      // Create audit log for failure
      await this.createAuditLog({
        action: "bulk_import",
        model: context.options.model,
        userId,
        timestamp: new Date(),
        recordCount: context.data.length,
        options: context.options,
        duration: `${(Date.now() - startTime) / 1000}s`,
        success: false,
        errorMessage: error.message,
      });

      throw new AppError(`Import failed: ${error.message}`, 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Export data with streaming support
   */
  async exportData(
    options: ExportOptions,
    userId: string,
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const Model = this.getModel(options.model);

    // Build query from filters
    const query = this.buildExportQuery(options);

    // Apply limit
    const limit = options.filters?.limit || 5000;

    // Fetch data
    const data = await Model.find(query).limit(limit).lean();

    // Sanitize sensitive fields
    const sanitized = data.map((doc) =>
      this.sanitizeDocument(options.model, doc),
    );

    // Populate relationships if requested
    let relationships: Record<string, any[]> | undefined;
    if (options.includeRelationships) {
      relationships = await this.fetchRelationships(options.model, data);
    }

    const metadata: ExportMetadata = {
      exportedAt: new Date(),
      exportedBy: userId,
      model: options.model,
      totalRecords: sanitized.length,
      filters: options.filters,
      fields: options.fields,
    };

    // Create audit log
    await this.createAuditLog({
      action: "bulk_export",
      model: options.model,
      userId,
      timestamp: new Date(),
      recordCount: sanitized.length,
      filters: options.filters,
      duration: `${(Date.now() - startTime) / 1000}s`,
      success: true,
    });

    return {
      success: true,
      metadata,
      data: sanitized,
      relationships,
    };
  }

  /**
   * Resolve relationships for a specific model
   */
  private async resolveRelationshipsForModel(
    modelName: ModelName,
    record: any,
    row: number,
    errors: ValidationError[],
  ): Promise<any | null> {
    const resolved = { ...record };

    switch (modelName) {
      case "Event":
        // Resolve vendor
        if (record.vendorEmail || record.vendorId) {
          const vendorResult =
            await this.relationshipResolver.resolveVendor(record);
          if (vendorResult.error) {
            errors.push({
              row,
              field: "vendorId",
              message: vendorResult.error,
              severity: "error",
            });
            return null;
          }
          resolved.vendorId = vendorResult.resolvedId;
          delete resolved.vendorEmail;
        }

        // Resolve category
        if (record.categorySlug || record.categoryId) {
          const categoryResult =
            await this.relationshipResolver.resolveCategory(record);
          if (categoryResult.error) {
            errors.push({
              row,
              field: "category",
              message: categoryResult.error,
              severity: "error",
            });
            return null;
          }
          resolved.category = categoryResult.resolvedId;
          delete resolved.categorySlug;
          delete resolved.categoryId;
        }
        break;

      case "Category":
        // Resolve parent category
        if (record.parentSlug || record.parentId) {
          const parentResult =
            await this.relationshipResolver.resolveParentCategory(record);
          if (parentResult.error) {
            errors.push({
              row,
              field: "parentId",
              message: parentResult.error,
              severity: "error",
            });
            return null;
          }
          if (parentResult.resolvedId) {
            resolved.parentId = parentResult.resolvedId;
          }
          delete resolved.parentSlug;
        }
        break;

      case "User":
        // No relationships to resolve
        break;

      case "Blog":
        // Resolve category (BlogCategory)
        if (record.categoryName || record.categoryId) {
          const categoryResult =
            await this.relationshipResolver.resolveBlogCategory(record);
          if (categoryResult.error) {
            errors.push({
              row,
              field: "category",
              message: categoryResult.error,
              severity: "error",
            });
            return null;
          }
          resolved.category = categoryResult.resolvedId;
          delete resolved.categoryName;
          delete resolved.categoryId;
        }
        break;

      case "Collection":
        // Resolve events
        if (record.eventTitles && Array.isArray(record.eventTitles)) {
          const eventIds: string[] = [];
          for (const title of record.eventTitles) {
            const eventResult = await this.relationshipResolver.resolveEvent({
              eventTitle: title,
            });
            if (eventResult.error) {
              errors.push({
                row,
                field: "events",
                message: `Event "${title}": ${eventResult.error}`,
                severity: "error",
              });
              return null;
            }
            eventIds.push(eventResult.resolvedId!);
          }
          resolved.events = eventIds;
          delete resolved.eventTitles;
        } else if (record.eventIds && Array.isArray(record.eventIds)) {
          // Use eventIds directly
          resolved.events = record.eventIds;
          delete resolved.eventIds;
        }
        break;

      case "Coupon":
        // Resolve createdBy
        if (record.createdByEmail || record.createdById) {
          const createdByResult = await this.relationshipResolver.resolveUser(
            record,
            "createdBy",
          );
          if (createdByResult.error) {
            errors.push({
              row,
              field: "createdBy",
              message: createdByResult.error,
              severity: "error",
            });
            return null;
          }
          resolved.createdBy = createdByResult.resolvedId;
          delete resolved.createdByEmail;
          delete resolved.createdById;
        }

        // Resolve applicable events
        if (record.eventTitles && Array.isArray(record.eventTitles)) {
          const eventIds: string[] = [];
          for (const title of record.eventTitles) {
            const eventResult = await this.relationshipResolver.resolveEvent({
              eventTitle: title,
            });
            if (eventResult.error) {
              errors.push({
                row,
                field: "applicableEvents",
                message: `Event "${title}": ${eventResult.error}`,
                severity: "error",
              });
              return null;
            }
            eventIds.push(eventResult.resolvedId!);
          }
          resolved.applicableEvents = eventIds;
          delete resolved.eventTitles;
        } else if (record.eventIds && Array.isArray(record.eventIds)) {
          resolved.applicableEvents = record.eventIds;
          delete resolved.eventIds;
        }

        // Resolve excluded events
        if (
          record.excludedEventTitles &&
          Array.isArray(record.excludedEventTitles)
        ) {
          const eventIds: string[] = [];
          for (const title of record.excludedEventTitles) {
            const eventResult = await this.relationshipResolver.resolveEvent({
              eventTitle: title,
            });
            if (eventResult.error) {
              errors.push({
                row,
                field: "excludedEvents",
                message: `Event "${title}": ${eventResult.error}`,
                severity: "error",
              });
              return null;
            }
            eventIds.push(eventResult.resolvedId!);
          }
          resolved.excludedEvents = eventIds;
          delete resolved.excludedEventTitles;
        } else if (
          record.excludedEventIds &&
          Array.isArray(record.excludedEventIds)
        ) {
          resolved.excludedEvents = record.excludedEventIds;
          delete resolved.excludedEventIds;
        }

        // Resolve applicable categories
        if (record.categorySlugs && Array.isArray(record.categorySlugs)) {
          const categoryIds: string[] = [];
          for (const slug of record.categorySlugs) {
            const categoryResult =
              await this.relationshipResolver.resolveCategory({
                categorySlug: slug,
              });
            if (categoryResult.error) {
              errors.push({
                row,
                field: "applicableCategories",
                message: `Category "${slug}": ${categoryResult.error}`,
                severity: "error",
              });
              return null;
            }
            categoryIds.push(categoryResult.resolvedId!);
          }
          resolved.applicableCategories = categoryIds;
          delete resolved.categorySlugs;
        } else if (record.categoryIds && Array.isArray(record.categoryIds)) {
          resolved.applicableCategories = record.categoryIds;
          delete resolved.categoryIds;
        }

        // Resolve excluded categories
        if (
          record.excludedCategorySlugs &&
          Array.isArray(record.excludedCategorySlugs)
        ) {
          const categoryIds: string[] = [];
          for (const slug of record.excludedCategorySlugs) {
            const categoryResult =
              await this.relationshipResolver.resolveCategory({
                categorySlug: slug,
              });
            if (categoryResult.error) {
              errors.push({
                row,
                field: "excludedCategories",
                message: `Category "${slug}": ${categoryResult.error}`,
                severity: "error",
              });
              return null;
            }
            categoryIds.push(categoryResult.resolvedId!);
          }
          resolved.excludedCategories = categoryIds;
          delete resolved.excludedCategorySlugs;
        } else if (
          record.excludedCategoryIds &&
          Array.isArray(record.excludedCategoryIds)
        ) {
          resolved.excludedCategories = record.excludedCategoryIds;
          delete resolved.excludedCategoryIds;
        }

        // Resolve applicable vendors
        if (record.vendorEmails && Array.isArray(record.vendorEmails)) {
          const vendorIds: string[] = [];
          for (const email of record.vendorEmails) {
            const vendorResult = await this.relationshipResolver.resolveVendor({
              vendorEmail: email,
            });
            if (vendorResult.error) {
              errors.push({
                row,
                field: "applicableVendors",
                message: `Vendor "${email}": ${vendorResult.error}`,
                severity: "error",
              });
              return null;
            }
            vendorIds.push(vendorResult.resolvedId!);
          }
          resolved.applicableVendors = vendorIds;
          delete resolved.vendorEmails;
        } else if (record.vendorIds && Array.isArray(record.vendorIds)) {
          resolved.applicableVendors = record.vendorIds;
          delete resolved.vendorIds;
        }

        // Resolve excluded vendors
        if (
          record.excludedVendorEmails &&
          Array.isArray(record.excludedVendorEmails)
        ) {
          const vendorIds: string[] = [];
          for (const email of record.excludedVendorEmails) {
            const vendorResult = await this.relationshipResolver.resolveVendor({
              vendorEmail: email,
            });
            if (vendorResult.error) {
              errors.push({
                row,
                field: "excludedVendors",
                message: `Vendor "${email}": ${vendorResult.error}`,
                severity: "error",
              });
              return null;
            }
            vendorIds.push(vendorResult.resolvedId!);
          }
          resolved.excludedVendors = vendorIds;
          delete resolved.excludedVendorEmails;
        } else if (
          record.excludedVendorIds &&
          Array.isArray(record.excludedVendorIds)
        ) {
          resolved.excludedVendors = record.excludedVendorIds;
          delete resolved.excludedVendorIds;
        }
        break;

      case "Order":
        // Resolve user
        if (record.userEmail || record.userId) {
          const userResult = await this.relationshipResolver.resolveUser(
            record,
            "user",
          );
          if (userResult.error) {
            errors.push({
              row,
              field: "userId",
              message: userResult.error,
              severity: "error",
            });
            return null;
          }
          resolved.userId = userResult.resolvedId;
          delete resolved.userEmail;
        }

        // Resolve event IDs in items
        if (record.items && Array.isArray(record.items)) {
          for (let i = 0; i < record.items.length; i++) {
            const item = record.items[i];
            if (item.eventTitle || item.eventId) {
              const eventResult = await this.relationshipResolver.resolveEvent(
                item,
                "event",
              );
              if (eventResult.error) {
                errors.push({
                  row,
                  field: `items[${i}].eventId`,
                  message: eventResult.error,
                  severity: "error",
                });
                return null;
              }
              resolved.items[i].eventId = eventResult.resolvedId;
              delete resolved.items[i].eventTitle;
            }
          }
        }
        break;

      // Add more models as needed
    }

    return resolved;
  }

  /**
   * Validate business rules for a model
   */
  private async validateBusinessRules(
    modelName: ModelName,
    record: any,
    row: number,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    switch (modelName) {
      case "Event":
        // Validate ageRange
        if (record.ageRange) {
          const [min, max] = record.ageRange;
          if (min < 0 || max > 100 || min > max) {
            errors.push({
              row,
              field: "ageRange",
              message: `Invalid age range [${min}, ${max}]. Must be 0 ≤ min ≤ max ≤ 100`,
              severity: "error",
            });
          }
        }

        // Validate dateSchedule
        if (record.dateSchedule && Array.isArray(record.dateSchedule)) {
          for (let i = 0; i < record.dateSchedule.length; i++) {
            const schedule = record.dateSchedule[i];

            if (schedule.startDate && schedule.endDate) {
              const start = new Date(schedule.startDate);
              const end = new Date(schedule.endDate);

              if (start >= end) {
                errors.push({
                  row,
                  field: `dateSchedule[${i}].startDate`,
                  message: "Start date must be before end date",
                  severity: "error",
                });
              }
            }

            if (
              schedule.availableSeats !== undefined &&
              schedule.totalSeats !== undefined
            ) {
              if (schedule.availableSeats > schedule.totalSeats) {
                errors.push({
                  row,
                  field: `dateSchedule[${i}].availableSeats`,
                  message: "Available seats cannot exceed total seats",
                  severity: "error",
                });
              }
            }

            // Validate timeSlots if present
            if (schedule.timeSlots && Array.isArray(schedule.timeSlots)) {
              for (let j = 0; j < schedule.timeSlots.length; j++) {
                const slot = schedule.timeSlots[j];

                if (
                  slot.availableSeats !== undefined &&
                  slot.totalSeats !== undefined
                ) {
                  if (slot.availableSeats > slot.totalSeats) {
                    errors.push({
                      row,
                      field: `dateSchedule[${i}].timeSlots[${j}].availableSeats`,
                      message: "Available seats cannot exceed total seats",
                      severity: "error",
                    });
                  }
                }
              }
            }
          }
        }

        // Validate online event meetingLink
        if (record.type === "Online" && !record.meetingLink) {
          errors.push({
            row,
            field: "meetingLink",
            message: "Meeting link is required for Online events",
            severity: "error",
          });
        }

        // Validate MediaAssets (imageAssets)
        if (
          record.imageAssets &&
          Array.isArray(record.imageAssets) &&
          record.imageAssets.length > 0
        ) {
          const MediaAsset = mongoose.model("MediaAsset");
          for (let i = 0; i < record.imageAssets.length; i++) {
            const assetId = record.imageAssets[i];
            const exists = await MediaAsset.exists({ _id: assetId });
            if (!exists) {
              errors.push({
                row,
                field: `imageAssets[${i}]`,
                message: `MediaAsset ${assetId} does not exist`,
                severity: "error",
              });
            }
          }
        }
        break;

      case "Blog":
        // Validate featuredImageAsset
        if (record.featuredImageAsset) {
          const MediaAsset = mongoose.model("MediaAsset");
          const exists = await MediaAsset.exists({
            _id: record.featuredImageAsset,
          });
          if (!exists) {
            errors.push({
              row,
              field: "featuredImageAsset",
              message: `MediaAsset ${record.featuredImageAsset} does not exist`,
              severity: "error",
            });
          }
        }

        // Validate category
        if (record.categoryId) {
          const BlogCategory = mongoose.model("BlogCategory");
          const exists = await BlogCategory.exists({ _id: record.categoryId });
          if (!exists) {
            errors.push({
              row,
              field: "categoryId",
              message: `BlogCategory ${record.categoryId} does not exist`,
              severity: "error",
            });
          }
        }
        break;

      case "Collection":
        // Validate events exist
        if (
          record.eventIds &&
          Array.isArray(record.eventIds) &&
          record.eventIds.length > 0
        ) {
          for (let i = 0; i < record.eventIds.length; i++) {
            const eventId = record.eventIds[i];
            const exists = await Event.exists({ _id: eventId });
            if (!exists) {
              errors.push({
                row,
                field: `eventIds[${i}]`,
                message: `Event ${eventId} does not exist`,
                severity: "error",
              });
            }
          }
        }

        // Validate iconAsset
        if (record.iconAsset) {
          const MediaAsset = mongoose.model("MediaAsset");
          const exists = await MediaAsset.exists({ _id: record.iconAsset });
          if (!exists) {
            errors.push({
              row,
              field: "iconAsset",
              message: `MediaAsset ${record.iconAsset} does not exist`,
              severity: "error",
            });
          }
        }

        // Validate featuredImageAsset
        if (record.featuredImageAsset) {
          const MediaAsset = mongoose.model("MediaAsset");
          const exists = await MediaAsset.exists({
            _id: record.featuredImageAsset,
          });
          if (!exists) {
            errors.push({
              row,
              field: "featuredImageAsset",
              message: `MediaAsset ${record.featuredImageAsset} does not exist`,
              severity: "error",
            });
          }
        }
        break;

      case "Category":
        // Validate circular parent
        if (record.parentId && record._id) {
          try {
            await this.relationshipResolver.validateCategoryParent(
              record._id.toString(),
              record.parentId.toString(),
            );
          } catch (error: any) {
            errors.push({
              row,
              field: "parentId",
              message: error.message,
              severity: "error",
            });
          }
        }
        break;

      case "Coupon":
        // Validate date range
        if (record.validFrom && record.validUntil) {
          const from = new Date(record.validFrom);
          const until = new Date(record.validUntil);
          if (until <= from) {
            errors.push({
              row,
              field: "validUntil",
              message: "Valid until date must be after valid from date",
              severity: "error",
            });
          }
        }

        // Validate usageCount <= usageLimit
        if (
          record.usageLimit !== undefined &&
          record.usageCount !== undefined
        ) {
          if (record.usageCount > record.usageLimit) {
            errors.push({
              row,
              field: "usageCount",
              message: `Usage count (${record.usageCount}) cannot exceed usage limit (${record.usageLimit})`,
              severity: "error",
            });
          }
        }

        // Validate percentage value
        if (record.type === "percentage" && record.value !== undefined) {
          if (record.value < 0 || record.value > 100) {
            errors.push({
              row,
              field: "value",
              message: `Percentage value must be 0-100, got ${record.value}`,
              severity: "error",
            });
          }
        }

        // Validate currency for fixed_amount
        if (record.type === "fixed_amount" && !record.currency) {
          errors.push({
            row,
            field: "currency",
            message: "Currency is required for fixed_amount coupons",
            severity: "error",
          });
        }
        break;

      case "Order":
        // Validate amount reconciliation
        if (record.subtotal !== undefined && record.total !== undefined) {
          const calculated =
            (record.subtotal || 0) +
            (record.tax || 0) +
            (record.serviceFee || 0) -
            (record.discount || 0) -
            (record.couponDiscount || 0);

          const diff = Math.abs(calculated - record.total);

          if (diff > 0.01) {
            errors.push({
              row,
              field: "total",
              message: `Total amount mismatch: expected ${calculated}, got ${record.total}`,
              severity: "error",
            });
          }
        }

        // Validate items totalPrice = unitPrice * quantity
        if (record.items && Array.isArray(record.items)) {
          for (let i = 0; i < record.items.length; i++) {
            const item = record.items[i];
            if (
              item.unitPrice !== undefined &&
              item.quantity !== undefined &&
              item.totalPrice !== undefined
            ) {
              const calculated = item.unitPrice * item.quantity;
              const diff = Math.abs(calculated - item.totalPrice);
              if (diff > 0.01) {
                errors.push({
                  row,
                  field: `items[${i}].totalPrice`,
                  message: `Item totalPrice mismatch: ${item.unitPrice} × ${item.quantity} = ${calculated}, got ${item.totalPrice}`,
                  severity: "error",
                });
              }
            }

            // Validate participant emergency contact for minors
            if (item.participants && Array.isArray(item.participants)) {
              for (let j = 0; j < item.participants.length; j++) {
                const participant = item.participants[j];
                if (participant.age < 18) {
                  if (
                    !participant.emergencyContact ||
                    !participant.emergencyContact.name ||
                    !participant.emergencyContact.phone
                  ) {
                    errors.push({
                      row,
                      field: `items[${i}].participants[${j}].emergencyContact`,
                      message: `Emergency contact is required for participant "${participant.name}" (age ${participant.age})`,
                      severity: "error",
                    });
                  }
                }
              }
            }
          }
        }

        // Validate payment routing commission
        if (record.paymentRouting) {
          const platformCommission =
            record.paymentRouting.platformCommission || 0;
          const vendorPayout = record.paymentRouting.vendorPayout || 0;
          const total = record.total || 0;

          const sum = platformCommission + vendorPayout;
          if (sum > total + 0.01) {
            errors.push({
              row,
              field: "paymentRouting",
              message: `Payment routing sum (${sum}) exceeds order total (${total})`,
              severity: "error",
            });
          }
        }
        break;

      // Add more models
    }

    return errors;
  }

  /**
   * Check unique constraints for upsert
   */
  private async checkUniqueConstraints(
    modelName: ModelName,
    record: any,
    matchBy: string,
    row: number,
  ): Promise<ValidationWarning | undefined> {
    const Model = this.getModel(modelName);
    const matchValue = record[matchBy];

    if (!matchValue) return undefined;

    const existing = await Model.findOne({ [matchBy]: matchValue });

    if (existing) {
      return {
        row,
        field: matchBy,
        message: `Record with ${matchBy}='${matchValue}' exists. Will be updated.`,
        severity: "warning",
        value: matchValue,
      };
    }

    return undefined;
  }

  /**
   * Upsert a single record
   */
  private async upsertRecord(
    Model: any,
    record: any,
    options: ImportOptions,
    session: mongoose.ClientSession,
  ): Promise<{ action: "create" | "update" }> {
    const matchField = options.matchBy === "id" ? "_id" : options.matchBy;
    const matchValue = record[matchField] || record._id;

    if (!matchValue && options.mode === "upsert") {
      // Create new
      const doc = new Model(record);
      await doc.save({ session });
      return { action: "create" };
    }

    if (options.mode === "upsert") {
      // Update existing or create
      const existing = await Model.findOne({
        [matchField]: matchValue,
      }).session(session);

      if (existing) {
        Object.assign(existing, record);
        await existing.save({ session });
        return { action: "update" };
      } else {
        const doc = new Model(record);
        await doc.save({ session });
        return { action: "create" };
      }
    }

    // Create only
    const doc = new Model(record);
    await doc.save({ session });
    return { action: "create" };
  }

  /**
   * Build export query from filters
   */
  private buildExportQuery(options: ExportOptions): any {
    const query: any = {};
    const filters = options.filters || {};

    // Date range filter
    if (filters.dateRange) {
      const { field, start, end } = filters.dateRange;
      query[field] = {};
      if (start) query[field].$gte = new Date(start);
      if (end) query[field].$lte = new Date(end);
    }

    // Status filter
    if (filters.status) {
      query.status = Array.isArray(filters.status)
        ? { $in: filters.status }
        : filters.status;
    }

    // isActive filter
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Model-specific filters
    if (filters.vendorId) {
      query.vendorId = filters.vendorId;
    }

    if (filters.categoryId) {
      query.category = filters.categoryId;
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    // Exclude deleted records (common pattern)
    if ("isDeleted" in query === false) {
      query.isDeleted = { $ne: true };
    }

    return query;
  }

  /**
   * Sanitize document before export
   */
  private sanitizeDocument(modelName: ModelName, doc: any): any {
    const sanitized = { ...doc };

    // Remove Mongoose internals
    delete sanitized.__v;

    // Model-specific sanitization
    switch (modelName) {
      case "User":
        delete sanitized.passwordHash;
        delete sanitized.twoFactorAuth;
        delete sanitized.passwordReset;
        delete sanitized.passwordResetOTP;
        delete sanitized.emailVerification;
        delete sanitized.phoneVerification;
        delete sanitized.loginAttempts;
        break;

      case "Payment":
        // Only last 8 chars of paymentIntentId
        if (sanitized.paymentIntentId) {
          sanitized.paymentIntentId = `****${sanitized.paymentIntentId.slice(-8)}`;
        }
        break;

      case "Payout":
        // Mask bank account number
        if (sanitized.bankDetails?.accountNumber) {
          const last4 = sanitized.bankDetails.accountNumber.slice(-4);
          sanitized.bankDetails.accountNumber = `****${last4}`;
        }
        break;
    }

    return sanitized;
  }

  /**
   * Fetch related data for context
   */
  private async fetchRelationships(
    modelName: ModelName,
    data: any[],
  ): Promise<Record<string, any[]>> {
    const relationships: Record<string, any[]> = {};

    switch (modelName) {
      case "Event":
        // Fetch vendors
        const vendorIds = [
          ...new Set(data.map((d) => d.vendorId?.toString()).filter(Boolean)),
        ];
        if (vendorIds.length > 0) {
          relationships.vendors = await User.find({ _id: { $in: vendorIds } })
            .select("_id email firstName lastName")
            .lean();
        }

        // Fetch categories
        const categoryIds = [
          ...new Set(data.map((d) => d.category?.toString()).filter(Boolean)),
        ];
        if (categoryIds.length > 0) {
          relationships.categories = await Category.find({
            _id: { $in: categoryIds },
          })
            .select("_id slug name")
            .lean();
        }
        break;

      // Add more models
    }

    return relationships;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(audit: BulkOperationAudit): Promise<void> {
    // Store in Redis or MongoDB audit collection
    const key = `audit:bulk:${audit.action}:${Date.now()}`;
    await cacheService.set(key, JSON.stringify(audit), { ttl: 86400 * 30 }); // 30 days

    logger.info(
      `Audit log created: ${audit.action} by ${audit.userId} - ${audit.success ? "SUCCESS" : "FAILED"}`,
    );
  }
}

export const bulkDataService = new BulkDataService();
