import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Plus, Loader2, Lock, ShoppingCart } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { paymentsApi } from '@/lib/paymentsApi';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CoursePricing {
  price: number;
  period: string;
  payment_url?: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  lesson_count: number;
  access_type: string | null;
  pricing?: CoursePricing | null;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: number | null;
  is_free: boolean;
  features: unknown;
  selected_course_ids: string[] | null;
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
  const [userTier, setUserTier] = useState<SubscriptionTier | null>(null);
  const [allTiers, setAllTiers] = useState<SubscriptionTier[]>([]);
  const [cheapestTier, setCheapestTier] = useState<SubscriptionTier | null>(null);
  const [purchasingCourseId, setPurchasingCourseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch courses for this community
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, cover_image_url, status, author_id, access_type')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (coursesData) {
        // Fetch lesson counts and pricing for each course
        const coursesWithData = await Promise.all(
          coursesData.map(async (course) => {
            const [lessonsResult, pricingResult] = await Promise.all([
              supabase
                .from('lessons')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', course.id),
              supabase
                .from('course_access_rules')
                .select('value')
                .eq('course_id', course.id)
                .eq('rule_type', 'subscription_pricing')
                .maybeSingle()
            ]);

            const pricing = pricingResult.data?.value as unknown as CoursePricing | null;

            return {
              ...course,
              lesson_count: lessonsResult.count || 0,
              pricing
            };
          })
        );

        setCourses(coursesWithData);
      }

      // Fetch ALL active tiers for this community
      const { data: allTiersData } = await supabase
        .from('subscription_tiers')
        .select('id, name, price_monthly, is_free, features, selected_course_ids')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (allTiersData) {
        setAllTiers(allTiersData);
        // Find cheapest paid tier
        const paidTiers = allTiersData.filter(t => !t.is_free && t.price_monthly && t.price_monthly > 0);
        if (paidTiers.length > 0) {
          setCheapestTier(paidTiers.sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0))[0]);
        }
      }

      // Fetch user's membership status and tier details
      if (userId) {
        try {
          const { data: membershipsData } = await supabase
            .from('memberships')
            .select('*, subscription_tiers(*)')
            .eq('community_id', communityId)
            .eq('user_id', userId)
            .eq('status', 'active');
          
          // Find the best tier (paid > free, or highest tier)
          const activeMembership = membershipsData?.find(
            m => m.subscription_tiers && !m.subscription_tiers.is_free
          ) || membershipsData?.[0];
          
          if (activeMembership?.subscription_tiers) {
            setUserTier(activeMembership.subscription_tiers);
          }
        } catch (error) {
          console.error('Error fetching memberships:', error);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [communityId, userId]);

  // Check if user has access to a specific course based on their subscription tier
  const hasAccessToCourse = (courseId: string): boolean => {
    if (isOwner) return true;
    if (!userTier) return false;
    
    const features = Array.isArray(userTier.features) ? userTier.features : [];
    
    // If tier has access to all courses
    if (features.includes('courses_all')) return true;
    
    // If tier has access to selected courses, check if this course is in the list
    if (features.includes('courses_selected')) {
      const selectedCourses = userTier.selected_course_ids || [];
      return selectedCourses.includes(courseId);
    }
    
    return false;
  };

  const handlePurchase = async (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.error(language === 'ru' ? 'Войдите для покупки' : 'Please login to purchase');
      return;
    }

    // If course has a custom payment URL, open it in new tab
    if (course.pricing?.payment_url) {
      window.open(course.pricing.payment_url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Otherwise use YooKassa
    if (!cheapestTier) {
      toast.error(language === 'ru' ? 'Подписка недоступна' : 'Subscription not available');
      return;
    }

    try {
      setPurchasingCourseId(course.id);
      
      const result = await paymentsApi.createSubscription({
        communityId,
        subscriptionTierId: cheapestTier.id,
        returnUrl: `${window.location.origin}/payment/callback?transactionId={transactionId}`
      });

      window.location.href = result.confirmationUrl;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error instanceof Error ? error.message : (language === 'ru' ? 'Ошибка оплаты' : 'Payment error'));
      setPurchasingCourseId(null);
    }
  };

  const handleCreateCourse = async () => {
    if (!userId || !formData.title.trim()) return;
    
    setCreating(true);
    const slug = formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-а-яё]/gi, '') + '-' + Date.now();
    
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: formData.title,
        description: formData.description || null,
        slug,
        community_id: communityId,
        author_id: userId,
        status: 'draft',
        access_type: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      toast.error(language === 'ru' ? 'Ошибка создания курса' : 'Error creating course');
    } else {
      toast.success(language === 'ru' ? 'Курс создан' : 'Course created');
      setDialogOpen(false);
      setFormData({ title: '', description: '' });
      // Navigate to the course editor
      navigate(`/course/${data.id}/lessons`);
    }
    setCreating(false);
  };

  const isPaidCourse = (course: Course) => course.access_type === 'paid_subscription';
  const isCourseLocked = (course: Course) => {
    if (!isPaidCourse(course)) return false;
    if (isOwner) return false;
    return !hasAccessToCourse(course.id);
  };
  // Show pay button for all paid courses, regardless of user role
  const showPayButton = (course: Course) => isPaidCourse(course);

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
          onClick={() => {
            setFormData({ title: '', description: '' });
            setDialogOpen(true);
          }}
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
          {courses.map((course) => {
            const locked = isCourseLocked(course);
            const isPurchasing = purchasingCourseId === course.id;
            
            return (
              <Card 
                key={course.id}
                className={`overflow-hidden transition-all duration-300 border-border ${
                  locked 
                    ? 'opacity-70 grayscale cursor-default' 
                    : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'
                }`}
                onClick={() => !locked && navigate(`/course/${course.id}/preview`)}
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
                  
                  {/* Lock overlay for paid courses */}
                  {locked && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-muted-foreground" />
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      <span>
                        {course.lesson_count} {language === 'ru' ? 'уроков' : 'lessons'}
                      </span>
                    </div>
                    
                    {/* Buy button for paid courses */}
                    {showPayButton(course) && (course.pricing || cheapestTier) && (
                      <Button
                        size="sm"
                        onClick={(e) => handlePurchase(course, e)}
                        disabled={isPurchasing}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isPurchasing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            {language === 'ru' ? 'Оплатить' : 'Pay'} {course.pricing?.price ?? cheapestTier?.price_monthly ?? 0} ₽
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Создать курс' : 'Create Course'}
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
              <Label>{language === 'ru' ? 'Описание' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ru' ? 'Описание курса' : 'Course description'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateCourse} disabled={!formData.title.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'ru' ? 'Создать' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
