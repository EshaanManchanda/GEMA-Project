import { Request, Response, NextFunction } from "express";
import OrganizationOnboarding from "../models/OrganizationOnboarding";
import { AppError } from "../middleware/error";

export const getOrganizationOnboardingStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [stats] = await OrganizationOnboarding.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$reviewStatus", "pending"] }, 1, 0],
            },
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$reviewStatus", "approved"] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$reviewStatus", "rejected"] }, 1, 0],
            },
          },
          signedAgreements: {
            $sum: {
              $cond: [{ $ifNull: ["$agreementSignedAt", false] }, 1, 0],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: stats?.total || 0,
        pending: stats?.pending || 0,
        approved: stats?.approved || 0,
        rejected: stats?.rejected || 0,
        signedAgreements: stats?.signedAgreements || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationOnboardings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();

    const filter: any = {};

    if (status) {
      filter.reviewStatus = status;
    }

    if (search) {
      filter.$or = [
        { "application.organizationName": { $regex: search, $options: "i" } },
        { "application.primaryContactName": { $regex: search, $options: "i" } },
        { "application.organizationPhone": { $regex: search, $options: "i" } },
      ];
    }

    const [organizations, total] = await Promise.all([
      OrganizationOnboarding.find(filter)
        .populate("user", "firstName lastName email")
        .populate("reviewedBy", "firstName lastName email")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrganizationOnboarding.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        organizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewOrganizationOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const onboardingId = req.params.id;
    const { status, notes } = req.body;

    const onboarding = await OrganizationOnboarding.findById(onboardingId);

    if (!onboarding) {
      return next(new AppError("Organization onboarding record not found", 404));
    }

    if (!onboarding.applicationCompletedAt) {
      return next(new AppError("Application must be submitted before review", 400));
    }

    if (
      status === "approved" &&
      (!onboarding.agreementSignedAt || !onboarding.agreement?.acceptedTerms)
    ) {
      return next(
        new AppError(
          "Agreement must be signed and accepted before approval",
          400,
        ),
      );
    }

    onboarding.reviewStatus = status;
    onboarding.reviewNotes = notes || "";
    onboarding.reviewedAt = new Date();
    onboarding.reviewedBy = req.user?._id;

    await onboarding.save();

    const updated = await OrganizationOnboarding.findById(onboardingId)
      .populate("user", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Organization application approved"
          : "Organization application rejected",
      data: {
        onboarding: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};
