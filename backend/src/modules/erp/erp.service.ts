import mongoose from "mongoose";
import Invoice, { InvoiceStatus, InvoiceType } from "./invoice.model";
import PaymentRecord from "./payment-record.model";
import FinancialReport from "./financial-report.model";
import Staff from "./staff.model";
import StaffAttendance from "./staff-attendance.model";
import LeaveRequest, { LeaveStatus } from "./leave-request.model";
import PayrollRun, { PayrollStatus } from "./payroll-run.model";
import { AppError } from "../../middleware/index";

export class ERPService {
  // Invoices
  async createInvoice(input: { schoolId: string; studentId?: string; type: string; items: any[]; tax?: number; dueDate: string; notes?: string }) {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const subtotal = input.items.reduce((sum: number, item: any) => sum + item.total, 0);
    const tax = input.tax || 0;
    const total = subtotal + tax;

    return Invoice.create({ ...input, invoiceNumber, subtotal, tax, total, dueDate: new Date(input.dueDate) });
  }

  async getInvoices(query: any) {
    const { page = 1, limit = 20, schoolId, studentId, status, type } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).populate("studentId", "firstName lastName studentId").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Invoice.countDocuments(filter),
    ]);

    return { invoices, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async updateInvoiceStatus(id: string, status: string) {
    const update: any = { status };
    if (status === InvoiceStatus.PAID) update.paidAt = new Date();
    const invoice = await Invoice.findByIdAndUpdate(id, update, { new: true });
    if (!invoice) throw new AppError("Invoice not found", 404);
    return invoice;
  }

  async payInvoice(invoiceId: string, input: { amount: number; paymentMethod: string; transactionId?: string; paidBy: string; notes?: string; receiptUrl?: string }) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    if (invoice.status === InvoiceStatus.PAID) throw new AppError("Invoice already paid", 400);

    const payment = await PaymentRecord.create({
      invoiceId,
      schoolId: invoice.schoolId,
      studentId: invoice.studentId,
      ...input,
      paidAt: new Date(),
    });

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.paidBy = new mongoose.Types.ObjectId(input.paidBy);
    await invoice.save();

    return { payment, invoice };
  }

  // Staff
  async createStaff(input: { schoolId: string; userId?: string; employeeId: string; firstName: string; lastName: string; email: string; phone: string; position: string; hireDate: string; salary?: number; department?: string }) {
    return Staff.create({ ...input, hireDate: new Date(input.hireDate) });
  }

  async getStaff(query: any) {
    const { page = 1, limit = 20, schoolId, department, isActive } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const [staff, total] = await Promise.all([
      Staff.find(filter).sort({ lastName: 1 }).skip(skip).limit(limitNum),
      Staff.countDocuments(filter),
    ]);

    return { staff, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  // Attendance
  async markAttendance(input: { schoolId: string; staffId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string }) {
    return StaffAttendance.findOneAndUpdate(
      { schoolId: input.schoolId, staffId: input.staffId, date: new Date(input.date) },
      { ...input, date: new Date(input.date), checkIn: input.checkIn ? new Date(input.checkIn) : undefined, checkOut: input.checkOut ? new Date(input.checkOut) : undefined },
      { upsert: true, new: true },
    );
  }

  async getAttendance(schoolId: string, query: any) {
    const { page = 1, limit = 20, staffId, startDate, endDate } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { schoolId };
    if (staffId) filter.staffId = staffId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      StaffAttendance.find(filter).populate("staffId", "firstName lastName").sort({ date: -1 }).skip(skip).limit(limitNum),
      StaffAttendance.countDocuments(filter),
    ]);

    return { records, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  // Leave Requests
  async createLeaveRequest(input: { schoolId: string; staffId: string; type: string; startDate: string; endDate: string; reason: string }) {
    return LeaveRequest.create({ ...input, startDate: new Date(input.startDate), endDate: new Date(input.endDate) });
  }

  async getLeaveRequests(query: any) {
    const { page = 1, limit = 20, schoolId, staffId, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (staffId) filter.staffId = staffId;
    if (status) filter.status = status;

    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter).populate("staffId", "firstName lastName").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      LeaveRequest.countDocuments(filter),
    ]);

    return { requests, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  async approveLeaveRequest(id: string, approvedBy: string) {
    const request = await LeaveRequest.findByIdAndUpdate(id, { status: LeaveStatus.APPROVED, approvedBy: new mongoose.Types.ObjectId(approvedBy), approvedAt: new Date() }, { new: true });
    if (!request) throw new AppError("Leave request not found", 404);
    return request;
  }

  async rejectLeaveRequest(id: string, reason: string) {
    const request = await LeaveRequest.findByIdAndUpdate(id, { status: LeaveStatus.REJECTED, rejectionReason: reason }, { new: true });
    if (!request) throw new AppError("Leave request not found", 404);
    return request;
  }

  // Payroll
  async createPayrollRun(input: { schoolId: string; periodStart: string; periodEnd: string; entries: any[]; processedBy: string }) {
    const totalAmount = input.entries.reduce((sum: number, e: any) => sum + e.netPay, 0);
    return PayrollRun.create({ ...input, periodStart: new Date(input.periodStart), periodEnd: new Date(input.periodEnd), totalAmount, staffCount: input.entries.length });
  }

  async getPayrollRuns(query: any) {
    const { page = 1, limit = 20, schoolId, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (schoolId) filter.schoolId = schoolId;
    if (status) filter.status = status;

    const [runs, total] = await Promise.all([
      PayrollRun.find(filter).sort({ periodStart: -1 }).skip(skip).limit(limitNum),
      PayrollRun.countDocuments(filter),
    ]);

    return { runs, pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total } };
  }

  // Financial Reports
  async generateFinancialReport(schoolId: string, input: { type: string; periodStart: string; periodEnd: string; generatedBy: string }) {
    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);

    const [invoices, payments] = await Promise.all([
      Invoice.find({ schoolId, createdAt: { $gte: start, $lte: end } }),
      PaymentRecord.find({ schoolId, paidAt: { $gte: start, $lte: end } }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const revenueByType: Record<string, number> = {};
    invoices.forEach((inv) => {
      revenueByType[inv.type] = (revenueByType[inv.type] || 0) + inv.total;
    });

    return FinancialReport.create({
      schoolId,
      type: input.type,
      periodStart: start,
      periodEnd: end,
      data: {
        totalRevenue,
        totalExpenses: 0,
        netProfit: totalRevenue,
        invoicesIssued: invoices.length,
        invoicesPaid: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
        invoicesOverdue: invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length,
        revenueByType,
        revenueByMonth: [],
      },
      generatedBy: new mongoose.Types.ObjectId(input.generatedBy),
    });
  }

  async getFinancialReports(schoolId: string) {
    return FinancialReport.find({ schoolId }).sort({ periodStart: -1 });
  }
}

export const erpService = new ERPService();
