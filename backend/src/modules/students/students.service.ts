import Student from "./student.model";
import Parent from "../parents/parent.model";
import School from "../schools/school.model";
import { AppError } from "../../middleware/index";

export interface CreateStudentInput {
  userId: string;
  schoolId: string;
  parentIds?: string[];
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: "male" | "female" | "other";
  studentId: string;
  grade: string;
  section?: string;
  medicalInfo?: any;
}

export interface UpdateStudentInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  photo?: string;
  grade?: string;
  section?: string;
  enrollmentStatus?: string;
  graduationDate?: string;
  medicalInfo?: any;
  lmsProfile?: any;
}

class StudentService {
  async createStudent(input: CreateStudentInput) {
    const school = await School.findById(input.schoolId);
    if (!school) throw new AppError("School not found", 404);

    const existing = await Student.findOne({ userId: input.userId });
    if (existing) throw new AppError("Student profile already exists for this user", 400);

    const existingStudentId = await Student.findOne({ studentId: input.studentId, schoolId: input.schoolId });
    if (existingStudentId) throw new AppError("Student ID already exists for this school", 400);

    const student = await Student.create({
      ...input,
      dateOfBirth: new Date(input.dateOfBirth),
      enrollmentDate: new Date(),
    });

    if (input.parentIds?.length) {
      await Promise.all(
        input.parentIds.map(async (parentId) => {
          const parent = await Parent.findOne({ userId: parentId });
          if (parent) {
            parent.studentIds.push(student._id as any);
            parent.relationshipToStudents.push({
              studentId: student._id as any,
              relationship: "guardian",
              isPrimary: false,
              hasBookingPermission: true,
              hasViewAccess: true,
            });
            parent.stats.childrenEnrolled = parent.studentIds.length;
            await parent.save();
          }
        }),
      );
    }

    school.stats.totalStudents += 1;
    await school.save();

    return student;
  }

  async getStudentById(id: string) {
    const student = await Student.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("schoolId", "schoolName")
      .populate("parentIds", "firstName lastName");
    if (!student) throw new AppError("Student not found", 404);
    return student;
  }

  async getStudentsBySchool(schoolId: string, query: any) {
    const { page = 1, limit = 20, grade, enrollmentStatus, search } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { schoolId, isActive: true };
    if (grade) filter.grade = grade;
    if (enrollmentStatus) filter.enrollmentStatus = enrollmentStatus;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(filter).populate("userId", "firstName lastName email").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Student.countDocuments(filter),
    ]);

    return {
      students,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), totalStudents: total },
    };
  }

  async updateStudent(id: string, input: UpdateStudentInput) {
    const student = await Student.findById(id);
    if (!student) throw new AppError("Student not found", 404);

    if (input.dateOfBirth) input.dateOfBirth = new Date(input.dateOfBirth) as any;
    Object.assign(student, input);
    await student.save();
    return student;
  }

  async bulkCreateStudents(schoolId: string, students: CreateStudentInput[]) {
    const created = await Student.insertMany(
      students.map((s) => ({ ...s, dateOfBirth: new Date(s.dateOfBirth), enrollmentDate: new Date() })),
    );

    const school = await School.findById(schoolId);
    if (school) {
      school.stats.totalStudents += created.length;
      await school.save();
    }

    return created;
  }

  async transferStudent(studentId: string, newSchoolId: string) {
    const student = await Student.findById(studentId);
    if (!student) throw new AppError("Student not found", 404);

    const oldSchoolId = student.schoolId;
    student.schoolId = newSchoolId as any;
    student.enrollmentStatus = "transferred" as any;
    await student.save();

    await School.findByIdAndUpdate(oldSchoolId, { $inc: { "stats.totalStudents": -1 } });
    await School.findByIdAndUpdate(newSchoolId, { $inc: { "stats.totalStudents": 1 } });

    return student;
  }

  async deleteStudent(id: string) {
    const student = await Student.findById(id);
    if (!student) throw new AppError("Student not found", 404);

    student.isActive = false;
    student.enrollmentStatus = "withdrawn" as any;
    await student.save();

    await School.findByIdAndUpdate(student.schoolId, { $inc: { "stats.totalStudents": -1 } });

    return student;
  }
}

export const studentService = new StudentService();
