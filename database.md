# 💼 Database Schema Documentation

This document outlines the **MongoDB schema** for the Kidzapp Clone project using either **MERN** or **Next.js + MongoDB** architecture.

---

## 🧑‍💼 Users Collection (`users`)

```js
{
  _id: ObjectId,
  name: String,
  email: String,
  passwordHash: String,
  roles: [ObjectId], // Refers to roles collection
  isApproved: Boolean,
  profileImage: String,
  preferredLanguage: "en" | "ar",
  vendorProfile: {
    companyName: String,
    businessLicense: String,
    payoutAccount: String
  },
  timezone: String,
  loginProvider: String,
  isEmailVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📆 Roles Collection (`roles`)

```js
{
  _id: ObjectId,
  name: "admin" | "vendor" | "customer",
  permissions: ["event:create", "user:approve", "dashboard:view"]
}
```

---

## 🎉 Events Collection (`events`)

```js
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,
  type: "Event" | "Course" | "Venue",
  venueType: "Indoor" | "Outdoor",
  ageRange: [Number, Number],
  location: {
    city: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  vendorId: ObjectId,
  price: Number,
  currency: String,
  isApproved: Boolean,
  affiliateCode: String,
  tags: [String],
  dateSchedule: [
    {
      date: Date,
      availableSeats: Number,
      price: Number
    }
  ],
  seoMeta: {
    title: String,
    description: String,
    keywords: [String]
  },
  faqs: [
    {
      question: String,
      answer: String
    }
  ],
  viewsCount: Number,
  isFeatured: Boolean,
  images: [String],
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛒 Orders Collection (`orders`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  items: [
    {
      itemId: ObjectId,
      name: String,
      quantity: Number,
      price: Number,
      currency: String
    }
  ],
  totalCost: Number,
  currency: String,
  paymentStatus: "pending" | "paid" | "failed",
  affiliateCode: String,
  couponUsedId: ObjectId,
  trackingId: String,
  refundedAmount: Number,
  createdAt: Date
}
```

---

## 💸 Payment Transactions (`payments`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,
  gateway: "Stripe" | "PayPal" | "Razorpay",
  amount: Number,
  currency: String,
  paymentStatus: "pending" | "completed" | "refunded" | "failed",
  transactionId: String,
  paidAt: Date
}
```

---

## 💰 Affiliate Logs Collection (`affiliates`)

```js
{
  _id: ObjectId,
  affiliateCode: String,
  referrerUserId: ObjectId,
  eventId: ObjectId,
  clicks: Number,
  conversions: Number,
  commissionEarned: Number,
  lastUpdated: Date
}
```

---

## 📥 Submissions/Requests (`submissions`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  type: "event" | "support" | "vendor",
  status: "pending" | "approved" | "rejected",
  message: String,
  submittedAt: Date
}
```

---

## 📊 Analytics Collection (Optional)

```js
{
  _id: ObjectId,
  eventId: ObjectId,
  views: Number,
  uniqueVisitors: Number,
  shares: Number,
  sourceChannel: String,
  date: Date
}
```

---

## 📬 Contact/Leads Collection (`contacts`)

```js
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  message: String,
  status: "new" | "read" | "archived",
  createdAt: Date
}
```

---

## 🌎 Blog Posts Collection (`blogPosts`)

```js
{
  _id: ObjectId,
  title: String,
  slug: String,
  authorId: ObjectId,
  content: {
    en: String,
    ar: String
  },
  featuredImage: String,
  tags: [String],
  categories: [String],
  isPublished: Boolean,
  publishedAt: Date,
  seoMeta: {
    title: String,
    description: String,
    keywords: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📚 Blog Comments Collection (`blogComments`)

```js
{
  _id: ObjectId,
  postId: ObjectId,
  userId: ObjectId,
  comment: String,
  isApproved: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧃 Reviews Collection (`reviews`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  eventId: ObjectId,
  rating: Number,
  comment: String,
  isVerified: Boolean,
  likesCount: Number,
  isFlagged: Boolean,
  createdAt: Date
}
```

---

## 🌎 Currencies and Rates (`currencies`)

```js
{
  _id: ObjectId,
  base: String,
  rates: {
    AED: Number,
    EGP: Number,
    CAD: Number,
    USD: Number
  },
  updatedAt: Date
}
```

---

## 🌐 Languages (Translations) Collection (Optional)

```js
{
  _id: ObjectId,
  namespace: String,
  key: String,
  translations: {
    en: String,
    ar: String
  }
}
```

---

## 💴 Coupons Collection (`coupons`)

```js
{
  _id: ObjectId,
  code: String,
  type: "percentage" | "fixed",
  value: Number,
  applicableTo: [ObjectId],
  validTill: Date,
  createdBy: ObjectId
}
```

---

## 📄 Saved Items Collection (`savedItems`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  itemType: "event" | "course" | "product",
  itemId: ObjectId,
  createdAt: Date
}
```

---

## 📢 Notifications (`notifications`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  type: "booking" | "admin",
  message: String,
  isRead: Boolean,
  createdAt: Date
}
```

---

## ✉️ Audit Logs (`auditLogs`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  action: String,
  targetId: ObjectId,
  targetType: String,
  timestamp: Date,
  metadata: Object
}
```

---

## 🔒 Login Attempts (`loginAttempts`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  ipAddress: String,
  attemptType: "login" | "forgot_password",
  count: Number,
  lastAttempt: Date
}
```

---

## 🧾 User Sessions (`userSessions`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  sessionToken: String,
  deviceInfo: String,
  ipAddress: String,
  isActive: Boolean,
  createdAt: Date,
  expiresAt: Date
}
```

---

## 📈 AB Tests (`abTests`)

```js
{
  _id: ObjectId,
  name: String,
  variantA: Object,
  variantB: Object,
  targetAudience: String,
  startDate: Date,
  endDate: Date,
  metricsTracked: [String]
}
```

---

## ⚠️ Reports Collection (`reports`)

```js
{
  _id: ObjectId,
  reportedBy: ObjectId,
  targetType: "user" | "event" | "review",
  targetId: ObjectId,
  reason: String,
  status: "pending" | "resolved" | "ignored",
  createdAt: Date
}
```

---

## 🧪 Feature Flags (`featureFlags`)

```js
{
  _id: ObjectId,
  key: String,
  isEnabled: Boolean,
  userSegment: String,
  updatedAt: Date
}
```

---

## 💵 Vendor Payouts (`payouts`)

```js
{
  _id: ObjectId,
  vendorId: ObjectId,
  amount: Number,
  currency: String,
  status: "pending" | "approved" | "paid",
  payoutMethod: "bank_transfer" | "wallet",
  requestedAt: Date,
  paidAt: Date
}
```

---

## 📜 CMS Pages (`cmsPages`)

```js
{
  _id: ObjectId,
  slug: String,
  content: {
    en: String,
    ar: String
  },
  isPublished: Boolean,
  updatedAt: Date
}
```

---

## 🏦 Media Library (`media`)

```js
{
  _id: ObjectId,
  uploaderId: ObjectId,
  url: String,
  type: "image" | "video",
  context: "event" | "profile" | "blog",
  altText: String,
  publicId: String,
  createdAt: Date
}
```

---

## 💳 Refund Requests (`refundRequests`)

```js
{
  _id: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,
  reason: String,
  status: "requested" | "approved" | "rejected" | "processed",
  requestedAt: Date,
  processedAt: Date
}
```

---

Let me know if you need **ER diagrams**, **Mongoose models**, or **access control logic examples** next!
