import { Router } from 'express';
import { query } from 'express-validator';
import { Event, Category, User } from '../models';
import { AppError } from '../middleware/index';

const router = Router();

/**
 * @desc    Global search across events, categories, and vendors
 * @route   GET /api/search
 * @access  Public
 */
router.get(
  '/',
  [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('type')
      .optional()
      .isIn(['events', 'categories', 'vendors', 'all'])
      .withMessage('Type must be one of: events, categories, vendors, all'),
  ],
  async (req, res, next) => {
    try {
      const { q, limit = 10, type = 'all' } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim() === '') {
        return res.status(200).json({
          success: true,
          message: 'No search query provided',
          data: {
            events: [],
            categories: [],
            vendors: [],
            total: 0,
          },
        });
      }

      const searchQuery = q.trim();
      const searchLimit = parseInt(limit as string);
      
      // Build regex for case-insensitive search
      const searchRegex = new RegExp(searchQuery, 'i');
      
      const results: any = {
        events: [],
        categories: [],
        vendors: [],
        total: 0,
      };

      // Search Events
      if (type === 'all' || type === 'events') {
        const events = await Event.find({
          $and: [
            { isApproved: true, isDeleted: false },
            {
              $or: [
                { title: searchRegex },
                { description: searchRegex },
                { tags: { $in: [searchRegex] } },
                { location: searchRegex },
              ],
            },
          ],
        })
          .select('title description price currency location images category type')
          .limit(searchLimit)
          .sort({ createdAt: -1 });

        results.events = events;
        results.total += events.length;
      }

      // Search Categories
      if (type === 'all' || type === 'categories') {
        const categories = await Category.find({
          $and: [
            { isActive: true },
            {
              $or: [
                { name: searchRegex },
                { description: searchRegex },
                { tags: { $in: [searchRegex] } },
              ],
            },
          ],
        })
          .select('name description slug icon')
          .limit(searchLimit)
          .sort({ name: 1 });

        results.categories = categories;
        results.total += categories.length;
      }

      // Search Vendors/Users
      if (type === 'all' || type === 'vendors') {
        const vendors = await User.find({
          $and: [
            { role: 'vendor', isActive: true },
            {
              $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { 'profile.businessName': searchRegex },
                { 'profile.description': searchRegex },
              ],
            },
          ],
        })
          .select('firstName lastName email profile.businessName profile.description profile.avatar')
          .limit(searchLimit)
          .sort({ createdAt: -1 });

        results.vendors = vendors;
        results.total += vendors.length;
      }

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: results,
        query: searchQuery,
      });
    } catch (error) {
      console.error('Search error:', error);
      return next(new AppError('Search failed', 500));
    }
  }
);

/**
 * @desc    Search events with advanced filters
 * @route   GET /api/search/events
 * @access  Public
 */
router.get(
  '/events',
  [
    query('q').optional().trim(),
    query('category').optional(),
    query('city').optional(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('page').optional().isInt({ min: 1 }),
  ],
  async (req, res, next) => {
    try {
      const {
        q,
        category,
        city,
        minPrice,
        maxPrice,
        dateFrom,
        dateTo,
        limit = 12,
        page = 1,
      } = req.query;

      const searchLimit = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const skip = (pageNum - 1) * searchLimit;

      // Build search filters
      const filters: any = {
        isApproved: true,
        isDeleted: false,
      };

      // Text search
      if (q && typeof q === 'string' && q.trim()) {
        const searchRegex = new RegExp(q.trim(), 'i');
        filters.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { tags: { $in: [searchRegex] } },
          { location: searchRegex },
        ];
      }

      // Category filter
      if (category) {
        filters.category = category;
      }

      // City filter
      if (city) {
        filters.location = new RegExp(city as string, 'i');
      }

      // Price filter
      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.$gte = parseFloat(minPrice as string);
        if (maxPrice) filters.price.$lte = parseFloat(maxPrice as string);
      }

      // Date filter
      if (dateFrom || dateTo) {
        filters['dateSchedule.date'] = {};
        if (dateFrom) filters['dateSchedule.date'].$gte = new Date(dateFrom as string);
        if (dateTo) filters['dateSchedule.date'].$lte = new Date(dateTo as string);
      }

      const events = await Event.find(filters)
        .select('title description price currency location images category type dateSchedule')
        .skip(skip)
        .limit(searchLimit)
        .sort({ createdAt: -1 });

      const total = await Event.countDocuments(filters);

      res.status(200).json({
        success: true,
        message: 'Event search completed successfully',
        data: {
          events,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / searchLimit),
            totalEvents: total,
            hasNextPage: pageNum < Math.ceil(total / searchLimit),
            hasPrevPage: pageNum > 1,
            limit: searchLimit,
          },
        },
        query: q || '',
        filters: { category, city, minPrice, maxPrice, dateFrom, dateTo },
      });
    } catch (error) {
      console.error('Event search error:', error);
      return next(new AppError('Event search failed', 500));
    }
  }
);

/**
 * @desc    Get search suggestions based on partial query
 * @route   GET /api/search/suggestions
 * @access  Public
 */
router.get(
  '/suggestions',
  [
    query('q')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Query must be between 2 and 50 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Limit must be between 1 and 10'),
  ],
  async (req, res, next) => {
    try {
      const { q, limit = 5 } = req.query;
      const searchLimit = parseInt(limit as string);
      const searchRegex = new RegExp(`^${q}`, 'i'); // Start with query

      const suggestions = [];

      // Get event title suggestions
      const eventTitles = await Event.find({
        isApproved: true,
        isDeleted: false,
        title: searchRegex,
      })
        .select('title')
        .limit(searchLimit)
        .sort({ title: 1 });

      suggestions.push(
        ...eventTitles.map(e => ({
          text: e.title,
          type: 'event',
          id: e._id,
        }))
      );

      // Get category suggestions
      const categories = await Category.find({
        isActive: true,
        name: searchRegex,
      })
        .select('name slug')
        .limit(searchLimit)
        .sort({ name: 1 });

      suggestions.push(
        ...categories.map(c => ({
          text: c.name,
          type: 'category',
          id: c._id,
          slug: c.slug,
        }))
      );

      // Remove duplicates and limit results
      const uniqueSuggestions = suggestions
        .filter((item, index, self) => 
          index === self.findIndex(t => t.text.toLowerCase() === item.text.toLowerCase())
        )
        .slice(0, searchLimit);

      res.status(200).json({
        success: true,
        message: 'Suggestions retrieved successfully',
        data: {
          suggestions: uniqueSuggestions,
          query: q,
        },
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      return next(new AppError('Failed to get suggestions', 500));
    }
  }
);

export default router;