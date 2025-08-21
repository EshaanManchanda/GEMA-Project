# Gema Backend API

Backend API for Gema Event Management Platform with Firebase Authentication.

## Features

- Express.js REST API
- MongoDB with Mongoose ODM
- Firebase Authentication integration
- JWT-based authentication
- Role-based access control
- Input validation with express-validator
- Error handling middleware
- Security features (helmet, rate limiting, etc.)
- TypeScript support

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Firebase project (for authentication)

## Getting Started

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example` and fill in your configuration:

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gema
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=15
RATE_LIMIT_MAX=100
EMAIL_HOST=your_email_host
EMAIL_PORT=your_email_port
EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_email_from
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and select the providers you want to use (Email/Password, Google, Facebook, etc.)
3. Generate a new private key from Project Settings > Service Accounts > Firebase Admin SDK
4. Use the values from the downloaded JSON file to fill in your `.env` file

### Development

Start the development server:

```bash
npm run dev
```

### Database Seeding

Seed the database with initial data (roles, etc.):

```bash
npm run db:seed
```

### Production Build

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm run start:prod
```

## API Documentation

### Authentication Endpoints

- `POST /auth/register` - Register a new user
  - **Request Body:**
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "password": "password123"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "data": {
        "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "role": "customer",
        "status": "pending",
        "isEmailVerified": false,
        "isPhoneVerified": false,
        "createdAt": "2024-01-29T12:00:00.000Z",
        "updatedAt": "2024-01-29T12:00:00.000Z"
      }
    }
    ```
- `POST /auth/login` - Login with email and password
  - **Request Body:**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "password123"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "user": {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "role": "customer"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
- `POST /auth/logout` - Logout user
  - **Request Body:** (None)
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Logout successful"
    }
    ```
- `POST /auth/refresh-token` - Refresh access token
  - **Request Body:**
    ```json
    {
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Token refreshed successfully",
      "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```
- `GET /auth/me` - Get current user
  - **Request Body:** (None)
  - **Response:**
    ```json
    {
      "success": true,
      "message": "User data retrieved successfully",
      "data": {
        "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "role": "customer",
        "status": "active",
        "isEmailVerified": true,
        "isPhoneVerified": false,
        "createdAt": "2024-01-29T12:00:00.000Z",
        "updatedAt": "2024-01-29T12:00:00.000Z"
      }
    }
    ```
- `PUT /auth/profile` - Update user profile
  - **Request Body:**
    ```json
    {
      "firstName": "Jane",
      "lastName": "Doe"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Profile updated successfully",
      "data": {
        "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "role": "customer",
        "status": "active",
        "isEmailVerified": true,
        "isPhoneVerified": false,
        "createdAt": "2024-01-29T12:00:00.000Z",
        "updatedAt": "2024-01-29T12:30:00.000Z"
      }
    }
    ```
- `PUT /auth/change-password` - Change password
  - **Request Body:**
    ```json
    {
      "oldPassword": "password123",
      "newPassword": "new_password456"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Password changed successfully"
    }
    ```
- `POST /auth/forgot-password` - Request password reset
  - **Request Body:**
    ```json
    {
      "email": "john.doe@example.com"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Password reset email sent successfully"
    }
    ```
- `POST /auth/reset-password` - Reset password with token
  - **Request Body:**
    ```json
    {
      "token": "some_reset_token",
      "newPassword": "new_password456"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Password reset successfully"
    }
    ```
- `POST /auth/verify-email` - Verify email with OTP
  - **Request Body:**
    ```json
    {
      "otp": "1234"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Email verified successfully"
    }
    ```
- `POST /auth/resend-verification-email` - Resend email verification OTP
  - **Request Body:**
    ```json
    {
      "email": "john.doe@example.com"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Verification OTP sent successfully"
    }
    ```
- `POST /auth/firebase` - Authenticate with Firebase
  - **Request Body:**
    ```json
    {
      "idToken": "firebase_id_token"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Firebase authentication successful",
      "data": {
        "user": {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "role": "customer"
        },
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```

### Email Verification System

The system uses OTP-based email verification instead of token-based verification for enhanced security and user experience.

#### How OTP Email Verification Works

1. **Registration**: When a user registers, a 4-digit OTP is generated and sent to their email
2. **OTP Generation**: Random 4-digit numeric code (e.g., "1234")
3. **Expiration**: OTP expires after 10 minutes for security
4. **Verification**: User enters the OTP to verify their email address
5. **Resend**: Users can request a new OTP if the current one expires

#### OTP Features

- **4-digit numeric codes** for easy entry on mobile devices
- **10-minute expiration** time for enhanced security
- **Professional email templates** with clear OTP display
- **Resend functionality** for expired or lost OTPs
- **Rate limiting** to prevent OTP spam
- **Secure storage** with encrypted OTP codes in database

#### Email Template

The OTP verification email includes:
- Clear subject line: "Email Verification OTP - Gema"
- Prominent OTP display in large, readable font
- Security warnings about not sharing the code
- 10-minute expiration notice
- Professional Gema branding

#### Migration from Token-based Verification

**Previous System (Deprecated):**
- Used long random tokens (32-byte hex strings)
- 24-hour expiration time
- Required clicking email links
- Less mobile-friendly

**Current OTP System (Active):**
- Uses 4-digit numeric codes
- 10-minute expiration for better security
- Direct code entry in app
- Optimized for mobile devices
- Better user experience

### Firebase Authentication with React Native App

This section outlines the integration of Firebase Authentication with the MERN backend and a React Native application.

#### Overview of the Flow

1.  **React Native app** authenticates the user with Firebase.
2.  Firebase returns an **ID token** (short-lived JWT issued by Firebase).
3.  React Native sends that **ID token** to your backend.
4.  Your backend **verifies** the token with Firebase Admin SDK.
5.  Backend **finds or creates** a user in MongoDB linked to that Firebase UID.
6.  Backend generates its **own JWT & refresh token** for session handling.
7.  React Native stores and uses your backend’s tokens for all future requests.

#### Step-by-Step Implementation

##### Step 1 — Firebase Setup

1.  Go to <mcurl name="Firebase Console" url="https://console.firebase.google.com/"></mcurl> → Create Project.
2.  Enable **Firebase Authentication** and choose providers you need (Email/Password, Google, Facebook, etc.).
3.  Go to **Project Settings → Service Accounts → Generate New Private Key**.
4.  Save the downloaded JSON — you’ll use it in your backend `.env` file:

    ```env
    FIREBASE_PROJECT_ID=your_project_id
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your_project_id.iam.gserviceaccount.com
    ```

##### Step 2 — React Native App (Frontend)

Install Firebase for React Native:

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

**Initialize Firebase** in your RN app:

```js
import auth from '@react-native-firebase/auth';

// Email/Password Example
await auth().signInWithEmailAndPassword(email, password);

// Get Firebase ID token
const idToken = await auth().currentUser.getIdToken();
```

**Send `idToken` to your backend**:

```js
const response = await fetch('`https://your-backend.com/api/auth/firebase`', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken }),
});

const data = await response.json();
// Save backend's JWT & refresh token
```

##### Step 3 — Backend Firebase Admin SDK Setup

Install Firebase Admin SDK:

```bash
npm install firebase-admin
```

Initialize Firebase in your backend (<mcfile name="firebase.ts" path="e:\coding\gema\backend\src\config\firebase.ts"></mcfile>):

```ts
import admin from 'firebase-admin';
import { config } from './env';

export const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
        clientEmail: config.firebase.clientEmail,
      }),
    });
    console.log('Firebase Admin SDK initialized with provided credentials');
  }
};
```

Call `initializeFirebase()` in your <mcfile name="server.ts" path="e:\coding\gema\backend\src\server.ts"></mcfile> before routes.

##### Step 4 — Backend `/auth/firebase` Controller

Here’s the **core logic** in <mcsymbol name="firebaseAuth" filename="auth.controller.ts" path="e:\coding\gema\backend\src\controllers\auth.controller.ts" startline="549" type="function"></mcsymbol>:

```ts
import admin from 'firebase-admin';
import User from '../models/User';
import { generateToken, generateRefreshToken } from '../config/jwt';
import { AppError } from '../middleware';

export const firebaseAuth = async (req, res, next) => {
  const { idToken } = req.body;

  try {
    // 1. Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    // 2. Find or Create User in MongoDB
    let user = await User.findOne({ firebaseUid });
    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = await User.create({
        firebaseUid,
        email,
        isEmailVerified: decodedToken.email_verified,
        role: 'customer', // default role
        status: 'ACTIVE',
      });
    }

    // 3. Generate Backend Tokens
    const accessToken = generateToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    // 4. Respond
    res.status(200).json({
      success: true,
      message: 'Firebase authentication successful',
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });

  } catch (err) {
    return next(new AppError('Invalid Firebase ID token', 401));
  }
};
```

##### Step 5 — MongoDB User Schema

Make sure your <mcfile name="User.ts" path="e:\coding\gema\backend\src\models\User.ts"></mcfile> model has:

```ts
firebaseUid: { type: String, unique: true, sparse: true },
email: { type: String, unique: true, required: true },
isEmailVerified: { type: Boolean, default: false },
role: { type: String, enum: ['admin', 'vendor', 'customer'], default: 'customer' },
status: { type: String, enum: ['ACTIVE', 'PENDING', 'SUSPENDED'], default: 'ACTIVE' }
```

`sparse: true` ensures uniqueness only applies when a value exists.

##### Step 6 — Middleware to Verify Backend JWT

Once you issue your own JWT, verify it for protected routes using the <mcsymbol name="authenticate" filename="auth.ts" path="e:\coding\gema\backend\src\middleware\auth.ts" startline="10" type="function"></mcsymbol> middleware:

```ts
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

##### Step 7 — Future API Requests

React Native will:

*   Call `/auth/firebase` **only once after sign-in with Firebase**.
*   Store your **access & refresh tokens**.
*   Use them for all API calls to your backend.

**Result:**

*   Firebase handles sign-in and identity verification.
*   Your backend handles session control, role management, and MongoDB data.
*   React Native app only talks to your backend with your JWT after initial login.

### Event Endpoints

- `GET /events` - Get all approved events (Public)
  - **Query Parameters:**
    - `page` - Page number (optional, default: 1)
    - `limit` - Items per page (optional, default: 10, max: 50)
    - `category` - Filter by category (optional)
    - `type` - Event type: 'Event', 'Course', 'Venue' (optional)
    - `venueType` - 'Indoor' or 'Outdoor' (optional)
    - `city` - Filter by city (optional)
    - `minPrice` - Minimum price (optional)
    - `maxPrice` - Maximum price (optional)
    - `currency` - Currency filter (optional)
    - `ageMin` - Minimum age (optional)
    - `ageMax` - Maximum age (optional)
    - `featured` - Filter featured events (optional)
    - `search` - Text search (optional)
    - `sortBy` - Sort by field (optional)
    - `sortOrder` - 'asc' or 'desc' (optional)
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Events retrieved successfully",
      "data": {
        "events": [
          {
            "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
            "title": "Tech Conference 2024",
            "description": "Annual technology conference",
            "category": "Technology",
            "type": "Event",
            "venueType": "Indoor",
            "location": {
              "city": "Dubai",
              "address": "Dubai World Trade Centre",
              "coordinates": { "lat": 25.2048, "lng": 55.2708 }
            },
            "price": 250,
            "currency": "AED",
            "dateSchedule": [
              {
                "date": "2024-03-15T09:00:00.000Z",
                "availableSeats": 500,
                "price": 250
              }
            ],
            "tags": ["technology", "conference", "networking"],
            "images": ["event1.jpg"],
            "ageRange": [18, 65],
            "isApproved": true,
            "isFeatured": false,
            "viewsCount": 1250,
            "vendorId": "65b7d7e2f8e3a7b8c9d0e1f3",
            "createdAt": "2024-01-29T12:00:00.000Z"
          }
        ],
        "pagination": {
          "currentPage": 1,
          "totalPages": 5,
          "totalItems": 50,
          "limit": 10
        }
      }
    }
    ```

- `GET /events/:id` - Get single event by ID (Public)
  - **Parameters:** `id` - Event ID
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Event retrieved successfully",
      "data": {
        "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
        "title": "Tech Conference 2024",
        "description": "Annual technology conference",
        "vendor": {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f3",
          "firstName": "John",
          "lastName": "Doe",
          "email": "vendor@example.com"
        }
      }
    }
    ```

- `GET /events/categories` - Get event categories (Public)
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Categories retrieved successfully",
      "data": {
        "categories": ["Technology", "Music", "Sports", "Business", "Arts"]
      }
    }
    ```

- `POST /events` - Create new event (Vendor only)
  - **Request Body:**
    ```json
    {
      "title": "Tech Conference 2024",
      "description": "Annual technology conference",
      "category": "Technology",
      "type": "Event",
      "venueType": "Indoor",
      "ageRange": [18, 65],
      "location": {
        "city": "Dubai",
        "address": "Dubai World Trade Centre",
        "coordinates": { "lat": 25.2048, "lng": 55.2708 }
      },
      "price": 250,
      "currency": "AED",
      "dateSchedule": [
        {
          "date": "2024-03-15T09:00:00.000Z",
          "availableSeats": 500,
          "price": 250
        }
      ],
      "tags": ["technology", "conference"],
      "images": ["event1.jpg"]
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Event created successfully",
      "data": {
        "_id": "65b7d7e2f8e3a7b8c9d0e1f2",
        "title": "Tech Conference 2024",
        "isApproved": false,
        "createdAt": "2024-01-29T12:00:00.000Z"
      }
    }
    ```

- `PUT /events/:id` - Update event (Vendor - own events only)
  - **Parameters:** `id` - Event ID
  - **Request Body:** Event fields to update
  - **Response:** Updated event object

- `DELETE /events/:id` - Delete event (Vendor - own events only)
  - **Parameters:** `id` - Event ID
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Event deleted successfully"
    }
    ```

- `GET /events/vendor/my-events` - Get vendor's events (Vendor only)
  - **Query Parameters:** `page`, `limit`, `status`, `sortBy`, `sortOrder`
  - **Response:** Paginated list of vendor's events

- `GET /events/vendor/analytics` - Get vendor event analytics (Vendor only)
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Analytics retrieved successfully",
      "data": {
        "totalEvents": 15,
        "approvedEvents": 12,
        "pendingEvents": 2,
        "featuredEvents": 3,
        "totalViews": 5420,
        "avgPrice": 125.50
      }
    }
    ```

### Order Endpoints

- `POST /orders` - Create new order (Customer only)
  - **Request Body:**
    ```json
    {
      "items": [
        {
          "eventId": "65b7d7e2f8e3a7b8c9d0e1f2",
          "scheduleDate": "2024-03-15T09:00:00.000Z",
          "quantity": 2
        }
      ],
      "billingAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "+971501234567",
        "address": "123 Main St",
        "city": "Dubai",
        "state": "Dubai",
        "zipCode": "00000",
        "country": "UAE"
      },
      "notes": "Special requirements",
      "couponCode": "DISCOUNT10",
      "affiliateCode": "REF123"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Order created successfully",
      "data": {
        "_id": "65b7d7e2f8e3a7b8c9d0e1f4",
        "orderNumber": "ORD-2024-001",
        "items": [
          {
            "eventId": "65b7d7e2f8e3a7b8c9d0e1f2",
            "quantity": 2,
            "unitPrice": 250,
            "totalPrice": 500
          }
        ],
        "subtotal": 500,
        "tax": 25,
        "total": 525,
        "currency": "AED",
        "status": "pending",
        "paymentStatus": "pending",
        "createdAt": "2024-01-29T12:00:00.000Z"
      }
    }
    ```

- `GET /orders` - Get user's orders (Customer only)
  - **Query Parameters:** `page`, `limit`, `status`, `sortBy`, `sortOrder`
  - **Response:** Paginated list of user's orders

- `GET /orders/:id` - Get order details (Customer - own orders)
  - **Parameters:** `id` - Order ID
  - **Response:** Order with populated event details

- `PUT /orders/:id/cancel` - Cancel order (Customer - own orders)
  - **Parameters:** `id` - Order ID
  - **Request Body:**
    ```json
    {
      "reason": "Changed plans"
    }
    ```
  - **Response:** Updated order with cancelled status

- `POST /orders/:id/payment` - Process payment (Customer - own orders)
  - **Parameters:** `id` - Order ID
  - **Request Body:**
    ```json
    {
      "paymentMethod": "stripe",
      "paymentIntentId": "pi_1234567890"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Payment processed successfully",
      "data": {
        "order": {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f4",
          "status": "confirmed",
          "paymentStatus": "paid"
        },
        "tickets": [
          {
            "_id": "65b7d7e2f8e3a7b8c9d0e1f5",
            "ticketNumber": "TKT-2024-001",
            "qrCode": "data:image/png;base64,..."
          }
        ]
      }
    }
    ```

- `GET /orders/vendor/my-orders` - Get vendor's orders (Vendor only)
  - **Response:** Orders for vendor's events

### Payment Endpoints

- `GET /payments/config` - Get Stripe configuration (Public)
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "publishableKey": "pk_test_..."
      }
    }
    ```

- `POST /payments/create-intent` - Create payment intent (Customer only)
  - **Request Body:**
    ```json
    {
      "orderId": "65b7d7e2f8e3a7b8c9d0e1f4"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Payment intent created successfully",
      "data": {
        "clientSecret": "pi_1234567890_secret_...",
        "paymentIntentId": "pi_1234567890",
        "amount": 52500,
        "currency": "aed",
        "customerId": "cus_1234567890"
      }
    }
    ```

- `POST /payments/confirm` - Confirm payment (Customer only)
  - **Request Body:**
    ```json
    {
      "paymentIntentId": "pi_1234567890",
      "paymentMethodId": "pm_1234567890"
    }
    ```
  - **Response:** Payment confirmation with order status

- `POST /payments/cancel` - Cancel payment (Customer only)
  - **Request Body:**
    ```json
    {
      "paymentIntentId": "pi_1234567890"
    }
    ```
  - **Response:** Payment cancellation confirmation

- `GET /payments/payment-methods` - Get user's payment methods (Customer only)
  - **Response:** List of saved payment methods

- `DELETE /payments/payment-methods/:id` - Remove payment method (Customer only)
  - **Parameters:** `id` - Payment method ID
  - **Response:** Deletion confirmation

- `POST /payments/refund` - Process refund (Admin only)
  - **Request Body:**
    ```json
    {
      "orderId": "65b7d7e2f8e3a7b8c9d0e1f4",
      "amount": 525.00,
      "reason": "Event cancelled"
    }
    ```
  - **Response:** Refund confirmation with updated order

- `POST /payments/webhook` - Stripe webhook handler (Stripe only)
  - **Request:** Stripe webhook payload
  - **Response:** Webhook acknowledgment

### Ticket Endpoints

- `POST /tickets/generate` - Generate tickets (Vendor/Admin only)
  - **Request Body:**
    ```json
    {
      "orderId": "65b7d7e2f8e3a7b8c9d0e1f4",
      "eventId": "65b7d7e2f8e3a7b8c9d0e1f2",
      "attendees": [
        {
          "name": "John Doe",
          "email": "john.doe@example.com",
          "phone": "+971501234567",
          "ticketType": "Standard",
          "price": 250,
          "currency": "AED",
          "seatNumber": "A1"
        }
      ]
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Tickets generated successfully",
      "data": [
        {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f5",
          "ticketNumber": "TKT-2024-001",
          "qrCode": "data:image/png;base64,...",
          "attendeeName": "John Doe",
          "status": "active"
        }
      ]
    }
    ```

- `GET /tickets/:ticketId` - Get ticket details (Ticket holder/Vendor/Admin)
  - **Parameters:** `ticketId` - Ticket ID
  - **Response:** Ticket with event and attendee details

- `POST /tickets/:ticketId/transfer` - Transfer ticket (Ticket holder only)
  - **Parameters:** `ticketId` - Ticket ID
  - **Request Body:**
    ```json
    {
      "toEmail": "recipient@example.com",
      "message": "Transferring ticket to you"
    }
    ```
  - **Response:** Updated ticket with new owner

- `POST /tickets/:ticketId/resend` - Resend ticket (Ticket holder/Vendor/Admin)
  - **Parameters:** `ticketId` - Ticket ID
  - **Request Body:**
    ```json
    {
      "method": "email"
    }
    ```
  - **Response:** Resend confirmation

### Check-in Endpoints

- `POST /checkin` - Check-in ticket (Employee only)
  - **Request Body:**
    ```json
    {
      "ticketNumber": "TKT-2024-001",
      "employeeId": "65b7d7e2f8e3a7b8c9d0e1f6",
      "location": "Main Entrance",
      "deviceInfo": "iPad Pro 12.9",
      "geoLocation": {
        "lat": 25.2048,
        "lng": 55.2708
      },
      "notes": "Guest arrived on time"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Ticket checked in successfully",
      "data": {
        "ticket": {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f5",
          "status": "checked-in",
          "checkInDetails": {
            "isCheckedIn": true,
            "checkInTime": "2024-03-15T09:15:00.000Z",
            "location": "Main Entrance"
          }
        },
        "checkinLog": {
          "_id": "65b7d7e2f8e3a7b8c9d0e1f7",
          "scanResult": "success",
          "timestamp": "2024-03-15T09:15:00.000Z"
        }
      }
    }
    ```

- `GET /checkin/logs` - Get check-in logs (Vendor/Admin/Employee)
  - **Query Parameters:** `eventId`, `employeeId`, `scanResult`
  - **Response:** List of check-in logs with populated references

- `GET /checkin/summary` - Get check-in summary (Vendor/Admin)
  - **Query Parameters:** `eventId`
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Check-in summary retrieved successfully",
      "data": {
        "totalTickets": 500,
        "checkedInTickets": 450,
        "uncheckedTickets": 50,
        "uniqueAttendees": 450,
        "checkInRate": 90
      }
    }
    ```

### Employee Endpoints

- `POST /employees` - Create employee (Vendor/Admin only)
  - **Request Body:**
    ```json
    {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phone": "+971501234567",
      "role": "staff",
      "permissions": ["checkin", "view_reports"],
      "assignedEvents": ["65b7d7e2f8e3a7b8c9d0e1f2"],
      "assignedVenues": ["65b7d7e2f8e3a7b8c9d0e1f8"]
    }
    ```
  - **Response:** Created employee object

- `GET /employees/:employeeId` - Get employee details (Vendor/Admin/Employee)
  - **Parameters:** `employeeId` - Employee ID
  - **Response:** Employee with populated references

- `PUT /employees/:employeeId` - Update employee (Vendor/Admin/Employee)
  - **Parameters:** `employeeId` - Employee ID
  - **Request Body:** Employee fields to update
  - **Response:** Updated employee

- `DELETE /employees/:employeeId` - Delete employee (Vendor/Admin only)
  - **Parameters:** `employeeId` - Employee ID
  - **Response:** Deletion confirmation

- `POST /employees/assign-event` - Assign employee to event (Vendor/Admin)
  - **Request Body:**
    ```json
    {
      "employeeId": "65b7d7e2f8e3a7b8c9d0e1f6",
      "eventId": "65b7d7e2f8e3a7b8c9d0e1f2"
    }
    ```
  - **Response:** Updated employee

- `POST /employees/remove-event` - Remove employee from event (Vendor/Admin)
  - **Request Body:**
    ```json
    {
      "employeeId": "65b7d7e2f8e3a7b8c9d0e1f6",
      "eventId": "65b7d7e2f8e3a7b8c9d0e1f2"
    }
    ```
  - **Response:** Updated employee

### Venue Endpoints

- `POST /venues` - Create venue (Vendor/Admin only)
  - **Request Body:**
    ```json
    {
      "name": "Dubai Conference Center",
      "address": "123 Business Bay, Dubai",
      "coordinates": {
        "lat": 25.1972,
        "lng": 55.2744
      },
      "capacity": 1000,
      "venueType": "Indoor",
      "facilities": ["WiFi", "Parking", "AC"],
      "checkInGates": [
        {
          "name": "Main Entrance",
          "location": "Front of building"
        }
      ],
      "accessRules": "ID required for entry",
      "wifiCredentials": {
        "network": "VenueWiFi",
        "password": "password123"
      }
    }
    ```
  - **Response:** Created venue object

- `GET /venues/:venueId` - Get venue details (Venue owner only)
  - **Parameters:** `venueId` - Venue ID
  - **Response:** Venue details

- `PUT /venues/:venueId` - Update venue (Venue owner only)
  - **Parameters:** `venueId` - Venue ID
  - **Request Body:** Venue fields to update
  - **Response:** Updated venue

- `DELETE /venues/:venueId` - Delete venue (Venue owner only)
  - **Parameters:** `venueId` - Venue ID
  - **Response:** Deletion confirmation

### Review Endpoints

- `GET /reviews/:type/:id` - Get reviews for event/venue (Public)
  - **Parameters:**
    - `type` - 'event' or 'venue'
    - `id` - Target ID
  - **Query Parameters:** `page`, `limit`, `rating`, `verified`, `sortBy`, `sortOrder`
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Reviews retrieved successfully",
      "data": {
        "reviews": [
          {
            "_id": "65b7d7e2f8e3a7b8c9d0e1f9",
            "rating": 5,
            "title": "Excellent event!",
            "comment": "Great organization and content",
            "author": {
              "firstName": "John",
              "lastName": "D."
            },
            "isVerified": true,
            "helpful": 15,
            "notHelpful": 2,
            "createdAt": "2024-01-29T12:00:00.000Z"
          }
        ],
        "ratingStats": {
          "averageRating": 4.2,
          "totalReviews": 25,
          "distribution": {
            "5": 10,
            "4": 8,
            "3": 5,
            "2": 1,
            "1": 1
          }
        },
        "pagination": {
          "currentPage": 1,
          "totalPages": 3,
          "totalItems": 25
        }
      }
    }
    ```

- `POST /reviews` - Create review (Customer only)
  - **Request Body:**
    ```json
    {
      "type": "event",
      "targetId": "65b7d7e2f8e3a7b8c9d0e1f2",
      "orderId": "65b7d7e2f8e3a7b8c9d0e1f4",
      "rating": 5,
      "title": "Excellent event!",
      "comment": "Great organization and content",
      "pros": ["Well organized", "Great speakers"],
      "cons": ["Parking was limited"],
      "media": ["review1.jpg"]
    }
    ```
  - **Response:** Created review object

- `GET /reviews/my-reviews` - Get user's reviews (Private)
  - **Query Parameters:** `page`, `limit`
  - **Response:** User's reviews with pagination

- `PUT /reviews/:id` - Update review (Author only)
  - **Parameters:** `id` - Review ID
  - **Request Body:** Review fields to update
  - **Response:** Updated review

- `DELETE /reviews/:id` - Delete review (Author only)
  - **Parameters:** `id` - Review ID
  - **Response:** Deletion confirmation

- `POST /reviews/:id/vote` - Vote on review helpfulness (Private)
  - **Parameters:** `id` - Review ID
  - **Request Body:**
    ```json
    {
      "helpful": true
    }
    ```
  - **Response:** Updated vote counts

- `POST /reviews/:id/flag` - Flag review (Private)
  - **Parameters:** `id` - Review ID
  - **Request Body:**
    ```json
    {
      "reason": "inappropriate",
      "description": "Contains offensive language"
    }
    ```
  - **Response:** Flag confirmation

- `POST /reviews/:id/respond` - Vendor response to review (Vendor only)
  - **Parameters:** `id` - Review ID
  - **Request Body:**
    ```json
    {
      "message": "Thank you for your feedback!"
    }
    ```
  - **Response:** Updated review with vendor response

### Upload Endpoints

- `GET /uploads/files/*` - Serve uploaded files (Public)
  - **Response:** File content with appropriate headers

- `POST /uploads/single` - Upload single file (Private)
  - **Request:** Multipart form data with 'file' field
  - **Response:**
    ```json
    {
      "success": true,
      "message": "File uploaded successfully",
      "data": {
        "filename": "file_1234567890.jpg",
        "originalName": "my-image.jpg",
        "size": 256000,
        "mimetype": "image/jpeg",
        "url": "/api/uploads/files/misc/file_1234567890.jpg"
      }
    }
    ```

- `POST /uploads/multiple` - Upload multiple files (Private)
  - **Request:** Multipart form data with 'files' field (max 5 files)
  - **Response:** Array of uploaded file information

- `POST /uploads/event-images` - Upload event images (Private)
  - **Request:** Multipart form data with image fields
  - **Response:** Object with uploaded image information by field

- `POST /uploads/venue-images` - Upload venue images (Private)
  - **Request:** Multipart form data with image fields
  - **Response:** Object with uploaded image information by field

- `POST /uploads/avatar` - Upload user avatar (Private)
  - **Request:** Multipart form data with 'avatar' field
  - **Response:** Uploaded avatar information

- `POST /uploads/document` - Upload document (Private)
  - **Request:** Multipart form data with 'document' field
  - **Response:** Uploaded document information

- `DELETE /uploads/file/:filename` - Delete file (Private)
  - **Parameters:** `filename` - File name
  - **Query Parameters:** `category` - File category
  - **Response:** Deletion confirmation

- `GET /uploads/info/:filename` - Get file information (Private)
  - **Parameters:** `filename` - File name
  - **Query Parameters:** `category` - File category
  - **Response:** File metadata

- `GET /uploads/list/:category` - List files in category (Private)
  - **Parameters:** `category` - Category name
  - **Query Parameters:** `page`, `limit`
  - **Response:** Paginated file list

### Analytics Endpoints

- `GET /analytics/dashboard` - Get dashboard summary (Admin/Vendor)
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Dashboard summary retrieved successfully",
      "data": {
        "totalRevenue": 125000,
        "totalOrders": 450,
        "totalEvents": 15,
        "totalUsers": 1200,
        "recentActivity": [],
        "topEvents": [],
        "revenueGrowth": 12.5
      }
    }
    ```

- `GET /analytics/events` - Get event analytics (Admin/Vendor)
  - **Query Parameters:** `startDate`, `endDate`
  - **Response:** Event performance analytics

- `GET /analytics/orders` - Get order analytics (Admin/Vendor)
  - **Query Parameters:** `startDate`, `endDate`
  - **Response:** Order and revenue analytics

- `GET /analytics/tickets` - Get ticket analytics (Admin/Vendor)
  - **Query Parameters:** `startDate`, `endDate`
  - **Response:** Ticket sales and check-in analytics

- `GET /analytics/users` - Get user analytics (Admin only)
  - **Query Parameters:** `startDate`, `endDate`
  - **Response:** User registration and engagement analytics

- `GET /analytics/venues` - Get venue analytics (Admin/Vendor)
  - **Response:** Venue utilization analytics

- `GET /analytics/revenue` - Get revenue report (Admin/Vendor)
  - **Query Parameters:** `startDate`, `endDate`, `groupBy`
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Revenue report retrieved successfully",
      "data": {
        "totalRevenue": 125000,
        "totalOrders": 450,
        "averageOrderValue": 277.78,
        "revenueByPeriod": [
          {
            "period": "2024-01",
            "revenue": 25000,
            "orders": 90
          }
        ],
        "currencyBreakdown": [
          {
            "currency": "AED",
            "total": 100000,
            "percentage": 80
          }
        ]
      }
    }
    ```

- `GET /analytics/events/:eventId/performance` - Get event performance (Admin/Vendor)
  - **Parameters:** `eventId` - Event ID
  - **Response:** Detailed event performance metrics

- `GET /analytics/export` - Export analytics data (Admin/Vendor)
  - **Query Parameters:** `type`, `startDate`, `endDate`, `format`
  - **Response:** Analytics data in requested format (JSON/CSV)

### General Endpoints

- `GET /` - Health check / Root route
  - **Request Body:** (None)
  - **Response:**
    ```json
    {
      "message": "Welcome to the Gema API!"
    }
    ```

## Common Response Format

All API endpoints follow a consistent response structure:

```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "errors": any
}
```

## Authentication

### JWT Token Usage

For protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Roles and Permissions

- **Public**: No authentication required
- **Private**: Requires valid JWT token
- **Customer**: Can access customer-specific endpoints
- **Vendor**: Can manage their own events, orders, employees
- **Admin**: Full system access
- **Employee**: Limited access based on assigned permissions

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:
- Default: 100 requests per 15-minute window
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time

## Pagination

Paginated endpoints use consistent query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50/100)
- `sortBy`: Field to sort by
- `sortOrder`: 'asc' or 'desc' (default: 'desc')

## File Uploads

### Supported File Types
- **Images**: jpg, jpeg, png, gif (max 5MB)
- **Documents**: pdf, doc, docx (max 10MB)

### Upload Limits
- Single file: 1 file
- Multiple files: 5 files maximum
- Event/Venue images: 10 images maximum

## Webhooks

### Stripe Webhooks
- **Endpoint**: `POST /payments/webhook`
- **Events**: `payment_intent.succeeded`, `payment_intent.payment_failed`
- **Verification**: Stripe signature verification required

## License

MIT