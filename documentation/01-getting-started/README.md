# Getting Started with Gema Event Management Platform

## 🚀 Welcome to Gema

The Gema Event Management Platform is a comprehensive full-stack application modeled after [Kidzapp.com](https://kidzapp.com/), enabling families to discover and book kids' activities. This section contains everything you need to get started with the platform.

---

## 📑 Section Contents

### [📋 Project Overview](./project-overview.md)
Complete introduction to the Gema platform including:
- System overview and key features
- Technology stack and architecture
- User roles and permissions
- Core functionality breakdown

### [🏗️ Project Structure](./project-structure.md)
Detailed project organization including:
- Backend file structure and patterns
- Frontend component organization
- Key directories and their purposes
- Code organization principles

### [⚡ Quick Setup Guide](./quick-setup.md)
Get running in 5 minutes with:
- Prerequisites and dependencies
- Installation instructions
- Environment configuration
- First-run verification

---

## 🎯 Quick Start (5 Minutes)

```bash
# 1. Clone the repository
git clone <repository-url>
cd gema

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run db:seed
npm run dev

# 3. Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev
```

**Access Points:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## 🌟 Key Platform Features

### 🔐 Authentication & User Management
- Multi-role authentication (Customer, Vendor, Admin, Employee)
- JWT-based security with refresh tokens
- Firebase integration for social login
- Role-based access control (RBAC)

### 🎫 Event Management System
- Comprehensive event creation and management
- Vendor approval workflows
- Multi-category event organization
- Advanced scheduling and availability

### 💳 E-commerce Integration
- Stripe payment processing
- Shopping cart functionality
- Order management and tracking
- Automated booking confirmations

### 👨‍💼 Administrative Interface
- Complete admin dashboard
- User and vendor management
- Event moderation workflows
- Analytics and reporting

### 🌍 Internationalization
- Multi-language support (English/Arabic)
- RTL layout support
- Multi-currency functionality
- Localized content management

---

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend    │    │   Database      │
│   (React)       │◄───│   (Express)  │◄───│   (MongoDB)     │
│   TypeScript    │    │   Node.js    │    │   25+ Collections│
│   Redux Toolkit │    │   TypeScript │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                       
                       ┌──────────────┐              
                       │   Services   │              
                       │ • Firebase   │              
                       │ • Stripe     │              
                       │ • Cloudinary │              
                       │ • Nodemailer │              
                       └──────────────┘              
```

---

## 🛣️ Learning Path

### 👨‍💻 For Developers
1. **Start Here**: [Quick Setup Guide](./quick-setup.md)
2. **Understand Structure**: [Project Structure](./project-structure.md)
3. **API Documentation**: [Backend API Reference](../03-backend/api-reference.md)
4. **Component Guide**: [Frontend Components](../04-frontend/component-architecture.md)

### 👨‍💼 For Product Managers
1. **Platform Overview**: [Project Overview](./project-overview.md)
2. **Admin Features**: [Admin System Overview](../05-admin-system/admin-overview.md)
3. **User Workflows**: [Testing Strategy](../08-testing/testing-overview.md)

### 🚀 For DevOps Engineers
1. **System Architecture**: [Project Structure](./project-structure.md)
2. **Deployment Guide**: [Deployment Overview](../07-deployment/deployment-overview.md)
3. **Monitoring Setup**: [System Monitoring](../09-maintenance/monitoring.md)

---

## 📋 Prerequisites

### Development Environment
- **Node.js** v18+ and npm
- **MongoDB** (local or MongoDB Atlas)
- **Git** for version control
- **Code Editor** (VS Code recommended)

### External Services (Optional)
- **Firebase Project** for authentication
- **Stripe Account** for payments
- **Cloudinary Account** for media storage
- **SMTP Provider** for email services

---

## 🆘 Need Help?

- **Setup Issues**: Check [Troubleshooting Guide](../09-maintenance/troubleshooting.md)
- **API Questions**: See [Backend Documentation](../03-backend/)
- **Frontend Help**: Review [Frontend Documentation](../04-frontend/)
- **Deployment Problems**: Consult [Deployment Guide](../07-deployment/)

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| Project Repository | [GitHub Repository](#) |
| Live Demo | [Demo Site](#) |
| API Documentation | [Backend API](../03-backend/api-reference.md) |
| Component Library | [Frontend Components](../04-frontend/component-architecture.md) |
| Admin Panel Demo | [Admin Interface](#) |

---

**Next Step**: Choose your path above or start with the [Quick Setup Guide](./quick-setup.md) to get the platform running locally.