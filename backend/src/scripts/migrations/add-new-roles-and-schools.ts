import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";

async function migrate() {
  console.log("🚀 Starting migration: Add new roles and school support");

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  try {
    const Teacher = mongoose.model("Teacher");
    const School = mongoose.model("School");
    const User = mongoose.model("User");

    // 1. Create placeholder schools for teachers without schoolId
    const teachersWithoutSchool = await Teacher.find({ schoolId: { $exists: false } });
    console.log(`📋 Found ${teachersWithoutSchool.length} teachers without schoolId`);

    for (const teacher of teachersWithoutSchool) {
      let school = await School.findOne({ email: teacher.email });
      if (!school) {
        school = await School.create({
          userId: null,
          schoolName: `${teacher.fullName} (Independent)`,
          schoolType: "training_center",
          email: teacher.email,
          phone: teacher.phone || "",
          address: {
            street: teacher.address?.address || "Unknown",
            city: teacher.address?.city || "Unknown",
            state: teacher.address?.state || "",
            zipCode: teacher.address?.postalCode || "00000",
            country: teacher.address?.country || "United Arab Emirates",
          },
          verificationStatus: "verified",
          isActive: true,
          settings: {
            allowTeacherSelfRegistration: true,
            requireParentApprovalForBookings: false,
            autoGenerateCertificates: false,
            enableLMS: false,
            enableERP: false,
          },
          memberSince: teacher.memberSince || new Date(),
          slug: `${teacher.fullName}-independent`.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-"),
        });
        console.log(`  🏫 Created placeholder school: ${school.schoolName}`);
      }

      teacher.schoolId = school._id;
      await teacher.save();
      console.log(`  ✅ Updated teacher: ${teacher.fullName} → ${school.schoolName}`);
    }

    // 2. Update User model with profile references
    const allUsers = await User.find();
    console.log(`📋 Processing ${allUsers.length} users for profile references`);

    let updatedCount = 0;
    for (const user of allUsers) {
      let needsUpdate = false;

      switch (user.role) {
        case "vendor": {
          const Vendor = mongoose.model("Vendor");
          const vendor = await Vendor.findOne({ userId: user._id });
          if (vendor && !user.vendorId) {
            user.vendorId = vendor._id;
            needsUpdate = true;
          }
          break;
        }
        case "teacher": {
          const teacher = await Teacher.findOne({ userId: user._id });
          if (teacher && !user.teacherProfileId) {
            user.teacherProfileId = teacher._id;
            needsUpdate = true;
          }
          break;
        }
        case "employee": {
          const Employee = mongoose.model("Employee");
          const employee = await Employee.findOne({ userId: user._id });
          if (employee && !user.employeeProfileId) {
            user.employeeProfileId = employee._id;
            needsUpdate = true;
          }
          break;
        }
      }

      if (needsUpdate) {
        await user.save();
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} users with profile references`);
    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

migrate();
