import Student from "../../models/Student";
import Teacher from "../../models/Teacher";
import Certificate from "../../models/Certificate";
import { Section, make, pick, int, daysAgo, fullName, emailOf, phone, SCHOOLS, FIRST, LAST } from "./helpers";

export const education: Section = async (ctx) => {
  const parents = [...ctx.byRole("parent"), ...ctx.byRole("customer")];
  const teacherUsers = ctx.byRole("teacher");
  if (!parents.length) return [];

  const students = make("student", 24, (i) => {
    const first = pick(FIRST), last = pick(LAST);
    const at = daysAgo(int(0, 180));
    return {
      parentUserId: pick(parents)._id, firstName: first, lastName: last, email: emailOf(`${first}.${last}`, i),
      phone: phone(), gender: pick(["male", "female"]), grade: `Grade ${int(1, 12)}`, rollNumber: `R${1000 + i}`,
      dateOfBirth: daysAgo(365 * int(6, 17)), guardianRelation: pick(["father", "mother", "guardian"]), schoolId: pick(SCHOOLS),
      status: pick(["active", "active", "active", "inactive"]),
      address: { line1: "Al Wasl Rd", city: "Dubai", state: "Dubai", country: "AE", zip: "00000" },
      emergencyContact: { name: fullName(), phone: phone(), relation: "Parent" },
      createdAt: at, updatedAt: at,
    };
  });

  // userId is unique: leave users that already have a real Teacher profile alone.
  const taken = new Set((await Teacher.find({ userId: { $in: teacherUsers.map((u) => u._id) } }).select("userId").lean()).map((t: any) => String(t.userId)));
  const teachers = teacherUsers.filter((u) => !taken.has(String(u._id))).map((u, i) => ({
    _id: make("teacher", i + 1, () => ({}))[i]._id, userId: u._id,
    fullName: `${u.firstName || "Teacher"} ${u.lastName || i}`, email: u.email,
    teachingMode: pick(["online", "offline", "hybrid"]), verificationStatus: pick(["verified", "verified", "pending"]),
  }));

  const certificates = ctx.events.length ? make("certificate", 30, (i) => {
    const s = pick(students);
    const at = daysAgo(int(0, 90));
    return {
      eventId: pick(ctx.events)._id, userId: s.parentUserId, recipient: { name: `${s.firstName} ${s.lastName}`, email: s.email },
      status: pick(["generated", "emailed", "emailed", "pending", "failed"]),
      certificateNumber: `MOCK-CERT-${String(i + 1).padStart(4, "0")}`, createdAt: at, updatedAt: at,
    };
  }) : [];

  return [
    { label: "students", model: Student, docs: students },
    { label: "teachers", model: Teacher, docs: teachers },
    { label: "certificates", model: Certificate, docs: certificates },
  ];
};
