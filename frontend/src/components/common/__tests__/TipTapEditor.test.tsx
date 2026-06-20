/**
 * TipTapEditor Test Suite
 *
 * Tests the HTML/Visual mode toggle, per-keystroke suppression in HTML mode,
 * blur-driven onChange, mode-switch onChange, dirty detection on no-op toggles,
 * debug console cleanliness, and the hideModeSwitcher prop.
 *
 * TipTap's ProseMirror core requires a real Range API (missing in jsdom),
 * so the entire @tiptap/* surface is mocked.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock editor instance — shared across the test module
// ---------------------------------------------------------------------------
const mockSetContent = jest.fn();
const mockGetHTML = jest.fn(() => '<p>test</p>');
const mockClearContent = jest.fn();

const mockEditor: Record<string, any> = {
  getHTML: mockGetHTML,
  getText: jest.fn(() => 'test'),
  commands: {
    setContent: mockSetContent,
    clearContent: mockClearContent,
    setTextSelection: jest.fn(),
    scrollIntoView: jest.fn(),
    setYoutubeVideo: jest.fn(),
  },
  isDestroyed: false,
  isActive: jest.fn(() => false),
  chain: jest.fn(() => {
    const handler: ProxyHandler<Record<string, any>> = {
      get(_target, prop) {
        if (prop === 'run') return jest.fn();
        if (prop === 'focus') return jest.fn(() => new Proxy({}, handler));
        return jest.fn(() => new Proxy({}, handler));
      },
    };
    return new Proxy({} as Record<string, any>, handler);
  }),
  can: jest.fn(() => {
    const handler: ProxyHandler<Record<string, any>> = {
      get(_target, prop) {
        if (prop === 'undo' || prop === 'redo') return jest.fn(() => false);
        return jest.fn(() => new Proxy({}, handler));
      },
    };
    return new Proxy({} as Record<string, any>, handler);
  }),
  getAttributes: jest.fn(() => ({})),
  state: {
    selection: { from: 0, to: 0 },
    doc: { textBetween: jest.fn(() => '') },
  },
  storage: {
    characterCount: {
      characters: jest.fn(() => 42),
      words: jest.fn(() => 7),
    },
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  // Stores captured onUpdate so tests can trigger it
  _onUpdate: undefined as ((args: { editor: any }) => void) | undefined,
};

// ---------------------------------------------------------------------------
// Mock @tiptap/react
// ---------------------------------------------------------------------------
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn((config: any) => {
    if (config?.onUpdate) {
      mockEditor._onUpdate = config.onUpdate;
    }
    return mockEditor;
  }),
  EditorContent: ({ editor: _editor }: any) => (
    <div data-testid="editor-content">Editor</div>
  ),
  BubbleMenu: ({ children }: any) => (
    <div data-testid="bubble-menu">{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock @tiptap/core
// ---------------------------------------------------------------------------
jest.mock('@tiptap/core', () => ({
  Node: {
    create: jest.fn(() => ({
      extend: jest.fn(() => ({ configure: jest.fn(() => ({})) })),
      configure: jest.fn(() => ({})),
    })),
  },
  Mark: {
    create: jest.fn(() => ({
      extend: jest.fn(() => ({ configure: jest.fn(() => ({})) })),
      configure: jest.fn(() => ({})),
    })),
  },
  Extension: { create: jest.fn(() => ({})) },
  mergeAttributes: jest.fn((...attrs: any[]) => Object.assign({}, ...attrs)),
}));

// ---------------------------------------------------------------------------
// Mock all TipTap extensions
// ---------------------------------------------------------------------------
const extensionMock = {
  configure: jest.fn(() => ({})),
  extend: jest.fn(() => ({ configure: jest.fn(() => ({})) })),
};
jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-image', () => ({
  __esModule: true,
  default: {
    extend: jest.fn(() => ({ configure: jest.fn(() => ({})) })),
  },
}));
jest.mock('@tiptap/extension-link', () => ({
  __esModule: true,
  default: {
    extend: jest.fn(() => ({ configure: jest.fn(() => ({})) })),
  },
}));
jest.mock('@tiptap/extension-youtube', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-placeholder', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-underline', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-text-align', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-text-style', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-color', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-highlight', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-table', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-table-row', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-table-header', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-table-cell', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-character-count', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-code-block-lowlight', () => ({
  __esModule: true,
  default: { configure: jest.fn(() => ({})) },
}));
jest.mock('@tiptap/extension-paragraph', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-heading', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-list-item', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-bullet-list', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-ordered-list', () => ({
  __esModule: true,
  default: extensionMock,
}));
jest.mock('@tiptap/extension-blockquote', () => ({
  __esModule: true,
  default: extensionMock,
}));

// lowlight
jest.mock('lowlight', () => ({
  common: {},
  createLowlight: jest.fn(() => ({})),
}));

// Sibling / child components
jest.mock('../HtmlInsertModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../admin/media/MediaPickerModal', () => ({
  __esModule: true,
  default: () => null,
}));

// react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// logger utility
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// lucide-react icons — return trivial span elements
jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get(_target, name) {
        if (typeof name !== 'string') return undefined;
        const IconComponent = (props: any) => (
          <span data-testid={`icon-${name}`} {...props} />
        );
        IconComponent.displayName = name as string;
        return IconComponent;
      },
    },
  );
});

// Media slice type stub
jest.mock('../../../store/slices/mediaSlice', () => ({
  __esModule: true,
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER all mocks
// ---------------------------------------------------------------------------
import TipTapEditor from '../TipTapEditor';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const renderEditor = (
  props: Partial<React.ComponentProps<typeof TipTapEditor>> = {},
) => {
  const defaultProps = {
    content: '<p>Hello</p>',
    onChange: jest.fn(),
  };
  return { ...render(<TipTapEditor {...defaultProps} {...props} />), onChange: props.onChange ?? defaultProps.onChange };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('TipTapEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHTML.mockReturnValue('<p>test</p>');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // a) Mode toggle display
  // -----------------------------------------------------------------------
  describe('mode toggle display', () => {
    it('shows Visual mode by default and hides HTML mode', () => {
      renderEditor();

      // The Visual container wraps EditorContent
      const visualContainer =
        screen.getByTestId('editor-content').parentElement!;
      expect(visualContainer).toHaveStyle({ display: 'block' });

      // The HTML textarea container is hidden
      const textarea = screen.getByPlaceholderText(
        '<p>Write your HTML here...</p>',
      );
      // Walk up to the div with the display style
      const htmlContainer =
        textarea.closest('div.bg-white') ?? textarea.parentElement!.parentElement!;
      expect(htmlContainer).toHaveStyle({ display: 'none' });
    });

    it('switches to HTML mode when HTML button is clicked', () => {
      renderEditor();

      const htmlButton = screen.getByRole('button', { name: /HTML/i });
      act(() => {
        fireEvent.click(htmlButton);
      });

      const visualContainer =
        screen.getByTestId('editor-content').parentElement!;
      expect(visualContainer).toHaveStyle({ display: 'none' });

      const textarea = screen.getByPlaceholderText(
        '<p>Write your HTML here...</p>',
      );
      const htmlContainer =
        textarea.closest('div.bg-white') ?? textarea.parentElement!.parentElement!;
      expect(htmlContainer).toHaveStyle({ display: 'block' });
    });

    it('switches back to Visual when Visual button is clicked', () => {
      renderEditor();

      // Go to HTML
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /HTML/i }));
      });

      // Go back to Visual
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Visual$/i }));
      });

      const visualContainer =
        screen.getByTestId('editor-content').parentElement!;
      expect(visualContainer).toHaveStyle({ display: 'block' });
    });
  });

  // -----------------------------------------------------------------------
  // b) No per-keystroke onChange in HTML mode
  // -----------------------------------------------------------------------
  describe('HTML mode onChange suppression', () => {
    it('does NOT call onChange during typing in HTML textarea', () => {
      const onChange = jest.fn();
      renderEditor({ onChange });

      // Switch to HTML mode
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /HTML/i }));
      });

      // Clear calls from the mode switch
      onChange.mockClear();

      // Type in the textarea
      const textarea = screen.getByPlaceholderText(
        '<p>Write your HTML here...</p>',
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: '<p>New content</p>' },
      });

      // Advance timers in case of any debouncing
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // onChange should NOT have been called during typing
      expect(onChange).not.toHaveBeenCalled();
    });

    it('calls onChange on textarea blur', () => {
      const onChange = jest.fn();
      renderEditor({ onChange });

      // Switch to HTML mode
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /HTML/i }));
      });
      onChange.mockClear();

      // Type and then blur
      const textarea = screen.getByPlaceholderText(
        '<p>Write your HTML here...</p>',
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: '<p>Blurred content</p>' },
      });
      fireEvent.blur(textarea);

      expect(onChange).toHaveBeenCalledWith('<p>Blurred content</p>');
    });
  });

  // -----------------------------------------------------------------------
  // c) HTML -> Visual calls onChange once (from mode switch)
  // -----------------------------------------------------------------------
  describe('HTML to Visual mode switch onChange', () => {
    it('calls onChange when switching from HTML to Visual with edited content', () => {
      const onChange = jest.fn();
      renderEditor({ onChange });

      // Switch to HTML
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /HTML/i }));
      });
      onChange.mockClear();

      // Type new content in HTML textarea
      const textarea = screen.getByPlaceholderText(
        '<p>Write your HTML here...</p>',
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: '<p>Updated HTML</p>' },
      });

      // Switch back to Visual
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Visual$/i }));
      });

      // onChange should be called during the HTML->Visual switch
      expect(onChange).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // d) Dirty detection - no-op toggles
  // -----------------------------------------------------------------------
  describe('dirty detection on no-op toggles', () => {
    it('does not produce different values when toggling modes without edits', () => {
      const onChange = jest.fn();
      mockGetHTML.mockReturnValue('<p>Hello</p>');
      renderEditor({ content: '<p>Hello</p>', onChange });

      onChange.mockClear();

      // Visual -> HTML -> Visual with no edits in between
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /HTML/i }));
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Visual$/i }));
      });

      // All values passed to onChange should be the same (no corruption)
      const allValues = onChange.mock.calls.map((c: any[]) => c[0]);
      const uniqueValues = new Set(allValues);
      expect(uniqueValues.size).toBeLessThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // e) Console clean - no debug logs
  // -----------------------------------------------------------------------
  describe('console cleanliness', () => {
    it('does not emit TipTap debug logs during render and mode toggle', () => {
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      renderEditor();

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /HTML/i }));
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /^Visual$/i }));
      });

      // Filter for TipTap-specific debug output (not React internal warnings)
      const editorLogs = consoleLogSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('TipTap'),
      );
      const editorWarns = consoleWarnSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('TipTap'),
      );

      expect(editorLogs).toHaveLength(0);
      expect(editorWarns).toHaveLength(0);

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // f) hideModeSwitcher prop
  // -----------------------------------------------------------------------
  describe('hideModeSwitcher prop', () => {
    it('hides Visual/HTML toggle buttons when hideModeSwitcher is true', () => {
      renderEditor({ hideModeSwitcher: true });

      expect(
        screen.queryByRole('button', { name: /^Visual$/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /HTML/i }),
      ).not.toBeInTheDocument();
    });

    it('shows Visual/HTML toggle buttons by default', () => {
      renderEditor();

      expect(
        screen.getByRole('button', { name: /^Visual$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /HTML/i }),
      ).toBeInTheDocument();
    });
  });
});
