import { Request, Response } from "express";
import { certificateService } from "./certificates.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

export const createTemplate = catchAsync(async (req: AuthRequest, res: Response) => {
  const template = await certificateService.createTemplate(req.body);
  res.status(201).json({ success: true, message: "Certificate template created", data: { template } });
});

export const getTemplates = catchAsync(async (req: Request, res: Response) => {
  const result = await certificateService.getTemplates(req.query);
  res.json({ success: true, ...result });
});

export const getTemplate = catchAsync(async (req: Request, res: Response) => {
  const template = await certificateService.getTemplateById(req.params.id);
  res.json({ success: true, data: { template } });
});

export const updateTemplate = catchAsync(async (req: AuthRequest, res: Response) => {
  const template = await certificateService.updateTemplate(req.params.id, req.body);
  res.json({ success: true, message: "Certificate template updated", data: { template } });
});

export const deleteTemplate = catchAsync(async (req: AuthRequest, res: Response) => {
  await certificateService.deleteTemplate(req.params.id);
  res.json({ success: true, message: "Certificate template deleted" });
});

export const generateCertificate = catchAsync(async (req: AuthRequest, res: Response) => {
  const record = await certificateService.generateCertificate({ ...req.body, issuedBy: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Certificate generated", data: { record } });
});

export const generateBatch = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await certificateService.generateBatch({ ...req.body, createdBy: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: `Batch processing complete: ${result.generated} generated, ${result.failed} failed`, data: result });
});

export const getRecord = catchAsync(async (req: Request, res: Response) => {
  const record = await certificateService.getRecordById(req.params.id);
  res.json({ success: true, data: { record } });
});

export const getRecords = catchAsync(async (req: Request, res: Response) => {
  const result = await certificateService.getRecords(req.query);
  res.json({ success: true, ...result });
});

export const verifyCertificate = catchAsync(async (req: Request, res: Response) => {
  const record = await certificateService.verifyCertificate(req.params.code, req.ip, req.headers["user-agent"] as string);
  res.json({ success: true, message: "Certificate is valid", data: { record } });
});

export const getStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await certificateService.getStats(req.query);
  res.json({ success: true, data: { stats } });
});
