import { Router } from 'express';
import { createVenue, getVenueDetails, updateVenue, deleteVenue } from '../controllers/venue.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Protect all routes with authentication and authorization middleware
router.use(authenticate);

// Create Venue (Vendor/Admin only)
router.post('/', authorize(['vendor', 'admin']), createVenue);

// Get Venue Details (Vendor/Admin, or employee with permission)
router.get('/:venueId', authorize(['vendor', 'admin', 'employee']), getVenueDetails);

// Update Venue (Vendor/Admin only)
router.put('/:venueId', authorize(['vendor', 'admin']), updateVenue);

// Delete Venue (Vendor/Admin only)
router.delete('/:venueId', authorize(['vendor', 'admin']), deleteVenue);

export default router;