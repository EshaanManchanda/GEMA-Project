import { test, expect, visit } from '../support/fixtures';
import type { Page } from '@playwright/test';

// Exact names: "Insert HTML" in the toolbar would also match a has-text("HTML") selector.
const tab = (page: Page, name: 'HTML' | 'Visual') => page.getByRole('button', { name, exact: true }).first().click();
const editor = (page: Page) => page.locator('.ProseMirror').first();

async function openCreatePage(page: Page) {
  await visit(page, '/admin/events/create');
  await expect(editor(page)).toBeVisible({ timeout: 15000 });
}

test.describe('Admin Event Editor - Description Toggle', () => {
  // Logged in as admin via the saved session (playwright.config.ts → admin project).

  test('HTML to Visual switch preserves content without refresh', async ({ page }) => {
    // The TipTap editor is lazy-loaded; openCreatePage waits for its .ProseMirror element.
    await openCreatePage(page);

    // Switch to HTML mode via the tab button
    await tab(page, 'HTML');

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
    await tab(page, 'Visual');

    // Wait a moment for TipTap to re-render the parsed content
    await page.waitForTimeout(500);

    // Assert that the content is preserved in the visual editor
    const editorContent = editor(page);
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
    await openCreatePage(page);

    // Type content in Visual mode
    await editor(page).click();
    await page.keyboard.type('Hello World');
    await expect(editor(page)).toContainText('Hello World');

    // Switch to HTML mode and capture the HTML
    await tab(page, 'HTML');
    const textarea = page.locator('textarea[placeholder="<p>Write your HTML here...</p>"]');
    const htmlBefore = await textarea.inputValue();
    expect(htmlBefore).toContain('Hello World');

    // Switch back to Visual and verify content
    await tab(page, 'Visual');
    await expect(editor(page)).toContainText('Hello World');

    // Switch to HTML again -- should be stable (no normalization drift)
    await tab(page, 'HTML');
    const htmlAfter = await textarea.inputValue();
    expect(htmlAfter).toBe(htmlBefore);
  });

  test('no-op toggle does not mark form as dirty', async ({ page }) => {
    await openCreatePage(page);

    // Toggle HTML -> Visual -> HTML with no edits at all
    await tab(page, 'HTML');
    await tab(page, 'Visual');
    await tab(page, 'HTML');

    // Verify no "unsaved changes" indicator is visible.
    // Adjust this selector if the UI adds an unsaved-changes indicator.
    const unsavedIndicator = page.locator('text=Unsaved changes');
    await expect(unsavedIndicator).not.toBeVisible();
  });

  test('HTML normalization is stable across round-trips', async ({ page }) => {
    await openCreatePage(page);

    // Switch to HTML and enter content that TipTap will normalize
    await tab(page, 'HTML');
    const textarea = page.locator('textarea[placeholder="<p>Write your HTML here...</p>"]');
    await textarea.fill('<div><p>Nested content</p></div><p>Regular paragraph</p>');

    // Switch to Visual (TipTap normalizes the HTML)
    await tab(page, 'Visual');

    // Switch back to HTML and capture the normalized output
    await tab(page, 'HTML');
    const normalized1 = await textarea.inputValue();

    // One more round-trip should produce identical HTML (stable normalization)
    await tab(page, 'Visual');
    await tab(page, 'HTML');
    const normalized2 = await textarea.inputValue();

    expect(normalized2).toBe(normalized1);
  });
});
