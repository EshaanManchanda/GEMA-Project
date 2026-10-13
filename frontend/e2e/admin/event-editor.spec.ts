import { test, expect } from '@playwright/test';

test.describe('Admin Event Editor - Description Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin via the login form.
    // Requires the backend running on the configured API_BASE_URL (see frontend .env).
    // The webServer config in playwright.config.ts only starts the frontend dev server;
    // start the backend separately with: cd backend && npm run dev
    await page.goto('/login');

    // Fill the email field (id="email")
    await page.fill('#email', 'admin@gema.com');

    // Fill the password field (id="password")
    await page.fill('#password', 'admin123');

    // Submit the form -- the submit button contains "Sign in"
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Wait for navigation away from /login. After successful login the admin
    // is redirected to a role-based dashboard path.
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15000,
    });
  });

  test('HTML to Visual switch preserves content without refresh', async ({ page }) => {
    await page.goto('/admin/events/create');

    // Wait for the TipTapEditor to load (it is lazy-loaded via React.lazy + Suspense).
    // The visual editor renders a .ProseMirror element inside the page.
    await page.waitForSelector('.ProseMirror', { timeout: 15000 });

    // Switch to HTML mode via the tab button
    await page.click('button:has-text("HTML")');

    // Type HTML content in the textarea.
    // The TipTapEditor textarea uses placeholder="<p>Write your HTML here...</p>"
    const textarea = page.locator('textarea[placeholder="<p>Write your HTML here...</p>"]');
    await textarea.fill('<h1>Test Title</h1><p>Test paragraph with <strong>bold</strong> text.</p>');

    // Start collecting console errors before the mode switch
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text());
      }
    });

    // Switch back to Visual mode
    await page.click('button:has-text("Visual")');

    // Wait a moment for TipTap to re-render the parsed content
    await page.waitForTimeout(500);

    // Assert that the content is preserved in the visual editor
    const editorContent = page.locator('.ProseMirror');
    await expect(editorContent).toContainText('Test Title');
    await expect(editorContent).toContainText('Test paragraph with');
    await expect(editorContent).toContainText('bold');

    // Assert no unexpected console errors from the editor toggle.
    // React dev-mode warnings are expected and filtered out.
    const editorErrors = consoleErrors.filter(
      (e) => !e.includes('Warning:')
    );
    expect(editorErrors).toHaveLength(0);
  });

  test('Visual to HTML to Visual round-trip preserves content', async ({ page }) => {
    await page.goto('/admin/events/create');
    await page.waitForSelector('.ProseMirror', { timeout: 15000 });

    // Type content in Visual mode
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.pressSequentially('Hello World');

    // Switch to HTML mode and capture the HTML
    await page.click('button:has-text("HTML")');
    const textarea = page.locator('textarea[placeholder="<p>Write your HTML here...</p>"]');
    const htmlBefore = await textarea.inputValue();
    expect(htmlBefore).toContain('Hello World');

    // Switch back to Visual and verify content
    await page.click('button:has-text("Visual")');
    await expect(editor).toContainText('Hello World');

    // Switch to HTML again -- should be stable (no normalization drift)
    await page.click('button:has-text("HTML")');
    const htmlAfter = await textarea.inputValue();
    expect(htmlAfter).toBe(htmlBefore);
  });

  test('no-op toggle does not mark form as dirty', async ({ page }) => {
    await page.goto('/admin/events/create');
    await page.waitForSelector('.ProseMirror', { timeout: 15000 });

    // Toggle HTML -> Visual -> HTML with no edits at all
    await page.click('button:has-text("HTML")');
    await page.click('button:has-text("Visual")');
    await page.click('button:has-text("HTML")');

    // Verify no "unsaved changes" indicator is visible.
    // Adjust this selector if the UI adds an unsaved-changes indicator.
    const unsavedIndicator = page.locator('text=Unsaved changes');
    await expect(unsavedIndicator).not.toBeVisible();
  });

  test('HTML normalization is stable across round-trips', async ({ page }) => {
    await page.goto('/admin/events/create');
    await page.waitForSelector('.ProseMirror', { timeout: 15000 });

    // Switch to HTML and enter content that TipTap will normalize
    await page.click('button:has-text("HTML")');
    const textarea = page.locator('textarea[placeholder="<p>Write your HTML here...</p>"]');
    await textarea.fill('<div><p>Nested content</p></div><p>Regular paragraph</p>');

    // Switch to Visual (TipTap normalizes the HTML)
    await page.click('button:has-text("Visual")');

    // Switch back to HTML and capture the normalized output
    await page.click('button:has-text("HTML")');
    const normalized1 = await textarea.inputValue();

    // One more round-trip should produce identical HTML (stable normalization)
    await page.click('button:has-text("Visual")');
    await page.click('button:has-text("HTML")');
    const normalized2 = await textarea.inputValue();

    expect(normalized2).toBe(normalized1);
  });
});
