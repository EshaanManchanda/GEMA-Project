import CertificateRecord from "./certificate-record.model";
import CertificateTemplate from "./certificate-template.model";
import CertificateBatch from "./certificate-batch.model";
import CertificateVerificationLog from "./certificate-verification-log.model";
import { AppError } from "../../middleware/index";
import crypto from "crypto";

export interface CreateTemplateInput {
  schoolId?: string;
  vendorId?: string;
  name: string;
  description?: string;
  type: string;
  design: {
    layout: string;
    backgroundColor?: string;
    borderColor?: string;
    logoUrl?: string;
    sealUrl?: string;
    signatureFields: Array<{ label: string; title: string; imageUrl?: string }>;
  };
  variables: Array<{ key: string; label: string; type: string; required: boolean }>;
}

export interface GenerateCertificateInput {
  templateId: string;
  studentId: string;
  eventId?: string;
  courseId?: string;
  examId?: string;
  issuedBy: string;
  variables: Record<string, any>;
}

export interface GenerateBatchInput {
  templateId: string;
  studentIds: string[];
  eventId?: string;
  courseId?: string;
  createdBy: string;
  name: string;
  description?: string;
  variables: Record<string, any>;
}

class CertificateService {
  async createTemplate(input: CreateTemplateInput) {
    const template = await CertificateTemplate.create(input);
    return template;
  }

  async getTemplateById(id: string) {
    const template = await CertificateTemplate.findById(id);
    if (!template) throw new AppError("Certificate template not found", 404);
    return template;
  }

  async getTemplates(query: any) {
    const { page = 1, limit = 20, schoolId, vendorId, type, isActive } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (vendorId) filter.vendorId = vendorId;
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const [templates, total] = await Promise.all([
      CertificateTemplate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      CertificateTemplate.countDocuments(filter),
    ]);

    return {
      templates,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total },
    };
  }

  async updateTemplate(id: string, input: Partial<CreateTemplateInput>) {
    const template = await CertificateTemplate.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!template) throw new AppError("Certificate template not found", 404);
    return template;
  }

  async deleteTemplate(id: string) {
    const template = await CertificateTemplate.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!template) throw new AppError("Certificate template not found", 404);
    return template;
  }

  async generateCertificate(input: GenerateCertificateInput) {
    const template = await CertificateTemplate.findById(input.templateId);
    if (!template) throw new AppError("Certificate template not found", 404);
    if (!template.isActive) throw new AppError("Certificate template is not active", 400);

    const requiredVars = template.variables.filter((v) => v.required);
    for (const rv of requiredVars) {
      if (!input.variables[rv.key]) {
        throw new AppError(`Missing required variable: ${rv.key}`, 400);
      }
    }

    const certificateNumber = `CERT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const verificationCode = crypto.randomBytes(16).toString("hex");
    const verificationUrl = `${process.env.FRONTEND_URL || "https://kidrove.com"}/verify-certificate/${verificationCode}`;

    const record = await CertificateRecord.create({
      ...input,
      certificateNumber,
      verificationCode,
      verificationUrl,
      status: "generated" as any,
    });

    await CertificateTemplate.findByIdAndUpdate(input.templateId, { $inc: { usageCount: 1 } });

    return record;
  }

  async generateBatch(input: GenerateBatchInput) {
    const template = await CertificateTemplate.findById(input.templateId);
    if (!template) throw new AppError("Certificate template not found", 404);

    const batch = await CertificateBatch.create({
      ...input,
      status: "processing" as any,
      totalCertificates: input.studentIds.length,
      startedAt: new Date(),
    });

    const results = await Promise.allSettled(
      input.studentIds.map(async (studentId) => {
        const certificateNumber = `CERT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        const verificationCode = crypto.randomBytes(16).toString("hex");
        const verificationUrl = `${process.env.FRONTEND_URL || "https://kidrove.com"}/verify-certificate/${verificationCode}`;

        return CertificateRecord.create({
          templateId: input.templateId,
          studentId,
          eventId: input.eventId,
          courseId: input.courseId,
          issuedBy: input.createdBy,
          certificateNumber,
          verificationCode,
          verificationUrl,
          variables: input.variables,
          status: "generated" as any,
        });
      }),
    );

    let generated = 0;
    let failed = 0;
    const errorLog: any[] = [];

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        generated++;
      } else {
        failed++;
        errorLog.push({
          studentId: input.studentIds[i],
          error: result.reason?.message || "Unknown error",
          timestamp: new Date(),
        });
      }
    });

    await CertificateBatch.findByIdAndUpdate(batch._id, {
      status: failed === 0 ? "completed" : failed === input.studentIds.length ? "failed" : "partial",
      generatedCertificates: generated,
      failedCertificates: failed,
      errorLog,
      completedAt: new Date(),
    });

    await CertificateTemplate.findByIdAndUpdate(input.templateId, { $inc: { usageCount: generated } });

    return { batch: await CertificateBatch.findById(batch._id), generated, failed, errorLog };
  }

  async getRecordById(id: string) {
    const record = await CertificateRecord.findById(id)
      .populate("templateId", "name type")
      .populate("studentId", "firstName lastName studentId")
      .populate("issuedBy", "firstName lastName");
    if (!record) throw new AppError("Certificate record not found", 404);
    return record;
  }

  async getRecords(query: any) {
    const { page = 1, limit = 20, studentId, eventId, courseId, templateId, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (studentId) filter.studentId = studentId;
    if (eventId) filter.eventId = eventId;
    if (courseId) filter.courseId = courseId;
    if (templateId) filter.templateId = templateId;
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      CertificateRecord.find(filter).populate("templateId", "name type").populate("studentId", "firstName lastName").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      CertificateRecord.countDocuments(filter),
    ]);

    return {
      records,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total },
    };
  }

  async verifyCertificate(verificationCode: string, ipAddress?: string, userAgent?: string) {
    const record = await CertificateRecord.findOne({ verificationCode })
      .populate("templateId", "name type design")
      .populate("studentId", "firstName lastName studentId grade")
      .populate("eventId", "title")
      .populate("issuedBy", "firstName lastName");

    if (!record) {
      await CertificateVerificationLog.create({ verificationCode, verifiedBy: "unknown", isValid: false, ipAddress, userAgent });
      throw new AppError("Certificate not found or invalid", 404);
    }

    await CertificateVerificationLog.create({
      certificateId: record._id,
      verificationCode,
      verifiedBy: ipAddress || "unknown",
      ipAddress,
      userAgent,
      isValid: true,
    });

    return record;
  }

  async getStats(query: any) {
    const { schoolId, vendorId, templateId } = query;
    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (vendorId) filter.vendorId = vendorId;
    if (templateId) filter.templateId = templateId;

    const [totalTemplates, totalRecords, statusBreakdown] = await Promise.all([
      CertificateTemplate.countDocuments(filter),
      CertificateRecord.countDocuments(filter),
      CertificateRecord.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalTemplates,
      totalRecords,
      statusBreakdown: statusBreakdown.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

export const certificateService = new CertificateService();
