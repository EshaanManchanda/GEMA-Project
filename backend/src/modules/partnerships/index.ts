export { default as Partnership } from "./partnership.model";
export type { IPartnership, IPartnershipModel } from "./partnership.model";
export {
  submitPartnership,
  getAllPartnerships,
  getPartnershipById,
  updatePartnershipStatus,
  deletePartnership,
  getPartnershipStats,
} from "./partnership.controller";
export { default as partnershipRoutes } from "./partnership.routes";
