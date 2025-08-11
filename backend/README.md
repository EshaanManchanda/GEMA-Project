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
- `POST /auth/verify-email` - Verify email with token
  - **Request Body:**
    ```json
    {
      "token": "some_verification_token"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Email verified successfully"
    }
    ```
- `POST /auth/resend-verification-email` - Resend email verification link
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
      "message": "Verification email sent successfully"
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

### General Endpoints

- `GET /` - Health check / Root route
  - **Request Body:** (None)
  - **Response:**
    ```json
    {
      "message": "Welcome to the Gema API!"
    }
    ```

## License

MIT