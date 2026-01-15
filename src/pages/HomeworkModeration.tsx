import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, ChevronRight, ChevronDown, BookOpen, 
  FileText, Check, X, Clock, User, Calendar,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface Course {
  id: string;
  title: string;
  pendingCount: number;
}

interface Lesson {
  id: string;
  title: string;
  course_id: string;
  pendingCount: number;
}

interface HomeworkSubmission {
  id: string;
  user_id: string;
  lesson_id: string;
  content: string;
  status: 'ready' | 'ok' | 'reject';
  moderator_message: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export default function HomeworkModeration() {
  const navigate = useNavigate();
  const { language } = useI18n();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Map<string, Lesson[]>>(new Map());
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [moderatorMessage, setModeratorMessage] = useState('');

  useEffect(() => {
    fetchCoursesWithHomework();
  }, []);

  const fetchCoursesWithHomework = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }

    // Get courses where user is author
    const { data: authorCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('author_id', user.id);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      setLoading(false);
      return;
    }

    if (!authorCourses || authorCourses.length === 0) {
      setLoading(false);
      return;
    }

    const courseIds = authorCourses.map(c => c.id);

    // Get lessons with homework for these courses
    const { data: hwLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, title, course_id')
      .in('course_id', courseIds)
      .eq('has_homework', true);

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      setLoading(false);
      return;
    }

    if (!hwLessons || hwLessons.length === 0) {
      setLoading(false);
      return;
    }

    const lessonIds = hwLessons.map(l => l.id);

    // Get all homework submissions for these lessons
    const { data: subs, error: subsError } = await supabase
      .from('homework_submissions')
      .select('*')
      .in('lesson_id', lessonIds)
      .order('created_at', { ascending: false });

    if (subsError) {
      console.error('Error fetching submissions:', subsError);
      setLoading(false);
      return;
    }

    // Fetch user profiles for submissions
    const userIds = [...new Set(subs?.map(s => s.user_id) || [])];
    let profilesMap: Record<string, { real_name?: string; email?: string }> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .rpc('get_public_profiles', { profile_ids: userIds });
      
      profiles?.forEach((p: any) => {
        profilesMap[p.id] = { real_name: p.real_name };
      });
    }

    const enrichedSubs: HomeworkSubmission[] = (subs || []).map(s => ({
      ...s,
      user_name: profilesMap[s.user_id]?.real_name || 'Участник',
      user_email: profilesMap[s.user_id]?.email
    }));

    setAllSubmissions(enrichedSubs);

    // Calculate pending counts
    const lessonPendingCounts: Record<string, number> = {};
    enrichedSubs.forEach(s => {
      if (s.status === 'ready') {
        lessonPendingCounts[s.lesson_id] = (lessonPendingCounts[s.lesson_id] || 0) + 1;
      }
    });

    // Group lessons by course
    const lessonsMap = new Map<string, Lesson[]>();
    hwLessons.forEach(lesson => {
      const courseId = lesson.course_id;
      if (!lessonsMap.has(courseId)) {
        lessonsMap.set(courseId, []);
      }
      lessonsMap.get(courseId)!.push({
        ...lesson,
        pendingCount: lessonPendingCounts[lesson.id] || 0
      });
    });
    setLessons(lessonsMap);

    // Calculate course pending counts
    const coursePendingCounts: Record<string, number> = {};
    lessonsMap.forEach((lessonList, courseId) => {
      coursePendingCounts[courseId] = lessonList.reduce((sum, l) => sum + l.pendingCount, 0);
    });

    const coursesWithCounts = authorCourses
      .filter(c => lessonsMap.has(c.id))
      .map(c => ({
        ...c,
        pendingCount: coursePendingCounts[c.id] || 0
      }));

    setCourses(coursesWithCounts);
    setLoading(false);
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const selectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const lessonSubs = allSubmissions.filter(s => s.lesson_id === lessonId);
    setSubmissions(lessonSubs);
    setSelectedSubmission(lessonSubs.length > 0 ? lessonSubs[0] : null);
    setModeratorMessage('');
  };

  const selectSubmission = (sub: HomeworkSubmission) => {
    setSelectedSubmission(sub);
    setModeratorMessage(sub.moderator_message || '');
  };

  const handleModerate = async (status: 'ok' | 'reject') => {
    if (!selectedSubmission) return;

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'reject') {
      if (!moderatorMessage.trim()) {
        toast.error(language === 'ru' ? 'Укажите причину отклонения' : 'Please provide a rejection reason');
        return;
      }
      updateData.moderator_message = moderatorMessage;
    } else {
      updateData.moderator_message = null;
    }

    const { error } = await supabase
      .from('homework_submissions')
      .update(updateData)
      .eq('id', selectedSubmission.id);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка обновления' : 'Update error');
      console.error(error);
    } else {
      toast.success(
        status === 'ok' 
          ? (language === 'ru' ? 'Домашнее задание принято' : 'Homework approved')
          : (language === 'ru' ? 'Домашнее задание отклонено' : 'Homework rejected')
      );
      fetchCoursesWithHomework();
      
      // Update local state
      setSubmissions(prev => prev.map(s => 
        s.id === selectedSubmission.id ? { ...s, status, moderator_message: updateData.moderator_message } : s
      ));
      setSelectedSubmission(prev => prev ? { ...prev, status, moderator_message: updateData.moderator_message } : null);
    }
  };

  const getStatusBadge = (status: 'ready' | 'ok' | 'reject') => {
    switch (status) {
      case 'ready':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />{language === 'ru' ? 'На проверке' : 'Pending'}</Badge>;
      case 'ok':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="w-3 h-3 mr-1" />{language === 'ru' ? 'Принято' : 'Approved'}</Badge>;
      case 'reject':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><X className="w-3 h-3 mr-1" />{language === 'ru' ? 'Отклонено' : 'Rejected'}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: language === 'ru' ? ru : enUS });
  };

  // Get previous submissions for the same user and lesson
  const getPreviousSubmissions = () => {
    if (!selectedSubmission) return [];
    return allSubmissions.filter(s => 
      s.user_id === selectedSubmission.user_id && 
      s.lesson_id === selectedSubmission.lesson_id &&
      s.id !== selectedSubmission.id
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          {language === 'ru' ? 'Загрузка...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'ru' ? 'Модерация домашних заданий' : 'Homework Moderation'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ru' ? 'Проверка и оценка ответов участников' : 'Review and grade student submissions'}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === 'ru' 
                ? 'Нет курсов с домашними заданиями' 
                : 'No courses with homework assignments'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Courses and Lessons */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {language === 'ru' ? 'Курсы' : 'Courses'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="px-4 pb-4 space-y-2">
                  {courses.map(course => (
                    <div key={course.id}>
                      <button
                        onClick={() => toggleCourse(course.id)}
                        className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        {expandedCourses.has(course.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="flex-1 font-medium truncate">{course.title}</span>
                        {course.pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {course.pendingCount}
                          </Badge>
                        )}
                      </button>
                      
                      {expandedCourses.has(course.id) && lessons.get(course.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          {lessons.get(course.id)!.map(lesson => (
                            <button
                              key={lesson.id}
                              onClick={() => selectLesson(lesson.id)}
                              className={`w-full flex items-center gap-2 p-2 rounded-md text-sm text-left transition-colors ${
                                selectedLessonId === lesson.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-accent'
                              }`}
                            >
                              <FileText className="w-3 h-3" />
                              <span className="flex-1 truncate">{lesson.title}</span>
                              {lesson.pendingCount > 0 && (
                                <Badge 
                                  variant={selectedLessonId === lesson.id ? "outline" : "destructive"} 
                                  className="text-xs"
                                >
                                  {lesson.pendingCount}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right content - Submissions */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {!selectedLessonId ? (
                <div className="flex items-center justify-center h-[calc(100vh-300px)] text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ru' ? 'Выберите урок слева' : 'Select a lesson from the left'}</p>
                  </div>
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex items-center justify-center h-[calc(100vh-300px)] text-muted-foreground">
                  <div className="text-center">
                    <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ru' ? 'Нет домашних заданий для проверки' : 'No homework to review'}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 h-[calc(100vh-300px)]">
                  {/* Submissions list */}
                  <div className="border-r">
                    <div className="p-3 border-b bg-muted/30">
                      <h3 className="font-medium">
                        {language === 'ru' ? 'Ответы' : 'Submissions'} ({submissions.length})
                      </h3>
                    </div>
                    <ScrollArea className="h-[calc(100vh-360px)]">
                      <div className="p-2 space-y-2">
                        {submissions.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => selectSubmission(sub)}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                              selectedSubmission?.id === sub.id 
                                ? 'bg-primary/10 border border-primary' 
                                : 'hover:bg-accent border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium text-sm">{sub.user_name}</span>
                              {getStatusBadge(sub.status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(sub.created_at)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Selected submission detail */}
                  <div className="flex flex-col">
                    {selectedSubmission ? (
                      <>
                        <div className="p-3 border-b bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{selectedSubmission.user_name}</span>
                            </div>
                            {getStatusBadge(selectedSubmission.status)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(selectedSubmission.created_at)}
                          </div>
                        </div>
                        
                        <ScrollArea className="flex-1 p-4">
                          <div className="space-y-4">
                            {/* Previous submissions */}
                            {getPreviousSubmissions().length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {language === 'ru' ? 'Предыдущие ответы' : 'Previous submissions'}
                                </h4>
                                <div className="space-y-2">
                                  {getPreviousSubmissions().map(prev => (
                                    <div key={prev.id} className="p-3 bg-muted/30 rounded-lg text-sm">
                                      <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                                        {formatDate(prev.created_at)}
                                        {getStatusBadge(prev.status)}
                                      </div>
                                      <p className="whitespace-pre-wrap">{prev.content}</p>
                                      {prev.moderator_message && (
                                        <div className="mt-2 p-2 bg-red-500/10 rounded text-red-600 text-xs">
                                          <strong>{language === 'ru' ? 'Комментарий:' : 'Comment:'}</strong> {prev.moderator_message}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <Separator className="my-4" />
                              </div>
                            )}

                            {/* Current submission */}
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                {language === 'ru' ? 'Текущий ответ' : 'Current submission'}
                              </h4>
                              <div className="p-4 bg-card border rounded-lg whitespace-pre-wrap">
                                {selectedSubmission.content}
                              </div>
                            </div>

                            {/* Moderation actions */}
                            {selectedSubmission.status === 'ready' && (
                              <div className="space-y-3">
                                <Separator />
                                <div>
                                  <label className="text-sm font-medium">
                                    {language === 'ru' ? 'Комментарий (для отклонения)' : 'Comment (for rejection)'}
                                  </label>
                                  <Textarea
                                    value={moderatorMessage}
                                    onChange={(e) => setModeratorMessage(e.target.value)}
                                    placeholder={language === 'ru' ? 'Укажите причину отклонения...' : 'Enter rejection reason...'}
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleModerate('ok')}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    {language === 'ru' ? 'Принять' : 'Approve'}
                                  </Button>
                                  <Button 
                                    onClick={() => handleModerate('reject')}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    {language === 'ru' ? 'Отклонить' : 'Reject'}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {selectedSubmission.status !== 'ready' && selectedSubmission.moderator_message && (
                              <div className="p-3 bg-muted rounded-lg">
                                <strong className="text-sm">{language === 'ru' ? 'Ваш комментарий:' : 'Your comment:'}</strong>
                                <p className="text-sm mt-1">{selectedSubmission.moderator_message}</p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>{language === 'ru' ? 'Выберите ответ' : 'Select a submission'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
