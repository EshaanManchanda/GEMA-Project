import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express.d";
import Teacher, { TeacherVerificationStatus } from "../models/Teacher";
import User, { UserRole } from "../models/User";
import { AppError } from "../middleware/error";

export const getMyTeacherApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const [user, teacherApplication] = await Promise.all([
      User.findById(userId).select("firstName lastName email phone role status"),
      Teacher.findOne({ userId }),
    ]);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Teacher application fetched",
      data: {
        user,
        application: teacherApplication,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submitTeacherApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const {
      profile,
      topics,
      ageRanges,
      experienceTypes,
      yearsOfExperience,
      qualifications,
      profileVideoUrl,
      acceptedTerms,
    } = req.body;

    if (!acceptedTerms) {
      return next(new AppError("You must accept terms before submitting", 400));
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      return next(new AppError("Select at least one topic", 400));
    }

    if (!Array.isArray(ageRanges) || ageRanges.length === 0) {
      return next(new AppError("Select at least one learner age range", 400));
    }

    if (!Array.isArray(experienceTypes) || experienceTypes.length === 0) {
      return next(new AppError("Select at least one experience type", 400));
    }

    const qualificationSentences = String(qualifications || "")
      .split(/[.!?]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (qualificationSentences.length < 4 || qualificationSentences.length > 5) {
      return next(
        new AppError(
          "Qualifications must contain 4-5 complete sentences",
          400,
        ),
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.role === UserRole.TEACHER) {
      return next(new AppError("You are already a teacher", 400));
    }

    if (profile?.firstName) {
      user.firstName = String(profile.firstName).trim();
    }
    if (profile?.lastName) {
      user.lastName = String(profile.lastName).trim();
    }
    if (profile?.phone) {
      user.phone = String(profile.phone).trim();
    }

    await user.save();

    const fullName = `${user.firstName} ${user.lastName}`.trim();

    const teacher = await Teacher.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          fullName,
          email: user.email,
          phone: user.phone || profile?.phone || "",
          subjects: topics,
          learnerAgeRanges: ageRanges,
          experienceTypes,
          yearsOfExperience,
          bio: qualifications,
          profileVideoUrl: profileVideoUrl || "",
          teachingMode: "online",
          verificationStatus: TeacherVerificationStatus.PENDING,
          isActive: false,
          isSuspended: false,
          termsAcceptedAt: new Date(),
          applicationSubmittedAt: new Date(),
          address: {
            address: "",
            city: "",
            country: "United Arab Emirates",
          },
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Teacher application submitted for admin review",
      data: {
        application: teacher,
      },
    });
  } catch (error) {
    next(error);
  }
};
