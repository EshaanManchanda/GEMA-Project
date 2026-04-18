import Parent from "./parent.model";
import Student from "../students/student.model";
import { AppError } from "../../middleware/index";

export interface CreateParentInput {
  userId: string;
  studentIds?: string[];
  firstName: string;
  lastName: string;
  phone: string;
  preferences?: any;
  billingAddress?: any;
}

export interface UpdateParentInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  photo?: string;
  preferences?: any;
  billingAddress?: any;
}

class ParentService {
  async createParent(input: CreateParentInput) {
    const existing = await Parent.findOne({ userId: input.userId });
    if (existing) throw new AppError("Parent profile already exists for this user", 400);

    const parent = await Parent.create({
      ...input,
      relationshipToStudents: input.studentIds?.map((sid) => ({
        studentId: sid,
        relationship: "guardian",
        isPrimary: false,
        hasBookingPermission: true,
        hasViewAccess: true,
      })),
    });

    if (input.studentIds?.length) {
      await Student.updateMany(
        { _id: { $in: input.studentIds } },
        { $addToSet: { parentIds: parent._id } },
      );
    }

    return parent;
  }

  async getParentById(id: string) {
    const parent = await Parent.findById(id)
      .populate("userId", "firstName lastName email")
      .populate("studentIds", "firstName lastName studentId grade");
    if (!parent) throw new AppError("Parent not found", 404);
    return parent;
  }

  async getParentByUserId(userId: string) {
    const parent = await Parent.findOne({ userId }).populate("studentIds", "firstName lastName studentId grade schoolId");
    if (!parent) throw new AppError("Parent profile not found", 404);
    return parent;
  }

  async updateParent(id: string, input: UpdateParentInput) {
    const parent = await Parent.findById(id);
    if (!parent) throw new AppError("Parent not found", 404);
    Object.assign(parent, input);
    await parent.save();
    return parent;
  }

  async addChild(parentId: string, studentId: string, relationship: string) {
    const parent = await Parent.findById(parentId);
    if (!parent) throw new AppError("Parent not found", 404);

    const student = await Student.findById(studentId);
    if (!student) throw new AppError("Student not found", 404);

    const alreadyLinked = parent.studentIds.some((sid: any) => sid.toString() === studentId);
    if (alreadyLinked) throw new AppError("Student already linked to this parent", 400);

    parent.studentIds.push(student._id as any);
    parent.relationshipToStudents.push({
      studentId: student._id as any,
      relationship: relationship as any,
      isPrimary: parent.studentIds.length === 0,
      hasBookingPermission: true,
      hasViewAccess: true,
    });
    parent.stats.childrenEnrolled = parent.studentIds.length;
    await parent.save();

    student.parentIds.push(parent.userId as any);
    await student.save();

    return parent;
  }

  async removeChild(parentId: string, studentId: string) {
    const parent = await Parent.findById(parentId);
    if (!parent) throw new AppError("Parent not found", 404);

    parent.studentIds = parent.studentIds.filter((sid: any) => sid.toString() !== studentId);
    parent.relationshipToStudents = parent.relationshipToStudents.filter((r: any) => r.studentId.toString() !== studentId);
    parent.stats.childrenEnrolled = parent.studentIds.length;
    await parent.save();

    await Student.findByIdAndUpdate(studentId, { $pull: { parentIds: parent.userId } });

    return parent;
  }

  async deleteParent(id: string) {
    const parent = await Parent.findById(id);
    if (!parent) throw new AppError("Parent not found", 404);
    parent.isActive = false;
    await parent.save();
    return parent;
  }
}

export const parentService = new ParentService();
