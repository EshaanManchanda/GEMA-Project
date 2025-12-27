import React, { useCallback, useState } from 'react';
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
import HtmlInsertModal from './HtmlInsertModal';
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
  Highlighter
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  mediaCategory?: 'blog' | 'event' | 'profile' | 'document' | 'misc';
  mediaFolder?: string;
  characterLimit?: number;
  showCharacterCount?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your blog content...',
  editable = true,
  mediaCategory = 'misc',
  mediaFolder = 'content',
  characterLimit,
  showCharacterCount = true
}) => {
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'image' | 'video'>('image');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4'
        }
      }),
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
      })
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[300px] p-4'
      }
    }
  });

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
      editor
        .chain()
        .focus()
        .setImage({
          src: imageUrl,
          alt: asset.originalName,
          title: asset.originalName
        })
        .run();
      toast.success('Image inserted successfully');
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
        editor?.chain().focus().setImage({ src: url }).run();
        toast.success('External image inserted');
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

    // Normal TipTap insertion (will strip unsupported tags/attributes)
    try {
      editor.chain().focus().insertContent(html).run();
      if (isComplexHtml) {
        toast('Some advanced features may have been removed', {
          duration: 4000,
          icon: '⚠️'
        });
      }
    } catch (error) {
      console.error('Error inserting HTML:', error);
      toast.error('Failed to insert HTML content');
    }
  }, [editor, onChange]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {editable && (
        <>
          {/* Toolbar */}
          <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
            {/* Text Formatting */}
            <div className="flex gap-0.5 border-r border-gray-300 pr-2">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('bold') ? 'bg-gray-300' : ''
                }`}
                title="Bold"
                type="button"
              >
                <Bold size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('italic') ? 'bg-gray-300' : ''
                }`}
                title="Italic"
                type="button"
              >
                <Italic size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('underline') ? 'bg-gray-300' : ''
                }`}
                title="Underline"
                type="button"
              >
                <UnderlineIcon size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('strike') ? 'bg-gray-300' : ''
                }`}
                title="Strikethrough"
                type="button"
              >
                <Strikethrough size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('code') ? 'bg-gray-300' : ''
                }`}
                title="Code"
                type="button"
              >
                <Code size={18} />
              </button>
            </div>

            {/* Headings */}
            <div className="flex gap-0.5 border-r border-gray-300 pr-2">
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''
                }`}
                title="Heading 1"
                type="button"
              >
                <Heading1 size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''
                }`}
                title="Heading 2"
                type="button"
              >
                <Heading2 size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : ''
                }`}
                title="Heading 3"
                type="button"
              >
                <Heading3 size={18} />
              </button>
            </div>

            {/* Lists */}
            <div className="flex gap-0.5 border-r border-gray-300 pr-2">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('bulletList') ? 'bg-gray-300' : ''
                }`}
                title="Bullet List"
                type="button"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('orderedList') ? 'bg-gray-300' : ''
                }`}
                title="Numbered List"
                type="button"
              >
                <ListOrdered size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('blockquote') ? 'bg-gray-300' : ''
                }`}
                title="Quote"
                type="button"
              >
                <Quote size={18} />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex gap-0.5 border-r border-gray-300 pr-2">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300' : ''
                }`}
                title="Align Left"
                type="button"
              >
                <AlignLeft size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300' : ''
                }`}
                title="Align Center"
                type="button"
              >
                <AlignCenter size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300' : ''
                }`}
                title="Align Right"
                type="button"
              >
                <AlignRight size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-300' : ''
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
                className={`p-2 rounded hover:bg-gray-200 ${
                  editor.isActive('link') ? 'bg-gray-300' : ''
                }`}
                title="Add Link"
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
              <div className="relative group">
                <button
                  className="p-2 rounded hover:bg-gray-200"
                  title="Text Color"
                  type="button"
                >
                  <Palette size={18} />
                </button>
                <div className="hidden group-hover:flex absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 gap-1 flex-wrap w-48 z-10">
                  {['#000000', '#374151', '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => editor.chain().focus().setColor(color).run()}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={`Text Color: ${color}`}
                      type="button"
                    />
                  ))}
                  <button
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs"
                    title="Reset Color"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="relative group">
                <button
                  className="p-2 rounded hover:bg-gray-200"
                  title="Highlight Color"
                  type="button"
                >
                  <Highlighter size={18} />
                </button>
                <div className="hidden group-hover:flex absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-2 gap-1 flex-wrap w-48 z-10">
                  {['#FEF3C7', '#FED7AA', '#FECACA', '#DDD6FE', '#BFDBFE', '#BBF7D0', '#FED7E2'].map(color => (
                    <button
                      key={color}
                      onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={`Highlight: ${color}`}
                      type="button"
                    />
                  ))}
                  <button
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                    className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs"
                    title="Remove Highlight"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Undo/Redo */}
            <div className="flex gap-0.5">
              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo"
                type="button"
              >
                <Undo size={18} />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo"
                type="button"
              >
                <Redo size={18} />
              </button>
            </div>
          </div>

          {/* Bubble Menu for text selection */}
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
            <div className="flex gap-1 bg-gray-800 text-white p-1 rounded shadow-lg">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-2 py-1 rounded text-sm ${
                  editor.isActive('bold') ? 'bg-gray-600' : ''
                }`}
              >
                Bold
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-2 py-1 rounded text-sm ${
                  editor.isActive('italic') ? 'bg-gray-600' : ''
                }`}
              >
                Italic
              </button>
              <button
                onClick={handleSetLink}
                className={`px-2 py-1 rounded text-sm ${
                  editor.isActive('link') ? 'bg-gray-600' : ''
                }`}
              >
                Link
              </button>
            </div>
          </BubbleMenu>
        </>
      )}

      {/* Editor Content */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* Character and Word Count Display */}
      {editor && showCharacterCount && (
        <div className={`border-t px-4 py-2 flex items-center justify-between text-xs transition-colors ${
          characterLimit && editor.storage.characterCount.characters() > characterLimit
            ? 'bg-red-50 border-red-200'
            : characterLimit && editor.storage.characterCount.characters() > characterLimit * 0.9
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <span className={`font-medium ${
              characterLimit && editor.storage.characterCount.characters() > characterLimit
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
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                editor.storage.characterCount.characters() > characterLimit
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
