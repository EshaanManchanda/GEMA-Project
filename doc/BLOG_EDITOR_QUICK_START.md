# Blog Editor Quick Start Guide

> 5-minute guide to using the enhanced blog editor

---

## ✨ What's New?

Your blog editor now has **WordPress-level control** with:
- 🎨 **Tables** - Visual table editor
- 🌈 **Colors** - Text & highlight color pickers
- 📐 **40+ Layout Classes** - Grids, cards, callouts, columns
- 💅 **Custom CSS** - Per-post styling
- 🔤 **Professional Fonts** - Inter + Playfair Display

---

## 🚀 Quick Examples

### 1. Insert a Table (30 seconds)

1. Click the **table icon** in toolbar
2. A 3×3 table appears with headers
3. **Edit cells:** Click inside any cell and type
4. **Add rows/columns:** Use `R+` or `C+` buttons
5. **Delete:** Select cell, use `R-` or `C-` buttons

**Result:**
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |

---

### 2. Add Colors (15 seconds)

**Text Color:**
1. Select text
2. Hover **palette icon** 🎨
3. Click a color

**Highlight:**
1. Select text
2. Hover **highlighter icon**
3. Click a color

**Result:** <span style="color: #3B82F6; background: #FEF3C7;">Colored and highlighted text</span>

---

### 3. Create a 2-Column Layout (1 minute)

1. Click **Insert HTML** button (code icon `</>`)
2. Paste this code:
```html
<div class="blog-grid-2">
  <div class="blog-card">
    <h3>Column 1</h3>
    <p>Your content here...</p>
  </div>
  <div class="blog-card">
    <h3>Column 2</h3>
    <p>Your content here...</p>
  </div>
</div>
```
3. Click "Insert"

**Result:** Two side-by-side cards (mobile-responsive!)

---

### 4. Add an Info Callout (30 seconds)

1. Click **Insert HTML** button
2. Paste:
```html
<div class="blog-callout-info">
  💡 This is an important tip for readers!
</div>
```

**Result:** Blue info box with border

**Other callouts:**
- `.blog-callout-warning` → Yellow warning
- `.blog-callout-success` → Green success
- `.blog-callout-danger` → Red danger

---

### 5. Floating Image with Text Wrap (45 seconds)

1. Click **Insert HTML** button
2. Paste:
```html
<img src="your-image-url.jpg" alt="Description" class="blog-img-float-right" />
<p>Your text will wrap around the image on the left side...</p>
```

**Options:**
- `.blog-img-float-left` - Image on left, text on right
- `.blog-img-float-right` - Image on right, text on left
- `.blog-img-caption` - Centered caption below image

---

### 6. Custom CSS (Advanced - 2 minutes)

For unique styling needs:

1. Scroll to **"Custom CSS (Optional)"** field below content editor
2. Write your styles:
```css
.my-gradient-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
}
```
3. Use in content (Insert HTML):
```html
<div class="my-gradient-box">
  <h2>Special Announcement!</h2>
  <p>This box has a custom gradient background.</p>
</div>
```

---

## 📖 See All Options

**View the Style Guide:**
1. While editing a blog post, click **"📖 View Style Guide"** link
2. Or navigate to: `/admin/blog-style-guide`

**What's in the Style Guide:**
- Live previews of ALL 40+ classes
- Copy-to-clipboard buttons
- HTML code examples
- Font showcase
- Quick reference

---

## 🎯 Most Popular Classes

### Layout
```html
<div class="blog-grid-2">...</div>          <!-- 2 columns -->
<div class="blog-grid-3">...</div>          <!-- 3 columns -->
<div class="blog-grid-sidebar">...</div>    <!-- Main + sidebar -->
```

### Cards & Boxes
```html
<div class="blog-card">...</div>            <!-- Basic card -->
<div class="blog-card-highlight">...</div>  <!-- Gradient card -->
<div class="blog-callout-info">...</div>    <!-- Blue info box -->
```

### Typography
```html
<p class="blog-drop-cap">Text...</p>        <!-- Large first letter -->
<span class="blog-text-highlight">...</span><!-- Yellow highlight -->
<blockquote class="blog-pull-quote">...</blockquote>
```

### Buttons
```html
<a href="#" class="blog-button">Click Me</a>
<a href="#" class="blog-button-outline">Learn More</a>
```

---

## 💡 Pro Tips

### 1. **Combine Classes**
```html
<div class="blog-grid-2">
  <div class="blog-callout-info">
    <h3>Tip 1</h3>
    <p>Info in a grid!</p>
  </div>
  <div class="blog-callout-success">
    <h3>Tip 2</h3>
    <p>Success in a grid!</p>
  </div>
</div>
```

### 2. **Responsive Images**
All image classes are mobile-responsive:
- Floats clear on small screens
- Grids stack vertically on mobile

### 3. **Hover for Color Palettes**
Don't click the color icons - **hover** them to see the color palette!

### 4. **Table Shortcuts**
When cursor is in a table:
- `Tab` → Move to next cell
- Extra toolbar buttons appear automatically

### 5. **Preview Before Publishing**
1. Click **"Preview"** tab in the blog form
2. See exactly how your post will look
3. Switch back to **"Edit"** tab to make changes

---

## 🐛 Troubleshooting

### My custom styles aren't working
**Cause:** CSS conflicts with existing styles

**Fix:**
1. Use more specific selectors:
   ```css
   /* Instead of: */
   .my-box { color: red; }

   /* Use: */
   .blog-content .my-box {
     color: red !important;
   }
   ```

### Table buttons don't appear
**Cause:** Cursor not inside table

**Fix:** Click inside a table cell to see row/column buttons

### Colors not showing in palette
**Cause:** Clicking instead of hovering

**Fix:** **Hover** over palette/highlighter icons (don't click the icon itself)

### Float images not wrapping
**Cause:** Not enough text

**Fix:** Add more text content after the image, or use a different layout

---

## 📱 Mobile Preview

**All layouts are responsive:**
- 2-3 column grids → Stack to 1 column on mobile
- Floating images → Center and full-width on mobile
- Tables → Horizontal scroll if too wide
- Buttons → Full-width on small screens

**Test on mobile:**
Use browser dev tools (F12) → Toggle device toolbar

---

## ❓ Need Help?

1. **Style Guide:** `/admin/blog-style-guide` - See all examples
2. **Documentation:** `BLOG_STYLING_IMPROVEMENTS.md` - Technical details
3. **Support:** [Your support channel/email]

---

## 🎉 Happy Blogging!

You now have professional blogging tools. Experiment with:
- Tables for data/comparisons
- Colors for emphasis
- Grids for visual variety
- Custom CSS for unique designs

**Remember:** Click "📖 View Style Guide" anytime for inspiration!
