import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Save, Plus, GripVertical, Trash2,
  Type, Image, CheckSquare, TextCursor, Link2, List, Video, MousePointer,
  FileText, ClipboardCheck, ChevronRight, ChevronDown, Pencil
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

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
  order_index: number;
  type: 'lesson' | 'test' | 'assignment';
  parent_lesson_id: string | null;
  course_id: string;
  video_url: string | null;
  children?: Lesson[];
}

interface Course {
  id: string;
  title: string;
  community_id: string;
}

interface CommunityLessonBuilderProps {
  user: User | null;
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

const typeLabels = {
  lesson: { ru: 'Урок', en: 'Lesson', icon: FileText },
  test: { ru: 'Тест', en: 'Test', icon: ClipboardCheck },
  assignment: { ru: 'Задание', en: 'Assignment', icon: FileText }
};

export default function CommunityLessonBuilder({ user }: CommunityLessonBuilderProps) {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'lesson' as 'lesson' | 'test' | 'assignment',
    video_url: ''
  });

  const fetchOrCreateCourse = useCallback(async () => {
    if (!communityId || !user) return;

    // Try to find existing course for this community
    const { data: existingCourse, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, community_id')
      .eq('community_id', communityId)
      .limit(1)
      .maybeSingle();

    if (existingCourse) {
      setCourse(existingCourse);
      return existingCourse;
    }

    // Create a default course for this community
    const { data: community } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single();

    const { data: newCourse, error: createError } = await supabase
      .from('courses')
      .insert({
        community_id: communityId,
        author_id: user.id,
        title: community?.name || 'Community Course',
        slug: `community-${communityId}-${Date.now()}`,
        status: 'draft'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating course:', createError);
      toast.error(language === 'ru' ? 'Ошибка создания курса' : 'Error creating course');
      return null;
    }

    setCourse(newCourse);
    return newCourse;
  }, [communityId, user, language]);

  const fetchLessons = useCallback(async (courseId: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (error) {
      console.error('Error fetching lessons:', error);
      return;
    }

    // Build tree structure
    const lessonsMap = new Map<string, Lesson>();
    const rootLessons: Lesson[] = [];

    data?.forEach((lesson) => {
      lessonsMap.set(lesson.id, { ...lesson, children: [] } as Lesson);
    });

    data?.forEach((lesson) => {
      const node = lessonsMap.get(lesson.id)!;
      if (lesson.parent_lesson_id) {
        const parent = lessonsMap.get(lesson.parent_lesson_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        rootLessons.push(node);
      }
    });

    setLessons(rootLessons);
  }, []);

  const fetchBlocks = useCallback(async (lessonId: string) => {
    const { data, error } = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index');

    if (!error) {
      setBlocks(data || []);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const courseData = await fetchOrCreateCourse();
      if (courseData) {
        await fetchLessons(courseData.id);
      }
      setLoading(false);
    };
    init();
  }, [fetchOrCreateCourse, fetchLessons]);

  useEffect(() => {
    if (selectedLesson) {
      fetchBlocks(selectedLesson.id);
    } else {
      setBlocks([]);
    }
  }, [selectedLesson, fetchBlocks]);

  const handleCreateLesson = (parentLessonId: string | null = null) => {
    setEditingLesson(null);
    setParentId(parentLessonId);
    setFormData({ title: '', type: 'lesson', video_url: '' });
    setDialogOpen(true);
  };

  const handleEditLesson = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLesson(lesson);
    setParentId(lesson.parent_lesson_id);
    setFormData({
      title: lesson.title,
      type: lesson.type,
      video_url: lesson.video_url || ''
    });
    setDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(language === 'ru' ? 'Удалить урок?' : 'Delete lesson?')) return;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Delete error');
    } else {
      toast.success(language === 'ru' ? 'Урок удален' : 'Lesson deleted');
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null);
      }
      if (course) fetchLessons(course.id);
    }
  };

  const handleSubmitLesson = async () => {
    if (!course) return;

    const { data: maxOrderData } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('course_id', course.id)
      .eq('parent_lesson_id', parentId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.order_index ?? -1) + 1;

    if (editingLesson) {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: formData.title,
          type: formData.type,
          video_url: formData.video_url || null
        })
        .eq('id', editingLesson.id);

      if (error) {
        toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Save error');
      } else {
        toast.success(language === 'ru' ? 'Урок обновлен' : 'Lesson updated');
        setDialogOpen(false);
        fetchLessons(course.id);
        if (selectedLesson?.id === editingLesson.id) {
          setSelectedLesson({ ...selectedLesson, ...formData });
        }
      }
    } else {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          course_id: course.id,
          parent_lesson_id: parentId,
          title: formData.title,
          type: formData.type,
          video_url: formData.video_url || null,
          order_index: nextOrder
        })
        .select()
        .single();

      if (error) {
        toast.error(language === 'ru' ? 'Ошибка создания' : 'Create error');
      } else {
        toast.success(language === 'ru' ? 'Урок создан' : 'Lesson created');
        setDialogOpen(false);
        fetchLessons(course.id);
        setSelectedLesson(data as Lesson);
      }
    }
  };

  const toggleExpand = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const addBlock = async (type: BlockType) => {
    if (!selectedLesson) return;

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
        lesson_id: selectedLesson.id,
        block_type: type,
        order_index: maxOrder + 1,
        config_json: defaultConfigs[type]
      })
      .select()
      .single();

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка добавления блока' : 'Error adding block');
    } else {
      setBlocks([...blocks, data as LessonBlock]);
    }
  };

  const updateBlock = (blockId: string, config: any) => {
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
    if (!selectedLesson) return;
    setSaving(true);

    await supabase
      .from('lessons')
      .update({ title: selectedLesson.title })
      .eq('id', selectedLesson.id);

    for (const block of blocks) {
      await supabase
        .from('lesson_blocks')
        .update({ config_json: block.config_json, order_index: block.order_index })
        .eq('id', block.id);
    }

    toast.success(language === 'ru' ? 'Сохранено' : 'Saved');
    setSaving(false);
  };

  const renderLessonTree = (lessonList: Lesson[], depth: number = 0) => {
    return lessonList.map(lesson => {
      const hasChildren = lesson.children && lesson.children.length > 0;
      const isExpanded = expandedLessons.has(lesson.id);
      const isSelected = selectedLesson?.id === lesson.id;
      const Icon = typeLabels[lesson.type].icon;

      return (
        <div key={lesson.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
            style={{ paddingLeft: 12 + depth * 16 }}
            onClick={() => setSelectedLesson(lesson)}
          >
            {hasChildren ? (
              <button onClick={(e) => toggleExpand(lesson.id, e)} className="p-0.5">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 truncate text-sm">{lesson.title}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => handleEditLesson(lesson, e)}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive"
                onClick={(e) => handleDeleteLesson(lesson.id, e)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderLessonTree(lesson.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
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
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(course ? `/course/${course.id}/preview` : `/community/${communityId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {language === 'ru' ? 'Конструктор уроков' : 'Lesson Builder'}
          </h1>
        </div>
        {selectedLesson && (
          <Button onClick={saveAll} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? (language === 'ru' ? 'Сохранение...' : 'Saving...') : t('common.save')}
          </Button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Lesson tree */}
        <div className="w-72 border-r bg-card flex flex-col">
          <div className="p-3 border-b">
            <Button onClick={() => handleCreateLesson(null)} className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Создать урок' : 'Create Lesson'}
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {language === 'ru' ? 'Уроков пока нет' : 'No lessons yet'}
                </div>
              ) : (
                <div className="space-y-1">
                  {renderLessonTree(lessons)}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right content - Block editor */}
        <div className="flex-1 flex overflow-hidden">
          {selectedLesson ? (
            <>
              {/* Block palette */}
              <div className="w-48 border-r bg-muted/30 p-3">
                <h3 className="font-medium text-sm mb-3">
                  {language === 'ru' ? 'Добавить блок' : 'Add Block'}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {blockTypes.map(({ type, label, icon: Icon }) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      className="flex flex-col h-auto py-2 gap-1"
                      onClick={() => addBlock(type)}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{label[language]}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Content editor */}
              <div className="flex-1 overflow-auto p-4">
                <div className="mb-4">
                  <Input
                    value={selectedLesson.title}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, title: e.target.value })}
                    className="text-xl font-bold border-0 px-0 focus-visible:ring-0 bg-transparent"
                    placeholder={language === 'ru' ? 'Название урока' : 'Lesson title'}
                  />
                  <Badge variant="outline" className="mt-2">
                    {typeLabels[selectedLesson.type][language]}
                  </Badge>
                </div>

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
                  <div>{blocks.map(block => renderBlockEditor(block))}</div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ru' ? 'Выберите урок для редактирования' : 'Select a lesson to edit'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Lesson Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLesson 
                ? (language === 'ru' ? 'Редактировать урок' : 'Edit Lesson')
                : (language === 'ru' ? 'Создать урок' : 'Create Lesson')}
            </DialogTitle>
            <DialogDescription>
              {editingLesson
                ? (language === 'ru' ? 'Измените параметры урока' : 'Modify lesson settings')
                : (language === 'ru' ? 'Заполните информацию о новом уроке' : 'Fill in new lesson details')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">{language === 'ru' ? 'Название' : 'Title'}</Label>
              <Input
                id="lesson-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'ru' ? 'Название урока' : 'Lesson title'}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'ru' ? 'Тип' : 'Type'}</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v: any) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson">{typeLabels.lesson[language]}</SelectItem>
                  <SelectItem value="test">{typeLabels.test[language]}</SelectItem>
                  <SelectItem value="assignment">{typeLabels.assignment[language]}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-url">{language === 'ru' ? 'Ссылка на видео (опционально)' : 'Video URL (optional)'}</Label>
              <Input
                id="video-url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSubmitLesson} disabled={!formData.title.trim()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
