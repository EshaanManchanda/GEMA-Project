import { body } from "express-validator";

export const saveOrganizationApplicationValidation = [
  body("application.organizationName")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required")
    .isLength({ max: 200 })
    .withMessage("Organization name cannot exceed 200 characters"),

  body("application.anticipatedTeachersNextMonth")
    .isInt({ min: 1 })
    .withMessage("Anticipated teachers must be at least 1")
    .toInt(),

  body("application.countryOfOperation")
    .optional({ nullable: true })
    .trim(),

  body("application.organizationWebsite")
    .optional({ nullable: true })
    .trim()
    .if(body("application.organizationWebsite").notEmpty())
    .isURL({ require_protocol: true, protocols: ["http", "https"] })
    .withMessage("Organization website must be a valid URL"),

  body("application.primaryContactName")
    .optional({ nullable: true })
    .trim(),

  body("application.primaryContactTitle")
    .optional({ nullable: true })
    .trim(),

  body("application.organizationPhone")
    .optional({ nullable: true })
    .trim()
    .if(body("application.organizationPhone").notEmpty())
    .isLength({ min: 6, max: 30 })
    .withMessage("Organization phone length is invalid"),

  body("application.foundedYear")
    .optional({ nullable: true })
    .trim(),

  body("application.teacherBackground")
    .optional({ nullable: true })
    .trim()
    .if(body("application.teacherBackground").notEmpty())
    .isLength({ min: 20 })
    .withMessage("Teacher background must be at least 20 characters"),

  body("application.learnerAudience")
    .optional({ nullable: true })
    .trim()
    .if(body("application.learnerAudience").notEmpty())
    .isLength({ min: 20 })
    .withMessage("Learner audience must be at least 20 characters"),

  body("application.classTypes")
    .optional({ nullable: true })
    .trim()
    .if(body("application.classTypes").notEmpty())
    .isLength({ min: 20 })
    .withMessage("Class types must be at least 20 characters"),

  body("application.firstClassDescription")
    .optional({ nullable: true })
    .trim()
    .if(body("application.firstClassDescription").notEmpty())
    .isLength({ min: 20 })
    .withMessage("First class description must be at least 20 characters"),

  body("application.referralSource")
    .optional({ nullable: true })
    .trim(),

  body("application.publicReviewsLinks")
    .optional()
    .isString()
    .withMessage("Public reviews links must be text"),

  body("application.additionalNotes")
    .optional()
    .isString()
    .withMessage("Additional notes must be text"),
];

export const signOrganizationAgreementValidation = [
  body("agreement.legalName")
    .trim()
    .notEmpty()
    .withMessage("Organization legal name is required"),

  body("agreement.legalEntityType")
    .trim()
    .notEmpty()
    .withMessage("Legal entity type is required"),

  body("agreement.incorporationLocation")
    .trim()
    .notEmpty()
    .withMessage("State or location of incorporation is required"),

  body("agreement.principalBusinessAddress")
    .optional({ nullable: true })
    .trim()
    .isString()
    .withMessage("Principal business address must be text"),

  body("agreement.backgroundChecksRequired")
    .custom((value) => value === true || value === "true")
    .withMessage("Background checks acknowledgment is required"),

  body("agreement.authorizedSignerName")
    .trim()
    .notEmpty()
    .withMessage("Authorized signature is required"),

  body("agreement.authorizedSignerTitle")
    .trim()
    .notEmpty()
    .withMessage("Authorized signer title is required"),

  body("agreement.acceptedTerms")
    .equals("true")
    .withMessage("You must accept the organization agreement"),
];
