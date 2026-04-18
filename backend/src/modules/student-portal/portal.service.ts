import Enrollment from "./enrollment.model";
import Student from "../students/student.model";
import Parent from "../parents/parent.model";
import CertificateRecord from "../certificates/certificate-record.model";
import { AppError } from "../../middleware/index";

export interface StudentDashboardData {
  student: any;
  upcomingEvents: any[];
  activeEnrollments: any[];
  recentCertificates: any[];
  attendanceSummary: any;
  stats: any;
}

export interface ParentDashboardData {
  parent: any;
  children: Array<{
    student: any;
    upcomingEvents: any[];
    activeEnrollments: any[];
    recentCertificates: any[];
    attendanceSummary: any;
  }>;
}

class StudentPortalService {
  async getStudentDashboard(userId: string): Promise<StudentDashboardData> {
    const student = await Student.findOne({ userId })
      .populate("schoolId", "schoolName")
      .populate("parentIds", "firstName lastName phone");
    if (!student) throw new AppError("Student profile not found", 404);

    const [activeEnrollments, recentCertificates] = await Promise.all([
      Enrollment.find({ studentId: student._id, status: "active" })
        .populate("referenceId")
        .sort({ enrolledAt: -1 })
        .limit(10),
      CertificateRecord.find({ studentId: student._id })
        .populate("templateId", "name type")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const totalAttendance = student.stats.totalEventsAttended || 0;
    const attendanceSummary = {
      total: totalAttendance,
      events: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.total || 0), 0),
      present: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.present || 0), 0),
      absent: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.absent || 0), 0),
      late: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.late || 0), 0),
    };

    return {
      student,
      upcomingEvents: [],
      activeEnrollments,
      recentCertificates,
      attendanceSummary,
      stats: student.stats,
    };
  }

  async getParentDashboard(userId: string): Promise<ParentDashboardData> {
    const parent = await Parent.findOne({ userId })
      .populate("studentIds", "firstName lastName studentId grade section schoolId photo");
    if (!parent) throw new AppError("Parent profile not found", 404);

    const children = await Promise.all(
      (parent.studentIds || []).map(async (studentId: any) => {
        const student = await Student.findById(studentId).populate("schoolId", "schoolName");
        if (!student) return null;

        const [activeEnrollments, recentCertificates] = await Promise.all([
          Enrollment.find({ studentId, status: "active" })
            .populate("referenceId")
            .sort({ enrolledAt: -1 })
            .limit(5),
          CertificateRecord.find({ studentId })
            .populate("templateId", "name type")
            .sort({ createdAt: -1 })
            .limit(3),
        ]);

        const attendanceSummary = {
          total: student.stats.totalEventsAttended || 0,
          events: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.total || 0), 0),
          present: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.present || 0), 0),
          absent: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.absent || 0), 0),
          late: activeEnrollments.reduce((sum, e) => sum + (e.attendance?.late || 0), 0),
        };

        return {
          student,
          upcomingEvents: [],
          activeEnrollments,
          recentCertificates,
          attendanceSummary,
        };
      }),
    );

    return {
      parent,
      children: children.filter(Boolean),
    };
  }

  async getEnrollments(studentId: string, query: any) {
    const { page = 1, limit = 20, type, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { studentId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter).populate("referenceId").sort({ enrolledAt: -1 }).skip(skip).limit(limitNum),
      Enrollment.countDocuments(filter),
    ]);

    return {
      enrollments,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total },
    };
  }

  async getCertificates(studentId: string, query: any) {
    const { page = 1, limit = 20, status } = query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { studentId };
    if (status) filter.status = status;

    const [certificates, total] = await Promise.all([
      CertificateRecord.find(filter)
        .populate("templateId", "name type")
        .populate("eventId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CertificateRecord.countDocuments(filter),
    ]);

    return {
      certificates,
      pagination: { currentPage: pageNum, totalPages: Math.ceil(total / limitNum), total },
    };
  }

  async getAttendance(studentId: string) {
    const enrollments = await Enrollment.find({ studentId }).populate("referenceId");
    const summary = enrollments.reduce(
      (acc, e) => ({
        total: acc.total + (e.attendance?.total || 0),
        present: acc.present + (e.attendance?.present || 0),
        absent: acc.absent + (e.attendance?.absent || 0),
        late: acc.late + (e.attendance?.late || 0),
      }),
      { total: 0, present: 0, absent: 0, late: 0 },
    );

    return { summary, enrollments };
  }

  async getGrades(studentId: string) {
    const enrollments = await Enrollment.find({ studentId, grade: { $exists: true } }).populate("referenceId");
    return { grades: enrollments.map((e) => ({ enrollment: e._id, reference: e.referenceId, grade: e.grade })) };
  }
}

export const studentPortalService = new StudentPortalService();
