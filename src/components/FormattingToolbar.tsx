import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Image,
  Link2,
  Play,
  Minus
} from 'lucide-react';

interface FormattingToolbarProps {
  onFormat: (format: string) => void;
  language: string;
}

const headingButtons = [
  { format: 'h1', label: 'H1' },
  { format: 'h2', label: 'H2' },
  { format: 'h3', label: 'H3' },
  { format: 'h4', label: 'H4' },
];

const textStyleButtons = [
  { format: 'bold', icon: Bold, tooltip: { ru: 'Жирный', en: 'Bold' } },
  { format: 'italic', icon: Italic, tooltip: { ru: 'Курсив', en: 'Italic' } },
  { format: 'strikethrough', icon: Strikethrough, tooltip: { ru: 'Зачеркнутый', en: 'Strikethrough' } },
  { format: 'code', icon: Code, tooltip: { ru: 'Код', en: 'Code' } },
];

const listButtons = [
  { format: 'bullet-list', icon: List, tooltip: { ru: 'Маркированный список', en: 'Bullet list' } },
  { format: 'numbered-list', icon: ListOrdered, tooltip: { ru: 'Нумерованный список', en: 'Numbered list' } },
];

const blockButtons = [
  { format: 'blockquote', icon: Quote, tooltip: { ru: 'Цитата', en: 'Blockquote' } },
  { format: 'code-block', icon: Code, tooltip: { ru: 'Блок кода', en: 'Code block' }, variant: 'block' },
];

const mediaButtons = [
  { format: 'image', icon: Image, tooltip: { ru: 'Изображение', en: 'Image' } },
  { format: 'link', icon: Link2, tooltip: { ru: 'Ссылка', en: 'Link' } },
  { format: 'divider', icon: Minus, tooltip: { ru: 'Разделитель', en: 'Divider' } },
  { format: 'video', icon: Play, tooltip: { ru: 'Видео', en: 'Video' } },
];

export default function FormattingToolbar({ onFormat, language }: FormattingToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 p-2 bg-muted/80 rounded-lg border border-border/50 mb-4 flex-wrap">
        {/* Headings H1-H4 */}
        <div className="flex items-center">
          {headingButtons.map(({ format, label }) => (
            <Tooltip key={format}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => onFormat(format)}
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
          {textStyleButtons.map(({ format, icon: Icon, tooltip }) => (
            <Tooltip key={format}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => onFormat(format)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip[language as 'ru' | 'en']}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <div className="flex items-center">
          {listButtons.map(({ format, icon: Icon, tooltip }) => (
            <Tooltip key={format}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => onFormat(format)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip[language as 'ru' | 'en']}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Block elements */}
        <div className="flex items-center">
          {blockButtons.map(({ format, icon: Icon, tooltip }) => (
            <Tooltip key={format}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => onFormat(format)}
                >
                  {format === 'code-block' ? (
                    <div className="relative">
                      <Icon className="h-4 w-4" />
                      <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold">⎵</span>
                    </div>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip[language as 'ru' | 'en']}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Media */}
        <div className="flex items-center">
          {mediaButtons.map(({ format, icon: Icon, tooltip }) => (
            <Tooltip key={format}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
                  onClick={() => onFormat(format)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip[language as 'ru' | 'en']}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
