import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Users, MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  access_type: string;
  community_id: string;
  created_at: string;
  community?: { name: string };
  lessons_count?: number;
}

interface Community {
  id: string;
  name: string;
}

export default function MyCourses() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    description: string;
    community_id: string;
    status: 'draft' | 'published' | 'archived';
    access_type: 'open' | 'delayed' | 'paid_subscription' | 'gifted' | 'promo_code' | 'by_rating_level' | 'delayed_by_rating';
  }>({
    title: '',
    slug: '',
    description: '',
    community_id: '',
    status: 'draft',
    access_type: 'open'
  });

  const statusLabels = {
    draft: { ru: 'Черновик', en: 'Draft' },
    published: { ru: 'Опубликован', en: 'Published' },
    archived: { ru: 'В архиве', en: 'Archived' }
  };

  const statusColors = {
    draft: 'bg-yellow-500/20 text-yellow-700',
    published: 'bg-green-500/20 text-green-700',
    archived: 'bg-gray-500/20 text-gray-700'
  };

  useEffect(() => {
    fetchCourses();
    fetchCommunities();
  }, []);

  const fetchCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        community:communities(name)
      `)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      toast.error(language === 'ru' ? 'Ошибка загрузки курсов' : 'Error loading courses');
    } else {
      // Fetch lessons count for each course
      const coursesWithCount = await Promise.all((data || []).map(async (course) => {
        const { count } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);
        return { ...course, lessons_count: count || 0 };
      }));
      setCourses(coursesWithCount);
    }
    setLoading(false);
  };

  const fetchCommunities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get communities where user is owner or has author role
    const { data, error } = await supabase
      .from('communities')
      .select('id, name')
      .eq('creator_id', user.id);

    if (!error && data) {
      setCommunities(data);
    }
  };

  const handleCreate = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      community_id: communities[0]?.id || '',
      status: 'draft',
      access_type: 'open'
    });
    setDialogOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      slug: course.slug,
      description: course.description || '',
      community_id: course.community_id,
      status: course.status as 'draft' | 'published' | 'archived',
      access_type: course.access_type as 'open' | 'delayed' | 'paid_subscription' | 'by_rating_level'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm(language === 'ru' ? 'Удалить курс?' : 'Delete course?')) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Delete error');
    } else {
      toast.success(language === 'ru' ? 'Курс удален' : 'Course deleted');
      fetchCourses();
    }
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (editingCourse) {
      const { error } = await supabase
        .from('courses')
        .update({
          title: formData.title,
          slug,
          description: formData.description,
          community_id: formData.community_id,
          status: formData.status,
          access_type: formData.access_type
        })
        .eq('id', editingCourse.id);

      if (error) {
        toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Save error');
      } else {
        toast.success(language === 'ru' ? 'Курс обновлен' : 'Course updated');
        setDialogOpen(false);
        fetchCourses();
      }
    } else {
      const { error } = await supabase
        .from('courses')
        .insert({
          title: formData.title,
          slug,
          description: formData.description,
          community_id: formData.community_id,
          author_id: user.id,
          status: formData.status,
          access_type: formData.access_type
        });

      if (error) {
        toast.error(language === 'ru' ? 'Ошибка создания' : 'Create error');
        console.error(error);
      } else {
        toast.success(language === 'ru' ? 'Курс создан' : 'Course created');
        setDialogOpen(false);
        fetchCourses();
      }
    }
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'ru' ? 'Мои курсы' : 'My Courses'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'ru' ? 'Управляйте своими курсами и уроками' : 'Manage your courses and lessons'}
          </p>
        </div>
        <Button onClick={handleCreate} disabled={communities.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          {language === 'ru' ? 'Создать курс' : 'Create Course'}
        </Button>
      </div>

      {communities.length === 0 && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <p className="text-yellow-700">
              {language === 'ru' 
                ? 'Сначала создайте сообщество, чтобы добавлять курсы' 
                : 'Create a community first to add courses'}
            </p>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {language === 'ru' ? 'У вас пока нет курсов' : 'You have no courses yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div 
                className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative"
                style={course.cover_image_url ? { 
                  backgroundImage: `url(${course.cover_image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              >
                <Badge className={`absolute top-3 left-3 ${statusColors[course.status]}`}>
                  {statusLabels[course.status][language]}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-background/80">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/course/${course.id}/lessons`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {language === 'ru' ? 'Уроки' : 'Lessons'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(course)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(course.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardHeader className="pb-2">
                <CardTitle 
                  className="text-lg cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/course/${course.id}/lessons`)}
                >
                  {course.title}
                </CardTitle>
                {course.community && (
                  <CardDescription className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.community.name}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {course.description || (language === 'ru' ? 'Без описания' : 'No description')}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {course.lessons_count} {language === 'ru' ? 'уроков' : 'lessons'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCourse 
                ? (language === 'ru' ? 'Редактировать курс' : 'Edit Course')
                : (language === 'ru' ? 'Создать курс' : 'Create Course')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{language === 'ru' ? 'Название' : 'Title'}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'ru' ? 'Название курса' : 'Course title'}
              />
            </div>

            <div>
              <Label>{language === 'ru' ? 'Сообщество' : 'Community'}</Label>
              <Select 
                value={formData.community_id} 
                onValueChange={(v) => setFormData({ ...formData, community_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ru' ? 'Описание' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ru' ? 'Описание курса' : 'Course description'}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ru' ? 'Статус' : 'Status'}</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{statusLabels.draft[language]}</SelectItem>
                    <SelectItem value="published">{statusLabels.published[language]}</SelectItem>
                    <SelectItem value="archived">{statusLabels.archived[language]}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{language === 'ru' ? 'Доступ' : 'Access'}</Label>
                <Select 
                  value={formData.access_type} 
                  onValueChange={(v: any) => setFormData({ ...formData, access_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{language === 'ru' ? 'Открытый' : 'Open'}</SelectItem>
                    <SelectItem value="delayed">{language === 'ru' ? 'Отложенный' : 'Delayed'}</SelectItem>
                    <SelectItem value="paid_subscription">{language === 'ru' ? 'По подписке' : 'Subscription'}</SelectItem>
                    <SelectItem value="by_rating_level">{language === 'ru' ? 'По рейтингу' : 'By rating'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title || !formData.community_id}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
