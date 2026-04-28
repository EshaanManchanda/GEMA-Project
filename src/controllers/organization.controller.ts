import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/express.d";
import OrganizationOnboarding from "../models/OrganizationOnboarding";
import { AppError } from "../middleware/error";

export const getOrganizationOnboarding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const onboarding = await OrganizationOnboarding.findOne({ user: userId });

    res.status(200).json({
      success: true,
      message: "Organization onboarding data fetched",
      data: {
        onboarding,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveOrganizationApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const { application } = req.body;

    const onboarding = await OrganizationOnboarding.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          user: userId,
          accountCreated: true,
          application,
          reviewStatus: "pending",
          reviewNotes: "",
          reviewedAt: null,
          reviewedBy: null,
          applicationCompletedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Organization application saved",
      data: {
        onboarding,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const signOrganizationAgreement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new AppError("Unauthorized", 401));
    }

    const { agreement } = req.body;

    const existing = await OrganizationOnboarding.findOne({ user: userId });

    if (!existing?.applicationCompletedAt) {
      return next(
        new AppError(
          "Please complete the organization application before signing agreement",
          400,
        ),
      );
    }

    const now = new Date();

    const onboarding = await OrganizationOnboarding.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          "agreement.legalName": agreement.legalName,
          "agreement.legalEntityType": agreement.legalEntityType,
          "agreement.incorporationLocation": agreement.incorporationLocation,
          "agreement.principalBusinessAddress":
            agreement.principalBusinessAddress,
          "agreement.backgroundChecksRequired":
            agreement.backgroundChecksRequired,
          "agreement.authorizedSignerName": agreement.authorizedSignerName,
          "agreement.authorizedSignerTitle": agreement.authorizedSignerTitle,
          "agreement.acceptedTerms": true,
          "agreement.signedAt": now,
          reviewStatus: "pending",
          reviewNotes: "",
          reviewedAt: null,
          reviewedBy: null,
          agreementSignedAt: now,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Organization agreement signed",
      data: {
        onboarding,
      },
    });
  } catch (error) {
    next(error);
  }
};
