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