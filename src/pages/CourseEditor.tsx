import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, ArrowLeft, GripVertical, Pencil, Trash2, 
  FileText, Video, ClipboardCheck, ChevronRight, ChevronDown, ClipboardList
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Lesson {
  id: string;
  title: string;
  order_index: number;
  type: 'lesson' | 'test' | 'assignment';
  parent_lesson_id: string | null;
  video_url: string | null;
  children?: Lesson[];
}

interface Course {
  id: string;
  title: string;
  status: string;
}

export default function CourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<{
    title: string;
    type: 'lesson' | 'test' | 'assignment';
    video_url: string;
  }>({
    title: '',
    type: 'lesson',
    video_url: ''
  });

  const typeLabels = {
    lesson: { ru: 'Урок', en: 'Lesson', icon: FileText },
    test: { ru: 'Тест', en: 'Test', icon: ClipboardCheck },
    assignment: { ru: 'Задание', en: 'Assignment', icon: FileText }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchLessons();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, status')
      .eq('id', courseId)
      .single();

    if (error) {
      toast.error(language === 'ru' ? 'Курс не найден' : 'Course not found');
      navigate('/my-courses');
    } else {
      setCourse(data);
    }
  };

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    if (error) {
      console.error('Error fetching lessons:', error);
    } else {
      // Build tree structure
      const lessonsMap = new Map<string, Lesson>();
      const rootLessons: Lesson[] = [];

      data?.forEach((lesson) => {
        lessonsMap.set(lesson.id, { ...lesson, children: [] });
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
    }
    setLoading(false);
  };

  const handleCreate = (parentLessonId: string | null = null) => {
    setEditingLesson(null);
    setParentId(parentLessonId);
    setFormData({
      title: '',
      type: 'lesson',
      video_url: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setParentId(lesson.parent_lesson_id);
    setFormData({
      title: lesson.title,
      type: lesson.type as 'lesson' | 'test' | 'assignment',
      video_url: lesson.video_url || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm(language === 'ru' ? 'Удалить урок?' : 'Delete lesson?')) return;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Delete error');
    } else {
      toast.success(language === 'ru' ? 'Урок удален' : 'Lesson deleted');
      fetchLessons();
    }
  };

  const handleSubmit = async () => {
    // Get max order_index for positioning
    const { data: maxOrderData } = await supabase
      .from('lessons')
      .select('order_index')
      .eq('course_id', courseId)
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
        fetchLessons();
      }
    } else {
      const { error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          parent_lesson_id: parentId,
          title: formData.title,
          type: formData.type,
          video_url: formData.video_url || null,
          order_index: nextOrder
        });

      if (error) {
        toast.error(language === 'ru' ? 'Ошибка создания' : 'Create error');
        console.error(error);
      } else {
        toast.success(language === 'ru' ? 'Урок создан' : 'Lesson created');
        setDialogOpen(false);
        fetchLessons();
      }
    }
  };

  const toggleExpand = (lessonId: string) => {
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

  const renderLesson = (lesson: Lesson, depth: number = 0) => {
    const hasChildren = lesson.children && lesson.children.length > 0;
    const isExpanded = expandedLessons.has(lesson.id);
    const Icon = typeLabels[lesson.type].icon;

    return (
      <div key={lesson.id}>
        <div 
          className={`flex items-center gap-2 p-3 bg-card border rounded-lg mb-2 hover:border-primary/50 transition-colors`}
          style={{ marginLeft: depth * 24 }}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
          
          {hasChildren ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-6 h-6"
              onClick={() => toggleExpand(lesson.id)}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          <Icon className="w-4 h-4 text-primary" />
          
          <span 
            className="flex-1 cursor-pointer hover:text-primary"
            onClick={() => navigate(`/course/${courseId}/lesson/${lesson.id}`)}
          >
            {lesson.title}
          </span>

          <Badge variant="outline" className="text-xs">
            {typeLabels[lesson.type][language]}
          </Badge>

          {lesson.video_url && (
            <Video className="w-4 h-4 text-muted-foreground" />
          )}

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleCreate(lesson.id)}
            title={language === 'ru' ? 'Добавить подурок' : 'Add sub-lesson'}
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleEdit(lesson)}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleDelete(lesson.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {lesson.children!.map(child => renderLesson(child, depth + 1))}
          </div>
        )}
      </div>
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/my-courses')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course?.title}</h1>
          <p className="text-muted-foreground">
            {language === 'ru' ? 'Редактор уроков' : 'Lesson Editor'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/homework-moderation')}>
            <ClipboardList className="w-4 h-4 mr-2" />
            {language === 'ru' ? 'Модерация ДЗ' : 'Homework Moderation'}
          </Button>
          <Button onClick={() => handleCreate(null)}>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ru' ? 'Добавить урок' : 'Add Lesson'}
          </Button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {language === 'ru' ? 'В курсе пока нет уроков' : 'No lessons in this course yet'}
            </p>
            <Button onClick={() => handleCreate(null)}>
              <Plus className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Добавить первый урок' : 'Add First Lesson'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {lessons.map(lesson => renderLesson(lesson))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLesson 
                ? (language === 'ru' ? 'Редактировать урок' : 'Edit Lesson')
                : (language === 'ru' ? 'Создать урок' : 'Create Lesson')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{language === 'ru' ? 'Название' : 'Title'}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'ru' ? 'Название урока' : 'Lesson title'}
              />
            </div>

            <div>
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

            <div>
              <Label>{language === 'ru' ? 'Ссылка на видео (опционально)' : 'Video URL (optional)'}</Label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
