import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Edit, BookOpen, FileText, ClipboardCheck, Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author_id: string;
  status: string;
  community_id: string;
}

interface Lesson {
  id: string;
  title: string;
  type: string;
  order_index: number;
  parent_lesson_id: string | null;
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
  const [loading, setLoading] = useState(true);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;

      // Fetch course
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseData) {
        setCourse(courseData);
      }

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        // Build tree structure
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { ru: string; en: string }> = {
      lesson: { ru: 'Урок', en: 'Lesson' },
      test: { ru: 'Тест', en: 'Test' },
      assignment: { ru: 'Задание', en: 'Assignment' }
    };
    return labels[type]?.[language] || type;
  };

  const renderLesson = (lesson: Lesson, depth: number = 0) => {
    const hasChildren = lesson.children && lesson.children.length > 0;
    const isExpanded = expandedLessons.has(lesson.id);

    return (
      <div key={lesson.id}>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(lesson.id)}
        >
          {hasChildren ? (
            <button className="p-1 hover:bg-muted rounded">
              {isExpanded ? (
                <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          {getTypeIcon(lesson.type)}
          
          <div className="flex-1">
            <span className="font-medium text-foreground">{lesson.title}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({getTypeLabel(lesson.type)})
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-2 border-l border-border">
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
      {/* Cover */}
      <div className="h-48 md:h-64 bg-muted relative">
        {course.cover_image_url ? (
          <img 
            src={course.cover_image_url} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-primary/40" />
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {language === 'ru' ? 'Назад' : 'Back'}
        </Button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{course.title}</h1>
                {course.description && (
                  <p className="text-muted-foreground">{course.description}</p>
                )}
              </div>
              
              {isAuthor && (
                <Button 
                  onClick={() => navigate(`/community/${course.community_id}/lessons`)}
                  className="bg-gradient-primary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Редактировать' : 'Edit'}
                </Button>
              )}
            </div>

            {/* Lessons list */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">
                  {language === 'ru' ? 'Содержание курса' : 'Course Content'}
                </h2>
                
                {lessons.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {language === 'ru' ? 'Уроки пока не добавлены' : 'No lessons yet'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {lessons.map(lesson => renderLesson(lesson))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">
                  {language === 'ru' ? 'Статус' : 'Status'}
                </div>
                <div className={`inline-flex px-2 py-1 rounded text-sm font-medium ${
                  course.status === 'published' 
                    ? 'bg-green-500/10 text-green-500' 
                    : course.status === 'draft'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {course.status === 'published' 
                    ? (language === 'ru' ? 'Опубликован' : 'Published')
                    : course.status === 'draft'
                    ? (language === 'ru' ? 'Черновик' : 'Draft')
                    : (language === 'ru' ? 'В архиве' : 'Archived')}
                </div>

                <div className="mt-6 text-sm text-muted-foreground mb-2">
                  {language === 'ru' ? 'Уроков' : 'Lessons'}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {lessons.length}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
