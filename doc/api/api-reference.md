# Gema Event Management Platform

API documentation for Gema Event Management Platform

**Version:** 1.0.0

## Servers

- http://localhost:8000 - Development server

## Endpoints

### /categories/:id/toggle-status

#### PATCH

**Summary:** PATCH /categories/:id/toggle-status

Endpoint for PATCH /categories/:id/toggle-status

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /models

#### GET

**Summary:** GET /models

Endpoint for GET /models

**Responses:**

- **200**: Successful response

---

### /stats

#### GET

**Summary:** GET /stats

Endpoint for GET /stats

**Responses:**

- **200**: Successful response

---

#### USE

**Summary:** USE /stats

Endpoint for USE /stats

**Responses:**

- **200**: Successful response

---

### /validate

#### POST

**Summary:** POST /validate

Endpoint for POST /validate

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /execute

#### POST

**Summary:** POST /execute

Endpoint for POST /execute

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /export/Category

#### POST

**Summary:** POST /export/Category

Endpoint for POST /export/Category

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /export/User

#### POST

**Summary:** POST /export/User

Endpoint for POST /export/User

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /export/:model

#### POST

**Summary:** POST /export/:model

Endpoint for POST /export/:model

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| model | path | string | Yes | Path parameter: model |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /bulk

#### PATCH

**Summary:** PATCH /bulk

Endpoint for PATCH /bulk

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

#### POST

**Summary:** POST /bulk

Endpoint for POST /bulk

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /

#### GET

**Summary:** GET /

Endpoint for GET /

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

#### POST

**Summary:** POST /

Endpoint for POST /

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

#### USE

**Summary:** USE /

Endpoint for USE /

**Responses:**

- **200**: Successful response

---

### /:id

#### GET

**Summary:** GET /:id

Endpoint for GET /:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

#### PUT

**Summary:** PUT /:id

Endpoint for PUT /:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /:id

Endpoint for DELETE /:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### PATCH

**Summary:** PATCH /:id

Endpoint for PATCH /:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /:id/events

#### POST

**Summary:** POST /:id/events

Endpoint for POST /:id/events

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/events/:eventId

#### DELETE

**Summary:** DELETE /:id/events/:eventId

Endpoint for DELETE /:id/events/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /commissions

#### GET

**Summary:** GET /commissions

Endpoint for GET /commissions

**Responses:**

- **200**: Successful response

---

#### POST

**Summary:** POST /commissions

Endpoint for POST /commissions

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /commissions/:id

#### GET

**Summary:** GET /commissions/:id

Endpoint for GET /commissions/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### PUT

**Summary:** PUT /commissions/:id

Endpoint for PUT /commissions/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /commissions/:id

Endpoint for DELETE /commissions/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /commissions/:id/set-default

#### PUT

**Summary:** PUT /commissions/:id/set-default

Endpoint for PUT /commissions/:id/set-default

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /commission-templates

#### GET

**Summary:** GET /commission-templates

Endpoint for GET /commission-templates

**Responses:**

- **200**: Successful response

---

### /commission-transactions

#### GET

**Summary:** GET /commission-transactions

Endpoint for GET /commission-transactions

**Responses:**

- **200**: Successful response

---

### /commission-transactions/:id

#### GET

**Summary:** GET /commission-transactions/:id

Endpoint for GET /commission-transactions/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /commission-transactions/approve

#### PUT

**Summary:** PUT /commission-transactions/approve

Endpoint for PUT /commission-transactions/approve

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /commission-transactions/:id/reject

#### PUT

**Summary:** PUT /commission-transactions/:id/reject

Endpoint for PUT /commission-transactions/:id/reject

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /commission-transactions/:id/recalculate

#### PUT

**Summary:** PUT /commission-transactions/:id/recalculate

Endpoint for PUT /commission-transactions/:id/recalculate

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /commission-stats

#### GET

**Summary:** GET /commission-stats

Endpoint for GET /commission-stats

**Responses:**

- **200**: Successful response

---

### /commission-analytics

#### GET

**Summary:** GET /commission-analytics

Endpoint for GET /commission-analytics

**Responses:**

- **200**: Successful response

---

### /commission-pending

#### GET

**Summary:** GET /commission-pending

Endpoint for GET /commission-pending

**Responses:**

- **200**: Successful response

---

### /commission-batch-calculate

#### POST

**Summary:** POST /commission-batch-calculate

Endpoint for POST /commission-batch-calculate

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /commission-bulk-approve

#### POST

**Summary:** POST /commission-bulk-approve

Endpoint for POST /commission-bulk-approve

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /commission-bulk-reject

#### POST

**Summary:** POST /commission-bulk-reject

Endpoint for POST /commission-bulk-reject

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /commission-export

#### GET

**Summary:** GET /commission-export

Endpoint for GET /commission-export

**Responses:**

- **200**: Successful response

---

### /activity

#### GET

**Summary:** GET /activity

Endpoint for GET /activity

**Responses:**

- **200**: Successful response

---

### /top-performers

#### GET

**Summary:** GET /top-performers

Endpoint for GET /top-performers

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /system-health

#### GET

**Summary:** GET /system-health

Endpoint for GET /system-health

**Responses:**

- **200**: Successful response

---

### /vendors

#### GET

**Summary:** GET /vendors

Endpoint for GET /vendors

**Responses:**

- **200**: Successful response

---

#### USE

**Summary:** USE /vendors

Endpoint for USE /vendors

**Responses:**

- **200**: Successful response

---

### /:id/vendor

#### PUT

**Summary:** PUT /:id/vendor

Endpoint for PUT /:id/vendor

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/restore

#### PUT

**Summary:** PUT /:id/restore

Endpoint for PUT /:id/restore

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/approve

#### PUT

**Summary:** PUT /:id/approve

Endpoint for PUT /:id/approve

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/reject

#### PUT

**Summary:** PUT /:id/reject

Endpoint for PUT /:id/reject

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/toggle-featured

#### PUT

**Summary:** PUT /:id/toggle-featured

Endpoint for PUT /:id/toggle-featured

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /reviews/pending

#### GET

**Summary:** GET /reviews/pending

Endpoint for GET /reviews/pending

**Responses:**

- **200**: Successful response

---

### /flagged

#### GET

**Summary:** GET /flagged

Endpoint for GET /flagged

**Responses:**

- **200**: Successful response

---

### /review/:id

#### POST

**Summary:** POST /review/:id

Endpoint for POST /review/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /vendor-earnings

#### GET

**Summary:** GET /vendor-earnings

Endpoint for GET /vendor-earnings

**Responses:**

- **200**: Successful response

---

### /vendor-earnings/:vendorId

#### GET

**Summary:** GET /vendor-earnings/:vendorId

Endpoint for GET /vendor-earnings/:vendorId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| vendorId | path | string | Yes | Path parameter: vendorId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payout-requests

#### GET

**Summary:** GET /payout-requests

Endpoint for GET /payout-requests

**Responses:**

- **200**: Successful response

---

### /payout-requests/:id

#### GET

**Summary:** GET /payout-requests/:id

Endpoint for GET /payout-requests/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payout-requests/:id/approve

#### PUT

**Summary:** PUT /payout-requests/:id/approve

Endpoint for PUT /payout-requests/:id/approve

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payout-requests/:id/reject

#### PUT

**Summary:** PUT /payout-requests/:id/reject

Endpoint for PUT /payout-requests/:id/reject

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payout-requests/:id/process

#### PUT

**Summary:** PUT /payout-requests/:id/process

Endpoint for PUT /payout-requests/:id/process

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payout-requests/bulk-approve

#### POST

**Summary:** POST /payout-requests/bulk-approve

Endpoint for POST /payout-requests/bulk-approve

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /payout-requests/bulk-reject

#### POST

**Summary:** POST /payout-requests/bulk-reject

Endpoint for POST /payout-requests/bulk-reject

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /payout-stats

#### GET

**Summary:** GET /payout-stats

Endpoint for GET /payout-stats

**Responses:**

- **200**: Successful response

---

### /payout-analytics

#### GET

**Summary:** GET /payout-analytics

Endpoint for GET /payout-analytics

**Responses:**

- **200**: Successful response

---

### /payout-export

#### GET

**Summary:** GET /payout-export

Endpoint for GET /payout-export

**Responses:**

- **200**: Successful response

---

### /:id/visibility

#### PATCH

**Summary:** PATCH /:id/visibility

Endpoint for PATCH /:id/visibility

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /display-orders

#### PATCH

**Summary:** PATCH /display-orders

Endpoint for PATCH /display-orders

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /dashboard

#### GET

**Summary:** GET /dashboard

Endpoint for GET /dashboard

**Responses:**

- **200**: Successful response

---

### /transactions

#### GET

**Summary:** GET /transactions

Endpoint for GET /transactions

**Responses:**

- **200**: Successful response

---

#### POST

**Summary:** POST /transactions

Endpoint for POST /transactions

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /transactions/:id

#### PUT

**Summary:** PUT /transactions/:id

Endpoint for PUT /transactions/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payouts/process

#### POST

**Summary:** POST /payouts/process

Endpoint for POST /payouts/process

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /analytics/subscriptions

#### GET

**Summary:** GET /analytics/subscriptions

Endpoint for GET /analytics/subscriptions

**Responses:**

- **200**: Successful response

---

### /analytics/advertising

#### GET

**Summary:** GET /analytics/advertising

Endpoint for GET /analytics/advertising

**Responses:**

- **200**: Successful response

---

### /settings

#### GET

**Summary:** GET /settings

Endpoint for GET /settings

**Responses:**

- **200**: Successful response

---

#### PUT

**Summary:** PUT /settings

Endpoint for PUT /settings

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /reports/generate

#### GET

**Summary:** GET /reports/generate

Endpoint for GET /reports/generate

**Responses:**

- **200**: Successful response

---

### /settings/health

#### GET

**Summary:** GET /settings/health

Endpoint for GET /settings/health

**Responses:**

- **200**: Successful response

---

### /app-settings

#### GET

**Summary:** GET /app-settings

Endpoint for GET /app-settings

**Responses:**

- **200**: Successful response

---

#### PUT

**Summary:** PUT /app-settings

Endpoint for PUT /app-settings

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /app-settings/email/test-connection

#### POST

**Summary:** POST /app-settings/email/test-connection

Endpoint for POST /app-settings/email/test-connection

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /app-settings/email/send-test

#### POST

**Summary:** POST /app-settings/email/send-test

Endpoint for POST /app-settings/email/send-test

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /dashboard-all

#### GET

**Summary:** GET /dashboard-all

Endpoint for GET /dashboard-all

**Responses:**

- **200**: Successful response

---

### /teacher-earnings

#### GET

**Summary:** GET /teacher-earnings

Endpoint for GET /teacher-earnings

**Responses:**

- **200**: Successful response

---

### /teacher-earnings/:teacherId

#### GET

**Summary:** GET /teacher-earnings/:teacherId

Endpoint for GET /teacher-earnings/:teacherId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| teacherId | path | string | Yes | Path parameter: teacherId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/status

#### PUT

**Summary:** PUT /:id/status

Endpoint for PUT /:id/status

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### PATCH

**Summary:** PATCH /:id/status

Endpoint for PATCH /:id/status

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/active

#### PUT

**Summary:** PUT /:id/active

Endpoint for PUT /:id/active

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/suspend

#### PUT

**Summary:** PUT /:id/suspend

Endpoint for PUT /:id/suspend

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/payment-mode

#### PUT

**Summary:** PUT /:id/payment-mode

Endpoint for PUT /:id/payment-mode

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/subscription-status

#### PUT

**Summary:** PUT /:id/subscription-status

Endpoint for PUT /:id/subscription-status

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/role

#### PATCH

**Summary:** PATCH /:id/role

Endpoint for PATCH /:id/role

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/reset-password/initiate

#### POST

**Summary:** POST /:id/reset-password/initiate

Endpoint for POST /:id/reset-password/initiate

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/reset-password/confirm

#### POST

**Summary:** POST /:id/reset-password/confirm

Endpoint for POST /:id/reset-password/confirm

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /list

#### GET

**Summary:** GET /list

Endpoint for GET /list

**Responses:**

- **200**: Successful response

---

### /click/:affiliateCode

#### POST

**Summary:** POST /click/:affiliateCode

Endpoint for POST /click/:affiliateCode

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| affiliateCode | path | string | Yes | Path parameter: affiliateCode |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /apply

#### POST

**Summary:** POST /apply

Endpoint for POST /apply

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /my

#### GET

**Summary:** GET /my

Endpoint for GET /my

**Responses:**

- **200**: Successful response

---

### /profile

#### PUT

**Summary:** PUT /profile

Endpoint for PUT /profile

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

#### GET

**Summary:** GET /profile

Endpoint for GET /profile

**Responses:**

- **200**: Successful response

---

### /generate-url

#### POST

**Summary:** POST /generate-url

Endpoint for POST /generate-url

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /dashboard/stats

#### GET

**Summary:** GET /dashboard/stats

Endpoint for GET /dashboard/stats

**Responses:**

- **200**: Successful response

---

### /analytics/overview

#### GET

**Summary:** GET /analytics/overview

Endpoint for GET /analytics/overview

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /events

#### GET

**Summary:** GET /events

Endpoint for GET /events

**Responses:**

- **200**: Successful response

---

#### USE

**Summary:** USE /events

Endpoint for USE /events

**Responses:**

- **200**: Successful response

---

#### POST

**Summary:** POST /events

Endpoint for POST /events

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /orders

#### GET

**Summary:** GET /orders

Endpoint for GET /orders

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

#### USE

**Summary:** USE /orders

Endpoint for USE /orders

**Responses:**

- **200**: Successful response

---

### /tickets

#### GET

**Summary:** GET /tickets

Endpoint for GET /tickets

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

#### USE

**Summary:** USE /tickets

Endpoint for USE /tickets

**Responses:**

- **200**: Successful response

---

### /users

#### GET

**Summary:** GET /users

Endpoint for GET /users

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /venues

#### GET

**Summary:** GET /venues

Endpoint for GET /venues

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

#### USE

**Summary:** USE /venues

Endpoint for USE /venues

**Responses:**

- **200**: Successful response

---

### /revenue

#### GET

**Summary:** GET /revenue

Endpoint for GET /revenue

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /events/:eventId/performance

#### GET

**Summary:** GET /events/:eventId/performance

Endpoint for GET /events/:eventId/performance

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /export

#### GET

**Summary:** GET /export

Endpoint for GET /export

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /active

#### GET

**Summary:** GET /active

Endpoint for GET /active

**Responses:**

- **200**: Successful response

---

### /:id/impression

#### POST

**Summary:** POST /:id/impression

Endpoint for POST /:id/impression

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/click

#### POST

**Summary:** POST /:id/click

Endpoint for POST /:id/click

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/dismiss

#### POST

**Summary:** POST /:id/dismiss

Endpoint for POST /:id/dismiss

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /register

#### POST

**Summary:** POST /register

Endpoint for POST /register

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /register-admin

#### POST

**Summary:** POST /register-admin

Endpoint for POST /register-admin

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /login

#### POST

**Summary:** POST /login

Endpoint for POST /login

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /logout

#### POST

**Summary:** POST /logout

Endpoint for POST /logout

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /refresh-token

#### POST

**Summary:** POST /refresh-token

Endpoint for POST /refresh-token

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /me

#### GET

**Summary:** GET /me

Endpoint for GET /me

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /change-password

#### PUT

**Summary:** PUT /change-password

Endpoint for PUT /change-password

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /forgot-password

#### POST

**Summary:** POST /forgot-password

Endpoint for POST /forgot-password

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /reset-password

#### POST

**Summary:** POST /reset-password

Endpoint for POST /reset-password

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /verify-email

#### POST

**Summary:** POST /verify-email

Endpoint for POST /verify-email

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /resend-verification-email

#### POST

**Summary:** POST /resend-verification-email

Endpoint for POST /resend-verification-email

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /firebase

#### POST

**Summary:** POST /firebase

Endpoint for POST /firebase

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /addresses

#### POST

**Summary:** POST /addresses

Endpoint for POST /addresses

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /addresses/:addressIndex

#### PUT

**Summary:** PUT /addresses/:addressIndex

Endpoint for PUT /addresses/:addressIndex

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| addressIndex | path | string | Yes | Path parameter: addressIndex |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /addresses/:addressIndex

Endpoint for DELETE /addresses/:addressIndex

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| addressIndex | path | string | Yes | Path parameter: addressIndex |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /upload-avatar

#### POST

**Summary:** POST /upload-avatar

Endpoint for POST /upload-avatar

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /avatar

#### PUT

**Summary:** PUT /avatar

Endpoint for PUT /avatar

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /avatar

Endpoint for DELETE /avatar

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

#### POST

**Summary:** POST /avatar

Endpoint for POST /avatar

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /send-phone-verification

#### POST

**Summary:** POST /send-phone-verification

Endpoint for POST /send-phone-verification

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /verify-phone

#### POST

**Summary:** POST /verify-phone

Endpoint for POST /verify-phone

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /resend-phone-verification

#### POST

**Summary:** POST /resend-phone-verification

Endpoint for POST /resend-phone-verification

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /posts/:postId/comments

#### GET

**Summary:** GET /posts/:postId/comments

Endpoint for GET /posts/:postId/comments

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| postId | path | string | Yes | Path parameter: postId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### POST

**Summary:** POST /posts/:postId/comments

Endpoint for POST /posts/:postId/comments

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| postId | path | string | Yes | Path parameter: postId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /comments/:commentId

#### PUT

**Summary:** PUT /comments/:commentId

Endpoint for PUT /comments/:commentId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /comments/:commentId

Endpoint for DELETE /comments/:commentId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /comments/:commentId/like

#### POST

**Summary:** POST /comments/:commentId/like

Endpoint for POST /comments/:commentId/like

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /comments/:commentId/dislike

#### POST

**Summary:** POST /comments/:commentId/dislike

Endpoint for POST /comments/:commentId/dislike

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /comments/:commentId/report

#### POST

**Summary:** POST /comments/:commentId/report

Endpoint for POST /comments/:commentId/report

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /comments/:commentId/replies

#### GET

**Summary:** GET /comments/:commentId/replies

Endpoint for GET /comments/:commentId/replies

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /comments/:commentId/approve

#### PUT

**Summary:** PUT /comments/:commentId/approve

Endpoint for PUT /comments/:commentId/approve

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| commentId | path | string | Yes | Path parameter: commentId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/posts/:postId/comments

#### GET

**Summary:** GET /admin/posts/:postId/comments

Endpoint for GET /admin/posts/:postId/comments

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| postId | path | string | Yes | Path parameter: postId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /featured

#### GET

**Summary:** GET /featured

Endpoint for GET /featured

**Responses:**

- **200**: Successful response

---

### /popular

#### GET

**Summary:** GET /popular

Endpoint for GET /popular

**Responses:**

- **200**: Successful response

---

### /recent

#### GET

**Summary:** GET /recent

Endpoint for GET /recent

**Responses:**

- **200**: Successful response

---

### /categories

#### GET

**Summary:** GET /categories

Endpoint for GET /categories

**Responses:**

- **200**: Successful response

---

#### USE

**Summary:** USE /categories

Endpoint for USE /categories

**Responses:**

- **200**: Successful response

---

### /:slug

#### GET

**Summary:** GET /:slug

Endpoint for GET /:slug

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:slug/related

#### GET

**Summary:** GET /:slug/related

Endpoint for GET /:slug/related

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:slug/like

#### POST

**Summary:** POST /:slug/like

Endpoint for POST /:slug/like

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:slug/share

#### POST

**Summary:** POST /:slug/share

Endpoint for POST /:slug/share

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /initiate

#### POST

**Summary:** POST /initiate

Endpoint for POST /initiate

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /confirm

#### POST

**Summary:** POST /confirm

Endpoint for POST /confirm

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /:id/cancel

#### PUT

**Summary:** PUT /:id/cancel

Endpoint for PUT /:id/cancel

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /roots

#### GET

**Summary:** GET /roots

Endpoint for GET /roots

**Responses:**

- **200**: Successful response

---

### /search

#### GET

**Summary:** GET /search

Endpoint for GET /search

**Responses:**

- **200**: Successful response

---

#### USE

**Summary:** USE /search

Endpoint for USE /search

**Responses:**

- **200**: Successful response

---

### /parent/:parentId

#### GET

**Summary:** GET /parent/:parentId

Endpoint for GET /parent/:parentId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| parentId | path | string | Yes | Path parameter: parentId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /sort-order/bulk

#### PUT

**Summary:** PUT /sort-order/bulk

Endpoint for PUT /sort-order/bulk

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /update-counts

#### POST

**Summary:** POST /update-counts

Endpoint for POST /update-counts

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /logs

#### GET

**Summary:** GET /logs

Endpoint for GET /logs

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /summary

#### GET

**Summary:** GET /summary

Endpoint for GET /summary

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /:id/read

#### PATCH

**Summary:** PATCH /:id/read

Endpoint for PATCH /:id/read

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/responded

#### PATCH

**Summary:** PATCH /:id/responded

Endpoint for PATCH /:id/responded

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /my-history

#### GET

**Summary:** GET /my-history

Endpoint for GET /my-history

**Responses:**

- **200**: Successful response

---

### /validate/:code

#### POST

**Summary:** POST /validate/:code

Endpoint for POST /validate/:code

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| code | path | string | Yes | Path parameter: code |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/stats

#### GET

**Summary:** GET /:id/stats

Endpoint for GET /:id/stats

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /bulk/status

#### PUT

**Summary:** PUT /bulk/status

Endpoint for PUT /bulk/status

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /detect

#### GET

**Summary:** GET /detect

Endpoint for GET /detect

**Responses:**

- **200**: Successful response

---

### /rates

#### GET

**Summary:** GET /rates

Endpoint for GET /rates

**Responses:**

- **200**: Successful response

---

### /supported

#### GET

**Summary:** GET /supported

Endpoint for GET /supported

**Responses:**

- **200**: Successful response

---

### /convert

#### POST

**Summary:** POST /convert

Endpoint for POST /convert

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /info/:code

#### GET

**Summary:** GET /info/:code

Endpoint for GET /info/:code

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| code | path | string | Yes | Path parameter: code |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /refresh

#### POST

**Summary:** POST /refresh

Endpoint for POST /refresh

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /:employeeId

#### GET

**Summary:** GET /:employeeId

Endpoint for GET /:employeeId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| employeeId | path | string | Yes | Path parameter: employeeId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### PUT

**Summary:** PUT /:employeeId

Endpoint for PUT /:employeeId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| employeeId | path | string | Yes | Path parameter: employeeId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /:employeeId

Endpoint for DELETE /:employeeId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| employeeId | path | string | Yes | Path parameter: employeeId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /assign-event

#### POST

**Summary:** POST /assign-event

Endpoint for POST /assign-event

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /remove-event

#### POST

**Summary:** POST /remove-event

Endpoint for POST /remove-event

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /events/:id/track-click

#### POST

**Summary:** POST /events/:id/track-click

Endpoint for POST /events/:id/track-click

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /events/:id/analytics

#### GET

**Summary:** GET /events/:id/analytics

Endpoint for GET /events/:id/analytics

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /vendor/events/:id/claim

#### POST

**Summary:** POST /vendor/events/:id/claim

Endpoint for POST /vendor/events/:id/claim

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /vendor/claimed-events

#### GET

**Summary:** GET /vendor/claimed-events

Endpoint for GET /vendor/claimed-events

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /admin/affiliate-analytics

#### GET

**Summary:** GET /admin/affiliate-analytics

Endpoint for GET /admin/affiliate-analytics

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /events/:id/cancel

#### POST

**Summary:** POST /events/:id/cancel

Endpoint for POST /events/:id/cancel

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /events/:id/cancellation-status

#### GET

**Summary:** GET /events/:id/cancellation-status

Endpoint for GET /events/:id/cancellation-status

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /events/:id/affected-orders

#### GET

**Summary:** GET /events/:id/affected-orders

Endpoint for GET /events/:id/affected-orders

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /events/:id/retry-notifications

#### POST

**Summary:** POST /events/:id/retry-notifications

Endpoint for POST /events/:id/retry-notifications

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /orders/:id/cancel

#### PUT

**Summary:** PUT /orders/:id/cancel

Endpoint for PUT /orders/:id/cancel

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /orders/:id/refund-status

#### GET

**Summary:** GET /orders/:id/refund-status

Endpoint for GET /orders/:id/refund-status

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /cities

#### GET

**Summary:** GET /cities

Endpoint for GET /cities

**Responses:**

- **200**: Successful response

---

### /vendor/my-events

#### GET

**Summary:** GET /vendor/my-events

Endpoint for GET /vendor/my-events

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /vendor/analytics

#### GET

**Summary:** GET /vendor/analytics

Endpoint for GET /vendor/analytics

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /:id/claim

#### POST

**Summary:** POST /:id/claim

Endpoint for POST /:id/claim

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/all

#### GET

**Summary:** GET /admin/all

Endpoint for GET /admin/all

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /admin/:id/approval

#### PUT

**Summary:** PUT /admin/:id/approval

Endpoint for PUT /admin/:id/approval

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/:id/featured

#### PUT

**Summary:** PUT /admin/:id/featured

Endpoint for PUT /admin/:id/featured

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /check/:eventId

#### GET

**Summary:** GET /check/:eventId

Endpoint for GET /check/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:eventId

#### POST

**Summary:** POST /:eventId

Endpoint for POST /:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /:eventId

Endpoint for DELETE /:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /basic

#### GET

**Summary:** GET /basic

Endpoint for GET /basic

**Responses:**

- **200**: Successful response

---

### /redis

#### GET

**Summary:** GET /redis

Endpoint for GET /redis

**Responses:**

- **200**: Successful response

---

### /invalidate-cache

#### POST

**Summary:** POST /invalidate-cache

Endpoint for POST /invalidate-cache

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /homepage

#### USE

**Summary:** USE /homepage

Endpoint for USE /homepage

**Responses:**

- **200**: Successful response

---

### /auth

#### USE

**Summary:** USE /auth

Endpoint for USE /auth

**Responses:**

- **200**: Successful response

---

### /employees

#### USE

**Summary:** USE /employees

Endpoint for USE /employees

**Responses:**

- **200**: Successful response

---

#### GET

**Summary:** GET /employees

Endpoint for GET /employees

**Responses:**

- **200**: Successful response

---

#### POST

**Summary:** POST /employees

Endpoint for POST /employees

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /checkin

#### USE

**Summary:** USE /checkin

Endpoint for USE /checkin

**Responses:**

- **200**: Successful response

---

### /payments

#### USE

**Summary:** USE /payments

Endpoint for USE /payments

**Responses:**

- **200**: Successful response

---

### /reviews

#### USE

**Summary:** USE /reviews

Endpoint for USE /reviews

**Responses:**

- **200**: Successful response

---

### /reels

#### USE

**Summary:** USE /reels

Endpoint for USE /reels

**Responses:**

- **200**: Successful response

---

### /uploads

#### USE

**Summary:** USE /uploads

Endpoint for USE /uploads

**Responses:**

- **200**: Successful response

---

### /media

#### USE

**Summary:** USE /media

Endpoint for USE /media

**Responses:**

- **200**: Successful response

---

### /banners

#### USE

**Summary:** USE /banners

Endpoint for USE /banners

**Responses:**

- **200**: Successful response

---

### /seo-content

#### USE

**Summary:** USE /seo-content

Endpoint for USE /seo-content

**Responses:**

- **200**: Successful response

---

### /announcements

#### USE

**Summary:** USE /announcements

Endpoint for USE /announcements

**Responses:**

- **200**: Successful response

---

### /popups

#### USE

**Summary:** USE /popups

Endpoint for USE /popups

**Responses:**

- **200**: Successful response

---

### /analytics

#### USE

**Summary:** USE /analytics

Endpoint for USE /analytics

**Responses:**

- **200**: Successful response

---

### /admin/users

#### USE

**Summary:** USE /admin/users

Endpoint for USE /admin/users

**Responses:**

- **200**: Successful response

---

### /admin/employees

#### USE

**Summary:** USE /admin/employees

Endpoint for USE /admin/employees

**Responses:**

- **200**: Successful response

---

### /admin/events

#### USE

**Summary:** USE /admin/events

Endpoint for USE /admin/events

**Responses:**

- **200**: Successful response

---

### /admin/venues

#### USE

**Summary:** USE /admin/venues

Endpoint for USE /admin/venues

**Responses:**

- **200**: Successful response

---

### /admin/vendors

#### USE

**Summary:** USE /admin/vendors

Endpoint for USE /admin/vendors

**Responses:**

- **200**: Successful response

---

### /admin/teachers

#### USE

**Summary:** USE /admin/teachers

Endpoint for USE /admin/teachers

**Responses:**

- **200**: Successful response

---

### /admin/dashboard

#### USE

**Summary:** USE /admin/dashboard

Endpoint for USE /admin/dashboard

**Responses:**

- **200**: Successful response

---

### /admin/moderation

#### USE

**Summary:** USE /admin/moderation

Endpoint for USE /admin/moderation

**Responses:**

- **200**: Successful response

---

### /admin

#### USE

**Summary:** USE /admin

Endpoint for USE /admin

**Responses:**

- **200**: Successful response

---

### /admin/collections

#### USE

**Summary:** USE /admin/collections

Endpoint for USE /admin/collections

**Responses:**

- **200**: Successful response

---

### /admin/reels

#### USE

**Summary:** USE /admin/reels

Endpoint for USE /admin/reels

**Responses:**

- **200**: Successful response

---

### /vendors/payouts

#### USE

**Summary:** USE /vendors/payouts

Endpoint for USE /vendors/payouts

**Responses:**

- **200**: Successful response

---

### /vendors/payment-settings

#### USE

**Summary:** USE /vendors/payment-settings

Endpoint for USE /vendors/payment-settings

**Responses:**

- **200**: Successful response

---

### /teachers

#### USE

**Summary:** USE /teachers

Endpoint for USE /teachers

**Responses:**

- **200**: Successful response

---

### /teachers/payouts

#### USE

**Summary:** USE /teachers/payouts

Endpoint for USE /teachers/payouts

**Responses:**

- **200**: Successful response

---

### /teachers/payment-settings

#### USE

**Summary:** USE /teachers/payment-settings

Endpoint for USE /teachers/payment-settings

**Responses:**

- **200**: Successful response

---

### /blogs

#### USE

**Summary:** USE /blogs

Endpoint for USE /blogs

**Responses:**

- **200**: Successful response

---

### /blog

#### USE

**Summary:** USE /blog

Endpoint for USE /blog

**Responses:**

- **200**: Successful response

---

### /admin/blogs

#### USE

**Summary:** USE /admin/blogs

Endpoint for USE /admin/blogs

**Responses:**

- **200**: Successful response

---

### /coupons

#### USE

**Summary:** USE /coupons

Endpoint for USE /coupons

**Responses:**

- **200**: Successful response

---

### /affiliates

#### USE

**Summary:** USE /affiliates

Endpoint for USE /affiliates

**Responses:**

- **200**: Successful response

---

### /newsletter

#### USE

**Summary:** USE /newsletter

Endpoint for USE /newsletter

**Responses:**

- **200**: Successful response

---

### /bookings

#### USE

**Summary:** USE /bookings

Endpoint for USE /bookings

**Responses:**

- **200**: Successful response

---

#### GET

**Summary:** GET /bookings

Endpoint for GET /bookings

**Responses:**

- **200**: Successful response

---

### /collections

#### USE

**Summary:** USE /collections

Endpoint for USE /collections

**Responses:**

- **200**: Successful response

---

### /favorites

#### USE

**Summary:** USE /favorites

Endpoint for USE /favorites

**Responses:**

- **200**: Successful response

---

### /currency

#### USE

**Summary:** USE /currency

Endpoint for USE /currency

**Responses:**

- **200**: Successful response

---

### /admin/revenue

#### USE

**Summary:** USE /admin/revenue

Endpoint for USE /admin/revenue

**Responses:**

- **200**: Successful response

---

### /admin/bulk-import

#### USE

**Summary:** USE /admin/bulk-import

Endpoint for USE /admin/bulk-import

**Responses:**

- **200**: Successful response

---

### /registrations

#### USE

**Summary:** USE /registrations

Endpoint for USE /registrations

**Responses:**

- **200**: Successful response

---

### /contact

#### USE

**Summary:** USE /contact

Endpoint for USE /contact

**Responses:**

- **200**: Successful response

---

### /partnerships

#### USE

**Summary:** USE /partnerships

Endpoint for USE /partnerships

**Responses:**

- **200**: Successful response

---

### /public/settings

#### USE

**Summary:** USE /public/settings

Endpoint for USE /public/settings

**Responses:**

- **200**: Successful response

---

### /admin/teachers/payouts

#### USE

**Summary:** USE /admin/teachers/payouts

Endpoint for USE /admin/teachers/payouts

**Responses:**

- **200**: Successful response

---

### /admin/teacher-revenue

#### USE

**Summary:** USE /admin/teacher-revenue

Endpoint for USE /admin/teacher-revenue

**Responses:**

- **200**: Successful response

---

### /file/:uuid

#### GET

**Summary:** GET /file/:uuid

Endpoint for GET /file/:uuid

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| uuid | path | string | Yes | Path parameter: uuid |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /upload

#### POST

**Summary:** POST /upload

Endpoint for POST /upload

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /upload-multiple

#### POST

**Summary:** POST /upload-multiple

Endpoint for POST /upload-multiple

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /unused

#### GET

**Summary:** GET /unused

Endpoint for GET /unused

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /:id/usage

#### GET

**Summary:** GET /:id/usage

Endpoint for GET /:id/usage

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /bulk-delete

#### POST

**Summary:** POST /bulk-delete

Endpoint for POST /bulk-delete

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /subscribe

#### POST

**Summary:** POST /subscribe

Endpoint for POST /subscribe

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /unsubscribe/:token

#### GET

**Summary:** GET /unsubscribe/:token

Endpoint for GET /unsubscribe/:token

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| token | path | string | Yes | Path parameter: token |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /status

#### GET

**Summary:** GET /status

Endpoint for GET /status

**Responses:**

- **200**: Successful response

---

### /preferences

#### PUT

**Summary:** PUT /preferences

Endpoint for PUT /preferences

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /unsubscribe

#### POST

**Summary:** POST /unsubscribe

Endpoint for POST /unsubscribe

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /admin/stats

#### GET

**Summary:** GET /admin/stats

Endpoint for GET /admin/stats

**Responses:**

- **200**: Successful response

---

### /admin/subscribers

#### GET

**Summary:** GET /admin/subscribers

Endpoint for GET /admin/subscribers

**Responses:**

- **200**: Successful response

---

### /admin/send

#### POST

**Summary:** POST /admin/send

Endpoint for POST /admin/send

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /:id/payment

#### POST

**Summary:** POST /:id/payment

Endpoint for POST /:id/payment

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /vendor/my-orders

#### GET

**Summary:** GET /vendor/my-orders

Endpoint for GET /vendor/my-orders

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /admin/analytics

#### GET

**Summary:** GET /admin/analytics

Endpoint for GET /admin/analytics

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /admin/:id

#### GET

**Summary:** GET /admin/:id

Endpoint for GET /admin/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### PUT

**Summary:** PUT /admin/:id

Endpoint for PUT /admin/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /admin/:id

Endpoint for DELETE /admin/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/:id/confirm

#### POST

**Summary:** POST /admin/:id/confirm

Endpoint for POST /admin/:id/confirm

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/:id/refund

#### POST

**Summary:** POST /admin/:id/refund

Endpoint for POST /admin/:id/refund

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/bulk

#### PATCH

**Summary:** PATCH /admin/bulk

Endpoint for PATCH /admin/bulk

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /config

#### GET

**Summary:** GET /config

Endpoint for GET /config

**Responses:**

- **200**: Successful response

---

### /webhook

#### POST

**Summary:** POST /webhook

Endpoint for POST /webhook

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /create-intent

#### POST

**Summary:** POST /create-intent

Endpoint for POST /create-intent

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /cancel

#### POST

**Summary:** POST /cancel

Endpoint for POST /cancel

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /payment-methods

#### GET

**Summary:** GET /payment-methods

Endpoint for GET /payment-methods

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /payment-methods/:id

#### DELETE

**Summary:** DELETE /payment-methods/:id

Endpoint for DELETE /payment-methods/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /refund

#### POST

**Summary:** POST /refund

Endpoint for POST /refund

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /social

#### GET

**Summary:** GET /social

Endpoint for GET /social

**Responses:**

- **200**: Successful response

---

### /:id/view

#### POST

**Summary:** POST /:id/view

Endpoint for POST /:id/view

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/like

#### POST

**Summary:** POST /:id/like

Endpoint for POST /:id/like

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /user/me

#### GET

**Summary:** GET /user/me

Endpoint for GET /user/me

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /event/:eventId

#### GET

**Summary:** GET /event/:eventId

Endpoint for GET /event/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /:id/confirm-payment

#### POST

**Summary:** POST /:id/confirm-payment

Endpoint for POST /:id/confirm-payment

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /:id/review

#### POST

**Summary:** POST /:id/review

Endpoint for POST /:id/review

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /:id/files/:fileId

#### GET

**Summary:** GET /:id/files/:fileId

Endpoint for GET /:id/files/:fileId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |
| fileId | path | string | Yes | Path parameter: fileId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /submit/:eventId

#### POST

**Summary:** POST /submit/:eventId

Endpoint for POST /submit/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /config/:eventId

#### POST

**Summary:** POST /config/:eventId

Endpoint for POST /config/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

#### GET

**Summary:** GET /config/:eventId

Endpoint for GET /config/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /config/:eventId

Endpoint for DELETE /config/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /config/:eventId/duplicate

#### POST

**Summary:** POST /config/:eventId/duplicate

Endpoint for POST /config/:eventId/duplicate

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /admin/pending

#### GET

**Summary:** GET /admin/pending

Endpoint for GET /admin/pending

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /:type/:id

#### GET

**Summary:** GET /:type/:id

Endpoint for GET /:type/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| type | path | string | Yes | Path parameter: type |
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /google/:eventId

#### GET

**Summary:** GET /google/:eventId

Endpoint for GET /google/:eventId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /my-reviews

#### GET

**Summary:** GET /my-reviews

Endpoint for GET /my-reviews

**Responses:**

- **200**: Successful response

---

### /:id/vote

#### POST

**Summary:** POST /:id/vote

Endpoint for POST /:id/vote

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/flag

#### POST

**Summary:** POST /:id/flag

Endpoint for POST /:id/flag

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/respond

#### POST

**Summary:** POST /:id/respond

Endpoint for POST /:id/respond

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /admin/:id/moderate

#### PUT

**Summary:** PUT /admin/:id/moderate

Endpoint for PUT /admin/:id/moderate

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /suggestions

#### GET

**Summary:** GET /suggestions

Endpoint for GET /suggestions

**Responses:**

- **200**: Successful response

---

### /sitemap.xml

#### GET

**Summary:** GET /sitemap.xml

Endpoint for GET /sitemap.xml

**Responses:**

- **200**: Successful response

---

### /sitemap-com.xml

#### GET

**Summary:** GET /sitemap-com.xml

Endpoint for GET /sitemap-com.xml

**Responses:**

- **200**: Successful response

---

### /sitemap-in.xml

#### GET

**Summary:** GET /sitemap-in.xml

Endpoint for GET /sitemap-in.xml

**Responses:**

- **200**: Successful response

---

### /sitemap-ae.xml

#### GET

**Summary:** GET /sitemap-ae.xml

Endpoint for GET /sitemap-ae.xml

**Responses:**

- **200**: Successful response

---

### /robots.txt

#### GET

**Summary:** GET /robots.txt

Endpoint for GET /robots.txt

**Responses:**

- **200**: Successful response

---

### /api/seo/debug-env

#### GET

**Summary:** GET /api/seo/debug-env

Endpoint for GET /api/seo/debug-env

**Responses:**

- **200**: Successful response

---

### /api/seo/event/:id/structured-data

#### GET

**Summary:** GET /api/seo/event/:id/structured-data

Endpoint for GET /api/seo/event/:id/structured-data

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /api/seo/blog/:slug/structured-data

#### GET

**Summary:** GET /api/seo/blog/:slug/structured-data

Endpoint for GET /api/seo/blog/:slug/structured-data

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /api/seo/meta-data/event/:id

#### GET

**Summary:** GET /api/seo/meta-data/event/:id

Endpoint for GET /api/seo/meta-data/event/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /api/seo/meta-data/blog/:slug

#### GET

**Summary:** GET /api/seo/meta-data/blog/:slug

Endpoint for GET /api/seo/meta-data/blog/:slug

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /api/seo/meta-data/category/:id

#### GET

**Summary:** GET /api/seo/meta-data/category/:id

Endpoint for GET /api/seo/meta-data/category/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /api/seo/organization

#### GET

**Summary:** GET /api/seo/organization

Endpoint for GET /api/seo/organization

**Responses:**

- **200**: Successful response

---

### /api/seo/breadcrumb

#### POST

**Summary:** POST /api/seo/breadcrumb

Endpoint for POST /api/seo/breadcrumb

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /:page

#### GET

**Summary:** GET /:page

Endpoint for GET /:page

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| page | path | string | Yes | Path parameter: page |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### PUT

**Summary:** PUT /:page

Endpoint for PUT /:page

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| page | path | string | Yes | Path parameter: page |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /:page

Endpoint for DELETE /:page

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| page | path | string | Yes | Path parameter: page |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /overview

#### GET

**Summary:** GET /overview

Endpoint for GET /overview

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /stripe/connect

#### POST

**Summary:** POST /stripe/connect

Endpoint for POST /stripe/connect

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /stripe/connect

Endpoint for DELETE /stripe/connect

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /stripe/connect/status

#### GET

**Summary:** GET /stripe/connect/status

Endpoint for GET /stripe/connect/status

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /stripe/connect/refresh

#### POST

**Summary:** POST /stripe/connect/refresh

Endpoint for POST /stripe/connect/refresh

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /stripe/keys

#### PUT

**Summary:** PUT /stripe/keys

Endpoint for PUT /stripe/keys

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /payment-mode

#### POST

**Summary:** POST /payment-mode

Endpoint for POST /payment-mode

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /subscription

#### GET

**Summary:** GET /subscription

Endpoint for GET /subscription

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /subscription/pay

#### POST

**Summary:** POST /subscription/pay

Endpoint for POST /subscription/pay

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /subscription/history

#### GET

**Summary:** GET /subscription/history

Endpoint for GET /subscription/history

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /subscription/cancel

#### POST

**Summary:** POST /subscription/cancel

Endpoint for POST /subscription/cancel

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /bank-account

#### PUT

**Summary:** PUT /bank-account

Endpoint for PUT /bank-account

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /payout-preferences

#### PUT

**Summary:** PUT /payout-preferences

Endpoint for PUT /payout-preferences

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /commission/calculate

#### POST

**Summary:** POST /commission/calculate

Endpoint for POST /commission/calculate

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /history

#### GET

**Summary:** GET /history

Endpoint for GET /history

**Responses:**

- **200**: Successful response

---

### /pending-earnings

#### GET

**Summary:** GET /pending-earnings

Endpoint for GET /pending-earnings

**Responses:**

- **200**: Successful response

---

### /request

#### POST

**Summary:** POST /request

Endpoint for POST /request

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /requests/:id

#### GET

**Summary:** GET /requests/:id

Endpoint for GET /requests/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /requests/:id

Endpoint for DELETE /requests/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /payment-settings

#### GET

**Summary:** GET /payment-settings

Endpoint for GET /payment-settings

**Responses:**

- **200**: Successful response

---

#### PUT

**Summary:** PUT /payment-settings

Endpoint for PUT /payment-settings

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /subscription-status

#### GET

**Summary:** GET /subscription-status

Endpoint for GET /subscription-status

**Responses:**

- **200**: Successful response

---

### /commission-history

#### GET

**Summary:** GET /commission-history

Endpoint for GET /commission-history

**Responses:**

- **200**: Successful response

---

### /public/:id

#### GET

**Summary:** GET /public/:id

Endpoint for GET /public/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:id/payment-info

#### GET

**Summary:** GET /:id/payment-info

Endpoint for GET /:id/payment-info

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /bookings/export

#### GET

**Summary:** GET /bookings/export

Endpoint for GET /bookings/export

**Responses:**

- **200**: Successful response

---

### /bookings/import

#### POST

**Summary:** POST /bookings/import

Endpoint for POST /bookings/import

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /bookings/:id

#### GET

**Summary:** GET /bookings/:id

Endpoint for GET /bookings/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### PUT

**Summary:** PUT /bookings/:id

Endpoint for PUT /bookings/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /upload-media

#### POST

**Summary:** POST /upload-media

Endpoint for POST /upload-media

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /availability-hours

#### PUT

**Summary:** PUT /availability-hours

Endpoint for PUT /availability-hours

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /social-links

#### PUT

**Summary:** PUT /social-links

Endpoint for PUT /social-links

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /events/:id

#### GET

**Summary:** GET /events/:id

Endpoint for GET /events/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### PUT

**Summary:** PUT /events/:id

Endpoint for PUT /events/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /events/:id

Endpoint for DELETE /events/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /events/:id/restore

#### PUT

**Summary:** PUT /events/:id/restore

Endpoint for PUT /events/:id/restore

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /generate

#### POST

**Summary:** POST /generate

Endpoint for POST /generate

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /generate-missing

#### POST

**Summary:** POST /generate-missing

Endpoint for POST /generate-missing

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /verify-qr/:eventId?

#### POST

**Summary:** POST /verify-qr/:eventId?

Endpoint for POST /verify-qr/:eventId?

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| eventId | path | string | Yes | Path parameter: eventId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /:ticketId/checkin

#### POST

**Summary:** POST /:ticketId/checkin

Endpoint for POST /:ticketId/checkin

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| ticketId | path | string | Yes | Path parameter: ticketId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /user/my-tickets

#### GET

**Summary:** GET /user/my-tickets

Endpoint for GET /user/my-tickets

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /order/:orderId

#### GET

**Summary:** GET /order/:orderId

Endpoint for GET /order/:orderId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| orderId | path | string | Yes | Path parameter: orderId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /:ticketId/download

#### GET

**Summary:** GET /:ticketId/download

Endpoint for GET /:ticketId/download

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| ticketId | path | string | Yes | Path parameter: ticketId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /:ticketId

#### GET

**Summary:** GET /:ticketId

Endpoint for GET /:ticketId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| ticketId | path | string | Yes | Path parameter: ticketId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /:ticketId/transfer

#### POST

**Summary:** POST /:ticketId/transfer

Endpoint for POST /:ticketId/transfer

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| ticketId | path | string | Yes | Path parameter: ticketId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /:ticketId/resend

#### POST

**Summary:** POST /:ticketId/resend

Endpoint for POST /:ticketId/resend

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| ticketId | path | string | Yes | Path parameter: ticketId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /files

#### USE

**Summary:** USE /files

Endpoint for USE /files

**Responses:**

- **200**: Successful response

---

### /single

#### POST

**Summary:** POST /single

Endpoint for POST /single

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /multiple

#### POST

**Summary:** POST /multiple

Endpoint for POST /multiple

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /event-images

#### POST

**Summary:** POST /event-images

Endpoint for POST /event-images

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /venue-images

#### POST

**Summary:** POST /venue-images

Endpoint for POST /venue-images

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /document

#### POST

**Summary:** POST /document

Endpoint for POST /document

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /blog-featured-image

#### POST

**Summary:** POST /blog-featured-image

Endpoint for POST /blog-featured-image

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /blog-content-media

#### POST

**Summary:** POST /blog-content-media

Endpoint for POST /blog-content-media

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /file/:filename

#### DELETE

**Summary:** DELETE /file/:filename

Endpoint for DELETE /file/:filename

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| filename | path | string | Yes | Path parameter: filename |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /info/:filename

#### GET

**Summary:** GET /info/:filename

Endpoint for GET /info/:filename

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| filename | path | string | Yes | Path parameter: filename |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /list/:category

#### GET

**Summary:** GET /list/:category

Endpoint for GET /list/:category

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| category | path | string | Yes | Path parameter: category |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /transform/:publicId

#### GET

**Summary:** GET /transform/:publicId

Endpoint for GET /transform/:publicId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| publicId | path | string | Yes | Path parameter: publicId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /variations/:publicId

#### GET

**Summary:** GET /variations/:publicId

Endpoint for GET /variations/:publicId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| publicId | path | string | Yes | Path parameter: publicId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /batch

#### POST

**Summary:** POST /batch

Endpoint for POST /batch

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /provider

#### GET

**Summary:** GET /provider

Endpoint for GET /provider

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token

**Authentication:** Required

---

### /enhanced-info/:identifier

#### GET

**Summary:** GET /enhanced-info/:identifier

Endpoint for GET /enhanced-info/:identifier

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| identifier | path | string | Yes | Path parameter: identifier |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /enhanced/:identifier

#### DELETE

**Summary:** DELETE /enhanced/:identifier

Endpoint for DELETE /enhanced/:identifier

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| identifier | path | string | Yes | Path parameter: identifier |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **404**: Resource not found

**Authentication:** Required

---

### /:vendorId/payment-info

#### GET

**Summary:** GET /:vendorId/payment-info

Endpoint for GET /:vendorId/payment-info

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| vendorId | path | string | Yes | Path parameter: vendorId |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /upload-image

#### POST

**Summary:** POST /upload-image

Endpoint for POST /upload-image

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /business-hours

#### PUT

**Summary:** PUT /business-hours

Endpoint for PUT /business-hours

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /social-media

#### PUT

**Summary:** PUT /social-media

Endpoint for PUT /social-media

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /employees/export

#### POST

**Summary:** POST /employees/export

Endpoint for POST /employees/export

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /employees/:id

#### GET

**Summary:** GET /employees/:id

Endpoint for GET /employees/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### PUT

**Summary:** PUT /employees/:id

Endpoint for PUT /employees/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

#### DELETE

**Summary:** DELETE /employees/:id

Endpoint for DELETE /employees/:id

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /employees/:id/assign-event

#### POST

**Summary:** POST /employees/:id/assign-event

Endpoint for POST /employees/:id/assign-event

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /employees/:id/remove-event

#### POST

**Summary:** POST /employees/:id/remove-event

Endpoint for POST /employees/:id/remove-event

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /verify-phone/send

#### POST

**Summary:** POST /verify-phone/send

Endpoint for POST /verify-phone/send

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /verify-phone/confirm

#### POST

**Summary:** POST /verify-phone/confirm

Endpoint for POST /verify-phone/confirm

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /bank-details

#### PUT

**Summary:** PUT /bank-details

Endpoint for PUT /bank-details

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /documents

#### GET

**Summary:** GET /documents

Endpoint for GET /documents

**Responses:**

- **200**: Successful response

---

### /documents/upload

#### POST

**Summary:** POST /documents/upload

Endpoint for POST /documents/upload

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /documents/:type

#### DELETE

**Summary:** DELETE /documents/:type

Endpoint for DELETE /documents/:type

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| type | path | string | Yes | Path parameter: type |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /stripe-connect/onboard

#### POST

**Summary:** POST /stripe-connect/onboard

Endpoint for POST /stripe-connect/onboard

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response

---

### /stripe-connect/status

#### GET

**Summary:** GET /stripe-connect/status

Endpoint for GET /stripe-connect/status

**Responses:**

- **200**: Successful response

---

### /venues/:id/track-click

#### POST

**Summary:** POST /venues/:id/track-click

Endpoint for POST /venues/:id/track-click

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /venues/:id/analytics

#### GET

**Summary:** GET /venues/:id/analytics

Endpoint for GET /venues/:id/analytics

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /vendor/venues/:id/claim

#### POST

**Summary:** POST /vendor/venues/:id/claim

Endpoint for POST /vendor/venues/:id/claim

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| id | path | string | Yes | Path parameter: id |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

### /vendor/claimed-venues

#### GET

**Summary:** GET /vendor/claimed-venues

Endpoint for GET /vendor/claimed-venues

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /admin/venue-affiliate-analytics

#### GET

**Summary:** GET /admin/venue-affiliate-analytics

Endpoint for GET /admin/venue-affiliate-analytics

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions

**Authentication:** Required

---

### /public

#### GET

**Summary:** GET /public

Endpoint for GET /public

**Responses:**

- **200**: Successful response

---

### /public/:slug

#### GET

**Summary:** GET /public/:slug

Endpoint for GET /public/:slug

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| slug | path | string | Yes | Path parameter: slug |

**Responses:**

- **200**: Successful response
- **404**: Resource not found

---

### /:venueId

#### GET

**Summary:** GET /:venueId

Endpoint for GET /:venueId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| venueId | path | string | Yes | Path parameter: venueId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### PUT

**Summary:** PUT /:venueId

Endpoint for PUT /:venueId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| venueId | path | string | Yes | Path parameter: venueId |

**Request Body:** Required

```json
{
  // Request body schema
}
```

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

#### DELETE

**Summary:** DELETE /:venueId

Endpoint for DELETE /:venueId

**Parameters:**

| Name | In | Type | Required | Description |
|------|----| -----|----------|-------------|
| venueId | path | string | Yes | Path parameter: venueId |

**Responses:**

- **200**: Successful response
- **401**: Unauthorized - Invalid or missing authentication token
- **403**: Forbidden - Insufficient permissions
- **404**: Resource not found

**Authentication:** Required

---

