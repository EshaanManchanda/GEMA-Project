export { default as Contact } from "./contact.model";
export type { IContact, IContactModel } from "./contact.model";
export {
  submitContact,
  getAllContacts,
  getContactById,
  markAsRead,
  markAsResponded,
  deleteContact,
  getContactStats,
} from "./contact.controller";
export { default as contactRoutes } from "./contact.routes";
