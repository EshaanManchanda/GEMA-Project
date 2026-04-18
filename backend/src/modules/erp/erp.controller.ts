import { Request, Response } from "express";
import { erpService } from "./erp.service";
import { catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

// Invoices
export const createInvoice = catchAsync(async (req: AuthRequest, res: Response) => {
  const invoice = await erpService.createInvoice(req.body);
  res.status(201).json({ success: true, message: "Invoice created", data: { invoice } });
});

export const getInvoices = catchAsync(async (req: Request, res: Response) => {
  const result = await erpService.getInvoices(req.query);
  res.json({ success: true, ...result });
});

export const updateInvoiceStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;
  const invoice = await erpService.updateInvoiceStatus(req.params.id, status);
  res.json({ success: true, message: "Invoice status updated", data: { invoice } });
});

export const payInvoice = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await erpService.payInvoice(req.params.id, { ...req.body, paidBy: req.user?._id.toString() || "" });
  res.json({ success: true, message: "Invoice paid", data: result });
});

// Staff
export const createStaff = catchAsync(async (req: AuthRequest, res: Response) => {
  const staff = await erpService.createStaff(req.body);
  res.status(201).json({ success: true, message: "Staff member created", data: { staff } });
});

export const getStaff = catchAsync(async (req: Request, res: Response) => {
  const result = await erpService.getStaff(req.query);
  res.json({ success: true, ...result });
});

// Attendance
export const markAttendance = catchAsync(async (req: AuthRequest, res: Response) => {
  const record = await erpService.markAttendance(req.body);
  res.status(201).json({ success: true, message: "Attendance marked", data: { record } });
});

export const getAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await erpService.getAttendance(String(req.query.schoolId), req.query);
  res.json({ success: true, ...result });
});

// Leave Requests
export const createLeaveRequest = catchAsync(async (req: AuthRequest, res: Response) => {
  const request = await erpService.createLeaveRequest(req.body);
  res.status(201).json({ success: true, message: "Leave request created", data: { request } });
});

export const getLeaveRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await erpService.getLeaveRequests(req.query);
  res.json({ success: true, ...result });
});

export const approveLeaveRequest = catchAsync(async (req: AuthRequest, res: Response) => {
  const request = await erpService.approveLeaveRequest(req.params.id, req.user?._id.toString() || "");
  res.json({ success: true, message: "Leave request approved", data: { request } });
});

export const rejectLeaveRequest = catchAsync(async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const request = await erpService.rejectLeaveRequest(req.params.id, reason);
  res.json({ success: true, message: "Leave request rejected", data: { request } });
});

// Payroll
export const createPayrollRun = catchAsync(async (req: AuthRequest, res: Response) => {
  const run = await erpService.createPayrollRun({ ...req.body, processedBy: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Payroll run created", data: { run } });
});

export const getPayrollRuns = catchAsync(async (req: Request, res: Response) => {
  const result = await erpService.getPayrollRuns(req.query);
  res.json({ success: true, ...result });
});

// Financial Reports
export const generateFinancialReport = catchAsync(async (req: AuthRequest, res: Response) => {
  const report = await erpService.generateFinancialReport(req.params.schoolId, { ...req.body, generatedBy: req.user?._id.toString() || "" });
  res.status(201).json({ success: true, message: "Financial report generated", data: { report } });
});

export const getFinancialReports = catchAsync(async (req: Request, res: Response) => {
  const reports = await erpService.getFinancialReports(req.params.schoolId);
  res.json({ success: true, data: { reports } });
});
