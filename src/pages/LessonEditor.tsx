import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Save, Plus, GripVertical, Trash2,
  Type, Image, CheckSquare, TextCursor, Link2, List, Video, MousePointer
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type BlockType = 'text' | 'image' | 'checkbox' | 'input_text' | 'button' | 'link' | 'list' | 'video';

interface LessonBlock {
  id: string;
  block_type: BlockType;
  order_index: number;
  config_json: any;
}

interface Lesson {
  id: string;
  title: string;
  content_html: string | null;
  video_url: string | null;
  type: string;
  course_id: string;
}

const blockTypes: { type: BlockType; label: { ru: string; en: string }; icon: any }[] = [
  { type: 'text', label: { ru: 'Текст', en: 'Text' }, icon: Type },
  { type: 'image', label: { ru: 'Изображение', en: 'Image' }, icon: Image },
  { type: 'video', label: { ru: 'Видео', en: 'Video' }, icon: Video },
  { type: 'checkbox', label: { ru: 'Чекбокс', en: 'Checkbox' }, icon: CheckSquare },
  { type: 'input_text', label: { ru: 'Поле ввода', en: 'Input Field' }, icon: TextCursor },
  { type: 'button', label: { ru: 'Кнопка', en: 'Button' }, icon: MousePointer },
  { type: 'link', label: { ru: 'Ссылка', en: 'Link' }, icon: Link2 },
  { type: 'list', label: { ru: 'Список', en: 'List' }, icon: List },
];

export default function LessonEditor() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLesson();
      fetchBlocks();
    }
  }, [lessonId]);

  const fetchLesson = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      toast.error(language === 'ru' ? 'Урок не найден' : 'Lesson not found');
      navigate(`/course/${courseId}/lessons`);
    } else {
      setLesson(data);
    }
    setLoading(false);
  };

  const fetchBlocks = async () => {
    const { data, error } = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index');

    if (!error) {
      setBlocks(data || []);
    }
  };

  const addBlock = async (type: BlockType) => {
    const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order_index)) : -1;
    
    const defaultConfigs: Record<BlockType, any> = {
      text: { content: '' },
      image: { url: '', alt: '' },
      video: { url: '' },
      checkbox: { label: '', checked: false },
      input_text: { placeholder: '', label: '' },
      button: { text: '', action: '' },
      link: { text: '', url: '' },
      list: { items: [''] }
    };

    const { data, error } = await supabase
      .from('lesson_blocks')
      .insert({
        lesson_id: lessonId,
        block_type: type,
        order_index: maxOrder + 1,
        config_json: defaultConfigs[type]
      })
      .select()
      .single();

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка добавления блока' : 'Error adding block');
    } else {
      setBlocks([...blocks, data]);
    }
  };

  const updateBlock = async (blockId: string, config: any) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, config_json: config } : b));
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase
      .from('lesson_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Delete error');
    } else {
      setBlocks(blocks.filter(b => b.id !== blockId));
    }
  };

  const saveAll = async () => {
    setSaving(true);

    // Save lesson
    if (lesson) {
      await supabase
        .from('lessons')
        .update({
          title: lesson.title,
          content_html: lesson.content_html,
          video_url: lesson.video_url
        })
        .eq('id', lessonId);
    }

    // Save all blocks
    for (const block of blocks) {
      await supabase
        .from('lesson_blocks')
        .update({ config_json: block.config_json, order_index: block.order_index })
        .eq('id', block.id);
    }

    toast.success(language === 'ru' ? 'Сохранено' : 'Saved');
    setSaving(false);
  };

  const renderBlockEditor = (block: LessonBlock) => {
    const config = block.config_json || {};
    const blockInfo = blockTypes.find(bt => bt.type === block.block_type);
    const Icon = blockInfo?.icon || Type;

    return (
      <Card key={block.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-2 pt-1">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <Icon className="w-4 h-4 text-primary" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {blockInfo?.label[language]}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => deleteBlock(block.id)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {block.block_type === 'text' && (
                <Textarea
                  value={config.content || ''}
                  onChange={(e) => updateBlock(block.id, { ...config, content: e.target.value })}
                  placeholder={language === 'ru' ? 'Введите текст...' : 'Enter text...'}
                  rows={4}
                />
              )}

              {block.block_type === 'image' && (
                <div className="space-y-2">
                  <Input
                    value={config.url || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, url: e.target.value })}
                    placeholder={language === 'ru' ? 'URL изображения' : 'Image URL'}
                  />
                  <Input
                    value={config.alt || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, alt: e.target.value })}
                    placeholder={language === 'ru' ? 'Описание (alt)' : 'Alt text'}
                  />
                  {config.url && (
                    <img src={config.url} alt={config.alt} className="max-h-40 rounded" />
                  )}
                </div>
              )}

              {block.block_type === 'video' && (
                <Input
                  value={config.url || ''}
                  onChange={(e) => updateBlock(block.id, { ...config, url: e.target.value })}
                  placeholder="https://youtube.com/embed/..."
                />
              )}

              {block.block_type === 'checkbox' && (
                <Input
                  value={config.label || ''}
                  onChange={(e) => updateBlock(block.id, { ...config, label: e.target.value })}
                  placeholder={language === 'ru' ? 'Текст чекбокса' : 'Checkbox label'}
                />
              )}

              {block.block_type === 'input_text' && (
                <div className="space-y-2">
                  <Input
                    value={config.label || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, label: e.target.value })}
                    placeholder={language === 'ru' ? 'Подпись поля' : 'Field label'}
                  />
                  <Input
                    value={config.placeholder || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, placeholder: e.target.value })}
                    placeholder={language === 'ru' ? 'Placeholder' : 'Placeholder'}
                  />
                </div>
              )}

              {block.block_type === 'button' && (
                <div className="space-y-2">
                  <Input
                    value={config.text || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, text: e.target.value })}
                    placeholder={language === 'ru' ? 'Текст кнопки' : 'Button text'}
                  />
                  <Input
                    value={config.action || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, action: e.target.value })}
                    placeholder={language === 'ru' ? 'Действие / URL' : 'Action / URL'}
                  />
                </div>
              )}

              {block.block_type === 'link' && (
                <div className="space-y-2">
                  <Input
                    value={config.text || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, text: e.target.value })}
                    placeholder={language === 'ru' ? 'Текст ссылки' : 'Link text'}
                  />
                  <Input
                    value={config.url || ''}
                    onChange={(e) => updateBlock(block.id, { ...config, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}

              {block.block_type === 'list' && (
                <div className="space-y-2">
                  {(config.items || ['']).map((item: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newItems = [...(config.items || [''])];
                          newItems[index] = e.target.value;
                          updateBlock(block.id, { ...config, items: newItems });
                        }}
                        placeholder={`${language === 'ru' ? 'Пункт' : 'Item'} ${index + 1}`}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          const newItems = (config.items || ['']).filter((_: any, i: number) => i !== index);
                          updateBlock(block.id, { ...config, items: newItems.length ? newItems : [''] });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      updateBlock(block.id, { ...config, items: [...(config.items || ['']), ''] });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {language === 'ru' ? 'Добавить пункт' : 'Add item'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${courseId}/lessons`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <Input
            value={lesson?.title || ''}
            onChange={(e) => setLesson(lesson ? { ...lesson, title: e.target.value } : null)}
            className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
            placeholder={language === 'ru' ? 'Название урока' : 'Lesson title'}
          />
        </div>
        <Button onClick={saveAll} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? (language === 'ru' ? 'Сохранение...' : 'Saving...') : t('common.save')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Block palette */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">
                {language === 'ru' ? 'Добавить блок' : 'Add Block'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {blockTypes.map(({ type, label, icon: Icon }) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => addBlock(type)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label[language]}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content editor */}
        <div className="lg:col-span-3">
          {blocks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Type className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {language === 'ru' 
                    ? 'Добавьте блоки контента из панели слева' 
                    : 'Add content blocks from the panel on the left'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {blocks.map(block => renderBlockEditor(block))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
