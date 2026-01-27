import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Video from './tiptap/VideoExtension';
import { ResizableImage } from './tiptap/ResizableImageExtension';
import { Audio } from './tiptap/AudioExtension';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  Link2,
  Play,
  Minus,
  Undo,
  Redo,
  Volume2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';
import CommunityMediaUploader from './CommunityMediaUploader';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  language: string;
  placeholder?: string;
  lessonId?: string;
  communityId?: string;
}

export default function RichTextEditor({ content, onChange, language, placeholder, lessonId, communityId }: RichTextEditorProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Avoid duplicate extension names (StarterKit may include Link)
        link: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ResizableImage.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: 'w-full aspect-video rounded-lg',
        },
      }),
      Video.configure({
        HTMLAttributes: {
          class: 'w-full rounded-lg my-4',
          controls: true,
        },
      }),
      Audio.configure({
        HTMLAttributes: {
          class: 'w-full',
          controls: true,
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || (language === 'ru' ? 'Начните писать...' : 'Start writing...'),
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none',
      },
    },
  });

  // Sync editor content when prop changes (e.g., after loading from DB)
  // Important: TipTap normalizes an "empty" doc to "<p></p>".
  // If we compare to an empty string, we'd keep resetting content and the editor looks blank.
  useEffect(() => {
    if (!editor) return;

    const normalizeEscapedVideo = (html: string) => {
      if (!html) return html;
      return html.replace(
        /&lt;video[^&]*&gt;\s*&lt;source[^&]*src=(?:&quot;|\")([^&\"]+?)(?:&quot;|\")[^&]*&gt;\s*&lt;\/video&gt;/gi,
        (_m, src) => `</p><video src="${src}"></video><p>`
      );
    };

    const incoming = normalizeEscapedVideo(content || '');
    const normalized = incoming.trim().length > 0 ? incoming : '<p></p>';
    const current = editor.getHTML();

    if (current !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [content, editor]);

  const insertImage = useCallback((url: string) => {
    if (url && editor) {
      editor.chain().focus().setResizableImage({ src: url }).run();
      setImageDialogOpen(false);
      setImageUrl('');
    }
  }, [editor]);

  const insertVideo = useCallback((url: string) => {
    if (url && editor) {
      // Check if it's a YouTube URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      } else {
        // For direct video URLs, use custom Video extension
        editor.chain().focus().setVideo({ src: url }).run();
      }
      setVideoDialogOpen(false);
      setVideoUrl('');
    }
  }, [editor]);

  const insertAudio = useCallback((url: string) => {
    if (url && editor) {
      editor.chain().focus().setAudio({ src: url }).run();
      setAudioDialogOpen(false);
      setAudioUrl('');
    }
  }, [editor]);

  const insertLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkDialogOpen(false);
      setLinkUrl('');
    }
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  const headingButtons = [
    { level: 1, label: 'H1' },
    { level: 2, label: 'H2' },
    { level: 3, label: 'H3' },
    { level: 4, label: 'H4' },
  ];

  // Smart heading: if partial text is selected within a paragraph, split and apply heading only to selection
  const applySmartHeading = useCallback((level: 1 | 2 | 3 | 4) => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    
    // If no selection or already a heading, just toggle normally
    if (empty || editor.isActive('heading', { level })) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }

    // Get the current node (paragraph/heading) boundaries
    const $from = editor.state.doc.resolve(from);
    const $to = editor.state.doc.resolve(to);
    
    // Check if selection is within a single paragraph/text block
    const parentNode = $from.parent;
    const startOfBlock = $from.start();
    const endOfBlock = startOfBlock + parentNode.nodeSize - 2; // -2 for opening/closing tags
    
    const selectionStartsAtBlockStart = from === startOfBlock;
    const selectionEndsAtBlockEnd = to === endOfBlock;

    // If selection covers the whole block, just toggle heading
    if (selectionStartsAtBlockStart && selectionEndsAtBlockEnd) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }

    // Get the selected text
    const selectedText = editor.state.doc.textBetween(from, to, '');
    if (!selectedText.trim()) {
      editor.chain().focus().toggleHeading({ level }).run();
      return;
    }

    // Split and insert heading for selected text only
    editor.chain()
      .focus()
      .command(({ tr, state }) => {
        const { from: selFrom, to: selTo } = state.selection;
        
        // Delete selected text
        tr.delete(selFrom, selTo);
        
        // Insert a hard break + heading with the text + hard break to split
        const headingNode = state.schema.nodes.heading.create(
          { level },
          state.schema.text(selectedText)
        );
        
        tr.insert(selFrom, headingNode);
        
        return true;
      })
      .run();
  }, [editor]);

  // Smart text alignment: if partial text is selected, split into separate paragraph and apply alignment
  const applySmartAlignment = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    
    // If no selection, just apply alignment to current block
    if (empty) {
      editor.chain().focus().setTextAlign(alignment).run();
      return;
    }

    // Get the current node boundaries
    const $from = editor.state.doc.resolve(from);
    const parentNode = $from.parent;
    const startOfBlock = $from.start();
    const endOfBlock = startOfBlock + parentNode.nodeSize - 2;
    
    const selectionStartsAtBlockStart = from === startOfBlock;
    const selectionEndsAtBlockEnd = to === endOfBlock;

    // If selection covers the whole block, just apply alignment
    if (selectionStartsAtBlockStart && selectionEndsAtBlockEnd) {
      editor.chain().focus().setTextAlign(alignment).run();
      return;
    }

    // Get the selected text
    const selectedText = editor.state.doc.textBetween(from, to, '');
    if (!selectedText.trim()) {
      editor.chain().focus().setTextAlign(alignment).run();
      return;
    }

    // Split and insert paragraph with alignment for selected text only
    editor.chain()
      .focus()
      .command(({ tr, state }) => {
        const { from: selFrom, to: selTo } = state.selection;
        
        // Delete selected text
        tr.delete(selFrom, selTo);
        
        // Create a paragraph with the selected text and alignment
        const paragraphNode = state.schema.nodes.paragraph.create(
          { textAlign: alignment },
          state.schema.text(selectedText)
        );
        
        tr.insert(selFrom, paragraphNode);
        
        return true;
      })
      .run();
  }, [editor]);

  const fonts = [
    { value: 'default', label: language === 'ru' ? 'По умолчанию' : 'Default' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Verdana', label: 'Verdana' },
  ];

  const getCurrentFont = () => {
    const fontFamily = editor.getAttributes('textStyle').fontFamily;
    return fontFamily || 'default';
  };

  const setFont = (font: string) => {
    if (font === 'default') {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(font).run();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border border-border rounded-lg bg-background">
        {/* Toolbar - sticky */}
        <div className="flex items-center gap-0.5 p-2 bg-muted/95 border-b border-border/50 flex-wrap sticky top-16 z-40 rounded-t-lg backdrop-blur supports-[backdrop-filter]:bg-muted/80">
          {/* Undo/Redo */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Отменить' : 'Undo'}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Повторить' : 'Redo'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Headings H1-H4 */}
          <div className="flex items-center">
            {headingButtons.map(({ level, label }) => (
              <Tooltip key={level}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                      editor.isActive('heading', { level }) ? 'bg-background text-foreground' : ''
                    }`}
                    onClick={() => applySmartHeading(level as 1 | 2 | 3 | 4)}
                  >
                    <span className="text-sm font-medium">{label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{language === 'ru' ? `Заголовок ${label}` : `Heading ${label}`}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text styles */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('bold') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Жирный' : 'Bold'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('italic') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Курсив' : 'Italic'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('strike') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Зачеркнутый' : 'Strikethrough'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('code') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Код' : 'Code'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Font Family */}
          <div className="flex items-center">
            <Select value={getCurrentFont()} onValueChange={setFont}>
              <SelectTrigger className="h-8 w-[120px] text-xs bg-background/80 border-border/50">
                <SelectValue placeholder={language === 'ru' ? 'Шрифт' : 'Font'} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {fonts.map((font) => (
                  <SelectItem 
                    key={font.value} 
                    value={font.value}
                    style={{ fontFamily: font.value !== 'default' ? font.value : undefined }}
                  >
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Text Alignment */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive({ textAlign: 'left' }) ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => applySmartAlignment('left')}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'По левому краю' : 'Align left'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive({ textAlign: 'center' }) ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => applySmartAlignment('center')}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'По центру' : 'Align center'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive({ textAlign: 'right' }) ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => applySmartAlignment('right')}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'По правому краю' : 'Align right'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive({ textAlign: 'justify' }) ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => applySmartAlignment('justify')}
                >
                  <AlignJustify className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'По ширине' : 'Justify'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Lists */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('bulletList') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Маркированный список' : 'Bullet list'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('orderedList') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Нумерованный список' : 'Numbered list'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Block elements */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('blockquote') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                  <Quote className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Цитата' : 'Blockquote'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('codeBlock') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                  <Code className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Блок кода' : 'Code block'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Media */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => setImageDialogOpen(true)}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Изображение' : 'Image'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80 ${
                    editor.isActive('link') ? 'bg-background text-foreground' : ''
                  }`}
                  onClick={() => setLinkDialogOpen(true)}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Ссылка' : 'Link'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Разделитель' : 'Divider'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => setVideoDialogOpen(true)}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Видео' : 'Video'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => setAudioDialogOpen(true)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'ru' ? 'Аудио' : 'Audio'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Вставить изображение' : 'Insert Image'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue={(lessonId || communityId) ? "upload" : "url"} className="w-full">
            <TabsList className={`grid w-full ${(lessonId || communityId) ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {(lessonId || communityId) && (
                <TabsTrigger value="upload">
                  {language === 'ru' ? 'Загрузить' : 'Upload'}
                </TabsTrigger>
              )}
              <TabsTrigger value="url">
                {language === 'ru' ? 'По ссылке' : 'By URL'}
              </TabsTrigger>
            </TabsList>
            {lessonId && (
              <TabsContent value="upload" className="mt-4">
                <ImageUploader
                  lessonId={lessonId}
                  onUploadComplete={(url) => {
                    if (url) insertImage(url);
                  }}
                />
              </TabsContent>
            )}
            {communityId && !lessonId && (
              <TabsContent value="upload" className="mt-4">
                <CommunityMediaUploader
                  communityId={communityId}
                  type="image"
                  language={language}
                  onUploadComplete={(url) => {
                    if (url) insertImage(url);
                  }}
                />
              </TabsContent>
            )}
            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ru' ? 'URL изображения' : 'Image URL'}</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => insertImage(imageUrl)}
                disabled={!imageUrl}
              >
                {language === 'ru' ? 'Вставить' : 'Insert'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Video Upload Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Вставить видео' : 'Insert Video'}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue={(lessonId || communityId) ? "upload" : "url"} className="w-full">
            <TabsList className={`grid w-full ${(lessonId || communityId) ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {(lessonId || communityId) && (
                <TabsTrigger value="upload">
                  {language === 'ru' ? 'Загрузить' : 'Upload'}
                </TabsTrigger>
              )}
              <TabsTrigger value="url">
                {language === 'ru' ? 'По ссылке' : 'By URL'}
              </TabsTrigger>
            </TabsList>
            {lessonId && (
              <TabsContent value="upload" className="mt-4">
                <VideoUploader
                  lessonId={lessonId}
                  onUploadComplete={(path) => {
                    if (path) {
                      // Store only the storage path (bucket is private; VideoPlayer will request a signed URL)
                      insertVideo(path);
                    }
                  }}
                />
              </TabsContent>
            )}
            {communityId && !lessonId && (
              <TabsContent value="upload" className="mt-4">
                <CommunityMediaUploader
                  communityId={communityId}
                  type="video"
                  language={language}
                  onUploadComplete={(url) => {
                    if (url) insertVideo(url);
                  }}
                />
              </TabsContent>
            )}
            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>{language === 'ru' ? 'URL видео' : 'Video URL'}</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'ru' 
                    ? 'Поддерживаются YouTube, Vimeo и прямые ссылки на видео' 
                    : 'YouTube, Vimeo and direct video links supported'}
                </p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => insertVideo(videoUrl)}
                disabled={!videoUrl}
              >
                {language === 'ru' ? 'Вставить' : 'Insert'}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Audio Dialog */}
      <Dialog open={audioDialogOpen} onOpenChange={setAudioDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Вставить аудио' : 'Insert Audio'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ru' ? 'URL аудио' : 'Audio URL'}</Label>
              <Input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
              />
              <p className="text-xs text-muted-foreground">
                {language === 'ru' 
                  ? 'Поддерживаются MP3, WAV, OGG и другие аудио форматы' 
                  : 'Supports MP3, WAV, OGG and other audio formats'}
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => insertAudio(audioUrl)}
              disabled={!audioUrl}
            >
              {language === 'ru' ? 'Вставить' : 'Insert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Вставить ссылку' : 'Insert Link'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'ru' ? 'URL ссылки' : 'Link URL'}</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button 
              className="w-full" 
              onClick={insertLink}
              disabled={!linkUrl}
            >
              {language === 'ru' ? 'Вставить' : 'Insert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
