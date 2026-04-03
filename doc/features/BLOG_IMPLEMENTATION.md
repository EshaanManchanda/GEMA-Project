# Blog Page Implementation with TipTap Rich Text Editor

## Overview
The blog system has been enhanced with a full-featured rich text editor (TipTap) that supports:
- Rich text formatting (bold, italic, underline, strikethrough, code)
- Headings (H1, H2, H3)
- Lists (bulleted and numbered)
- Text alignment (left, center, right, justify)
- **Image uploads** (stored in Cloudinary under `gema/blogs/content`)
- **Image URLs** (embed external images)
- **Video uploads** (stored in Cloudinary, supports MP4, WebM, MOV)
- **YouTube embeds** (paste YouTube URLs)
- Links with bubble menu for quick formatting
- Blockquotes and code blocks

## What Was Implemented

### Backend Changes

#### 1. Cloudinary Configuration (`backend/src/config/cloudinary.ts`)
Added two new upload presets:
- `blogs`: For blog featured images → uploads to `gema/blogs/`
- `blogContent`: For images/videos within blog content → uploads to `gema/blogs/content/`

Both support:
- Auto quality optimization
- Auto format detection
- Image transformations
- Video support (MP4, WebM, MOV)

#### 2. Upload Middleware (`backend/src/middleware/upload.ts`)
- Added blog category detection in `getCategoryFromRequest()`
- Created `blogs` subdirectory for local storage fallback
- Enhanced Cloudinary storage to handle video uploads
- Added two new middleware functions:
  - `uploadBlogFeaturedImage`: For blog cover images
  - `uploadBlogContentMedia`: For images/videos in blog content

#### 3. Upload Routes (`backend/src/routes/upload.routes.ts`)
Added two new endpoints:
- `POST /api/uploads/blog-featured-image`: Upload blog cover image
- `POST /api/uploads/blog-content-media`: Upload images/videos for blog content
  - Returns `mediaType: 'image' | 'video'` in response
  - Auto-detects file type based on MIME type

### Frontend Changes

#### 1. TipTap Editor Component (`frontend/src/components/common/TipTapEditor.tsx`)
Full-featured rich text editor with:

**Toolbar Buttons:**
- Text formatting: Bold, Italic, Underline, Strikethrough, Code
- Headings: H1, H2, H3
- Lists: Bullet lists, Numbered lists, Blockquotes
- Alignment: Left, Center, Right, Justify
- Media:
  - Upload Image button (uploads to Cloudinary)
  - Image URL button (embed external images)
  - Upload Video button (uploads to Cloudinary)
  - YouTube Embed button (paste YouTube URL)
  - Add Link button
- History: Undo, Redo

**Features:**
- Bubble menu on text selection for quick formatting
- Image upload with toast notifications
- Video upload with HTML5 video element
- YouTube embed with responsive iframe
- Link management with URL prompt
- Placeholder text support

#### 2. BlogForm Integration (`frontend/src/components/admin/BlogForm.tsx`)
- Replaced plain `<textarea>` with `<TipTapEditor>` component
- Integrated with react-hook-form using `Controller`
- Maintains all existing validation

#### 3. TipTap Styles (`frontend/src/styles/index.css`)
Added comprehensive ProseMirror styling:
- Headings with proper sizing and spacing
- Lists with proper indentation
- Blockquotes with left border
- Code blocks with dark theme
- Links with blue color and hover effect
- Images with responsive sizing and rounded corners
- Videos/iframes with aspect ratio preservation

#### 4. Package Dependencies (`frontend/package.json`)
Added TipTap packages:
```json
"@tiptap/extension-image": "^2.10.5",
"@tiptap/extension-link": "^2.10.5",
"@tiptap/extension-placeholder": "^2.10.5",
"@tiptap/extension-text-align": "^2.10.5",
"@tiptap/extension-underline": "^2.10.5",
"@tiptap/extension-youtube": "^2.10.5",
"@tiptap/react": "^2.10.5",
"@tiptap/starter-kit": "^2.10.5"
```

### Migration Script

#### `backend/src/scripts/migrateBlogContentToTipTap.ts`
A migration script to ensure existing blog content is compatible with TipTap:
- Wraps plain text content in `<p>` tags
- Ensures minimal HTML is properly structured
- Can be run with: `npx tsx src/scripts/migrateBlogContentToTipTap.ts`

## How to Use

### Creating/Editing a Blog

1. Navigate to `http://localhost:3000/admin/blogs`
2. Click "Create Blog" or edit an existing blog
3. Use the rich text editor for content:

#### Adding Images:
- **Option 1 - Upload:** Click the Upload Image button (first image icon), select a file
- **Option 2 - URL:** Click the Image URL button (second image icon), paste image URL

#### Adding Videos:
- **Option 1 - Upload:** Click the Upload Video button (red upload icon), select video file
- **Option 2 - YouTube:** Click YouTube button, paste YouTube URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)

#### Formatting Text:
- Select text to see bubble menu with Bold, Italic, Link options
- Use toolbar for headings, lists, alignment, etc.

### Image/Video Storage

All blog media is stored in Cloudinary:
- **Featured Images:** `gema/blogs/blog-[timestamp]-[random].jpg`
- **Content Images:** `gema/blogs/content/blogContent-[timestamp]-[random].jpg`
- **Content Videos:** `gema/blogs/content/blogContent-[timestamp]-[random].mp4`

## Testing Checklist

### Blog Creation
- [ ] Create new blog with rich text content
- [ ] Upload image within content
- [ ] Upload video within content
- [ ] Embed YouTube video
- [ ] Add links
- [ ] Use different headings and formatting
- [ ] Preview content before publishing
- [ ] Save as draft
- [ ] Publish blog

### Blog Editing
- [ ] Edit existing blog
- [ ] Add new images to existing content
- [ ] Modify existing text formatting
- [ ] Update featured image
- [ ] Save changes

### Media Verification
- [ ] Check Cloudinary dashboard for uploaded images in `gema/blogs/content/`
- [ ] Verify images display correctly in blog preview
- [ ] Verify videos play correctly
- [ ] Verify YouTube embeds are responsive

### Frontend Display
- [ ] View published blog on frontend
- [ ] Verify all images load correctly
- [ ] Verify videos play correctly
- [ ] Verify YouTube embeds work
- [ ] Verify links are clickable
- [ ] Check responsive design on mobile

## API Endpoints

### Upload Endpoints

#### Upload Blog Featured Image
```
POST /api/uploads/blog-featured-image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
  featuredImage: <file>

Response:
{
  "success": true,
  "message": "Blog featured image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "gema/blogs/blog-1234567890-123456789",
    "originalName": "image.jpg",
    "size": 123456,
    "mimetype": "image/jpeg",
    "provider": "cloudinary"
  }
}
```

#### Upload Blog Content Media
```
POST /api/uploads/blog-content-media
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
  media: <file>

Response:
{
  "success": true,
  "message": "Blog image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "gema/blogs/content/blogContent-1234567890-123456789",
    "originalName": "photo.jpg",
    "size": 123456,
    "mimetype": "image/jpeg",
    "mediaType": "image",
    "provider": "cloudinary"
  }
}
```

For videos, `mediaType` will be `"video"` and mimetype will be `"video/mp4"`, etc.

## Troubleshooting

### Images not uploading
1. **Check for duplicate /api prefix error:**
   - Error: `404 Not Found - /api/api/uploads/blog-content-media`
   - Fix: Ensure TipTapEditor uses `/uploads/blog-content-media` (without `/api` prefix)
   - The axios instance already includes `/api` in baseURL

2. Check Cloudinary credentials in `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   UPLOAD_PROVIDER=cloudinary
   ```
3. Verify authentication token is valid
4. Check browser console for errors
5. Check allowed file formats in middleware

### Videos not playing
1. Ensure video format is supported (MP4, WebM, MOV)
2. Check file size limits (default: 5MB)
3. Verify Cloudinary video transformations are enabled
4. Check browser video codec support

### TipTap editor not loading
1. Verify all packages are installed: `npm ls @tiptap/react`
2. Check for console errors
3. Ensure CSS is properly imported
4. Clear browser cache

### Migration script issues
If you need to migrate existing blogs, ensure:
1. MongoDB connection is working
2. All models are properly registered
3. Run with proper permissions

## Future Enhancements

Potential improvements for the blog system:

1. **Advanced Media Features:**
   - Image gallery/carousel support
   - Drag-and-drop image upload
   - Image captions and alt text editor
   - Video thumbnail customization
   - GIF support

2. **Editor Enhancements:**
   - Table support
   - Emoji picker
   - Color picker for text
   - Font size controls
   - Code syntax highlighting
   - Markdown import/export

3. **Collaboration:**
   - Real-time collaborative editing
   - Comments on content
   - Version history
   - Draft sharing

4. **SEO & Analytics:**
   - Reading time estimation
   - Keyword density checker
   - SEO score
   - Content readability analysis

5. **Performance:**
   - Lazy load images
   - Progressive image loading
   - Video lazy loading
   - Content caching

## Summary

The blog system now has a professional rich text editor with full media support. All images and videos are automatically uploaded to Cloudinary and stored in organized folders. The editor provides an intuitive interface for content creators while maintaining clean HTML output for frontend display.

**Key Benefits:**
- ✅ No need to write HTML manually
- ✅ WYSIWYG editing experience
- ✅ Automatic media optimization via Cloudinary
- ✅ Support for images, videos, and YouTube embeds
- ✅ Mobile-responsive output
- ✅ Maintains existing blog functionality
- ✅ Easy to extend with additional TipTap extensions

**Storage:**
- All media stored in Cloudinary
- Organized folder structure
- Automatic format optimization
- CDN delivery for fast loading
