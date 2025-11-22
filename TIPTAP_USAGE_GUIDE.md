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

---

## Summary

The TipTap editor gives you complete control over your blog content without needing to know HTML. Use the toolbar buttons, keyboard shortcuts, and media upload features to create beautiful, engaging blog posts.

**Remember:**
- ✅ Experiment freely (you can always Undo)
- ✅ Preview before publishing
- ✅ Save drafts frequently
- ✅ Use images and videos to enhance content
- ✅ Keep content well-structured with headings

**Need Help?**
- Check this guide
- Refer to BLOG_IMPLEMENTATION.md for technical details
- Test in draft mode before publishing

Happy blogging! 🎉
