# TipTap Editor Usage Guide

## Overview
The TipTap rich text editor is now integrated into your blog system, providing a modern WYSIWYG editing experience. This guide explains how to use all features of the editor.

## Accessing the Editor

### Admin Blog Page
1. Open your browser and navigate to: `http://localhost:3000/admin/blogs`
2. Click **"Create Blog"** button to create a new blog, OR
3. Click **"Edit"** button on an existing blog

### The Editor Interface
The editor consists of two main parts:
1. **Toolbar** (top) - Contains all formatting and media buttons
2. **Content Area** (bottom) - Where you write your blog content

---

## Text Formatting

### Basic Formatting
Located in the **first section** of the toolbar:

| Button | Action | Shortcut |
|--------|--------|----------|
| **B** (Bold icon) | Make text bold | Ctrl/Cmd + B |
| *I* (Italic icon) | Make text italic | Ctrl/Cmd + I |
| <u>U</u> (Underline icon) | Underline text | Ctrl/Cmd + U |
| ~~S~~ (Strikethrough icon) | Strike through text | Ctrl/Cmd + Shift + X |
| `</>` (Code icon) | Format as inline code | Ctrl/Cmd + E |

**How to use:**
1. Select the text you want to format
2. Click the formatting button
3. Or use keyboard shortcuts while typing

**Example:**
```
Type: This is important text
Select "important"
Click Bold button
Result: This is **important** text
```

---

## Headings

Located in the **second section** of the toolbar:

| Button | Creates | Use For |
|--------|---------|---------|
| H1 | Large heading | Main title, major sections |
| H2 | Medium heading | Subsections |
| H3 | Small heading | Minor sections, sub-topics |

**How to use:**
1. Place cursor on the line you want to convert
2. Click H1, H2, or H3 button
3. The entire line becomes a heading

**Example:**
```
Type: Introduction
Click H2 button
Result: ## Introduction (large, bold text)
```

**Keyboard shortcuts:**
- H1: Ctrl/Cmd + Alt + 1
- H2: Ctrl/Cmd + Alt + 2
- H3: Ctrl/Cmd + Alt + 3

---

## Lists

Located in the **third section** of the toolbar:

### Bullet List
- Click the **bullet list icon** (three dots with lines)
- Each line becomes a bullet point
- Press Enter to create new bullet
- Press Enter twice to exit list

**Example:**
```
Click bullet list button
Type: First item [Enter]
Type: Second item [Enter]
Type: Third item
```

Result:
- First item
- Second item
- Third item

### Numbered List
- Click the **numbered list icon** (1,2,3 with lines)
- Each line gets a number
- Numbers auto-increment

**Example:**
```
Click numbered list button
Type: Step one [Enter]
Type: Step two [Enter]
Type: Step three
```

Result:
1. Step one
2. Step two
3. Step three

### Blockquote
- Click the **quote icon** (quotation marks)
- Creates an indented, stylized quote block

**Example:**
```
Click blockquote button
Type: "The only way to do great work is to love what you do."
```

Result:
> "The only way to do great work is to love what you do."

---

## Text Alignment

Located in the **fourth section** of the toolbar:

| Icon | Alignment | Use For |
|------|-----------|---------|
| Left align | Left | Default, normal text |
| Center align | Center | Titles, centered quotes |
| Right align | Right | Signatures, dates |
| Justify | Full width | Formal documents |

**How to use:**
1. Place cursor in the paragraph
2. Click alignment button
3. Entire paragraph aligns

---

## Adding Images

You have **TWO OPTIONS** for adding images:

### Option 1: Upload Image from Computer
Located in the **fifth section** (media buttons):

1. Click the **Upload icon** (first icon in media section)
2. Select an image file from your computer
   - Supported formats: JPG, JPEG, PNG, WebP, GIF
   - Max size: 5MB (configurable)
3. Wait for upload to complete
4. Image appears in your content automatically

**What happens:**
- Image is uploaded to Cloudinary
- Stored in `gema/blogs/content/` folder
- Optimized for web automatically
- Responsive and mobile-friendly

**Example Flow:**
```
1. Write some text
2. Click Upload icon (upload button)
3. Choose "beach-photo.jpg" from your computer
4. Wait 2-3 seconds
5. See "Image uploaded successfully" toast
6. Image appears in content
```

### Option 2: Insert Image from URL
1. Click the **Image icon** (second icon in media section)
2. Enter image URL in the prompt box
   - Example: `https://example.com/image.jpg`
3. Click OK
4. Image appears in your content

**Example:**
```
Click Image URL button
Popup appears: "Enter image URL:"
Type: https://picsum.photos/800/400
Click OK
Image appears
```

**Image Features:**
- ✅ Automatically responsive
- ✅ Rounded corners
- ✅ Proper spacing (margin top/bottom)
- ✅ Click and drag to reposition (in some browsers)

---

## Adding Videos

You have **TWO OPTIONS** for adding videos:

### Option 1: Upload Video from Computer
Located in media section:

1. Click the **Red Upload icon** (video upload)
2. Select a video file from your computer
   - Supported formats: MP4, WebM, MOV
   - Max size: Configured in backend (default 5MB)
3. Wait for upload to complete
4. Video player appears in your content

**What happens:**
- Video is uploaded to Cloudinary
- Stored in `gema/blogs/content/` folder
- Converted to web-optimized format
- HTML5 video player embedded

**Example Flow:**
```
1. Click Red Upload icon (video upload)
2. Choose "tutorial.mp4" from your computer
3. Wait for upload (may take 10-30 seconds for large videos)
4. See "Video uploaded successfully" toast
5. Video player appears with controls
```

**Video Player Features:**
- ✅ Play/Pause controls
- ✅ Volume control
- ✅ Fullscreen option
- ✅ Responsive sizing
- ✅ Rounded corners

### Option 2: Embed YouTube Video
1. Go to YouTube and copy the video URL
2. Click the **YouTube icon** (in media section)
3. Paste the YouTube URL in the prompt
   - Accepts formats:
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://youtu.be/VIDEO_ID`
     - Just the VIDEO_ID
4. Click OK
5. YouTube video embed appears

**Example:**
```
Copy YouTube URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Click YouTube icon
Popup appears: "Enter YouTube URL:"
Paste: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Click OK
YouTube embed appears (responsive 16:9 player)
```

**YouTube Embed Features:**
- ✅ Responsive 16:9 aspect ratio
- ✅ Rounded corners
- ✅ Click to play
- ✅ Full YouTube controls

---

## Adding Links

Located in the media section:

### Add a Link
1. Select the text you want to link
2. Click the **Link icon** (chain link)
3. Enter the URL in the prompt
   - Example: `https://example.com`
4. Click OK
5. Text becomes a clickable link

**Example:**
```
Type: Visit our website
Select "our website"
Click Link icon
Popup: "Enter URL:"
Type: https://kidrove.com
Click OK
Result: Visit [our website](https://kidrove.com) (blue, underlined)
```

### Edit a Link
1. Click on the linked text
2. Click Link icon again
3. Modify the URL
4. Click OK

### Remove a Link
1. Click on the linked text
2. Click Link icon
3. Delete the URL (leave blank)
4. Click OK
5. Link is removed, text remains

**Link Styling:**
- Blue color (#3B82F6)
- Underlined
- Hover effect (darker blue)

---

## Inserting Custom HTML

### When to Use This Feature

The HTML insertion feature allows you to paste complete, styled HTML content directly into your blog. This is perfect for:

- **Landing pages** - Complex layouts with multiple sections
- **Styled content** - Pre-designed content with specific colors, spacing, and layouts
- **Email-style templates** - Newsletter-like content with boxes and cards
- **Complex layouts** - Multi-column designs, grid galleries, sticky sidebars
- **Pre-built components** - Tip boxes, call-to-action buttons, testimonial cards

### How to Insert HTML

Located in the **Media section** of the toolbar (Code2 icon: `</>`):

**Step-by-Step:**
1. Click the **Code2 icon** (`</>`) in the toolbar
2. Modal window opens titled "Insert HTML Content"
3. Paste your HTML code in the large textarea
4. Click **"Insert HTML"** button
5. Your styled content appears in the editor immediately

**Keyboard shortcuts:** None (use toolbar button)

---

### What HTML is Supported

#### ✅ **FULLY SUPPORTED** (All Working)

**Inline Styles:**
- All CSS properties via `style="..."` attributes
- Colors, fonts, spacing, borders, shadows, gradients
- **Modern layouts:** Flexbox (`display: flex; gap: 20px`)
- **CSS Grid:** Responsive galleries (`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`)
- **Advanced positioning:** `position: sticky`, `position: relative/absolute`

**HTML Elements:**
- Semantic tags: `<main>`, `<aside>`, `<nav>`, `<article>`, `<section>`
- Structure: `<div>`, `<span>`, `<p>`, all heading levels
- Text formatting: `<strong>`, `<em>`, `<u>`, `<s>`, `<code>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Links: `<a href="...">` with inline styles
- Images: `<img>` with absolute URLs
- Blockquotes: `<blockquote>`

**Media & Embeds:**
- External images (Google Photos, Cloudinary URLs, etc.)
- Instagram iframes (may need testing - see troubleshooting)
- YouTube embeds (use YouTube button for better compatibility)
- HTML5 video tags

**Responsive Design:**
- Flexbox with `flex-wrap: wrap`
- CSS Grid with `auto-fit` and `minmax()`
- Media-query-style inline responsiveness

---

#### ❌ **NOT SUPPORTED** (Will Be Stripped/Ignored)

**Document Structure:**
- `<!DOCTYPE html>` declarations
- `<html>`, `<head>`, `<body>` tags
- `<title>`, `<meta>` tags

**External Resources:**
- `<link rel="stylesheet">` (external CSS files)
- `<style>` blocks in document head
- CSS class names without global definitions

**Security Restrictions:**
- `<script>` tags (removed automatically)
- `onclick`, `onload`, and other event handlers
- JavaScript of any kind
- Some iframe sources (security policy dependent)

---

### Example: Pottery Workshop Page (Real-World Use Case)

**✅ THIS HTML STYLE IS FULLY SUPPORTED**

Here's a complete example demonstrating the FULL POWER of HTML insertion with inline styles:

**Supported Features (All Working in This Example):**
- ✅ **Flexbox layout** - Main content + sticky sidebar (`display: flex; flex-wrap: wrap; gap: 50px`)
- ✅ **CSS Grid galleries** - Responsive image grids (`display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`)
- ✅ **Sticky positioning** - Table of contents that follows scroll (`position: sticky; top: 40px`)
- ✅ **Styled components** - Colored tip boxes with borders and backgrounds
- ✅ **Instagram embeds** - iframe embeds (test first, may be restricted)
- ✅ **External images** - Google Photos URLs
- ✅ **Complex styling** - Borders, shadows, rounded corners, hover effects
- ✅ **Semantic HTML** - `<main>`, `<aside>`, `<nav>` for structure
- ✅ **Call-to-action buttons** - Styled links with inline CSS

**HTML Code Snippet (Ready to Use):**

```html
<!-- Main Wrapper with Flexbox -->
<div style="max-width: 1100px; margin: 0 auto; padding: 40px 20px; display: flex; flex-wrap: wrap; gap: 50px; position: relative;">

    <!-- Main Content Area -->
    <main style="flex: 1; min-width: 300px;">
        <h1 id="title" style="color: #111111; font-size: 2.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-top: 0; margin-bottom: 1rem; line-height: 1.3;">
            Why Kids Love Pottery Workshops in Malls
        </h1>

        <!-- Styled Tip Box -->
        <div style="padding: 20px 25px; border-radius: 0 8px 8px 0; margin-bottom: 1.5rem; position: relative; background-color: #ecfdf5; border-left: 5px solid #10b981;">
            <h4 style="color: #047857; margin-top: 0; margin-bottom: 8px; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 0.05em; font-weight: 700;">
                ✅ DO: Plan Ahead
            </h4>
            <p style="margin-bottom: 0;">Weekends can be busy. Book online to avoid disappointment.</p>
        </div>

        <!-- Location Card with Grid Gallery -->
        <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
            <h3 style="color: #111111; margin-top: 0; margin-bottom: 1rem; font-size: 1.25rem; font-weight: 600;">
                1. Bedia Pottery Classes
            </h3>
            <span style="font-style: italic; color: #666; margin-bottom: 15px; display: block; font-size: 0.9rem;">
                📍 Dubai Warehouse, Al Khayat Avenue - 10 19 Street - Al Quoz - Dubai
            </span>

            <!-- CSS Grid for Images -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                <div style="height: 200px; overflow: hidden; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <img src="https://lh3.googleusercontent.com/p/AF1QipOkuZv6YGS4vZ0Yga-8EOTo3FSlfJFfoHIwkxga=s1360-w1360-h1020-rw"
                         alt="Pottery Studio"
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
                </div>
            </div>
        </div>

        <!-- Call-to-Action Button -->
        <div style="text-align: center; margin-top: 40px;">
            <a href="#" style="display: inline-block; background-color: #E07A5F; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-align: center; text-decoration: none;">
                Visit KidRove Today
            </a>
        </div>
    </main>

    <!-- Sticky Table of Contents Sidebar -->
    <aside style="width: 250px; min-width: 200px; flex-shrink: 0; display: block; position: sticky; top: 40px; height: fit-content; border-left: 2px solid #e5e7eb; padding-left: 20px;">
        <h4 style="margin-top: 0; margin-bottom: 15px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666;">
            On this page
        </h4>
        <nav>
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 10px;">
                    <a href="#introduction" style="color: #555; font-size: 0.95rem; text-decoration: none; display: block;">
                        Introduction
                    </a>
                </li>
                <li style="margin-bottom: 10px;">
                    <a href="#benefits" style="color: #555; font-size: 0.95rem; text-decoration: none; display: block;">
                        Learning Benefits
                    </a>
                </li>
            </ul>
        </nav>
    </aside>
</div>
```

**How to Use This Exact HTML:**
1. **Remove** `<body>` opening tag (if present)
2. **Remove** `</body>` closing tag (if present)
3. **Copy** everything between them
4. Click **Code2 button** (`</>`) in TipTap toolbar
5. **Paste** the content into the modal textarea
6. Click **"Insert HTML"**
7. **Complex HTML Detected!** - A confirmation dialog will appear
8. Click **OK** to use **Raw HTML Mode** (recommended for pottery workshop HTML)
9. ✅ Your content is saved and will render perfectly with all styles!

**Important:** When using Raw HTML mode:
- ✅ ALL features preserved (iframes, flexbox, grid, sticky positioning, semantic tags)
- ✅ Content renders exactly as designed on the blog page
- ⚠️ Toolbar editing is disabled for this content (edit the raw HTML directly if needed)
- 🔒 Still secured with DOMPurify sanitization (scripts removed, XSS prevention)

---

### Security Notice

HTML content is **automatically sanitized** for security:

**Removed for Safety:**
- `<script>` tags and JavaScript code
- Event handlers (`onclick`, `onload`, `onerror`, etc.)
- Potentially dangerous attributes
- Some iframe sources (depending on security policy)

**What Stays:**
- Inline styles (all CSS properties)
- Safe HTML tags (divs, headings, paragraphs, links, images)
- Structure and layout
- External image URLs

This ensures your blog remains secure while allowing rich, styled content.

---

### Troubleshooting

**Problem: Styles not appearing**
**Solution:** Use inline `style="..."` attributes, not CSS classes. CSS classes only work if defined globally in your app.

**Problem: Layout looks broken**
**Solution:** Remove `<html>`, `<head>`, `<body>` tags. Paste only the inner content (divs, sections, etc.).

**Problem: Images not loading**
**Solution:** Use absolute URLs (starting with `https://`). Relative paths won't work. Upload images to media library first if needed.

**Problem: Instagram iframes not showing**
**Cause:** TipTap sanitizer may restrict iframes for security.
**Solution:** Test first. If blocked, replace with static images linking to Instagram posts:
```html
<a href="https://www.instagram.com/p/POST_ID/" target="_blank">
    <img src="screenshot.jpg" alt="View on Instagram"
         style="width: 100%; border-radius: 8px;">
</a>
```

**Problem: Complex grids/layouts look distorted**
**Solution:** Test in smaller chunks. Simplify grid configurations if needed. Use `minmax(200px, 1fr)` for better responsiveness.

**Problem: Sticky positioning not working**
**Cause:** TipTap's prose classes may override `position: sticky`.
**Solution:**
- Add `!important`: `style="position: sticky !important; top: 40px !important;"`
- Test in blog preview mode to see actual rendering

**Problem: Fonts not matching**
**Solution:** Specify font families inline: `style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;"`

**Problem: Colors look different**
**Solution:** Use hex codes (`#111111`) or RGB values (`rgb(17, 17, 17)`) for consistent colors.

---

## Bubble Menu

When you **select any text**, a floating menu appears with quick actions:

| Button | Action |
|--------|--------|
| Bold | Make selection bold |
| Italic | Make selection italic |
| Link | Add/edit link on selection |

**How to use:**
1. Select any text with your mouse
2. Bubble menu appears above selection
3. Click any button for instant formatting
4. Menu disappears when you click elsewhere

**Example:**
```
Type: This is important information
Drag mouse to select "important information"
Bubble menu appears
Click "Bold" in bubble menu
Selection becomes bold
```

---

## Undo & Redo

Located in the **last section** of the toolbar:

| Icon | Action | Shortcut |
|------|--------|----------|
| ← (Undo) | Undo last action | Ctrl/Cmd + Z |
| → (Redo) | Redo last undone action | Ctrl/Cmd + Shift + Z |

**Example:**
```
Type some text
Click Bold button
Text becomes bold
Click Undo
Text returns to normal
Click Redo
Text becomes bold again
```

---

## Complete Workflow Examples

### Example 1: Creating a Blog Post with Everything

```
1. CREATE TITLE
   - Type: "10 Best Activities for Kids in 2024"
   - Select the line
   - Click H1 button

2. ADD INTRODUCTION
   - Type your intro paragraph
   - Select first sentence
   - Click Italic button

3. ADD A SECTION
   - Type: "Outdoor Activities"
   - Select it
   - Click H2 button

4. ADD A LIST
   - Click Bullet List button
   - Type: "Swimming"
   - Press Enter
   - Type: "Hiking"
   - Press Enter
   - Type: "Cycling"

5. ADD AN IMAGE
   - Click Upload Image icon
   - Select "kids-outdoor.jpg"
   - Wait for upload
   - Image appears

6. ADD VIDEO
   - Click YouTube icon
   - Paste: https://www.youtube.com/watch?v=example
   - Video embed appears

7. ADD QUOTE
   - Click Blockquote button
   - Type: "Children learn as they play."

8. ADD LINK
   - Type: "Learn more on our activities page"
   - Select "activities page"
   - Click Link icon
   - Enter: https://kidrove.com/activities

9. REVIEW
   - Use Undo if you make mistakes
   - Scroll through content
   - Click "Preview" to see how it looks

10. SAVE
    - Click "Save as Draft" or "Publish"
```

### Example 2: Formatting Existing Text

```
Already have text? Here's how to format it:

Original Text:
"Introduction
Welcome to our blog about kids activities. We have many fun ideas.
Visit our website for more."

Steps:
1. Select "Introduction"
   → Click H2

2. Select "kids activities"
   → Click Bold

3. Select "many fun ideas"
   → Click Italic

4. Select "Visit our website"
   → Click Link icon
   → Enter URL

Result:
## Introduction
Welcome to our blog about **kids activities**. We have *many fun ideas*.
[Visit our website](https://example.com) for more.
```

### Example 3: Creating a Tutorial with Images

```
1. Title
   - Type: "How to Setup Your Account"
   - Make it H1

2. Step 1
   - Type: "Step 1: Create Account"
   - Make it H2
   - Type instructions
   - Upload screenshot-1.jpg

3. Step 2
   - Type: "Step 2: Verify Email"
   - Make it H2
   - Type instructions
   - Upload screenshot-2.jpg

4. Step 3
   - Type: "Step 3: Complete Profile"
   - Make it H2
   - Type instructions
   - Upload screenshot-3.jpg

5. Add Video Tutorial
   - Type: "Watch this video for a complete walkthrough:"
   - Click YouTube icon
   - Paste tutorial video URL
```

---

## Keyboard Shortcuts Cheat Sheet

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Bold | Ctrl + B | Cmd + B |
| Italic | Ctrl + I | Cmd + I |
| Underline | Ctrl + U | Cmd + U |
| Strikethrough | Ctrl + Shift + X | Cmd + Shift + X |
| Code | Ctrl + E | Cmd + E |
| Heading 1 | Ctrl + Alt + 1 | Cmd + Alt + 1 |
| Heading 2 | Ctrl + Alt + 2 | Cmd + Alt + 2 |
| Heading 3 | Ctrl + Alt + 3 | Cmd + Alt + 3 |
| Bullet List | Ctrl + Shift + 8 | Cmd + Shift + 8 |
| Numbered List | Ctrl + Shift + 7 | Cmd + Shift + 7 |
| Blockquote | Ctrl + Shift + B | Cmd + Shift + B |
| Undo | Ctrl + Z | Cmd + Z |
| Redo | Ctrl + Shift + Z | Cmd + Shift + Z |

---

## Tips & Best Practices

### 1. Content Structure
```
✅ DO:
- Use H1 for main title (once per blog)
- Use H2 for major sections
- Use H3 for subsections
- Add images every 2-3 paragraphs
- Break long text into lists

❌ DON'T:
- Use multiple H1 tags
- Write long paragraphs without breaks
- Add too many images (slows page)
- Forget to add alt text (accessibility)
```

### 2. Image Best Practices
```
✅ DO:
- Use high-quality images (min 800px width)
- Compress images before upload
- Use relevant images only
- Test on mobile devices

❌ DON'T:
- Upload huge files (>2MB)
- Use blurry/pixelated images
- Add too many images
- Use copyrighted images without permission
```

### 3. Video Best Practices
```
✅ DO:
- Prefer YouTube embeds (faster loading)
- Keep uploaded videos short (<2 min)
- Compress videos before upload
- Test video playback

❌ DON'T:
- Upload very large video files
- Add multiple uploaded videos (use YouTube)
- Use videos without permission
- Forget to test on mobile
```

### 4. Writing Tips
```
✅ DO:
- Write in short paragraphs
- Use bullet points for lists
- Add links to relevant pages
- Preview before publishing

❌ DON'T:
- Write walls of text
- Overuse bold/italic
- Add too many links
- Skip proofreading
```

---

## Troubleshooting

### Problem: Image won't upload
**Solution:**
1. Check file size (must be <5MB)
2. Check file format (JPG, PNG, WebP, GIF only)
3. Check internet connection
4. Try again in 30 seconds
5. Try using Image URL instead

### Problem: Video upload fails
**Solution:**
1. Video may be too large (check size limit)
2. Format may not be supported (use MP4)
3. Try uploading to YouTube first
4. Use YouTube embed option instead

### Problem: YouTube embed not working
**Solution:**
1. Verify URL is correct YouTube link
2. Check if video is public (not private)
3. Try different URL format
4. Copy URL from browser address bar

### Problem: Can't see toolbar buttons
**Solution:**
1. Scroll up in the editor
2. Check browser zoom (should be 100%)
3. Refresh the page
4. Try different browser

### Problem: Text formatting not applying
**Solution:**
1. Make sure text is selected
2. Try clicking button again
3. Use keyboard shortcut instead
4. Refresh and try again

### Problem: Link not clickable in preview
**Solution:**
- Links are clickable after publishing
- In editor, links show blue color but aren't clickable
- Preview published blog to test

---

## Content Migration

### If You Have Existing Blogs

Your existing blogs will continue to work! The system supports:
- Plain HTML content
- Legacy blog format
- New TipTap format

**To migrate existing blogs:**
1. Edit an old blog
2. Content loads in TipTap editor
3. Make any changes you want
4. Save
5. Content is now in TipTap format

**Automatic Migration:**
Run this command to migrate all blogs at once:
```bash
cd backend
npx tsx src/scripts/migrateBlogContentToTipTap.ts
```

---

## Advanced Features

### Combining Formats
You can combine multiple formats:

```
Example: Bold + Italic + Underline
1. Type: "Important announcement"
2. Select text
3. Click Bold
4. With text still selected, click Italic
5. With text still selected, click Underline
Result: ***<u>Important announcement</u>***
```

### Nested Lists
Create sub-lists by pressing Tab:

```
1. Main item
   [Press Tab]
   - Sub item 1
   - Sub item 2
   [Press Shift+Tab to go back]
2. Main item 2
```

### Image Positioning
```
Images are centered by default.

To adjust:
1. Click image in editor
2. Some browsers allow drag-to-resize
3. Use text before/after for context
```

---

## Quick Reference Card

```
TOOLBAR LAYOUT:
┌─────────────────────────────────────────────────────────┐
│ [B][I][U][S][<>] │ [H1][H2][H3] │ [•][1]["] │ [L][C][R][J] │ [Img][Link][Vid][YT] │ [↶][↷] │
│   Text Format    │   Headings   │   Lists   │  Alignment   │      Media           │ History │
└─────────────────────────────────────────────────────────┘
```

**Media Buttons Detail:**
- 📤 = Upload Image
- 🖼️ = Image URL
- 📤🔴 = Upload Video
- ▶️ = YouTube Embed
- 🔗 = Add Link
- </> = Insert HTML (Code2 button - custom styled content)

---

## Summary

The TipTap editor gives you complete control over your blog content without needing to know HTML. Use the toolbar buttons, keyboard shortcuts, and media upload features to create beautiful, engaging blog posts.

**Remember:**
- ✅ Experiment freely (you can always Undo)
- ✅ Preview before publishing
- ✅ Save drafts frequently
- ✅ Use images and videos to enhance content
- ✅ Keep content well-structured with headings
- ✅ Use HTML insertion (Code2 button) for complex layouts with inline styles

**Need Help?**
- Check this guide
- Refer to BLOG_IMPLEMENTATION.md for technical details
- Test in draft mode before publishing

Happy blogging! 🎉
