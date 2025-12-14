import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  BookOpen, 
  FileText, 
  ClipboardCheck, 
  Loader2, 
  Trash2, 
  Settings, 
  Globe,
  Plus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import CourseSettingsDialog from '@/components/CourseSettingsDialog';
import type { Database } from '@/integrations/supabase/types';

type AccessType = Database['public']['Enums']['access_type'];
type CourseStatus = Database['public']['Enums']['course_status'];

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author_id: string;
  status: CourseStatus | null;
  access_type: AccessType | null;
  community_id: string;
}

interface LessonBlock {
  id: string;
  lesson_id: string;
  block_type: string;
  config_json: unknown;
  order_index: number | null;
}

interface Lesson {
  id: string;
  title: string;
  type: string;
  order_index: number;
  parent_lesson_id: string | null;
  content_html: string | null;
  video_url: string | null;
  children?: Lesson[];
}

interface CoursePreviewProps {
  user: User | null;
}

export default function CoursePreview({ user }: CoursePreviewProps) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { language } = useI18n();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<LessonBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;

      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (courseData) {
        setCourse(courseData);
      }

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setAllLessons(lessonsData);
        
        const lessonMap = new Map<string, Lesson>();
        const rootLessons: Lesson[] = [];

        lessonsData.forEach(lesson => {
          lessonMap.set(lesson.id, { ...lesson, children: [] });
        });

        lessonsData.forEach(lesson => {
          const lessonWithChildren = lessonMap.get(lesson.id)!;
          if (lesson.parent_lesson_id) {
            const parent = lessonMap.get(lesson.parent_lesson_id);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(lessonWithChildren);
            }
          } else {
            rootLessons.push(lessonWithChildren);
          }
        });

        setLessons(rootLessons);
        
        if (rootLessons.length > 0) {
          setSelectedLesson(lessonMap.get(rootLessons[0].id) || rootLessons[0]);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [courseId]);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'test':
        return <ClipboardCheck className="h-4 w-4 text-orange-500" />;
      case 'assignment':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-primary" />;
    }
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    const fullLesson = allLessons.find(l => l.id === lesson.id);
    setSelectedLesson(fullLesson || lesson);
    
    // Fetch lesson blocks
    const { data: blocksData } = await supabase
      .from('lesson_blocks')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('order_index', { ascending: true });
    
    setLessonBlocks(blocksData || []);
  };

  // Load blocks for initial selected lesson
  useEffect(() => {
    const loadInitialBlocks = async () => {
      if (selectedLesson && lessonBlocks.length === 0) {
        const { data: blocksData } = await supabase
          .from('lesson_blocks')
          .select('*')
          .eq('lesson_id', selectedLesson.id)
          .order('order_index', { ascending: true });
        
        setLessonBlocks(blocksData || []);
      }
    };
    loadInitialBlocks();
  }, [selectedLesson]);

  const renderBlock = (block: LessonBlock) => {
    const config = (block.config_json || {}) as Record<string, unknown>;
    
    switch (block.block_type) {
      case 'text':
        return (
          <div key={block.id} className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
            {(config.content as string) || ''}
          </div>
        );
      case 'image':
        return config.url ? (
          <img 
            key={block.id}
            src={config.url as string} 
            alt={(config.alt as string) || ''} 
            className="max-w-full rounded-lg"
          />
        ) : null;
      case 'checkbox':
        return (
          <div key={block.id} className="flex items-center gap-2">
            <input type="checkbox" defaultChecked={Boolean(config.checked)} className="h-4 w-4" />
            <span>{(config.label as string) || ''}</span>
          </div>
        );
      case 'input_text':
        return (
          <div key={block.id} className="space-y-1">
            {config.label && <label className="text-sm font-medium">{config.label as string}</label>}
            <input 
              type="text" 
              placeholder={(config.placeholder as string) || ''} 
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            />
          </div>
        );
      case 'button':
        return (
          <button key={block.id} className="px-4 py-2 bg-primary text-primary-foreground rounded-md" disabled>
            {(config.label as string) || 'Button'}
          </button>
        );
      case 'link':
        return (
          <a key={block.id} href={(config.url as string) || '#'} className="text-primary underline">
            {(config.label as string) || (config.url as string) || 'Link'}
          </a>
        );
      case 'list':
        const items = (config.items as string[]) || [];
        return (
          <ul key={block.id} className="list-disc pl-5 space-y-1">
            {items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      case 'video':
        return config.url ? (
          <div key={block.id} className="aspect-video bg-muted rounded-lg">
            <video src={config.url as string} controls className="w-full h-full rounded-lg" />
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    
    setDeleting(true);
    try {
      await supabase.from('lessons').delete().eq('course_id', course.id);
      
      const { error } = await supabase.from('courses').delete().eq('id', course.id);
      
      if (error) throw error;

      toast({
        title: language === 'ru' ? 'Курс удалён' : 'Course deleted',
      });

      navigate(`/community/${course.community_id}`);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Не удалось удалить курс' : 'Failed to delete course',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePublish = async () => {
    if (!course) return;

    setPublishing(true);
    try {
      const newStatus: CourseStatus = course.status === 'published' ? 'draft' : 'published';
      
      const { error } = await supabase
        .from('courses')
        .update({ status: newStatus })
        .eq('id', course.id);

      if (error) throw error;

      setCourse({ ...course, status: newStatus });

      toast({
        title: newStatus === 'published' 
          ? (language === 'ru' ? 'Курс опубликован' : 'Course published')
          : (language === 'ru' ? 'Курс снят с публикации' : 'Course unpublished'),
      });
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleSettingsSave = (updatedCourse: Course) => {
    setCourse(updatedCourse);
  };

  const handleCreateLesson = async (parentLessonId: string | null = null, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!courseId) return;
    
    setCreatingLesson(true);
    try {
      // Get max order_index for siblings
      const siblings = parentLessonId 
        ? allLessons.filter(l => l.parent_lesson_id === parentLessonId)
        : allLessons.filter(l => !l.parent_lesson_id);
      
      const maxOrder = siblings.length > 0 
        ? Math.max(...siblings.map(l => l.order_index)) + 1 
        : 0;

      const { data: newLesson, error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          title: language === 'ru' ? 'Новый урок' : 'New Lesson',
          type: 'lesson',
          order_index: maxOrder,
          parent_lesson_id: parentLessonId,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setAllLessons(lessonsData);
        
        const lessonMap = new Map<string, Lesson>();
        const rootLessons: Lesson[] = [];

        lessonsData.forEach(lesson => {
          lessonMap.set(lesson.id, { ...lesson, children: [] });
        });

        lessonsData.forEach(lesson => {
          const lessonWithChildren = lessonMap.get(lesson.id)!;
          if (lesson.parent_lesson_id) {
            const parent = lessonMap.get(lesson.parent_lesson_id);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(lessonWithChildren);
            }
          } else {
            rootLessons.push(lessonWithChildren);
          }
        });

        setLessons(rootLessons);
        
        // Expand parent if creating nested lesson
        if (parentLessonId) {
          setExpandedLessons(prev => new Set([...prev, parentLessonId]));
        }
        
        // Select the new lesson
        if (newLesson) {
          setSelectedLesson(newLesson);
          setLessonBlocks([]);
        }
      }

      toast({
        title: language === 'ru' ? 'Урок создан' : 'Lesson created',
      });
    } catch (error) {
      console.error('Create lesson error:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Не удалось создать урок' : 'Failed to create lesson',
        variant: 'destructive',
      });
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!selectedLesson || !courseId) return;
    
    setDeletingLesson(true);
    try {
      // Delete lesson blocks first
      await supabase.from('lesson_blocks').delete().eq('lesson_id', selectedLesson.id);
      
      // Delete child lessons recursively
      const childLessons = allLessons.filter(l => l.parent_lesson_id === selectedLesson.id);
      for (const child of childLessons) {
        await supabase.from('lesson_blocks').delete().eq('lesson_id', child.id);
        await supabase.from('lessons').delete().eq('id', child.id);
      }
      
      // Delete the lesson itself
      const { error } = await supabase.from('lessons').delete().eq('id', selectedLesson.id);
      
      if (error) throw error;

      // Refresh lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setAllLessons(lessonsData);
        
        const lessonMap = new Map<string, Lesson>();
        const rootLessons: Lesson[] = [];

        lessonsData.forEach(lesson => {
          lessonMap.set(lesson.id, { ...lesson, children: [] });
        });

        lessonsData.forEach(lesson => {
          const lessonWithChildren = lessonMap.get(lesson.id)!;
          if (lesson.parent_lesson_id) {
            const parent = lessonMap.get(lesson.parent_lesson_id);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(lessonWithChildren);
            }
          } else {
            rootLessons.push(lessonWithChildren);
          }
        });

        setLessons(rootLessons);
        
        // Select first lesson or null
        if (rootLessons.length > 0) {
          setSelectedLesson(rootLessons[0]);
        } else {
          setSelectedLesson(null);
        }
        setLessonBlocks([]);
      }

      toast({
        title: language === 'ru' ? 'Урок удалён' : 'Lesson deleted',
      });
    } catch (error) {
      console.error('Delete lesson error:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Не удалось удалить урок' : 'Failed to delete lesson',
        variant: 'destructive',
      });
    } finally {
      setDeletingLesson(false);
      setShowDeleteLessonDialog(false);
    }
  };

  const renderLesson = (lesson: Lesson, depth: number = 0) => {
    const hasChildren = lesson.children && lesson.children.length > 0;
    const isExpanded = expandedLessons.has(lesson.id);
    const isSelected = selectedLesson?.id === lesson.id;

    return (
      <div key={lesson.id}>
        <div
          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            handleSelectLesson(lesson);
            if (hasChildren) toggleExpand(lesson.id);
          }}
        >
          {hasChildren ? (
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          ) : (
            <div className="w-4" />
          )}
          
          {getTypeIcon(lesson.type)}
          
          <span className={`text-sm flex-1 truncate ${isSelected ? 'font-medium' : ''}`}>
            {lesson.title}
          </span>
          
          {isAuthor && (
            <button
              onClick={(e) => handleCreateLesson(lesson.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
              title={language === 'ru' ? 'Добавить вложенный урок' : 'Add nested lesson'}
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {lesson.children!.map(child => renderLesson(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const isAuthor = user?.id === course?.author_id;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-lg">
          {language === 'ru' ? 'Курс не найден' : 'Course not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/my-courses')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {language === 'ru' ? 'Курсы' : 'Courses'}
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-foreground">{course.title}</h1>
                  {course.status === 'draft' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      {language === 'ru' ? 'Черновик' : 'Draft'}
                    </span>
                  )}
                  {course.status === 'archived' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                      {language === 'ru' ? 'В архиве' : 'Archived'}
                    </span>
                  )}
                </div>
                {course.description && (
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAuthor && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {language === 'ru' ? 'Удалить' : 'Delete'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    {publishing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4 mr-1" />
                    )}
                    {course.status === 'published' 
                      ? (language === 'ru' ? 'Снять с публикации' : 'Unpublish')
                      : (language === 'ru' ? 'Опубликовать' : 'Publish')
                    }
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSettingsDialog(true)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {language === 'ru' ? 'Настройки' : 'Settings'}
                  </Button>
                </>
              )}
              
              {isAuthor && selectedLesson && (
                <>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteLessonDialog(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => navigate(`/course/${courseId}/lesson/${selectedLesson.id}`)}
                    className="bg-gradient-primary"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Редактировать урок' : 'Edit Lesson'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-130px)]">
        {/* Left sidebar - Lesson hierarchy */}
        <div className="w-72 border-r border-border bg-card overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {language === 'ru' ? 'Содержание' : 'Contents'}
            </h2>
            
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {language === 'ru' ? 'Уроки не добавлены' : 'No lessons'}
              </p>
            ) : (
              <div className="space-y-1">
                {lessons.map(lesson => renderLesson(lesson))}
              </div>
            )}
            
            {isAuthor && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => handleCreateLesson(null)}
                disabled={creatingLesson}
              >
                {creatingLesson ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {language === 'ru' ? 'Новый урок' : 'New Lesson'}
              </Button>
            )}
          </div>
        </div>

        {/* Right content - Lesson viewer */}
        <div className="flex-1 overflow-y-auto">
          {selectedLesson ? (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                {getTypeIcon(selectedLesson.type)}
                <h2 className="text-2xl font-bold text-foreground">{selectedLesson.title}</h2>
              </div>

              {/* Video player */}
              {selectedLesson.video_url && (
                <Card className="mb-6">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      {selectedLesson.video_url.includes('youtube') || selectedLesson.video_url.includes('youtu.be') ? (
                        <iframe
                          className="w-full h-full rounded-lg"
                          src={selectedLesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video 
                          src={selectedLesson.video_url} 
                          controls 
                          className="w-full h-full rounded-lg"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content - blocks or html */}
              {lessonBlocks.length > 0 ? (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {lessonBlocks.map(block => renderBlock(block))}
                  </CardContent>
                </Card>
              ) : selectedLesson.content_html ? (
                <Card>
                  <CardContent className="p-6">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: selectedLesson.content_html }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                    <p className="text-muted-foreground">
                      {language === 'ru' 
                        ? 'Содержимое урока пока не добавлено' 
                        : 'Lesson content not added yet'}
                    </p>
                    {isAuthor && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate(`/course/${courseId}/lesson/${selectedLesson.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {language === 'ru' ? 'Добавить содержимое' : 'Add content'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  {language === 'ru' 
                    ? 'Выберите урок из списка слева' 
                    : 'Select a lesson from the list'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ru' ? 'Удалить курс?' : 'Delete course?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ru' 
                ? 'Это действие нельзя отменить. Все уроки курса будут удалены.'
                : 'This action cannot be undone. All lessons will be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ru' ? 'Удалить' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete lesson confirmation dialog */}
      <AlertDialog open={showDeleteLessonDialog} onOpenChange={setShowDeleteLessonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ru' ? 'Удалить урок?' : 'Delete lesson?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ru' 
                ? 'Это действие нельзя отменить. Все вложенные уроки также будут удалены.'
                : 'This action cannot be undone. All nested lessons will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLesson}
              disabled={deletingLesson}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingLesson && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ru' ? 'Удалить' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings dialog */}
      {course && (
        <CourseSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          course={course}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  );
}