import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Plus, Loader2 } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  lesson_count: number;
}

interface CoursesTabProps {
  communityId: string;
  isOwner: boolean;
  userId?: string;
  language: string;
  navigate: NavigateFunction;
}

export function CoursesTab({ communityId, isOwner, userId, language, navigate }: CoursesTabProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      // Fetch courses for this community
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, cover_image_url, status, author_id')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (coursesData) {
        // Fetch lesson counts
        const coursesWithCounts = await Promise.all(
          coursesData.map(async (course) => {
            const { count } = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            return {
              ...course,
              lesson_count: count || 0
            };
          })
        );

        setCourses(coursesWithCounts);
      }

      setLoading(false);
    };

    fetchCourses();
  }, [communityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <Button 
          onClick={() => navigate(`/community/${communityId}/lessons`)}
          className="bg-gradient-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ru' ? 'Создать курс' : 'Create Course'}
        </Button>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {language === 'ru' ? 'Курсы пока не добавлены' : 'No courses yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card 
              key={course.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border"
              onClick={() => navigate(`/course/${course.id}/preview`)}
            >
              <div className="h-32 bg-muted relative">
                {course.cover_image_url ? (
                  <img 
                    src={course.cover_image_url} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                
                {/* Status badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                  course.status === 'published' 
                    ? 'bg-green-500/90 text-white' 
                    : course.status === 'draft'
                    ? 'bg-yellow-500/90 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {course.status === 'published' 
                    ? (language === 'ru' ? 'Опубликован' : 'Published')
                    : course.status === 'draft'
                    ? (language === 'ru' ? 'Черновик' : 'Draft')
                    : (language === 'ru' ? 'Архив' : 'Archived')}
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3" />
                  <span>
                    {course.lesson_count} {language === 'ru' ? 'уроков' : 'lessons'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
