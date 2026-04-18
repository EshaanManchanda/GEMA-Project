import { Request, Response, NextFunction } from "express";
import { studentService } from "./students.service";
import { AppError, catchAsync } from "../../middleware/index";
import { AuthRequest } from "../../types/index";

export const createStudent = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await studentService.createStudent(req.body);
  res.status(201).json({ success: true, message: "Student created successfully", data: { student } });
});

export const getStudent = catchAsync(async (req: Request, res: Response) => {
  const student = await studentService.getStudentById(req.params.id);
  res.json({ success: true, data: { student } });
});

export const getStudents = catchAsync(async (req: Request, res: Response) => {
  const result = await studentService.getStudentsBySchool(req.params.schoolId, req.query);
  res.json({ success: true, ...result });
});

export const updateStudent = catchAsync(async (req: AuthRequest, res: Response) => {
  const student = await studentService.updateStudent(req.params.id, req.body);
  res.json({ success: true, message: "Student updated successfully", data: { student } });
});

export const bulkCreateStudents = catchAsync(async (req: AuthRequest, res: Response) => {
  const students = await studentService.bulkCreateStudents(req.params.schoolId, req.body.students);
  res.status(201).json({ success: true, message: `${students.length} students created`, data: { students } });
});

export const transferStudent = catchAsync(async (req: AuthRequest, res: Response) => {
  const { newSchoolId } = req.body;
  const student = await studentService.transferStudent(req.params.id, newSchoolId);
  res.json({ success: true, message: "Student transferred successfully", data: { student } });
});

export const deleteStudent = catchAsync(async (req: AuthRequest, res: Response) => {
  await studentService.deleteStudent(req.params.id);
  res.json({ success: true, message: "Student deleted successfully" });
});
