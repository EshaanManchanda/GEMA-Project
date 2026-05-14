# Certificate System Architecture - Implementation Plan

## Overview

This document details how the Certificate model links to the Event model in the GEMA system. The architecture ensures scalability, auditability, and ease of management.

---

## Current Model Structure

### Event.ts Linkages

```
Event.certificateTypes: [
  {
    name: string,        // e.g., "Participation", "Winner", "Gold"
    slug: string,        // e.g., "participation", "winner", "gold"
    templateId: ObjectId, // Reference to CertTemplate
    isDefault: boolean,
    description: string,
    criteria: string,
    sortOrder: number
  }
]
```

### Certificate.ts Linkages

```
Certificate:
  - eventId: ObjectId → Event._id
  - certificateTypeSlug: string → Event.certificateTypes[].slug
  - templateId: ObjectId → CertTemplate._id (optional override)
  - serialNumber: string (auto-generated format: CERT-YYYY-000001)
```

---

## Implementation Checklist

### ✅ Backend Core

- [x] 1. Certificate Model exists with fields: serialNumber, eventId, userId, templateId, certificateTypeSlug, recipient, data, status, pdfUrl, qrCodeUrl, issuedAt, history
- [x] 2. Template Model exists with fields: name, slug, mode (html/visual), html, css, backgroundImageUrl, canvasWidth, canvasHeight, fields (with fontSize, color, fontWeight, etc.), defaultOptions, active
- [x] 3. SerialCounter Model for auto-incrementing serial numbers
- [x] 4. CertificateRequest Model for bulk operations

### ✅ API Endpoints

- [x] 5. GET /api/certificates/templates - List all templates (including inactive)
- [x] 6. POST /api/certificates/templates - Create template
- [x] 7. GET /api/certificates/templates/:id - Get single template
- [x] 8. PUT /api/certificates/templates/:id - Update template (including active field)
- [x] 9. DELETE /api/certificates/templates/:id - Delete template
- [x] 10. POST /api/certificates/templates/:id/preview - Generate preview PDF
- [x] 11. GET /api/certificates/templates/:id/versions - Get version history
- [x] 12. POST /api/certificates/templates/:id/rollback/:version - Rollback version
- [x] 13. POST /api/certificates/generate - Generate single certificate
- [x] 14. POST /api/certificates/bulk - Bulk generate certificates
- [x] 15. POST /api/certificates/bulk-import - Import via CSV
- [x] 16. GET /api/certificates - List certificates (admin)
- [x] 17. GET /api/certificates/verify/:serialNumber - Public verification
- [x] 18. POST /api/certificates/:id/revoke - Revoke certificate
- [x] 19. POST /api/certificates/:id/retry - Retry failed generation
- [x] 20. POST /api/certificates/:id/email - Resend email
- [x] 21. GET /api/certificates/audit/logs - Audit trail

### ✅ Certificate Generation Worker

- [x] 22. BullMQ worker processes certificate generation jobs
- [x] 23. Puppeteer converts HTML to PDF
- [x] 24. **GEMA Media Service uploads PDFs** (not Cloudinary directly)
- [x] 25. QR code generation with verification URL
- [x] 26. Visual template builder generates proper HTML with fontSize, color, fontWeight, textAlign

### ✅ Frontend - Admin Certificates Page

- [x] 27. Templates tab displays all templates with status badge (Active/Inactive)
- [x] 28. Toggle button to activate/deactivate templates
- [x] 29. Edit button opens VisualTemplateBuilder
- [x] 30. Preview button generates and opens PDF
- [x] 31. Delete button with confirmation
- [x] 32. Version history with rollback option
- [x] 44a. **CSV file upload option** (in addition to paste)

### ✅ Frontend - Visual Template Builder

- [x] 33. Background image picker from media library
- [x] 34. Predefined field palette (recipientName, studentName, schoolName, serialNumber, issuedDate, eventTitle, qrCode)
- [x] 35. Custom field creation
- [x] 36. Drag and drop positioning
- [x] 37. Inspector panel with field properties:
  - [x] 37a. Label editing
  - [x] 37b. Font size (px)
  - [x] 37c. Color picker + hex input
  - [x] 37d. Font weight (normal/bold)
  - [x] 37e. Text alignment (left/center/right)
  - [x] 37f. Font family selection
  - [x] 37g. QR size (px) for QR fields
  - [x] 37h. Position (X/Y percentage)
- [x] 38. Page settings (A4, A3, Letter, portrait/landscape)
- [x] 39. Save creates/updates template

### ✅ Certificate Issue Flow

- [x] 40. Issue Certificate tab - select event + certificate type
- [x] 41. Recipient details form (name, email, optional user link)
- [x] 42. Template variables input (key=value pairs)
- [x] 43. Send email option
- [x] 44. Bulk Import tab - CSV paste + file upload functionality

### ✅ Verification & Download

- [x] 45. Public verification page at /certificates/verify/:serial
- [x] 46. Shows certificate details, event, recipient, issue date
- [x] 47. QR code for verification
- [x] 48. Download PDF option

---

## Testing Checklist

### Template Management
- [ ] Create new visual template with background image
- [ ] Add multiple fields (studentName, schoolName, serialNumber)
- [ ] Configure font size (e.g., 36px) for studentName field
- [ ] Configure color (e.g., #1e3a8a - dark blue)
- [ ] Configure font weight (bold)
- [ ] Save template - verify saved successfully
- [ ] Preview template - opens PDF in new tab
- [ ] **Verify font size 36px shows in generated PDF** ← CRITICAL TEST
- [ ] Toggle template to Inactive
- [ ] Refresh page - verify shows "Inactive"
- [ ] Toggle template to Active
- [ ] Verify shows "Active" and persists after refresh

### Certificate Generation
- [ ] Go to Issue Certificate tab
- [ ] Select event with certificate types
- [ ] Enter recipient name and email
- [ ] Add template variables (school=XYZ School)
- [ ] Submit - verify certificate created
- [ ] Check certificate status updates to "generated"
- [ ] View PDF - verify template fields applied correctly

### Bulk Operations
- [ ] Use Bulk Import tab
- [ ] Click "Upload CSV" button and select a .csv file
- [ ] Verify file content populates the textarea
- [ ] Submit - verify certificates generated
- [ ] Check results show success/failure count

### Verification
- [ ] Access /certificates/verify/CERT-2026-000001
- [ ] Verify shows correct certificate details
- [ ] Verify QR code is displayed

---

## Known Issues & Fixes Applied

### Issue 1: listTemplates returned only active templates
**Fixed:** Removed `{ active: true }` filter and added `active` to select clause
- File: `backend/src/modules/certificates/controllers/certificate.controller.ts` (lines 45-51)

### Issue 2: updateTemplate didn't explicitly handle active field  
**Fixed:** Added explicit handling for `req.body.active` boolean
- File: `backend/src/modules/certificates/controllers/certificate.controller.ts` (line 93)

### Issue 3: Font size not applied in preview
**Fixed:** Backend code correctly applies fontSize (certificate.worker.ts lines 331, 338)
- File: `backend/src/workers/certificate.worker.ts`

### Issue 4: Certificate PDFs using Cloudinary directly
**Fixed:** Now uses GEMA MediaService for PDF storage
- File: `backend/src/workers/certificate.worker.ts` (lines 207-227)
- PDF URLs now: `http://localhost:5001/api/media/file/{uuid}`

### Issue 5: CSV file upload not available in Bulk Import
**Fixed:** Added file upload button with FileUp icon
- File: `frontend/src/pages/admin/AdminCertificatesPage.tsx`

---

## API Endpoints Summary

### Admin

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/certificates/templates` | List all templates |
| POST | `/api/certificates/templates` | Create template |
| GET | `/api/certificates/templates/:id` | Get template |
| PUT | `/api/certificates/templates/:id` | Update template |
| DELETE | `/api/certificates/templates/:id` | Delete template |
| POST | `/api/certificates/templates/:id/preview` | Generate preview |
| POST | `/api/certificates/generate` | Generate certificate |
| POST | `/api/certificates/bulk` | Bulk generate |
| POST | `/api/certificates/bulk-import` | CSV import |
| GET | `/api/certificates` | List certificates |
| GET | `/api/certificates/audit/logs` | Audit trail |

### Public

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/certificates/verify/:serialNumber` | Verify certificate |

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/models/Certificate.ts` | Certificate, Template, SerialCounter models |
| `backend/src/modules/certificates/controllers/certificate.controller.ts` | API handlers |
| `backend/src/modules/certificates/routes/certificate.routes.ts` | Route definitions |
| `backend/src/modules/certificates/services/certificate.service.ts` | Business logic |
| `backend/src/workers/certificate.worker.ts` | BullMQ worker for PDF generation |
| `frontend/src/pages/admin/AdminCertificatesPage.tsx` | Admin certificates UI |
| `frontend/src/components/admin/VisualTemplateBuilder.tsx` | Visual template editor |

---

## Notes

1. **Template Override**: Certificate can have its own `templateId` that overrides the event's template
2. **Flexible Types**: Event can have any number of certificate types (not limited to winner/participation)
3. **Backward Compatible**: If no certificateTypes on event, can fall back to legacy behavior
4. **Extensible**: Add criteria, sortOrder, description per certificate type for admin management
5. **Font Size**: Configured in VisualTemplateBuilder inspector, applied in certificate.worker.ts buildVisualHtml()
6. **PDF Storage**: Uses GEMA MediaService (MediaAsset) instead of direct Cloudinary upload