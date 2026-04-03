# GEMA Master Documentation Index

Welcome to the central documentation repository for the GEMA Event Management Platform. All architecture, deployment, testing, and feature specification documents are categorized below.

## 🏗️ Architecture & Requirements (`/architecture/`)
- [Software Requirements Specification (SRS)](./architecture/srs.md)
- [Entity Relationship Diagram (ERD)](./architecture/erd.md)
- [Frontend Architecture](./architecture/frontend-architecture.md)
- [Getting Started / System Overview](./architecture/getting-started.md)
- [Security Guidelines](./architecture/security.md)
- [Security Middleware Architecture](./architecture/SECURITY.md)
- [Visual Implementation Guides](./architecture/VISUAL_IMPLEMENTATION_GUIDES.md)

## 🚀 Deployment Guides (`/deployment/`)
- [Unified Deployment Guide (Render, VPS, AWS, Vercel)](./deployment/deployment-guide.md)
- [Multi-Region Deployment](./deployment/DEPLOYMENT-MULTI-REGION.md)
- [Frontend Deployment specific](./deployment/FRONTEND_DEPLOYMENT_GUIDE.md)
- [MongoDB Atlas Setup Guide](./deployment/MONGODB_ATLAS_SETUP.md)
- [Redis Configuration](./deployment/REDIS_CONFIGURATION.md)
- [Redis Local Config](./deployment/REDIS_CONFIG_LOCAL.md)
- [Redis Cloud Config](./deployment/REDIS_CONFIGURATION_CLOUD.md)
- [CORS Fix Deployment Guide](./deployment/CORS_FIX_DEPLOYMENT_GUIDE.md)
- [Nginx Performance Upgrade](./deployment/PERFORMANCE-UPGRADE.md)
- [Publish Guide](./deployment/publish.md)

## 📚 API References & Flows (`/api/`)
- [Complete API Reference](./api/api-reference.md)
- [Postman Collection Guide](./api/POSTMAN_COLLECTION_GUIDE.md)
- [Postman JSON Collection (Generated)](./api/gema-api.postman_collection.json)
- [Postman JSON Collection (Complete)](./api/Gema-Complete-API.postman_collection.json)
- [Postman Environment Config](./api/gema.postman_environment.json)
- [Validators Structure](./api/VALIDATORS_README.md)
- **Domain API Docs**:
  - [Authentication](./api/authentication.md)
  - [Events](./api/events.md)
  - [File Uploads](./api/file-uploads.md)
  - [Orders & Payments](./api/orders-payments.md)
  - [Public APIs](./api/public-apis.md)
  - [Reviews & Ratings](./api/reviews-ratings.md)
  - [Venues & Vendors](./api/venues-vendors.md)
- **Data & System Flows**:
  - [Authentication Flow](./api/flow-auth.md)
  - [Booking Flow](./api/flow-booking.md)
  - [Payment Flow](./api/flow-payment.md)
  - [Refund Flow](./api/flow-refund.md)
  - [Ticketing Flow](./api/flow-ticket.md)

## 🧪 Testing Specifications (`/testing/`)
- **Domain Tests**:
  - [Authentication Tests](./testing/test-specs-auth.md)
  - [Events Tests](./testing/test-specs-events.md)
  - [Frontend/E2E Tests](./testing/test-specs-frontend.md)
  - [Payments Tests](./testing/test-specs-payments.md)
  - [Tickets Tests](./testing/test-specs-tickets.md)
  - [Vendors Tests](./testing/test-specs-vendors.md)
- **Guides**:
  - [Blog Testing Guide](./testing/BLOG_TESTING_GUIDE.md)
  - [Frontend Testing Guide](./testing/FRONTEND_TESTING_GUIDE.md)
  - [Teaching Events Verification](./testing/TEACHING_EVENTS_VERIFICATION_CHECKLIST.md)

## 📦 Feature Implementations (`/features/`)

### Blog & CMS System
- [Blog Editor Quick Start](./features/BLOG_EDITOR_QUICK_START.md)
- [Blog Implementation Details](./features/BLOG_IMPLEMENTATION.md)
- [Blog Styling Improvements](./features/BLOG_STYLING_IMPROVEMENTS.md)
- [Blog Fixes Summary](./features/BLOG_FIXES_SUMMARY.md)
- [TipTap Editor Usage Guide](./features/TIPTAP_USAGE_GUIDE.md)

### Teaching & Educational Events
- [Teaching Events Implementation Complete](./features/TEACHING_EVENTS_IMPLEMENTATION_COMPLETE.md)
- [Teacher Event Implementation Guide](./features/TEACHER_TEACHING_EVENT_IMPLEMENTATION.md)
- [Teaching Events Quick Reference](./features/TEACHING_EVENTS_QUICK_REFERENCE.md)
- [Teaching Events Admin Updates](./features/TEACHING_EVENTS_ADMIN_UPDATES.md)
- [Teacher Setup Guide](./features/TEACHER_TEACHING_EVENTS_GUIDE.md)
- [Teacher Quick Setup](./features/TEACHER_TEACHING_EVENTS_QUICK_SETUP.md)
- [Plan Teacher System original](./features/PLAN_TEACHER_SYSTEM.md)

### Various Features
- [Collection Sections Details](./features/COLLECTION_SECTIONS_SUMMARY.md)

## 📋 Summaries & Reports (`/summaries/`)
- [Final Optimization Report](./summaries/FINAL_OPTIMIZATION_REPORT.md)
- [Backend Optimization Report](./summaries/OPTIMIZATION_REPORT_BACKEND.md)
- [Frontend Optimization Report](./summaries/OPTIMIZATION_REPORT_FRONTEND.md)
- [Phase 1 Optimization](./summaries/PHASE1_OPTIMIZATION_SUMMARY.md)
- [Phase 2 Optimization](./summaries/PHASE2_OPTIMIZATION_SUMMARY.md)
- [Phase 3 Optimization](./summaries/PHASE3_OPTIMIZATION_SUMMARY.md)
- [Performance Improvements Summary](./summaries/PERFORMANCE-IMPROVEMENTS-SUMMARY.md)
- [Slug Migration Summary](./summaries/SLUG_MIGRATION_SUMMARY.md)
- [Slug Migration README](./summaries/README_SLUG_MIGRATION.md)
- [Implementation Summary](./summaries/IMPLEMENTATION_SUMMARY.md)
- [Implementation Complete README](./summaries/README_IMPLEMENTATION_COMPLETE.md)
- [Publication Readiness](./summaries/PUBLICATION_READINESS.md)
- [Migration Complete](./summaries/MIGRATION_COMPLETE.md)
- [CORS Success Summary](./summaries/CORS_SUCCESS_SUMMARY.md)

## 🐛 Debugging & Troubleshooting (`/troubleshooting/`)
- [Backend General Troubleshooting](./troubleshooting/troubleshooting.md)
- [Backend Fixes 2025-11-23](./troubleshooting/BACKEND_FIXES_2025-11-23.md)
- [Deployment Fix Instructions](./troubleshooting/DEPLOYMENT_FIX.md)
- [Immediate Action Required Notes](./troubleshooting/IMMEDIATE_ACTION_REQUIRED.md)
- [Troubleshoot CORS Guide](./troubleshooting/TROUBLESHOOT_CORS.md)
- [Signup Failure Analysis](./troubleshooting/SIGNUP_FAILURE_ANALYSIS.md)
- [Signup Debugging Guide](./troubleshooting/SIGNUP_DEBUGGING_GUIDE.md)
- [Signup Quick Fix](./troubleshooting/SIGNUP_QUICK_FIX.md)
- [TypeScript Errors Analysis](./troubleshooting/TYPESCRIPT_ERRORS.md)
- [Teacher ID Fix Notes](./troubleshooting/TEACHING_EVENT_TEACHERID_FIX.md)
- [CreateContext Error Fix](./troubleshooting/FIX_CREATECONTEXT_ERROR.md)
- [CSP Firebase Errors Fix](./troubleshooting/FIX_CSP_FIREBASE_ERRORS.md)

---
*Generated centrally to consolidate all `frontend`, `backend`, and legacy `doc` references.*
