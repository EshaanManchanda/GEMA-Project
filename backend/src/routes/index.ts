import authRoutes from './auth.routes';
import ticketRoutes from './ticket.routes';
import employeeRoutes from './employee.routes';
import checkinRoutes from './checkin.routes';
import venueRoutes from './venue.routes';
import eventRoutes from './event.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import reviewRoutes from './review.routes';
import uploadRoutes from './upload.routes';
import analyticsRoutes from './analytics.routes';
import adminUserRoutes from './admin.user.routes';
import adminEventRoutes from './admin.event.routes';
import adminVenueRoutes from './admin.venue.routes';
import vendorRoutes from './vendor.routes';
import blogRoutes from './blog.routes';
import adminBlogRoutes from './admin.blog.routes';
import { Router } from 'express';

const router = Router();

// Root route
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Gema API!' });
});

// Auth routes
router.use('/auth', authRoutes);

// Ticket routes
router.use('/tickets', ticketRoutes);

// Employee routes
router.use('/employees', employeeRoutes);

// Check-in routes
router.use('/checkin', checkinRoutes);

// Venue routes
router.use('/venues', venueRoutes);

// Event routes
router.use('/events', eventRoutes);

// Order routes
router.use('/orders', orderRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Review routes
router.use('/reviews', reviewRoutes);

// Upload routes
router.use('/uploads', uploadRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Admin User Management routes
router.use('/admin/users', adminUserRoutes);

// Admin Event Management routes
router.use('/admin/events', adminEventRoutes);

// Admin Venue Management routes
router.use('/admin/venues', adminVenueRoutes);

// Vendor routes
router.use('/vendors', vendorRoutes);

// Blog routes
router.use('/blogs', blogRoutes);

// Admin Blog Management routes
router.use('/admin/blogs', adminBlogRoutes);

export default router;