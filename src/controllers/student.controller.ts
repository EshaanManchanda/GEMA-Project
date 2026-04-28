import { Request, Response, NextFunction } from "express";
import Student from "../models/Student";
import User from "../models/User";
import { AppError } from "../middleware/index";
import { AuthRequest } from "../types/index";

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
