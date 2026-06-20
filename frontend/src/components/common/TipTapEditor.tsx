import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Node, Mark, mergeAttributes } from '@tiptap/core';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CharacterCount from '@tiptap/extension-character-count';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';
import { common, createLowlight } from 'lowlight';
import HtmlInsertModal from './HtmlInsertModal';

// Initialize lowlight with common languages
const lowlight = createLowlight(common);
import MediaPickerModal from '../admin/media/MediaPickerModal';
import { MediaAsset } from '../../store/slices/mediaSlice';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ImageIcon,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
  Upload,
  Table as TableIcon,
  Palette,
  Highlighter,
  Type,
  ChevronDown,
  RemoveFormatting,
  CaseSensitive,
  FileType,
  Minus,
  Search,
  X,
  ChevronUp,
  HelpCircle,
  FileCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Extension } from '@tiptap/core';
import logger from '../../utils/logger';

// TypeScript declarations for custom commands
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    fontWeight: {
      setFontWeight: (fontWeight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    };
    fontFamily: {
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
    textTransform: {
      setTextTransform: (textTransform: string) => ReturnType;
      unsetTextTransform: () => ReturnType;
    };
  }
}

// Custom FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: (attributes: { fontSize?: string }) => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom FontWeight extension
const FontWeight = Extension.create({
  name: 'fontWeight',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontWeight: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontWeight,
          renderHTML: (attributes: { fontWeight?: string }) => {
            if (!attributes.fontWeight) return {};
            return { style: `font-weight: ${attributes.fontWeight}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontWeight: (fontWeight: string) => ({ chain }) => {
        return chain().setMark('textStyle', { fontWeight }).run();
      },
      unsetFontWeight: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontWeight: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom FontFamily extension
const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.fontFamily?.replace(/['"]+/g, ''),
          renderHTML: (attributes: { fontFamily?: string }) => {
            if (!attributes.fontFamily) return {};
            return { style: `font-family: ${attributes.fontFamily}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }) => {
        return chain().setMark('textStyle', { fontFamily }).run();
      },
      unsetFontFamily: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom TextTransform extension
const TextTransform = Extension.create({
  name: 'textTransform',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        textTransform: {
          default: null,
          parseHTML: (element: HTMLElement) => element.style.textTransform,
          renderHTML: (attributes: { textTransform?: string }) => {
            if (!attributes.textTransform) return {};
            return { style: `text-transform: ${attributes.textTransform}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setTextTransform: (textTransform: string) => ({ chain }) => {
        return chain().setMark('textStyle', { textTransform }).run();
      },
      unsetTextTransform: () => ({ chain }) => {
        return chain().setMark('textStyle', { textTransform: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  mediaCategory?: 'blog' | 'event' | 'profile' | 'document' | 'misc';
  mediaFolder?: string;
  characterLimit?: number;
  showCharacterCount?: boolean;
  hideModeSwitcher?: boolean; // Hide the Visual/HTML mode switcher tabs
}

// Custom Div extension to support layout classes
const Div = Node.create({
  name: 'div',
  group: 'block',
  content: 'block*',
  draggable: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {};
          }
          return { class: attributes.class };
        },
      },
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});

// Custom Span extension to support inline classes
const Span = Mark.create({
  name: 'span',
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) {
            return {};
          }
          return { class: attributes.class };
        },
      },
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) => (element.hasAttribute('class') || element.hasAttribute('style')) ? {} : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

// Custom Link extension to support classes
const CustomLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
      }
    };
  }
});

// Helper to add class/style attributes to any node
const addClassAndStyle = (node: any) => {
  return node.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        class: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('class'),
          renderHTML: (attributes: any) => {
            if (!attributes.class) return {};
            return { class: attributes.class };
          },
        },
        style: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('style'),
          renderHTML: (attributes: any) => {
            if (!attributes.style) return {};
            return { style: attributes.style };
          },
        },
      };
    },
  });
};

// Extended Nodes
const CustomParagraph = addClassAndStyle(Paragraph);
const CustomHeading = addClassAndStyle(Heading).configure({ levels: [1, 2, 3] });
const CustomListItem = addClassAndStyle(ListItem);
const CustomBulletList = addClassAndStyle(BulletList);
const CustomOrderedList = addClassAndStyle(OrderedList);
const CustomBlockquote = addClassAndStyle(Blockquote);
const CustomImage = addClassAndStyle(Image.extend({
  inline: false,
  group: 'block',
})).configure({
  HTMLAttributes: {
    class: 'max-w-full h-auto rounded-lg my-4',
  },
});

// Custom Figure extension for image captions
const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'image figcaption?',
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      class: {
        default: 'my-4',
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => ({ class: attributes.class }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { class: 'my-4 text-center' }), 0];
  },
});

// Custom Figcaption extension
const Figcaption = Node.create({
  name: 'figcaption',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figcaption' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figcaption', mergeAttributes(HTMLAttributes, {
      class: 'text-sm text-gray-600 italic mt-2'
    }), 0];
  },
});

// Keyboard shortcuts reference
const KEYBOARD_SHORTCUTS = [
  { action: 'Bold', keys: 'Ctrl+B', mac: 'Cmd+B' },
  { action: 'Italic', keys: 'Ctrl+I', mac: 'Cmd+I' },
  { action: 'Underline', keys: 'Ctrl+U', mac: 'Cmd+U' },
  { action: 'Strikethrough', keys: 'Ctrl+Shift+S', mac: 'Cmd+Shift+S' },
  { action: 'Inline Code', keys: 'Ctrl+E', mac: 'Cmd+E' },
  { action: 'Link', keys: 'Ctrl+K', mac: 'Cmd+K' },
  { action: 'Undo', keys: 'Ctrl+Z', mac: 'Cmd+Z' },
  { action: 'Redo', keys: 'Ctrl+Y', mac: 'Cmd+Shift+Z' },
  { action: 'Heading 1', keys: 'Ctrl+Alt+1', mac: 'Cmd+Alt+1' },
  { action: 'Heading 2', keys: 'Ctrl+Alt+2', mac: 'Cmd+Alt+2' },
  { action: 'Heading 3', keys: 'Ctrl+Alt+3', mac: 'Cmd+Alt+3' },
  { action: 'Bullet List', keys: 'Ctrl+Shift+8', mac: 'Cmd+Shift+8' },
  { action: 'Ordered List', keys: 'Ctrl+Shift+7', mac: 'Cmd+Shift+7' },
  { action: 'Blockquote', keys: 'Ctrl+Shift+B', mac: 'Cmd+Shift+B' },
  { action: 'Horizontal Rule', keys: 'Ctrl+Shift+-', mac: 'Cmd+Shift+-' },
];

// Keyboard Shortcuts Modal Component
const KeyboardShortcutsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="pb-2">Action</th>
                <th className="pb-2">Shortcut</th>
              </tr>
            </thead>
            <tbody>
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <tr key={shortcut.action} className="border-t">
                  <td className="py-2">{shortcut.action}</td>
                  <td className="py-2">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {isMac ? shortcut.mac : shortcut.keys}
                    </kbd>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your blog content...',
  editable = true,
  mediaCategory = 'misc',
  mediaFolder = 'content',
  characterLimit,
  showCharacterCount = true,
  hideModeSwitcher = false
}) => {
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'image' | 'video'>('image');

  // Editor mode: visual or html
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  // Ref mirrors editorMode so the content-sync effect can read it synchronously
  // without adding editorMode as a dependency (which would cause unwanted re-runs)
  const editorModeRef = useRef<'visual' | 'html'>('visual');

  // Local buffer for HTML-mode textarea — synced to parent only on blur/mode-switch
  const [htmlBuffer, setHtmlBuffer] = useState(content ?? '');

  // Guards to prevent content-sync feedback loops:
  // isInternalUpdateRef: true while a programmatic setContent is in flight
  // lastEmittedRef: last HTML the editor emitted via onUpdate (content equality backstop)
  const isInternalUpdateRef = useRef(false);
  const lastEmittedRef = useRef(content ?? '');

  // Debounced parent onChange for Visual mode (reduces re-renders on large descriptions)
  const debouncedOnChangeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushDebouncedOnChange = useCallback(() => {
    if (debouncedOnChangeRef.current) {
      clearTimeout(debouncedOnChangeRef.current);
      debouncedOnChangeRef.current = null;
    }
  }, []);
  const debouncedOnChange = useCallback((html: string) => {
    flushDebouncedOnChange();
    debouncedOnChangeRef.current = setTimeout(() => {
      lastEmittedRef.current = html;
      onChange(html);
      debouncedOnChangeRef.current = null;
    }, 300);
  }, [onChange, flushDebouncedOnChange]);

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Dropdown states for color/font pickers
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showFontWeightPicker, setShowFontWeightPicker] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
  const [showTextTransformPicker, setShowTextTransformPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#000000');

  // Refs for click-outside handling
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const fontSizePickerRef = useRef<HTMLDivElement>(null);
  const fontWeightPickerRef = useRef<HTMLDivElement>(null);
  const fontFamilyPickerRef = useRef<HTMLDivElement>(null);
  const textTransformPickerRef = useRef<HTMLDivElement>(null);

  // Close all dropdowns helper
  const closeAllDropdowns = () => {
    setShowColorPicker(false);
    setShowHighlightPicker(false);
    setShowFontSizePicker(false);
    setShowFontWeightPicker(false);
    setShowFontFamilyPicker(false);
    setShowTextTransformPicker(false);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
        setShowHighlightPicker(false);
      }
      if (fontSizePickerRef.current && !fontSizePickerRef.current.contains(target)) {
        setShowFontSizePicker(false);
      }
      if (fontWeightPickerRef.current && !fontWeightPickerRef.current.contains(target)) {
        setShowFontWeightPicker(false);
      }
      if (fontFamilyPickerRef.current && !fontFamilyPickerRef.current.contains(target)) {
        setShowFontFamilyPicker(false);
      }
      if (textTransformPickerRef.current && !textTransformPickerRef.current.contains(target)) {
        setShowTextTransformPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flush debounced onChange on unmount so the last edit is never lost
  useEffect(() => {
    return () => {
      flushDebouncedOnChange();
    };
  }, [flushDebouncedOnChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable nodes we are replacing with extended versions
        paragraph: false,
        heading: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
      }),
      CustomParagraph,
      CustomHeading,
      CustomListItem,
      CustomBulletList,
      CustomOrderedList,
      CustomBlockquote,
      Div,
      Span,
      Underline,
      TextStyle,
      FontSize,
      FontWeight,
      FontFamily,
      TextTransform,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      CustomLink.configure({
        openOnClick: false,
      }),
      CustomImage,
      Figure,
      Figcaption,
      Youtube.configure({
        width: 640,
        height: 480,
        HTMLAttributes: {
          class: 'w-full aspect-video my-4'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4'
        }
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-3 py-2 bg-gray-100 font-semibold'
        }
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-3 py-2'
        }
      }),
      Placeholder.configure({
        placeholder
      }),
      CharacterCount.configure({
        limit: characterLimit,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        HTMLAttributes: {
          class: 'rounded-lg bg-gray-900 text-gray-100 p-4 my-4 overflow-x-auto text-sm font-mono',
        },
      }),
    ],
    content: content ?? '',
    editable,
    onUpdate: ({ editor }) => {
      if (isInternalUpdateRef.current) return;
      const html = editor.getHTML();
      debouncedOnChange(html);
    },
    editorProps: {
      attributes: {
        class: 'blog-content w-full max-w-none focus:outline-none min-h-[300px] p-4'
      }
    }
  });

  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external content prop changes into the editor (e.g. form reset, initial load)
  // Skips when: in HTML mode, during an internal update, or when content matches what
  // we last emitted (prevents the normalize→re-set feedback loop).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editorModeRef.current !== 'visual') return;
    if (isInternalUpdateRef.current) return;

    // If content matches what the editor last emitted, it's our own output — skip
    if (content === lastEmittedRef.current) return;

    const current = editor.getHTML();
    if (current !== content) {
      const safeContent = content ?? '';
      isInternalUpdateRef.current = true;
      try {
        editor.commands.setContent(safeContent, false);
        lastEmittedRef.current = editor.getHTML();
      } catch (err) {
        logger.error('TipTap setContent failed in content sync, falling back to stripped text', err);
        try {
          const stripped = safeContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          editor.commands.setContent(stripped ? `<p>${stripped}</p>` : '', false);
          lastEmittedRef.current = editor.getHTML();
        } catch {
          try { editor.commands.clearContent(); } catch { /* ignore */ }
        }
      } finally {
        isInternalUpdateRef.current = false;
      }
    }
  }, [content, editor]);

  // Handle mode switch between visual and HTML
  const handleModeSwitch = useCallback((mode: 'visual' | 'html') => {
    if (!editor) return;

    // Update ref synchronously BEFORE setEditorMode schedules a render,
    // so the content-sync effect sees the new mode immediately.
    editorModeRef.current = mode;

    if (mode === 'html') {
      // Visual → HTML: flush any pending debounced change, seed the HTML buffer
      flushDebouncedOnChange();
      const currentHtml = editor.getHTML();
      lastEmittedRef.current = currentHtml;
      onChange(currentHtml);
      setHtmlBuffer(currentHtml);
    } else {
      // HTML → Visual: apply the textarea buffer into the editor
      const liveHtml = htmlBuffer;

      isInternalUpdateRef.current = true;
      try {
        // Strip <script> and <style> tags that TipTap can't parse
        const sanitized = liveHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        editor.commands.setContent(sanitized, false);
        const resultHtml = editor.getHTML();

        if (resultHtml === '<p></p>' && sanitized.length > 20) {
          logger.warn('TipTap resulted in empty document. Falling back to stripped text.');
          throw new Error('TipTap silent empty document');
        }

        lastEmittedRef.current = resultHtml;
        onChange(resultHtml);
      } catch (err) {
        logger.error('TipTap setContent failed, falling back to stripped text', err);
        try {
          const stripped = liveHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const fallbackHtml = stripped ? `<p>${stripped}</p>` : '';
          editor.commands.setContent(fallbackHtml, false);
          lastEmittedRef.current = editor.getHTML();
          onChange(editor.getHTML());
        } catch {
          try { editor.commands.clearContent(); } catch { /* ignore */ }
        }
      } finally {
        isInternalUpdateRef.current = false;
      }
    }

    setEditorMode(mode);
  }, [editor, htmlBuffer, onChange, flushDebouncedOnChange]);

  // HTML textarea change — update local buffer only; parent gets notified on blur/mode-switch
  const handleHtmlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlBuffer(e.target.value);
  }, []);

  // Push HTML buffer to parent on blur (so edits are saved if user clicks away)
  const handleHtmlBlur = useCallback(() => {
    lastEmittedRef.current = htmlBuffer;
    onChange(htmlBuffer);
  }, [htmlBuffer, onChange]);

  // Find & Replace functionality
  const performFind = useCallback(() => {
    if (!editor || !findText) {
      setMatchCount(0);
      setCurrentMatchIndex(0);
      return;
    }

    const content = editor.getText();
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    const count = matches ? matches.length : 0;
    setMatchCount(count);
    if (count > 0) {
      setCurrentMatchIndex(1);
      // Select first match in editor
      const from = content.toLowerCase().indexOf(findText.toLowerCase());
      if (from !== -1) {
        // TipTap positions include +1 for doc node
        editor.commands.setTextSelection({ from: from + 1, to: from + findText.length + 1 });
        editor.commands.scrollIntoView();
      }
    } else {
      setCurrentMatchIndex(0);
    }
  }, [editor, findText]);

  const findNext = useCallback(() => {
    if (!editor || !findText || matchCount === 0) return;

    const content = editor.getText();
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match.index);
    }

    if (matches.length === 0) return;

    const nextIndex = currentMatchIndex >= matches.length ? 1 : currentMatchIndex + 1;
    setCurrentMatchIndex(nextIndex);
    const from = matches[nextIndex - 1];
    editor.commands.setTextSelection({ from: from + 1, to: from + findText.length + 1 });
    editor.commands.scrollIntoView();
  }, [editor, findText, matchCount, currentMatchIndex]);

  const findPrev = useCallback(() => {
    if (!editor || !findText || matchCount === 0) return;

    const content = editor.getText();
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match.index);
    }

    if (matches.length === 0) return;

    const prevIndex = currentMatchIndex <= 1 ? matches.length : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    const from = matches[prevIndex - 1];
    editor.commands.setTextSelection({ from: from + 1, to: from + findText.length + 1 });
    editor.commands.scrollIntoView();
  }, [editor, findText, matchCount, currentMatchIndex]);

  const handleReplace = useCallback(() => {
    if (!editor || !findText) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (selectedText.toLowerCase() === findText.toLowerCase()) {
      editor.chain().focus().deleteSelection().insertContent(replaceText).run();
      // Find next after replace
      setTimeout(performFind, 10);
    } else {
      performFind();
    }
  }, [editor, findText, replaceText, performFind]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !findText) return;

    const content = editor.getHTML();
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = content.replace(regex, replaceText);
    editor.commands.setContent(newContent);
    // onUpdate fires synchronously: sets lastOnChangeValue + calls onChange
    setMatchCount(0);
    setCurrentMatchIndex(0);
    toast.success(`Replaced all occurrences`);
  }, [editor, findText, replaceText]);

  // Focus find input when opened
  useEffect(() => {
    if (showFindReplace && findInputRef.current) {
      findInputRef.current.focus();
    }
  }, [showFindReplace]);

  // Re-search when find text changes
  useEffect(() => {
    if (showFindReplace) {
      performFind();
    }
  }, [findText, showFindReplace, performFind]);

  const handleInsertMediaFromLibrary = useCallback((type: 'image' | 'video') => {
    setMediaPickerMode(type);
    setShowMediaPicker(true);
  }, []);

  const handleMediaSelect = useCallback((assets: MediaAsset[]) => {
    if (assets.length === 0 || !editor) return;

    const asset = assets[0];

    if (mediaPickerMode === 'image') {
      // Use medium variation for balance of quality and performance
      const imageUrl = asset.variations?.medium || asset.variations?.large || asset.url;
      // Insert image with figure wrapper and caption
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'figure',
          content: [
            {
              type: 'image',
              attrs: {
                src: imageUrl,
                alt: asset.originalName,
                title: asset.originalName
              }
            },
            {
              type: 'figcaption',
              content: [{ type: 'text', text: 'Add caption...' }]
            }
          ]
        })
        .run();
      toast.success('Image inserted with caption');
    } else if (mediaPickerMode === 'video' && asset.mimeType.startsWith('video/')) {
      // Insert video as HTML5 video element
      editor
        .chain()
        .focus()
        .insertContent(
          `<video controls class="w-full my-4 rounded-lg">
            <source src="${asset.url}" type="${asset.mimeType}">
            Your browser does not support the video tag.
          </video>`
        )
        .run();
      toast.success('Video inserted successfully');
    }

    setShowMediaPicker(false);
  }, [editor, mediaPickerMode]);

  const handleImageUrl = useCallback(() => {
    const url = window.prompt('Enter external image URL (or use Media Library for uploaded images):');
    if (url && url.trim()) {
      try {
        new URL(url); // Validate URL format
        // Insert image with figure wrapper
        editor?.chain().focus().insertContent({
          type: 'figure',
          content: [
            {
              type: 'image',
              attrs: { src: url, alt: '', title: '' }
            },
            {
              type: 'figcaption',
              content: [{ type: 'text', text: 'Add caption...' }]
            }
          ]
        }).run();
        toast.success('External image inserted with caption');
      } catch (error) {
        toast.error('Invalid URL format');
      }
    }
  }, [editor]);

  const handleYoutubeEmbed = useCallback(() => {
    const url = window.prompt('Enter YouTube URL:');
    if (url) {
      editor?.commands.setYoutubeVideo({ src: url });
    }
  }, [editor]);

  const handleSetLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Normalize HTML structure for TipTap parsing - wraps orphaned inline elements in <p> tags
  const normalizeHtmlForTipTap = useCallback((html: string): string => {
    // Create a temporary container to parse HTML
    const container = document.createElement('div');
    container.innerHTML = html;

    // Inline tags that need block wrapping when at root level
    const inlineTags = ['B', 'I', 'STRONG', 'EM', 'U', 'S', 'SPAN', 'A', 'CODE', 'MARK'];

    // Use globalThis.Node to avoid conflict with TipTap's Node import
    const DOMNode = globalThis.Node;
    const result: globalThis.Node[] = [];
    let currentParagraph: HTMLParagraphElement | null = null;

    const flushParagraph = () => {
      if (currentParagraph && currentParagraph.innerHTML.trim()) {
        result.push(currentParagraph);
      }
      currentParagraph = null;
    };

    container.childNodes.forEach(node => {
      if (node.nodeType === DOMNode.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          if (!currentParagraph) {
            currentParagraph = document.createElement('p');
          }
          currentParagraph.appendChild(document.createTextNode(node.textContent || ''));
        }
      } else if (node.nodeType === DOMNode.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();

        if (tagName === 'BR') {
          // BR at root level - flush current paragraph, start new one
          flushParagraph();
        } else if (inlineTags.includes(tagName)) {
          // Inline element at root - add to current paragraph
          if (!currentParagraph) {
            currentParagraph = document.createElement('p');
          }
          currentParagraph.appendChild(el.cloneNode(true));
        } else {
          // Block element - flush paragraph first, then add block
          flushParagraph();
          result.push(el.cloneNode(true));
        }
      }
    });

    flushParagraph();

    // Convert result back to HTML string
    const output = document.createElement('div');
    result.forEach(node => output.appendChild(node));
    return output.innerHTML;
  }, []);

  const handleInsertHtml = useCallback((html: string) => {
    if (!editor) return;

    // Detect complex HTML features that TipTap can't parse
    const hasIframes = /<iframe/i.test(html);
    const hasSemanticTags = /<(main|aside|nav|article|section)/i.test(html);
    const hasComplexStyles = /style="[^"]*(?:display:\s*(?:flex|grid)|position:\s*sticky)/i.test(html);

    const isComplexHtml = hasIframes || hasSemanticTags || hasComplexStyles;

    if (isComplexHtml) {
      // Show confirmation dialog for Raw HTML mode
      const useRaw = window.confirm(
        'Complex HTML Detected!\n\n' +
        'This HTML contains advanced features (iframes, layouts, semantic tags) that may not work correctly in the visual editor.\n\n' +
        'Would you like to use RAW HTML MODE?\n\n' +
        '✅ Preserves all styling and layout exactly\n' +
        '❌ Disables toolbar editing for this content\n\n' +
        'Click OK to use Raw HTML mode, or Cancel to try standard insertion (may lose features).'
      );

      if (useRaw) {
        // Use special marker to signal Raw HTML mode to parent form
        onChange(`__RAW_HTML__${html}`);
        toast.success('Complex HTML will be preserved in Raw HTML mode', {
          duration: 4000,
          icon: '✅'
        });
        return;
      }
    }

    // Normalize HTML to wrap orphaned inline elements in paragraphs
    const normalizedHtml = normalizeHtmlForTipTap(html);

    // Normal TipTap insertion (will strip unsupported tags/attributes)
    try {
      editor.chain().focus().insertContent(normalizedHtml).run();
      if (isComplexHtml) {
        toast('Some advanced features may have been removed', {
          duration: 4000,
          icon: '⚠️'
        });
      }
    } catch (error) {
      logger.error('Error inserting HTML:', error);
      toast.error('Failed to insert HTML content');
    }
  }, [editor, onChange, normalizeHtmlForTipTap]);

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4 min-h-[300px] bg-gray-50 animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {editable && (
        <>
          {/* Mode Toggle Tabs */}
          {!hideModeSwitcher && (
            <div className="flex border-b border-gray-300 bg-gray-100">
              <button
                onClick={() => handleModeSwitch('visual')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editorMode === 'visual'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                type="button"
              >
                Visual
              </button>
              <button
                onClick={() => handleModeSwitch('html')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${editorMode === 'html'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                type="button"
              >
                <FileCode size={14} />
                HTML
              </button>
              <div className="flex-1" />
              {/* Find & Replace Toggle */}
              <button
                onClick={() => setShowFindReplace(!showFindReplace)}
                className={`px-3 py-2 text-sm flex items-center gap-1 ${showFindReplace ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800'
                  }`}
                title="Find & Replace (Ctrl+F)"
                type="button"
              >
                <Search size={14} />
              </button>
              {/* Keyboard Shortcuts Help */}
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                title="Keyboard Shortcuts"
                type="button"
              >
                <HelpCircle size={14} />
              </button>
            </div>
          )}

          {/* Find & Replace Bar */}
          {showFindReplace && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-300">
              <div className="flex items-center gap-1">
                <input
                  ref={findInputRef}
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Find..."
                  className="px-2 py-1 text-sm border border-gray-300 rounded w-40 focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.shiftKey ? findPrev() : findNext();
                    } else if (e.key === 'Escape') {
                      setShowFindReplace(false);
                    }
                  }}
                />
                <button
                  onClick={findPrev}
                  disabled={matchCount === 0}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                  title="Previous match"
                  type="button"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={findNext}
                  disabled={matchCount === 0}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                  title="Next match"
                  type="button"
                >
                  <ChevronDown size={16} />
                </button>
                <span className="text-xs text-gray-500 min-w-[60px]">
                  {matchCount > 0 ? `${currentMatchIndex} of ${matchCount}` : 'No matches'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replace..."
                  className="px-2 py-1 text-sm border border-gray-300 rounded w-40 focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleReplace();
                  }}
                />
                <button
                  onClick={handleReplace}
                  disabled={matchCount === 0}
                  className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  type="button"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={matchCount === 0}
                  className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                  type="button"
                >
                  Replace All
                </button>
              </div>
              <button
                onClick={() => setShowFindReplace(false)}
                className="p-1 rounded hover:bg-gray-200 ml-auto"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Toolbar - only show in visual mode */}
          {editorMode === 'visual' && (
            <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
              {/* Text Formatting */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''
                    }`}
                  title="Bold (Ctrl+B)"
                  type="button"
                >
                  <Bold size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''
                    }`}
                  title="Italic (Ctrl+I)"
                  type="button"
                >
                  <Italic size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-300' : ''
                    }`}
                  title="Underline (Ctrl+U)"
                  type="button"
                >
                  <UnderlineIcon size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-300' : ''
                    }`}
                  title="Strikethrough (Ctrl+Shift+S)"
                  type="button"
                >
                  <Strikethrough size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCode().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-300' : ''
                    }`}
                  title="Inline Code (Ctrl+E)"
                  type="button"
                >
                  <Code size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-300' : ''
                    }`}
                  title="Code Block"
                  type="button"
                >
                  <FileCode size={18} />
                </button>
              </div>

              {/* Headings */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
                    }`}
                  title="Heading 1 (Ctrl+Alt+1)"
                  type="button"
                >
                  <Heading1 size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
                    }`}
                  title="Heading 2 (Ctrl+Alt+2)"
                  type="button"
                >
                  <Heading2 size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
                    }`}
                  title="Heading 3 (Ctrl+Alt+3)"
                  type="button"
                >
                  <Heading3 size={18} />
                </button>
              </div>

              {/* Lists & Blocks */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''
                    }`}
                  title="Bullet List (Ctrl+Shift+8)"
                  type="button"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''
                    }`}
                  title="Numbered List (Ctrl+Shift+7)"
                  type="button"
                >
                  <ListOrdered size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-300' : ''
                    }`}
                  title="Blockquote (Ctrl+Shift+B)"
                  type="button"
                >
                  <Quote size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Horizontal Rule"
                  type="button"
                >
                  <Minus size={18} />
                </button>
              </div>

              {/* Alignment */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
                    }`}
                  title="Align Left"
                  type="button"
                >
                  <AlignLeft size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
                    }`}
                  title="Align Center"
                  type="button"
                >
                  <AlignCenter size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
                    }`}
                  title="Align Right"
                  type="button"
                >
                  <AlignRight size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : ''
                    }`}
                  title="Justify"
                  type="button"
                >
                  <AlignJustify size={18} />
                </button>
              </div>

              {/* Media */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => handleInsertMediaFromLibrary('image')}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Insert Image from Media Library"
                  type="button"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  onClick={handleImageUrl}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Insert External Image URL"
                  type="button"
                >
                  <Upload size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleInsertMediaFromLibrary('video')}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Insert Video from Media Library"
                  type="button"
                >
                  <Upload size={18} className="text-red-600" />
                </button>
                <button
                  onClick={handleYoutubeEmbed}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Embed YouTube"
                  type="button"
                >
                  <YoutubeIcon size={18} />
                </button>
                <button
                  onClick={handleSetLink}
                  className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''
                    }`}
                  title="Add Link (Ctrl+K)"
                  type="button"
                >
                  <LinkIcon size={18} />
                </button>
                <button
                  onClick={() => setShowHtmlModal(true)}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Insert HTML"
                  type="button"
                >
                  <Code2 size={18} />
                </button>
              </div>

              {/* Table Operations */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Insert Table (3x3)"
                  type="button"
                >
                  <TableIcon size={18} />
                </button>
                {editor.isActive('table') && (
                  <>
                    <button
                      onClick={() => editor.chain().focus().addColumnBefore().run()}
                      className="p-2 rounded hover:bg-gray-200 text-xs"
                      title="Add Column Before"
                      type="button"
                    >
                      C+
                    </button>
                    <button
                      onClick={() => editor.chain().focus().addRowBefore().run()}
                      className="p-2 rounded hover:bg-gray-200 text-xs"
                      title="Add Row Before"
                      type="button"
                    >
                      R+
                    </button>
                    <button
                      onClick={() => editor.chain().focus().deleteColumn().run()}
                      className="p-2 rounded hover:bg-gray-200 text-red-600 text-xs"
                      title="Delete Column"
                      type="button"
                    >
                      C-
                    </button>
                    <button
                      onClick={() => editor.chain().focus().deleteRow().run()}
                      className="p-2 rounded hover:bg-gray-200 text-red-600 text-xs"
                      title="Delete Row"
                      type="button"
                    >
                      R-
                    </button>
                    <button
                      onClick={() => editor.chain().focus().deleteTable().run()}
                      className="p-2 rounded hover:bg-gray-200 text-red-600"
                      title="Delete Table"
                      type="button"
                    >
                      <TableIcon size={18} className="opacity-50" />
                    </button>
                  </>
                )}
              </div>

              {/* Color Picker */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <div className="relative" ref={colorPickerRef}>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      setShowColorPicker(!showColorPicker);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 ${showColorPicker ? 'bg-gray-200' : ''}`}
                    title="Text Color"
                    type="button"
                  >
                    <Palette size={18} />
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 z-10 w-52">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#DC2626', '#059669', '#7C3AED'].map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              editor.chain().focus().setColor(color).run();
                              setShowColorPicker(false);
                            }}
                            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            title={color}
                            type="button"
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                          title="Pick custom color"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                          placeholder="#000000"
                        />
                        <button
                          onClick={() => {
                            editor.chain().focus().setColor(customColor).run();
                            setShowColorPicker(false);
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          type="button"
                        >
                          Apply
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetColor().run();
                          setShowColorPicker(false);
                        }}
                        className="w-full mt-2 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
                        type="button"
                      >
                        Reset Color
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative" ref={highlightPickerRef}>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      setShowHighlightPicker(!showHighlightPicker);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 ${showHighlightPicker ? 'bg-gray-200' : ''}`}
                    title="Highlight Color"
                    type="button"
                  >
                    <Highlighter size={18} />
                  </button>
                  {showHighlightPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 gap-1 flex flex-wrap w-48 z-10">
                      {['#FEF3C7', '#FED7AA', '#FECACA', '#DDD6FE', '#BFDBFE', '#BBF7D0', '#FED7E2', '#FECDD3'].map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            editor.chain().focus().toggleHighlight({ color }).run();
                            setShowHighlightPicker(false);
                          }}
                          className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                          type="button"
                        />
                      ))}
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetHighlight().run();
                          setShowHighlightPicker(false);
                        }}
                        className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs"
                        title="Remove Highlight"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Font Size Dropdown */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <div className="relative" ref={fontSizePickerRef}>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      setShowFontSizePicker(!showFontSizePicker);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 flex items-center gap-1 ${showFontSizePicker ? 'bg-gray-200' : ''}`}
                    title="Font Size"
                    type="button"
                  >
                    <Type size={18} />
                    <ChevronDown size={12} />
                  </button>
                  {showFontSizePicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 flex flex-col w-24 z-10">
                      {[
                        { label: 'Small', value: '12px' },
                        { label: 'Normal', value: '16px' },
                        { label: 'Medium', value: '18px' },
                        { label: 'Large', value: '20px' },
                        { label: 'XL', value: '24px' },
                        { label: 'XXL', value: '32px' },
                      ].map(size => (
                        <button
                          key={size.value}
                          onClick={() => {
                            editor.chain().focus().setFontSize(size.value).run();
                            setShowFontSizePicker(false);
                          }}
                          className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm"
                          style={{ fontSize: size.value }}
                          type="button"
                        >
                          {size.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetFontSize().run();
                          setShowFontSizePicker(false);
                        }}
                        className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm border-t border-gray-200"
                        type="button"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Font Weight Dropdown */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <div className="relative" ref={fontWeightPickerRef}>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      setShowFontWeightPicker(!showFontWeightPicker);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 flex items-center gap-1 ${showFontWeightPicker ? 'bg-gray-200' : ''}`}
                    title="Font Weight"
                    type="button"
                  >
                    <span className="text-sm font-bold">B</span>
                    <ChevronDown size={12} />
                  </button>
                  {showFontWeightPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 flex flex-col w-28 z-10">
                      {[
                        { label: 'Thin', value: '100' },
                        { label: 'Light', value: '300' },
                        { label: 'Normal', value: '400' },
                        { label: 'Medium', value: '500' },
                        { label: 'Semibold', value: '600' },
                        { label: 'Bold', value: '700' },
                        { label: 'Black', value: '900' },
                      ].map(weight => (
                        <button
                          key={weight.value}
                          onClick={() => {
                            editor.chain().focus().setFontWeight(weight.value).run();
                            setShowFontWeightPicker(false);
                          }}
                          className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm"
                          style={{ fontWeight: weight.value }}
                          type="button"
                        >
                          {weight.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetFontWeight().run();
                          setShowFontWeightPicker(false);
                        }}
                        className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm border-t border-gray-200"
                        type="button"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Font Family Dropdown */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <div className="relative" ref={fontFamilyPickerRef}>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      setShowFontFamilyPicker(!showFontFamilyPicker);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 flex items-center gap-1 ${showFontFamilyPicker ? 'bg-gray-200' : ''}`}
                    title="Font Family"
                    type="button"
                  >
                    <FileType size={18} />
                    <ChevronDown size={12} />
                  </button>
                  {showFontFamilyPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 flex flex-col w-40 z-10 max-h-64 overflow-y-auto">
                      {[
                        { label: 'Sans Serif', value: 'Arial, sans-serif' },
                        { label: 'Serif', value: 'Georgia, serif' },
                        { label: 'Monospace', value: 'Courier New, monospace' },
                        { label: 'Inter', value: 'Inter, sans-serif' },
                        { label: 'Roboto', value: 'Roboto, sans-serif' },
                        { label: 'Open Sans', value: 'Open Sans, sans-serif' },
                        { label: 'Lato', value: 'Lato, sans-serif' },
                        { label: 'Poppins', value: 'Poppins, sans-serif' },
                        { label: 'Playfair', value: 'Playfair Display, serif' },
                        { label: 'Times', value: 'Times New Roman, serif' },
                      ].map(font => (
                        <button
                          key={font.value}
                          onClick={() => {
                            editor.chain().focus().setFontFamily(font.value).run();
                            setShowFontFamilyPicker(false);
                          }}
                          className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm"
                          style={{ fontFamily: font.value }}
                          type="button"
                        >
                          {font.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          editor.chain().focus().unsetFontFamily().run();
                          setShowFontFamilyPicker(false);
                        }}
                        className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm border-t border-gray-200"
                        type="button"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Transform Dropdown */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <div className="relative" ref={textTransformPickerRef}>
                  <button
                    onClick={() => {
                      closeAllDropdowns();
                      setShowTextTransformPicker(!showTextTransformPicker);
                    }}
                    className={`p-2 rounded hover:bg-gray-200 flex items-center gap-1 ${showTextTransformPicker ? 'bg-gray-200' : ''}`}
                    title="Text Transform"
                    type="button"
                  >
                    <CaseSensitive size={18} />
                    <ChevronDown size={12} />
                  </button>
                  {showTextTransformPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg py-1 flex flex-col w-32 z-10">
                      {[
                        { label: 'Normal', value: 'none' },
                        { label: 'UPPERCASE', value: 'uppercase' },
                        { label: 'lowercase', value: 'lowercase' },
                        { label: 'Capitalize', value: 'capitalize' },
                      ].map(transform => (
                        <button
                          key={transform.value}
                          onClick={() => {
                            if (transform.value === 'none') {
                              editor.chain().focus().unsetTextTransform().run();
                            } else {
                              editor.chain().focus().setTextTransform(transform.value).run();
                            }
                            setShowTextTransformPicker(false);
                          }}
                          className="px-3 py-1.5 text-left hover:bg-gray-100 text-sm"
                          style={{ textTransform: transform.value as any }}
                          type="button"
                        >
                          {transform.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Clear Format */}
              <div className="flex gap-0.5 border-r border-gray-300 pr-2">
                <button
                  onClick={() => {
                    editor.chain().focus().unsetAllMarks().clearNodes().run();
                    toast.success('Formatting cleared');
                  }}
                  className="p-2 rounded hover:bg-gray-200"
                  title="Clear All Formatting"
                  type="button"
                >
                  <RemoveFormatting size={18} />
                </button>
              </div>

              {/* Undo/Redo */}
              <div className="flex gap-0.5">
                <button
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                  className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                  type="button"
                >
                  <Undo size={18} />
                </button>
                <button
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                  className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                  type="button"
                >
                  <Redo size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Bubble Menu for text selection */}
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="flex gap-1 bg-gray-800 text-white p-1 rounded shadow-lg">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-2 py-1 rounded text-sm ${editor.isActive('bold') ? 'bg-gray-600' : ''
                  }`}
              >
                Bold
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-2 py-1 rounded text-sm ${editor.isActive('italic') ? 'bg-gray-600' : ''
                  }`}
              >
                Italic
              </button>
              <button
                onClick={handleSetLink}
                className={`px-2 py-1 rounded text-sm ${editor.isActive('link') ? 'bg-gray-600' : ''
                  }`}
              >
                Link
              </button>
            </div>
          </BubbleMenu>
        </>
      )}

      {/* Editor Content - Visual Mode */}
      <div className="bg-white" style={{ display: editorMode === 'visual' ? 'block' : 'none' }}>
        <EditorContent editor={editor} />
      </div>

      {/* Editor Content - HTML Mode */}
      <div className="bg-white" style={{ display: editorMode === 'html' ? 'block' : 'none' }}>
        <div className="relative">
          <textarea
            ref={htmlTextareaRef}
            value={htmlBuffer}
            onChange={handleHtmlChange}
            onBlur={handleHtmlBlur}
            className="w-full min-h-[300px] p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none resize-y"
            placeholder="<p>Write your HTML here...</p>"
            spellCheck={false}
          />
          <div className="absolute top-2 right-2 text-xs text-gray-500">
            HTML Mode
          </div>
        </div>
      </div>

      {/* Character and Word Count Display */}
      {editor && showCharacterCount && (
        <div className={`border-t px-4 py-2 flex items-center justify-between text-xs transition-colors ${characterLimit && editor.storage.characterCount.characters() > characterLimit
          ? 'bg-red-50 border-red-200'
          : characterLimit && editor.storage.characterCount.characters() > characterLimit * 0.9
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200'
          }`}>
          <div className="flex items-center gap-4">
            <span className={`font-medium ${characterLimit && editor.storage.characterCount.characters() > characterLimit
              ? 'text-red-700'
              : characterLimit && editor.storage.characterCount.characters() > characterLimit * 0.9
                ? 'text-yellow-700'
                : 'text-gray-700'
              }`}>
              {editor.storage.characterCount.characters().toLocaleString()}
              {characterLimit && ` / ${characterLimit.toLocaleString()}`} characters
            </span>
            <span className="text-gray-600">
              {editor.storage.characterCount.words().toLocaleString()} words
            </span>
            {characterLimit && editor.storage.characterCount.characters() > characterLimit * 0.9 && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${editor.storage.characterCount.characters() > characterLimit
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
                }`}>
                {editor.storage.characterCount.characters() > characterLimit
                  ? `${(editor.storage.characterCount.characters() - characterLimit).toLocaleString()} over limit`
                  : `${(characterLimit - editor.storage.characterCount.characters()).toLocaleString()} remaining`
                }
              </span>
            )}
          </div>
          <div className="text-gray-500">
            ~{Math.ceil(editor.storage.characterCount.words() / 200)} min read
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* HTML Insert Modal */}
      <HtmlInsertModal
        isOpen={showHtmlModal}
        onClose={() => setShowHtmlModal(false)}
        onInsert={handleInsertHtml}
      />

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
        category={mediaCategory}
        folder={mediaFolder}
        multiple={false}
        title={mediaPickerMode === 'image' ? 'Select Image' : 'Select Video'}
      />
    </div>
  );
};

export default TipTapEditor;
