import { Request, Response, NextFunction } from "express";
import Student from "../models/Student";
import User, { UserRole, UserStatus } from "../models/User";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";
import emailService from "../services/email.service";
import { config } from "../config/env";
import logger from "../config/logger";

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) break;
    if (line[i] === '"') {
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else { field += line[i++]; }
      }
      result.push(field.trim());
      if (i < line.length && line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { result.push(line.slice(i).trim()); break; }
      result.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return result;
}

export const createStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { parentEmail, parentUserId: directParentId, ...rest } = req.body;

    let parentUserId = directParentId;

    if (!parentUserId && parentEmail) {
      const parent = await User.findOne({ email: parentEmail.toLowerCase().trim() }).select("_id");
      if (!parent) return next(new AppError("Parent user not found with that email", 404));
      parentUserId = parent._id;
    }

    if (!parentUserId) return next(new AppError("parentEmail or parentUserId is required", 400));

    const student = await Student.create({ parentUserId, ...rest });

    res.status(201).json({ success: true, data: { student } });
  } catch (error: any) {
    if (error.code === 11000) return next(new AppError("Student with this email already exists under this parent", 409));
    next(error);
  }
};

export const listStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { parentUserId, email, schoolId, status, page = 1, limit = 20 } = req.query;

    const filter: Record<string, any> = {};
    if (parentUserId) filter.parentUserId = parentUserId;
    if (email) filter.email = (email as string).toLowerCase().trim();
    if (schoolId) filter.schoolId = schoolId;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate("parentUserId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Student.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentsByParentEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.params;
    const students = await Student.findByParentEmail(email);
    res.status(200).json({ success: true, data: { students } });
  } catch (error) {
    next(error);
  }
};

export const getMyChildren = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parentUserId = req.user?._id || req.user?.id;
    const students = await Student.find({ parentUserId, status: "active" });
    res.status(200).json({ success: true, data: { students } });
  } catch (error) {
    next(error);
  }
};

export const getStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findById(req.params.id).populate("parentUserId", "firstName lastName email");
    if (!student) return next(new AppError("Student not found", 404));
    res.status(200).json({ success: true, data: { student } });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { parentEmail, parentUserId: _pid, ...updates } = req.body;
    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!student) return next(new AppError("Student not found", 404));
    res.status(200).json({ success: true, data: { student } });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
    if (!student) return next(new AppError("Student not found", 404));
    res.status(200).json({ success: true, data: { student } });
  } catch (error) {
    next(error);
  }
};

const MANDATORY_COLS = new Set(["student_name", "email", "school_name", "issue_date", "certificate_type"]);

export const publicStudentRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentName, grade, schoolName, location, email, phone, interest } = req.body;

    if (!studentName || !email) {
      return next(new AppError("Student name and email are required", 400));
    }

    const parentEmail = email.toLowerCase().trim();
    let parent = await User.findOne({ email: parentEmail });

    let isNewUser = false;
    let tempPassword = "";

    if (!parent) {
      isNewUser = true;
      tempPassword = Math.random().toString(36).slice(-8) + "!1A";
      
      const nameParts = studentName.split(/\s+/);
      const parentFirstName = nameParts[0] || "Parent";
      const parentLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

      parent = await User.create({
        firstName: parentFirstName,
        lastName: parentLastName,
        email: parentEmail,
        passwordHash: tempPassword,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
      });
    }

    const studentParts = studentName.split(/\s+/);
    const firstName = studentParts[0];
    const lastName = studentParts.length > 1 ? studentParts.slice(1).join(" ") : "Student";

    const programInfo = `Interest: ${interest}\nLocation: ${location}\nSchool: ${schoolName}`;

    const student = await Student.create({
      parentUserId: parent._id,
      email: parentEmail,
      firstName,
      lastName,
      grade,
      phone,
      medicalNotes: programInfo,
    });

    try {
      await emailService.sendEmail({
        to: parentEmail,
        subject: "Welcome to the KidRove Student Program!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Welcome to KidRove, ${firstName}!</h2>
            <p>Thank you for registering for the KidRove Student Program. We're excited to have you on board!</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #111827;">Registration Details:</h3>
              <p><strong>Student:</strong> ${studentName}</p>
              <p><strong>Grade:</strong> ${grade}</p>
              <p><strong>Interest:</strong> ${interest}</p>
            </div>
            ${isNewUser ? `
            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bfdbfe;">
              <p style="margin-top: 0;"><strong>Account Created:</strong> A parent account has been created for you.</p>
              <p><strong>Login Email:</strong> ${parentEmail}</p>
              <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
              <p>Please log in at <a href="${config.frontendUrl}/login">${config.frontendUrl}/login</a> and change your password.</p>
            </div>
            ` : ""}
            <p>We'll be in touch soon with more information about upcoming challenges and workshops.</p>
            <p>Best regards,<br>The KidRove Team</p>
          </div>
        `
      });
    } catch (emailErr) {
      logger.error("Failed to send student registration email:", emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful! Check your email for details.",
      data: { student }
    });
  } catch (error: any) {
    next(error);
  }
};

export const bulkImportStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(new AppError("CSV file required", 400));

    const text = req.file.buffer.toString("utf-8");
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
    if (rawLines.length < 2) return next(new AppError("CSV must have a header row plus at least one data row", 400));

    const headers = parseCSVRow(rawLines[0]).map((h) =>
      h.toLowerCase().trim().replace(/\s+/g, "_"),
    );
    const dataLines = rawLines.slice(1);

    const results = { created: 0, updated: 0, skipped: 0, newAccounts: 0, errors: [] as string[] };

    const userCache: Record<string, any> = {};
    const usedEmails = new Set<string>();

    const makeStudentEmail = (first: string, last: string, domain: string): string => {
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const base = `${slug(first)}.${slug(last)}`;
      let candidate = `${base}@${domain}`;
      if (!usedEmails.has(candidate)) return candidate;
      let n = 2;
      while (usedEmails.has(`${base}${n}@${domain}`)) n++;
      return `${base}${n}@${domain}`;
    };

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const values = parseCSVRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

      const studentName = row["student_name"]?.trim() || "";
      const contactEmail = row["email"]?.trim().toLowerCase() || "";
      const schoolName = row["school_name"]?.trim() || "";
      const grade = row["grade"]?.trim() || "";

      if (!studentName || !contactEmail) {
        results.errors.push(`Row ${i + 2}: student_name and email are required`);
        results.skipped++;
        continue;
      }

      const parts = studentName.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "Student";

      if (!userCache[contactEmail]) {
        let user = await User.findOne({ email: contactEmail }).select("_id firstName lastName email");
        if (!user) {
          const nameParts = (schoolName || contactEmail.split("@")[0]).split(/\s+/);
          const parentFirst = nameParts[0].slice(0, 50) || "School";
          const parentLast = (nameParts.slice(1).join(" ") || "Contact").slice(0, 50);
          const tempPassword =
            Math.random().toString(36).slice(-6) +
            Math.random().toString(36).slice(-4).toUpperCase() +
            "!2";

          user = await User.create({
            firstName: parentFirst,
            lastName: parentLast,
            email: contactEmail,
            passwordHash: tempPassword,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
          });
          results.newAccounts++;

          emailService.sendEmail({
            to: contactEmail,
            subject: `Your GEMA account has been created`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">
                <h2 style="color:#4f46e5">Welcome to GEMA!</h2>
                <p>Hi <strong>${parentFirst} ${parentLast}</strong>,</p>
                <p>A parent account has been created for you as part of a student bulk import.</p>
                <div style="background:#f5f5f5;border:2px solid #4f46e5;border-radius:8px;padding:16px;margin:16px 0">
                  <p style="margin:4px 0"><strong>Email:</strong> <code>${contactEmail}</code></p>
                  <p style="margin:4px 0"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
                </div>
                <p>Please <a href="${config.frontendUrl}/login">log in</a> and change your password immediately.</p>
                <p style="color:#888;font-size:12px">If you did not expect this email, please ignore it.</p>
              </div>`,
          }).catch(() => { /* silent */ });
        }
        userCache[contactEmail] = user;
      }

      const parentUser = userCache[contactEmail];
      const domain = contactEmail.split("@")[1] || "gema.local";
      const studentEmail = makeStudentEmail(firstName, lastName, domain);
      usedEmails.add(studentEmail);

      const extra: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        if (!MANDATORY_COLS.has(key) && val) extra[key] = val;
      }

      const studentFields = {
        firstName,
        lastName,
        grade: grade || undefined,
        ...(extra["city"] || extra["country"]
          ? { address: { city: extra["city"], country: extra["country"] } }
          : {}),
        ...(extra["contact_number"] ? { phone: extra["contact_number"] } : {}),
        ...(Object.keys(extra).length > 0 ? { medicalNotes: JSON.stringify(extra) } : {}),
      };

      const existing = await Student.findOne({ parentUserId: parentUser._id, email: studentEmail });
      if (existing) {
        await Student.findByIdAndUpdate(existing._id, { $set: studentFields });
        results.updated++;
      } else {
        await Student.create({ parentUserId: parentUser._id, email: studentEmail, ...studentFields });
        results.created++;
      }
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
