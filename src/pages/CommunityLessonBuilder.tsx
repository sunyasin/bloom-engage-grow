import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Save, Plus, Trash2,
  FileText, ClipboardCheck, ChevronRight, ChevronDown, Pencil
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import RichTextEditor from '@/components/RichTextEditor';

interface Lesson {
  id: string;
  title: string;
  order_index: number;
  type: 'lesson' | 'test' | 'assignment';
  parent_lesson_id: string | null;
  course_id: string;
  video_url: string | null;
  content_html: string | null;
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
  const [contentHtml, setContentHtml] = useState<string>('');
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
      setContentHtml(selectedLesson.content_html || '');
    } else {
      setContentHtml('');
    }
  }, [selectedLesson]);

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

  const saveAll = async () => {
    if (!selectedLesson) return;
    setSaving(true);

    const { error } = await supabase
      .from('lessons')
      .update({
        title: selectedLesson.title,
        content_html: contentHtml
      })
      .eq('id', selectedLesson.id);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Save error');
    } else {
      toast.success(language === 'ru' ? 'Сохранено' : 'Saved');
      setSelectedLesson({ ...selectedLesson, content_html: contentHtml });
      fetchLessons(course!.id);
    }

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

        {/* Right content - WYSIWYG editor */}
        <div className="flex-1 flex overflow-hidden">
          {selectedLesson ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-2">
                  <Input
                    value={selectedLesson.title}
                    onChange={(e) => setSelectedLesson({ ...selectedLesson, title: e.target.value })}
                    className="text-3xl font-bold border-0 px-0 focus-visible:ring-0 bg-transparent"
                    placeholder={language === 'ru' ? 'Название урока' : 'Lesson title'}
                  />
                  <Badge variant="outline">
                    {typeLabels[selectedLesson.type][language]}
                  </Badge>
                </div>

                <RichTextEditor
                  content={contentHtml}
                  onChange={setContentHtml}
                  language={language}
                  placeholder={language === 'ru' ? 'Начните создавать урок...' : 'Start creating your lesson...'}
                  lessonId={selectedLesson.id}
                />
              </div>
            </div>
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
