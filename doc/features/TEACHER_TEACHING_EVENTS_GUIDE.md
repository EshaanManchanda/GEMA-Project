# Teacher & Teaching Events Implementation Guide

## Overview

This document outlines the complete implementation of the Teacher and Teaching Events modules for the GEMA platform. The system allows teachers to create profiles and offer teaching classes to students.

## Backend Implementation

### Models

#### 1. **Teacher Model** (`backend/src/models/Teacher.ts`)
The Teacher model extends the User model with education and expertise information:

```typescript
Key Fields:
- userId: Reference to User model
- qualifications: Array of education credentials
- certifications: Array of professional certifications
- subjects: Array of subjects taught
- experience: Years of teaching experience
- specialization: Main area of expertise
- averageRating: Average rating from student reviews
- reviews: Array of student reviews
- basePrice: Base price per class
- teachingMethods: Array of teaching formats (online/offline/hybrid)
- status: active/inactive/suspended/pending
- isVerified: Admin verification status
- isApproved: Admin approval status
```

**Indexes**:
- userId
- email
- subjects
- location (2dsphere for proximity search)
- isVerified, isApproved, status
- createdAt, averageRating

#### 2. **TeachingEvent Model** (`backend/src/models/TeachingEvent.ts`)
The TeachingEvent model represents classes offered by teachers:

```typescript
Key Fields:
- teacherId: Reference to Teacher model
- subjects: Array of subjects covered
- ageRange: Min and max student age
- schedule: Array of class sessions with dates/times
- price: Price per class
- maxStudents: Class capacity
- enrolledStudents: Array of enrolled students with status
- learningObjectives: Course goals
- difficultyLevel: beginner/intermediate/advanced
- certificateOffered: Boolean flag for certificate
- status: draft/published/archived/pending/rejected/completed/cancelled
- isApproved: Admin approval status
```

**Indexes**:
- teacherId
- subjects
- location.city
- status, isApproved
- schedule.date

### Controllers

#### 1. **Teacher Controller** (`backend/src/controllers/teacher.controller.ts`)

**Public Routes**:
- `GET /api/teachers` - List all teachers with filters
- `GET /api/teachers/:id` - Get teacher details

**Protected Routes**:
- `POST /api/teachers` - Create new teacher profile
- `PUT /api/teachers/:id` - Update teacher profile
- `POST /api/teachers/:id/reviews` - Add review to teacher
- `GET /api/teachers/:id/events` - Get teacher's teaching events
- `DELETE /api/teachers/:id` - Soft delete teacher profile

**Features**:
- Pagination and filtering by subject, city, rating, price
- View count tracking
- Review management with rating calculations
- Profile verification and approval workflow

#### 2. **TeachingEvent Controller** (`backend/src/controllers/teaching-event.controller.ts`)

**Public Routes**:
- `GET /api/teaching-events` - List all teaching events
- `GET /api/teaching-events/:id` - Get event details

**Protected Routes**:
- `POST /api/teaching-events` - Create teaching event (teachers only)
- `PUT /api/teaching-events/:id` - Update event (teachers only)
- `POST /api/teaching-events/:id/enroll` - Enroll in event
- `POST /api/teaching-events/:id/unenroll` - Cancel enrollment
- `POST /api/teaching-events/:id/reviews` - Add review
- `DELETE /api/teaching-events/:id` - Soft delete event

**Features**:
- Enrollment management with capacity checking
- Schedule management
- Review and rating system
- Difficulty level filtering
- Teaching method filtering (online/offline/hybrid)

#### 3. **Admin Teacher Controller** (`backend/src/controllers/admin.teacher.controller.ts`)

**Admin Routes**:
- `GET /api/admin/teachers` - List all teachers (admin view)
- `GET /api/admin/teachers/:id` - Get teacher details
- `POST /api/admin/teachers` - Create teacher (admin can assign to user)
- `PUT /api/admin/teachers/:id` - Update teacher
- `PUT /api/admin/teachers/:id/approve` - Approve teacher
- `PUT /api/admin/teachers/:id/reject` - Reject teacher
- `PUT /api/admin/teachers/:id/featured` - Toggle featured status
- `DELETE /api/admin/teachers/:id` - Delete teacher (soft/permanent)
- `GET /api/admin/teachers/stats` - Get teacher statistics
- `PUT /api/admin/teachers/bulk` - Bulk update teachers

**Features**:
- Teacher approval workflow
- Featured teacher management
- Bulk operations
- Statistics and analytics

#### 4. **Admin TeachingEvent Controller** (`backend/src/controllers/admin.teaching-event.controller.ts`)

**Admin Routes**:
- `GET /api/admin/teaching-events` - List all events
- `GET /api/admin/teaching-events/:id` - Get event details
- `POST /api/admin/teaching-events` - Create event (admin can assign to teacher)
- `PUT /api/admin/teaching-events/:id` - Update event
- `PUT /api/admin/teaching-events/:id/approve` - Approve event
- `PUT /api/admin/teaching-events/:id/reject` - Reject event
- `PUT /api/admin/teaching-events/:id/featured` - Toggle featured
- `DELETE /api/admin/teaching-events/:id` - Delete event
- `GET /api/admin/teaching-events/stats` - Get statistics
- `PUT /api/admin/teaching-events/bulk` - Bulk update

### Routes

#### Public Routes
```
GET  /api/teachers                    - List teachers
GET  /api/teachers/:id                - Get teacher
GET  /api/teaching-events             - List teaching events
GET  /api/teaching-events/:id         - Get event details
```

#### Teacher Protected Routes
```
POST /api/teachers                    - Create profile
PUT  /api/teachers/:id                - Update profile
POST /api/teachers/:id/reviews        - Add review
GET  /api/teachers/:id/events         - Get my events
POST /api/teaching-events             - Create event
PUT  /api/teaching-events/:id         - Update event
DELETE /api/teaching-events/:id       - Delete event
```

#### Student Protected Routes
```
POST /api/teaching-events/:id/enroll    - Enroll in event
POST /api/teaching-events/:id/unenroll  - Cancel enrollment
POST /api/teaching-events/:id/reviews   - Add review
```

#### Admin Routes
```
GET    /api/admin/teachers             - List all teachers
POST   /api/admin/teachers             - Create teacher
GET    /api/admin/teachers/:id         - Get teacher
PUT    /api/admin/teachers/:id         - Update teacher
PUT    /api/admin/teachers/:id/approve - Approve
PUT    /api/admin/teachers/:id/reject  - Reject
DELETE /api/admin/teachers/:id         - Delete
GET    /api/admin/teaching-events      - List events
POST   /api/admin/teaching-events      - Create event
GET    /api/admin/teaching-events/:id  - Get event
PUT    /api/admin/teaching-events/:id  - Update event
```

## Frontend Implementation

### Components Structure

```
src/components/
├── teacher/
│   ├── TeacherCard.tsx           - Display teacher in grid/list
│   ├── TeacherProfile.tsx        - Full teacher profile view
│   ├── TeachersList.tsx          - Teachers list with filters
│   └── index.ts
├── teaching-event/
│   ├── TeachingEventCard.tsx     - Display event in grid/list
│   ├── TeachingEventsList.tsx    - Events list with filters
│   ├── TeachingEventDetail.tsx   - Full event details
│   └── index.ts
```

### Components

#### 1. **TeacherCard** (`TeacherCard.tsx`)
Displays teacher in a card format for lists and grids.

**Features**:
- Teacher profile image
- Rating and review count
- Location and experience
- Subjects list
- Base price per class
- Featured badge
- Click handler for details view

**Props**:
```typescript
interface TeacherCardProps {
  teacher: Teacher;
  onViewDetails: (teacherId: string) => void;
}
```

#### 2. **TeacherProfile** (`TeacherProfile.tsx`)
Detailed teacher profile page with multiple tabs.

**Features**:
- Cover image with featured badge
- Profile section with rating
- Multiple tabs: About, Qualifications, Reviews
- Qualifications and certifications display
- Languages spoken
- Teaching methods
- View classes button
- Verification status

**Props**:
```typescript
interface TeacherProfileProps {
  teacher: Teacher;
}
```

#### 3. **TeachersList** (`TeachersList.tsx`)
Browse and search teachers with advanced filters.

**Features**:
- Search bar
- Filter panel (subjects, location, price, rating)
- Pagination
- Responsive grid layout
- Loading states
- Empty states
- Filter clearing

**Filters Available**:
- Search term
- Subject selection
- Location (city)
- Max price
- Minimum rating

#### 4. **TeachingEventCard** (`TeachingEventCard.tsx`)
Displays teaching event in card format.

**Features**:
- Event image/placeholder
- Teacher info
- Subjects list
- Next class date/time
- Teaching method badge
- Available seats count
- Rating display
- Price per class
- Difficulty level badge
- Featured badge

**Props**:
```typescript
interface TeachingEventCardProps {
  event: TeachingEvent;
  onViewDetails: (eventId: string) => void;
}
```

#### 5. **TeachingEventsList** (`TeachingEventsList.tsx`)
Browse and search teaching events with filters.

**Features**:
- Search bar
- Filter panel (subjects, teaching method, difficulty, location, price, rating)
- Pagination
- Responsive grid layout
- Loading and empty states

**Filters Available**:
- Search term
- Subject selection
- Teaching method (online/offline/hybrid)
- Difficulty level
- Location (city)
- Max price
- Minimum rating

#### 6. **TeachingEventDetail** (`TeachingEventDetail.tsx`)
Detailed view of a teaching event.

**Features**:
- Hero image
- Event title and basic info
- Rating and reviews
- Enroll button with enrollment modal
- Tabs: About, Schedule, Teacher, FAQs
- Learning objectives checklist
- Prerequisites and materials
- Certificate info
- Teacher profile preview
- Schedule display with meeting links
- FAQ accordion
- Enrollment capacity tracking

**Props**:
```typescript
interface TeachingEventDetailProps {
  event: TeachingEventDetail;
  isEnrolled?: boolean;
  onEnroll?: () => void;
  onUnenroll?: () => void;
}
```

### Types

All TypeScript types are defined in `src/types/teacher.ts`:

- `ITeacher` - Complete teacher interface
- `ITeachingEvent` - Complete event interface
- `IQualification` - Education credential
- `ICertification` - Professional certification
- `ITeachingSchedule` - Class session details
- `ITeachingSession` - Enrollment record
- `IApiResponse<T>` - API response wrapper

## Database Schema

### Teacher Collection
```javascript
{
  userId: ObjectId,
  firstName: String,
  lastName: String,
  email: String,
  profileImage: String,
  bio: String,
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    country: String
  }],
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    certificateUrl: String
  }],
  subjects: [String],
  experience: Number,
  specialization: String,
  location: {
    city: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  teachingMethods: [String],
  basePrice: Number,
  currency: String,
  averageRating: Number,
  totalRatings: Number,
  reviews: [...],
  status: String,
  isVerified: Boolean,
  isApproved: Boolean,
  isFeatured: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### TeachingEvent Collection
```javascript
{
  teacherId: ObjectId,
  title: String,
  description: String,
  subjects: [String],
  ageRange: [Number, Number],
  teachingMethod: String,
  location: {
    city: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  schedule: [{
    date: Date,
    startTime: String,
    endTime: String,
    availableSeats: Number,
    price: Number,
    meetingLink: String
  }],
  duration: Number,
  frequency: String,
  price: Number,
  currency: String,
  maxStudents: Number,
  enrolledStudents: [{
    studentId: ObjectId,
    status: String,
    enrollmentDate: Date,
    rating: Number,
    feedback: String
  }],
  learningObjectives: [String],
  materials: [String],
  certificateOffered: Boolean,
  difficultyLevel: String,
  status: String,
  isApproved: Boolean,
  isFeatured: Boolean,
  averageRating: Number,
  reviewCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## API Examples

### Create Teacher Profile
```bash
POST /api/teachers
Content-Type: application/json
Authorization: Bearer <token>

{
  "bio": "Experienced math teacher with 10+ years experience",
  "qualifications": [{
    "degree": "Master's",
    "institution": "University",
    "year": 2015,
    "country": "UAE"
  }],
  "subjects": ["Mathematics", "Algebra"],
  "experience": 10,
  "specialization": "Advanced Mathematics",
  "teachingMethods": ["online", "offline"],
  "basePrice": 100,
  "location": {
    "city": "Dubai"
  }
}
```

### Create Teaching Event
```bash
POST /api/teaching-events
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Advanced Mathematics Class",
  "description": "Learn advanced math concepts",
  "subjects": ["Mathematics"],
  "ageRange": [14, 18],
  "teachingMethod": "online",
  "schedule": [{
    "date": "2024-01-15",
    "startTime": "14:00",
    "endTime": "15:00",
    "availableSeats": 20,
    "price": 100
  }],
  "duration": 60,
  "frequency": "weekly",
  "maxStudents": 20,
  "difficultyLevel": "intermediate",
  "category": "Education",
  "learningObjectives": ["Learn calculus basics"],
  "seoMeta": {
    "title": "Advanced Math Class",
    "description": "Learn advanced mathematics",
    "keywords": ["math", "advanced"]
  }
}
```

### Enroll in Teaching Event
```bash
POST /api/teaching-events/:id/enroll
Authorization: Bearer <token>
```

### Add Review to Teaching Event
```bash
POST /api/teaching-events/:id/reviews
Content-Type: application/json
Authorization: Bearer <token>

{
  "rating": 5,
  "comment": "Great class! Learned a lot."
}
```

## File Locations Summary

### Backend Files
- **Models**: `backend/src/models/Teacher.ts`, `backend/src/models/TeachingEvent.ts`
- **Controllers**: 
  - `backend/src/controllers/teacher.controller.ts`
  - `backend/src/controllers/teaching-event.controller.ts`
  - `backend/src/controllers/admin.teacher.controller.ts`
  - `backend/src/controllers/admin.teaching-event.controller.ts`
- **Routes**: 
  - `backend/src/routes/teacher.routes.ts`
  - `backend/src/routes/teaching-event.routes.ts`
  - `backend/src/routes/admin.teacher.routes.ts`
  - `backend/src/routes/admin.teaching-event.routes.ts`

### Frontend Files
- **Components**: `frontend/src/components/teacher/` and `frontend/src/components/teaching-event/`
- **Types**: `frontend/src/types/teacher.ts`

## Admin Panel Features

The admin panel includes comprehensive management for both Teachers and Teaching Events:

### Teacher Management
- View all teachers with advanced filtering
- Approve/reject teacher applications
- Mark teachers as verified/featured
- Bulk operations (approve multiple, delete, etc.)
- View teacher statistics and analytics
- Suspend/activate teacher accounts

### Teaching Event Management
- View all teaching events with filtering
- Approve/reject event submissions
- Mark events as featured
- Bulk operations
- View event statistics
- Manage enrollment and student feedback

## Verification & Approval Workflow

### Teacher Workflow
1. User creates teacher profile (status: pending)
2. Admin reviews and approves (status: active)
3. Teacher can then create teaching events

### TeachingEvent Workflow
1. Teacher creates event (status: pending)
2. Admin reviews and approves (status: published)
3. Students can enroll in published events

## SEO Features

- SEO meta tags for teachers and events
- Custom URLs for teacher and event pages
- Sitemap generation for teachers and events
- Structured data markup
- Meta descriptions and keywords

## Future Enhancements

1. **Payment Integration**: Stripe/Razorpay integration for class payments
2. **Live Classes**: Video integration for online teaching
3. **Certification System**: Digital certificates for course completion
4. **Progress Tracking**: Student progress and performance metrics
5. **Scheduling System**: Calendar integration for class scheduling
6. **Chat System**: Direct messaging between teachers and students
7. **Attendance Tracking**: Attendance management system
8. **Performance Analytics**: Teacher and student analytics dashboard
9. **Recommendation Engine**: AI-based teacher and class recommendations
10. **Subscription Plans**: Monthly/yearly subscription options

## Support & Documentation

For additional help or questions:
- Refer to API documentation in `/docs` folder
- Check Postman collection for API examples
- Review existing event implementation for patterns
- Check vendor and employee implementations for similar patterns
