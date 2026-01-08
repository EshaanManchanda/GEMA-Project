import React, { useState, useMemo } from 'react';
import { Copy, Check, Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Image as ImageIcon, Video, Table2, Palette, Highlighter, Type, Undo, Redo } from 'lucide-react';
import toast from 'react-hot-toast';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const BlogStyleGuidePage: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'classes'>('editor');
  const [searchTerm, setSearchTerm] = useState('');

  const copyToClipboard = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast.success(`Copied ${label}!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Toolbar buttons reference
  const toolbarButtons = [
    { icon: <Bold size={18} />, name: 'Bold', shortcut: 'Ctrl+B', description: 'Make text bold' },
    { icon: <Italic size={18} />, name: 'Italic', shortcut: 'Ctrl+I', description: 'Make text italic' },
    { icon: <Underline size={18} />, name: 'Underline', shortcut: 'Ctrl+U', description: 'Underline text' },
    { icon: <Strikethrough size={18} />, name: 'Strike', description: 'Strikethrough text' },
    { icon: <Code size={18} />, name: 'Code', description: 'Inline code formatting' },
    { icon: <Heading1 size={18} />, name: 'H1', description: 'Heading 1 (large)' },
    { icon: <Heading2 size={18} />, name: 'H2', description: 'Heading 2 (medium)' },
    { icon: <Heading3 size={18} />, name: 'H3', description: 'Heading 3 (small)' },
    { icon: <List size={18} />, name: 'Bullet List', description: 'Unordered list' },
    { icon: <ListOrdered size={18} />, name: 'Numbered List', description: 'Ordered list' },
    { icon: <Quote size={18} />, name: 'Blockquote', description: 'Quote block' },
    { icon: <AlignLeft size={18} />, name: 'Align Left', description: 'Align text left' },
    { icon: <AlignCenter size={18} />, name: 'Align Center', description: 'Center text' },
    { icon: <AlignRight size={18} />, name: 'Align Right', description: 'Align text right' },
    { icon: <AlignJustify size={18} />, name: 'Justify', description: 'Justify text' },
    { icon: <Link2 size={18} />, name: 'Link', description: 'Insert/edit link' },
    { icon: <ImageIcon size={18} />, name: 'Image', description: 'Insert image from library' },
    { icon: <Video size={18} />, name: 'Video', description: 'Insert video or YouTube' },
    { icon: <Table2 size={18} />, name: 'Table', description: 'Insert 3x3 table with headers' },
    { icon: <Palette size={18} />, name: 'Text Color', description: 'Hover to see color palette' },
    { icon: <Highlighter size={18} />, name: 'Highlight', description: 'Hover for highlight colors' },
    { icon: <Type size={18} />, name: 'HTML', description: 'Insert custom HTML' },
    { icon: <Undo size={18} />, name: 'Undo', shortcut: 'Ctrl+Z', description: 'Undo last action' },
    { icon: <Redo size={18} />, name: 'Redo', shortcut: 'Ctrl+Y', description: 'Redo last action' },
  ];

  // Text colors used in editor
  const textColors = ['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
  const highlightColors = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5', '#E0E7FF', '#FCE7F3', '#F3F4F6'];

  const examples = [
    {
      category: 'Layout - Grids',
      items: [
        {
          label: '2-Column Grid',
          className: 'blog-grid-2',
          code: `<div class="blog-grid-2">
  <div class="blog-card">Column 1 content</div>
  <div class="blog-card">Column 2 content</div>
</div>`,
          preview: (
            <div className="blog-grid-2">
              <div className="blog-card">Column 1 content</div>
              <div className="blog-card">Column 2 content</div>
            </div>
          )
        },
        {
          label: '3-Column Grid',
          className: 'blog-grid-3',
          code: `<div class="blog-grid-3">
  <div class="blog-card">Col 1</div>
  <div class="blog-card">Col 2</div>
  <div class="blog-card">Col 3</div>
</div>`,
          preview: (
            <div className="blog-grid-3">
              <div className="blog-card">Col 1</div>
              <div className="blog-card">Col 2</div>
              <div className="blog-card">Col 3</div>
            </div>
          )
        },
        {
          label: 'Sidebar Layout',
          className: 'blog-grid-sidebar',
          code: `<div class="blog-grid-sidebar">
  <div class="blog-box-light">Main content area</div>
  <div class="blog-box-primary">Sidebar</div>
</div>`,
          preview: (
            <div className="blog-grid-sidebar">
              <div className="blog-box-light">Main content area</div>
              <div className="blog-box-primary">Sidebar</div>
            </div>
          )
        }
      ]
    },
    {
      category: 'Callouts & Boxes',
      items: [
        {
          label: 'Info Callout',
          className: 'blog-callout-info',
          code: `<div class="blog-callout-info">
  💡 This is an information callout
</div>`,
          preview: (
            <div className="blog-callout-info">
              💡 This is an information callout
            </div>
          )
        },
        {
          label: 'Warning Callout',
          className: 'blog-callout-warning',
          code: `<div class="blog-callout-warning">
  ⚠️ This is a warning callout
</div>`,
          preview: (
            <div className="blog-callout-warning">
              ⚠️ This is a warning callout
            </div>
          )
        },
        {
          label: 'Success Callout',
          className: 'blog-callout-success',
          code: `<div class="blog-callout-success">
  ✅ This is a success callout
</div>`,
          preview: (
            <div className="blog-callout-success">
              ✅ This is a success callout
            </div>
          )
        },
        {
          label: 'Danger Callout',
          className: 'blog-callout-danger',
          code: `<div class="blog-callout-danger">
  ❌ This is a danger callout
</div>`,
          preview: (
            <div className="blog-callout-danger">
              ❌ This is a danger callout
            </div>
          )
        },
        {
          label: 'Gradient Box',
          className: 'blog-box-gradient',
          code: `<div class="blog-box-gradient">
  <h3>Featured Highlights</h3>
  <ul>
    <li>Premium styling</li>
    <li>Perfect contrast</li>
  </ul>
</div>`,
          preview: (
            <div className="blog-box-gradient">
              <h3 className="font-bold mb-2">Featured Highlights</h3>
              <ul>
                <li>Premium styling</li>
                <li>Perfect contrast</li>
              </ul>
            </div>
          )
        },
        {
          label: 'Card Highlight',
          className: 'blog-card-highlight',
          code: `<div class="blog-card-highlight">
  <h3>Featured Content</h3>
  <p>Beautiful gradient card</p>
</div>`,
          preview: (
            <div className="blog-card-highlight">
              <h3 className="font-bold mb-2">Featured Content</h3>
              <p>Beautiful gradient card</p>
            </div>
          )
        }
      ]
    },
    {
      category: 'Dividers & Spacing',
      items: [
        {
          label: 'Standard Divider',
          className: 'blog-divider',
          code: `<div class="blog-divider"></div>`,
          preview: <div className="blog-divider"></div>
        },
        {
          label: 'Thick Divider',
          className: 'blog-divider-thick',
          code: `<div class="blog-divider-thick"></div>`,
          preview: <div className="blog-divider-thick"></div>
        },
        {
          label: 'Vertical Space',
          className: 'blog-space-md',
          code: `<div class="blog-space-md"></div>`,
          preview: (
            <div className="bg-gray-100 border border-dashed border-gray-300 p-2 text-center text-xs text-gray-500">
              Spacer (2rem)
              <div className="blog-space-md"></div>
              (Gap above)
            </div>
          )
        }
      ]
    },
    {
      category: 'Typography',
      items: [
        {
          label: 'Drop Cap',
          className: 'blog-drop-cap',
          code: `<p class="blog-drop-cap">
  The first letter of this paragraph is large and fancy, creating an elegant magazine-style effect.
</p>`,
          preview: (
            <p className="blog-drop-cap">
              The first letter of this paragraph is large and fancy, creating an elegant magazine-style effect.
            </p>
          )
        },
        {
          label: 'Text Highlight',
          className: 'blog-text-highlight',
          code: `<span class="blog-text-highlight">highlighted text</span>`,
          preview: (
            <p>
              This is <span className="blog-text-highlight">highlighted text</span> in a sentence.
            </p>
          )
        },
        {
          label: 'Pull Quote',
          className: 'blog-pull-quote',
          code: `<blockquote class="blog-pull-quote">
  "This is an important quote that stands out from the main text."
</blockquote>`,
          preview: (
            <blockquote className="blog-pull-quote">
              "This is an important quote that stands out from the main text."
            </blockquote>
          )
        }
      ]
    },
    {
      category: 'Buttons & Links',
      items: [
        {
          label: 'Button',
          className: 'blog-button',
          code: `<a href="javascript:void(0)" class="blog-button">Click Here</a>`,
          preview: (
            <a href="javascript:void(0)" className="blog-button">Click Here</a>
          )
        },
        {
          label: 'Outline Button',
          className: 'blog-button-outline',
          code: `<a href="javascript:void(0)" class="blog-button-outline">Learn More</a>`,
          preview: (
            <a href="javascript:void(0)" className="blog-button-outline">Learn More</a>
          )
        }
      ]
    },
    {
      category: 'Images',
      items: [
        {
          label: 'Float Left',
          className: 'blog-img-float-left',
          code: `<img src="..." class="blog-img-float-left" alt="..." />`,
          preview: (
            <div>
              <div className="blog-img-float-left bg-gray-300 p-8 text-center" style={{ width: '150px', height: '100px' }}>
                Image
              </div>
              <p>Text wraps around the image on the right side. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          )
        },
        {
          label: 'Float Right',
          className: 'blog-img-float-right',
          code: `<img src="..." class="blog-img-float-right" alt="..." />`,
          preview: (
            <div>
              <div className="blog-img-float-right bg-gray-300 p-8 text-center" style={{ width: '150px', height: '100px' }}>
                Image
              </div>
              <p>Text wraps around the image on the left side. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          )
        },
        {
          label: 'Image Caption',
          className: 'blog-img-caption',
          code: `<img src="..." alt="..." />
<p class="blog-img-caption">Photo by John Doe</p>`,
          preview: (
            <div>
              <div className="bg-gray-300 p-12 text-center rounded-lg">Image</div>
              <p className="blog-img-caption">Photo by John Doe</p>
            </div>
          )
        }
      ]
    },
    {
      category: 'Columns',
      items: [
        {
          label: '2 Columns',
          className: 'blog-columns-2',
          code: `<div class="blog-columns-2">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit...
</div>`,
          preview: (
            <div className="blog-columns-2">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </div>
          )
        },
        {
          label: '3 Columns',
          className: 'blog-columns-3',
          code: `<div class="blog-columns-3">
  Lorem ipsum dolor sit amet, consectetur adipiscing elit...
</div>`,
          preview: (
            <div className="blog-columns-3">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </div>
          )
        }
      ]
    }
  ];

  // Filter examples for Style Classes tab
  const filteredExamples = useMemo(() => {
    if (!searchTerm.trim()) return examples;

    const lowerSearch = searchTerm.toLowerCase();
    return examples
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(lowerSearch) ||
          item.className.toLowerCase().includes(lowerSearch) ||
          item.code.toLowerCase().includes(lowerSearch)
        )
      }))
      .filter(section => section.items.length > 0);
  }, [searchTerm]);

  // Determine which editor sections to show based on search
  const editorSections = useMemo(() => {
    if (!searchTerm.trim()) {
      return {
        introduction: true,
        toolbar: true,
        basicFormatting: true,
        tables: true,
        colors: true,
        media: true,
        links: true,
        advanced: true,
        shortcuts: true,
        troubleshooting: true
      };
    }

    const lowerSearch = searchTerm.toLowerCase();
    return {
      introduction: 'introduction welcome editor wordpress'.includes(lowerSearch),
      toolbar: 'toolbar buttons reference'.includes(lowerSearch) ||
        toolbarButtons.some(btn =>
          btn.name.toLowerCase().includes(lowerSearch) ||
          btn.description.toLowerCase().includes(lowerSearch)
        ),
      basicFormatting: 'formatting text bold italic heading list quote'.includes(lowerSearch),
      tables: 'table row column grid'.includes(lowerSearch),
      colors: 'color highlight palette paint'.includes(lowerSearch),
      media: 'image video youtube media photo'.includes(lowerSearch),
      links: 'link url hyperlink'.includes(lowerSearch),
      advanced: 'html css custom advanced layout'.includes(lowerSearch),
      shortcuts: 'keyboard shortcut ctrl key'.includes(lowerSearch),
      troubleshooting: 'troubleshoot problem issue fix error help'.includes(lowerSearch)
    };
  }, [searchTerm]);

  // Show "no results" message
  const showNoResults = useMemo(() => {
    if (!searchTerm.trim()) return false;

    if (activeTab === 'classes') {
      return filteredExamples.length === 0;
    } else {
      return !Object.values(editorSections).some(show => show);
    }
  }, [searchTerm, activeTab, filteredExamples, editorSections]);

  return (
    <>
      <PrivatePageSEO title="Admin - Blog Style Guide | Kidrove" description="Blog editor style guide" />
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Blog Editor Guide & Style Reference</h1>
          <p className="text-gray-600">
            Learn how to use the editor and discover available CSS classes for blog content styling
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tutorials and classes..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('editor')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${activeTab === 'editor'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              📝 Editor Tutorial
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${activeTab === 'classes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              🎨 Style Classes
            </button>
          </nav>
        </div>

        {/* Editor Tutorial Tab */}
        {activeTab === 'editor' && (
          <div className="space-y-12">
            {/* No results message */}
            {showNoResults && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-2">No results found for "{searchTerm}"</p>
                <p className="text-gray-400 text-sm">Try searching for: table, color, image, link, formatting, shortcuts</p>
              </div>
            )}

            {/* Introduction */}
            {editorSections.introduction && (
              <section id="introduction">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to the Blog Editor!</h2>
                  <p className="text-gray-700 mb-4">
                    The editor provides powerful WordPress-level tools for creating beautiful blog content:
                  </p>
                  <ul className="list-disc ml-6 space-y-2 text-gray-700">
                    <li><strong>Rich Text Formatting:</strong> Bold, italic, headings, lists, and more</li>
                    <li><strong>Tables:</strong> Insert and manage tables with drag-and-drop simplicity</li>
                    <li><strong>Colors & Highlights:</strong> Text color picker and background highlights</li>
                    <li><strong>Media:</strong> Images, videos, and YouTube embeds from library</li>
                    <li><strong>Advanced Layouts:</strong> 40+ utility classes for grids, cards, callouts</li>
                    <li><strong>Custom CSS:</strong> Per-post styling for unique designs</li>
                  </ul>
                </div>
              </section>
            )}

            {/* Toolbar Reference */}
            {editorSections.toolbar && (
              <section id="toolbar">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Toolbar Reference
                </h2>
                <p className="text-gray-600 mb-6">Complete guide to all editor toolbar buttons:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {toolbarButtons.map((btn) => (
                    <div key={btn.name} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-gray-700">{btn.icon}</div>
                        <strong className="text-gray-900">{btn.name}</strong>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{btn.description}</p>
                      {btn.shortcut && (
                        <kbd className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">{btn.shortcut}</kbd>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Basic Formatting */}
            {editorSections.basicFormatting && (
              <section id="basic-formatting">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Basic Text Formatting
                </h2>
                <div className="space-y-6">
                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">Text Styles</h3>
                    <div className="space-y-2 mb-4">
                      <p><strong>Bold text</strong> - Click Bold button or press Ctrl+B</p>
                      <p><em>Italic text</em> - Click Italic button or press Ctrl+I</p>
                      <p><u>Underlined text</u> - Click Underline button or press Ctrl+U</p>
                      <p><del>Strikethrough text</del> - Click Strike button</p>
                      <p><code className="bg-gray-100 px-2 py-1 rounded">Inline code</code> - Click Code button</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">Headings</h3>
                    <div className="space-y-3">
                      <div>
                        <h1 className="text-3xl font-bold">Heading 1 - Use for main title</h1>
                        <p className="text-xs text-gray-500 mt-1">Usually one per post</p>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Heading 2 - Use for major sections</h2>
                        <p className="text-xs text-gray-500 mt-1">Break content into parts</p>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Heading 3 - Use for subsections</h3>
                        <p className="text-xs text-gray-500 mt-1">Within H2 sections</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">Lists & Quotes</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Bullet List:</p>
                        <ul className="list-disc ml-6">
                          <li>First item</li>
                          <li>Second item</li>
                          <li>Third item</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Numbered List:</p>
                        <ol className="list-decimal ml-6">
                          <li>First step</li>
                          <li>Second step</li>
                          <li>Third step</li>
                        </ol>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-2">Blockquote:</p>
                        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
                          "This is an important quote from someone."
                        </blockquote>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Tables */}
            {editorSections.tables && (
              <section id="tables">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Working with Tables
                </h2>
                <div className="space-y-6">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <h3 className="font-semibold mb-2">📚 What you'll learn:</h3>
                    <ul className="list-disc ml-6 text-sm space-y-1">
                      <li>How to insert a table (3x3 with headers)</li>
                      <li>Adding and removing rows and columns</li>
                      <li>Deleting the entire table</li>
                      <li>Best practices for table formatting</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">Step 1: Insert a Table</h3>
                    <p className="mb-4 text-gray-700">
                      Click the <strong>Table icon</strong> (grid icon) in the toolbar. A 3×3 table with a header row will appear.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold">Header 1</th>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold">Header 2</th>
                            <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold">Header 3</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-gray-300 px-3 py-2">Cell 1</td>
                            <td className="border border-gray-300 px-3 py-2">Cell 2</td>
                            <td className="border border-gray-300 px-3 py-2">Cell 3</td>
                          </tr>
                          <tr>
                            <td className="border border-gray-300 px-3 py-2">Cell 4</td>
                            <td className="border border-gray-300 px-3 py-2">Cell 5</td>
                            <td className="border border-gray-300 px-3 py-2">Cell 6</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-600 mt-2">Default: 3 columns × 3 rows with header row</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">Step 2: Managing Rows & Columns</h3>
                    <p className="mb-4 text-gray-700">When your cursor is inside a table, these buttons appear in the toolbar:</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="border rounded-lg p-4 text-center">
                        <button className="px-3 py-1 bg-gray-200 rounded font-mono text-sm mb-2">C+</button>
                        <p className="text-xs text-gray-600">Add Column Before</p>
                      </div>
                      <div className="border rounded-lg p-4 text-center">
                        <button className="px-3 py-1 bg-gray-200 rounded font-mono text-sm mb-2">R+</button>
                        <p className="text-xs text-gray-600">Add Row Before</p>
                      </div>
                      <div className="border rounded-lg p-4 text-center">
                        <button className="px-3 py-1 bg-red-100 text-red-600 rounded font-mono text-sm mb-2">C-</button>
                        <p className="text-xs text-gray-600">Delete Column</p>
                      </div>
                      <div className="border rounded-lg p-4 text-center">
                        <button className="px-3 py-1 bg-red-100 text-red-600 rounded font-mono text-sm mb-2">R-</button>
                        <p className="text-xs text-gray-600">Delete Row</p>
                      </div>
                      <div className="border rounded-lg p-4 text-center">
                        <button className="px-3 py-1 bg-red-100 text-red-600 rounded font-mono text-sm mb-2">
                          <Table2 size={14} className="inline" />
                        </button>
                        <p className="text-xs text-gray-600">Delete Entire Table</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <p className="font-semibold mb-2">💡 Pro Tips:</p>
                    <ul className="list-disc ml-6 text-sm space-y-1">
                      <li>Press <kbd className="px-2 py-1 bg-white border rounded text-xs">Tab</kbd> to move to the next cell</li>
                      <li>Table toolbar buttons only appear when your cursor is inside a table</li>
                      <li>You can format text inside table cells (bold, colors, links, etc.)</li>
                      <li>Click inside any cell to start editing</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <p className="font-semibold mb-2">⚠️ Common Mistakes:</p>
                    <ul className="list-disc ml-6 text-sm space-y-1">
                      <li>Clicking table icon while cursor is INSIDE a table inserts another table inside (avoid this!)</li>
                      <li>To delete a table, use the faded table icon button that appears when cursor is in table</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Colors & Highlights */}
            {editorSections.colors && (
              <section id="colors">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Colors & Highlights
                </h2>
                <div className="space-y-6">
                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Palette size={20} />
                      Text Color Picker
                    </h3>
                    <p className="mb-4 text-gray-700">
                      <strong>Important:</strong> <strong className="text-red-600">Hover</strong> over the Palette icon (don't click it directly!) to reveal the color swatches.
                    </p>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Available colors:</p>
                      <div className="flex gap-2 flex-wrap">
                        {textColors.map(color => (
                          <div key={color} className="text-center">
                            <div
                              className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-gray-500"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                            <code className="text-xs text-gray-600">{color.substring(0, 7)}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">How to use:</p>
                      <ol className="list-decimal ml-6 text-sm space-y-1">
                        <li>Select the text you want to color</li>
                        <li><strong>Hover</strong> over the Palette icon in toolbar</li>
                        <li>Click on a color swatch</li>
                        <li>Click <strong>×</strong> to reset to default color</li>
                      </ol>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Highlighter size={20} />
                      Highlight Picker
                    </h3>
                    <p className="mb-4 text-gray-700">
                      <strong>Hover</strong> over the Highlighter icon to reveal background highlight colors.
                    </p>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Available highlights:</p>
                      <div className="flex gap-2 flex-wrap">
                        {highlightColors.map(color => (
                          <div key={color} className="text-center">
                            <div
                              className="w-10 h-10 rounded border-2 border-gray-300 cursor-pointer hover:border-gray-500"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Example:</p>
                      <p className="text-lg">
                        This is <span style={{ backgroundColor: '#FEF3C7', padding: '2px 4px' }}>highlighted text</span> in a sentence.
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <p className="font-semibold mb-2">⚠️ Important:</p>
                    <p className="text-sm">
                      <strong>Hover</strong> over the color/highlighter icons to see the palette. Don't click the icons themselves!
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Images & Media */}
            {editorSections.media && (
              <section id="media">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Images & Media
                </h2>
                <div className="space-y-6">
                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ImageIcon size={20} />
                      Inserting Images
                    </h3>
                    <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                      <li>Click the <strong>Image icon</strong> in toolbar</li>
                      <li>Choose from <strong>Media Library</strong> or enter an <strong>External URL</strong></li>
                      <li>Select an image from your uploaded files</li>
                      <li>Image appears in the editor</li>
                    </ol>
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">💡 Tip: You can also use utility classes for image positioning:</p>
                      <ul className="list-disc ml-6 text-sm space-y-1">
                        <li><code>.blog-img-float-left</code> - Image on left, text wraps right</li>
                        <li><code>.blog-img-float-right</code> - Image on right, text wraps left</li>
                        <li><code>.blog-img-full</code> - Full-width image</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Video size={20} />
                      Videos & YouTube
                    </h3>
                    <p className="mb-3 text-gray-700">Insert videos or YouTube embeds:</p>
                    <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                      <li>Click the <strong>Video icon</strong> in toolbar</li>
                      <li>Select from <strong>Media Library</strong> for uploaded videos</li>
                      <li>Or enter a <strong>YouTube URL</strong> for embeds</li>
                      <li>Video player appears in the editor</li>
                    </ol>
                  </div>
                </div>
              </section>
            )}

            {/* Links */}
            {editorSections.links && (
              <section id="links">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Adding Links
                </h2>
                <div className="space-y-6">
                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Link2 size={20} />
                      How to Add Links
                    </h3>
                    <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                      <li>Select the text you want to turn into a link</li>
                      <li>Click the <strong>Link icon</strong> in toolbar</li>
                      <li>Enter the URL in the popup</li>
                      <li>Press Enter or click outside to save</li>
                    </ol>
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Editing/Removing links:</p>
                      <ul className="list-disc ml-6 text-sm space-y-1">
                        <li>Click on a linked text and click the Link icon again to edit</li>
                        <li>Click the unlink button in the popup to remove the link</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Advanced Features */}
            {editorSections.advanced && (
              <section id="advanced">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Advanced Features
                </h2>
                <div className="space-y-6">
                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">HTML Insertion</h3>
                    <p className="mb-3 text-gray-700">
                      Use the <strong>HTML button</strong> (code icon) to insert custom HTML for advanced layouts.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold mb-2">When to use:</p>
                      <ul className="list-disc ml-6 text-sm space-y-1 text-gray-700">
                        <li>Creating grids and columns (see Style Classes tab)</li>
                        <li>Adding callout boxes and cards</li>
                        <li>Complex layouts not possible with toolbar buttons</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-white">
                    <h3 className="font-semibold mb-3">Custom CSS (Advanced)</h3>
                    <p className="mb-3 text-gray-700">
                      Scroll down to the <strong>"Custom CSS (Optional)"</strong> field to add per-post styles.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold mb-2">Example:</p>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                        {`.my-gradient-box {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 2rem;
  border-radius: 1rem;
}`}
                      </pre>
                      <p className="text-sm text-gray-600 mt-2">
                        Then use <code className="bg-gray-200 px-2 py-1 rounded">&lt;div class="my-gradient-box"&gt;...&lt;/div&gt;</code> in content
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <p className="font-semibold mb-2">📖 More Layout Options:</p>
                    <p className="text-sm">
                      Switch to the <strong>Style Classes</strong> tab to see 40+ utility classes for grids, callouts, cards, and more!
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Keyboard Shortcuts */}
            {editorSections.shortcuts && (
              <section id="shortcuts">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Keyboard Shortcuts
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <span className="text-gray-700">Bold</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+B</kbd>
                  </div>
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <span className="text-gray-700">Italic</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+I</kbd>
                  </div>
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <span className="text-gray-700">Underline</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+U</kbd>
                  </div>
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <span className="text-gray-700">Undo</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Z</kbd>
                  </div>
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <span className="text-gray-700">Redo</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Y</kbd>
                  </div>
                  <div className="border rounded-lg p-4 bg-white flex items-center justify-between">
                    <span className="text-gray-700">Next table cell</span>
                    <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded">Tab</kbd>
                  </div>
                </div>
              </section>
            )}

            {/* Troubleshooting */}
            {editorSections.troubleshooting && (
              <section id="troubleshooting">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-primary-500">
                  Troubleshooting
                </h2>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="font-semibold mb-2 text-red-600">❌ Color palette not appearing</h3>
                    <p className="text-sm text-gray-700 mb-2"><strong>Cause:</strong> Clicking icon instead of hovering</p>
                    <p className="text-sm text-green-700"><strong>Fix:</strong> <strong>Hover</strong> over the palette/highlighter icons to see colors</p>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="font-semibold mb-2 text-red-600">❌ Table buttons don't appear</h3>
                    <p className="text-sm text-gray-700 mb-2"><strong>Cause:</strong> Cursor not inside table</p>
                    <p className="text-sm text-green-700"><strong>Fix:</strong> Click inside a table cell to see row/column buttons</p>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="font-semibold mb-2 text-red-600">❌ Can't delete table</h3>
                    <p className="text-sm text-gray-700 mb-2"><strong>Cause:</strong> Looking for delete button outside table</p>
                    <p className="text-sm text-green-700"><strong>Fix:</strong> Put cursor in table, use faded table icon button to delete entire table</p>
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <h3 className="font-semibold mb-2 text-red-600">❌ Float images not wrapping text</h3>
                    <p className="text-sm text-gray-700 mb-2"><strong>Cause:</strong> Not enough text content</p>
                    <p className="text-sm text-green-700"><strong>Fix:</strong> Add more text after image, or use a different layout</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Style Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-12">
            {/* No results message */}
            {showNoResults && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-2">No results found for "{searchTerm}"</p>
                <p className="text-gray-400 text-sm">Try searching for: grid, callout, card, button, image, column</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📖 Fonts Used</h3>
              <p className="text-sm text-blue-800">
                <span className="font-semibold" style={{ fontFamily: 'Inter' }}>Inter</span> - Body text (this is Inter)
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-semibold text-xl" style={{ fontFamily: 'Playfair Display' }}>Playfair Display</span> - Headings (this is Playfair Display)
              </p>
            </div>

            {filteredExamples.map((section) => (
              <div key={section.category}>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b-2 border-primary-500">
                  {section.category}
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  {section.items.map((item) => (
                    <div key={item.label} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.label}</h3>
                          <code className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">.{item.className}</code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.code, item.label)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
                          style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                          {copiedCode === item.label ? (
                            <>
                              <Check size={16} />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={16} />
                              Copy Code
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview:</h4>
                        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200 blog-content">
                          {item.preview}
                        </div>

                        <h4 className="text-sm font-semibold text-gray-700 mb-2">HTML Code:</h4>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                          <code>{item.code}</code>
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick Reference */}
            <div className="mt-12 p-6 bg-gray-100 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Reference - All Classes</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                <code className="bg-white px-2 py-1 rounded">.blog-grid-2</code>
                <code className="bg-white px-2 py-1 rounded">.blog-grid-3</code>
                <code className="bg-white px-2 py-1 rounded">.blog-grid-sidebar</code>
                <code className="bg-white px-2 py-1 rounded">.blog-flex-row</code>
                <code className="bg-white px-2 py-1 rounded">.blog-flex-col</code>
                <code className="bg-white px-2 py-1 rounded">.blog-flex-center</code>
                <code className="bg-white px-2 py-1 rounded">.blog-flex-between</code>
                <code className="bg-white px-2 py-1 rounded">.blog-card</code>
                <code className="bg-white px-2 py-1 rounded">.blog-card-highlight</code>
                <code className="bg-white px-2 py-1 rounded">.blog-callout</code>
                <code className="bg-white px-2 py-1 rounded">.blog-callout-info</code>
                <code className="bg-white px-2 py-1 rounded">.blog-callout-warning</code>
                <code className="bg-white px-2 py-1 rounded">.blog-callout-success</code>
                <code className="bg-white px-2 py-1 rounded">.blog-callout-danger</code>
                <code className="bg-white px-2 py-1 rounded">.blog-drop-cap</code>
                <code className="bg-white px-2 py-1 rounded">.blog-text-highlight</code>
                <code className="bg-white px-2 py-1 rounded">.blog-pull-quote</code>
                <code className="bg-white px-2 py-1 rounded">.blog-button</code>
                <code className="bg-white px-2 py-1 rounded">.blog-button-outline</code>
                <code className="bg-white px-2 py-1 rounded">.blog-img-full</code>
                <code className="bg-white px-2 py-1 rounded">.blog-img-float-left</code>
                <code className="bg-white px-2 py-1 rounded">.blog-img-float-right</code>
                <code className="bg-white px-2 py-1 rounded">.blog-img-caption</code>
                <code className="bg-white px-2 py-1 rounded">.blog-columns-2</code>
                <code className="bg-white px-2 py-1 rounded">.blog-columns-3</code>
                <code className="bg-white px-2 py-1 rounded">.blog-box</code>
                <code className="bg-white px-2 py-1 rounded">.blog-box-light</code>
                <code className="bg-white px-2 py-1 rounded">.blog-box-primary</code>
                <code className="bg-white px-2 py-1 rounded">.blog-box-accent</code>
                <code className="bg-white px-2 py-1 rounded">.blog-space-sm/md/lg/xl</code>
                <code className="bg-white px-2 py-1 rounded">.blog-text-center/left/right</code>
                <code className="bg-white px-2 py-1 rounded">.blog-divider</code>
                <code className="bg-white px-2 py-1 rounded">.blog-divider-thick</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BlogStyleGuidePage;
