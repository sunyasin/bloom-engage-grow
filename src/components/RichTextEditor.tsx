import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Redo
} from 'lucide-react';
import { useCallback, useState } from 'react';
import ImageUploader from './ImageUploader';
import VideoUploader from './VideoUploader';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  language: string;
  placeholder?: string;
  lessonId?: string;
}

export default function RichTextEditor({ content, onChange, language, placeholder, lessonId }: RichTextEditorProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
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

  const insertImage = useCallback((url: string) => {
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
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
        // For direct video URLs, insert as HTML
        editor.chain().focus().insertContent(
          `<video controls class="w-full rounded-lg"><source src="${url}" type="video/mp4"></video>`
        ).run();
      }
      setVideoDialogOpen(false);
      setVideoUrl('');
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

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 p-2 bg-muted/80 border-b border-border/50 flex-wrap">
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
                    onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run()}
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
          <Tabs defaultValue={lessonId ? "upload" : "url"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {lessonId && (
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
          <Tabs defaultValue={lessonId ? "upload" : "url"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {lessonId && (
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
                      // For uploaded videos, construct the full URL
                      const fullUrl = `https://njrhaqycomfsluefnkec.supabase.co/storage/v1/object/public/lesson-videos/${path}`;
                      insertVideo(fullUrl);
                    }
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
