import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../models/index";
import {
  getAllVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  approveVenue,
  rejectVenue,
  updateVenueStatus,
  bulkUpdateVenues,
  getVenueStats,
} from "./admin-venue.controller";

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

router.get("/stats", getVenueStats);

router.post("/", createVenue);

router.get("/", getAllVenues);

router.get("/:id", getVenueById);

router.put("/:id", updateVenue);

router.delete("/:id", deleteVenue);

router.put("/:id/approve", approveVenue);

router.put("/:id/reject", rejectVenue);

router.put("/:id/status", updateVenueStatus);

router.patch("/bulk", bulkUpdateVenues);

export default router;
