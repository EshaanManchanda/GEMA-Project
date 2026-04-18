export { default as Employee } from "./employee.model";
export type { IEmployee } from "./employee.model";
export {
  createEmployee,
  getEmployeeDetails,
  updateEmployee,
  deleteEmployee,
  assignEmployeeToEvent,
  removeEmployeeFromEvent,
} from "./employees.controller";
export {
  getAllEmployees,
  getEmployeeStats,
  getEmployeeById,
  createEmployee as adminCreateEmployee,
  updateEmployee as adminUpdateEmployee,
  deleteEmployee as adminDeleteEmployee,
  bulkUpdateEmployees,
} from "./admin-employees.controller";
export { default as employeeRoutes } from "./employees.routes";
export { default as adminEmployeeRoutes } from "./admin-employees.routes";
