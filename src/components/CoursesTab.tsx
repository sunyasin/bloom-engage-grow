import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Plus, Loader2, Lock, ShoppingCart, Key, MessageCircle } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { paymentsApi } from '@/lib/paymentsApi';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  lesson_count: number;
  access_type: string | null;
  access_types: string[] | null;
  delay_days: number | null;
  required_rating: number | null;
  promo_code: string | null;
  gifted_emails: string | null;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: number | null;
  is_free: boolean;
  features: unknown;
  selected_course_ids: string[] | null;
  payment_url: string | null;
}

interface Membership {
  id: string;
  user_id: string;
  community_id: string;
  started_at: string;
  status: string;
  subscription_tier_id: string | null;
  subscription_tiers: SubscriptionTier | null;
}

interface UserProfile {
  id: string;
  email: string;
  rating: number | null;
  telegram_id: string | null;
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
  const [userMembership, setUserMembership] = useState<Membership | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allTiers, setAllTiers] = useState<SubscriptionTier[]>([]);
  const [cheapestTier, setCheapestTier] = useState<SubscriptionTier | null>(null);
  const [purchasingCourseId, setPurchasingCourseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  
  // Promo code dialog state
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoCourseId, setPromoCourseId] = useState<string | null>(null);
  const [unlockedCourseIds, setUnlockedCourseIds] = useState<Set<string>>(new Set());
  
  // Telegram linking dialog state
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch courses for this community with extended fields
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, cover_image_url, status, author_id, access_type, access_types, delay_days, required_rating, promo_code, gifted_emails')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (coursesData) {
        // Fetch lesson counts for each course
        const coursesWithData = await Promise.all(
          coursesData.map(async (course) => {
            const lessonsResult = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            return {
              ...course,
              lesson_count: lessonsResult.count || 0,
            };
          })
        );

        setCourses(coursesWithData);
      }

      // Fetch ALL active tiers for this community
      const { data: allTiersData } = await supabase
        .from('subscription_tiers')
        .select('id, name, price_monthly, is_free, features, selected_course_ids, payment_url')
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

      // Fetch user's profile and membership status
      if (userId) {
        try {
          // Fetch user profile for email, rating and telegram_id
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, email, rating, telegram_id')
            .eq('id', userId)
            .single();
          
          if (profileData) {
            setUserProfile(profileData);
          }

          // Fetch memberships
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
          
          if (activeMembership) {
            setUserMembership(activeMembership as Membership);
            if (activeMembership.subscription_tiers) {
              setUserTier(activeMembership.subscription_tiers);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [communityId, userId]);

  // Get access types array (use access_types or fallback to access_type)
  const getAccessTypes = (course: Course): string[] => {
    if (course.access_types && course.access_types.length > 0) {
      return course.access_types;
    }
    return course.access_type ? [course.access_type] : ['open'];
  };

  // Check if user has access to a specific course based on multi-select access types
  const hasAccessToCourse = (course: Course): boolean => {
    if (isOwner) return true;
    
    // Check if course was unlocked via promo code
    if (unlockedCourseIds.has(course.id)) return true;
    
    const accessTypes = getAccessTypes(course);
    
    // Course is accessible if ANY condition is met
    for (const accessType of accessTypes) {
      if (checkAccessCondition(course, accessType)) {
        return true;
      }
    }
    
    return false;
  };

  // Check individual access condition
  const checkAccessCondition = (course: Course, accessType: string): boolean => {
    switch (accessType) {
      case 'open':
        return true;
      
      case 'paid_subscription':
        return hasSubscriptionAccess(course.id);
      
      case 'by_rating_level':
        if (!userProfile || course.required_rating == null) return false;
        return (userProfile.rating ?? 0) >= course.required_rating;
      
      case 'delayed':
        return hasDelayedAccess(course);
      
      case 'promo_code':
        // Promo code access is granted through the dialog
        return unlockedCourseIds.has(course.id);
      
      case 'gifted':
        return hasGiftedAccess(course);
      
      default:
        return false;
    }
  };

  // Check subscription-based access
  const hasSubscriptionAccess = (courseId: string): boolean => {
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

  // Check delayed access (days since subscription)
  const hasDelayedAccess = (course: Course): boolean => {
    if (!userMembership || course.delay_days == null) return false;
    
    const startedAt = new Date(userMembership.started_at);
    const now = new Date();
    const daysSinceSubscription = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceSubscription >= course.delay_days;
  };

  // Check gifted access (email in list)
  const hasGiftedAccess = (course: Course): boolean => {
    if (!userProfile || !course.gifted_emails) return false;
    
    const giftedList = course.gifted_emails
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);
    
    return giftedList.includes(userProfile.email.toLowerCase());
  };

  // Check if course requires promo code and user hasn't unlocked it yet
  const needsPromoCode = (course: Course): boolean => {
    const accessTypes = getAccessTypes(course);
    if (!accessTypes.includes('promo_code')) return false;
    if (unlockedCourseIds.has(course.id)) return false;
    
    // Check if any other access type grants access
    for (const accessType of accessTypes) {
      if (accessType !== 'promo_code' && checkAccessCondition(course, accessType)) {
        return false;
      }
    }
    
    return true;
  };

  // Get tier names that give access to a specific course
  const getTierNamesForCourse = (courseId: string): string[] => {
    return allTiers
      .filter(tier => {
        const features = Array.isArray(tier.features) ? tier.features : [];
        if (features.includes('courses_all')) return true;
        if (features.includes('courses_selected')) {
          return (tier.selected_course_ids || []).includes(courseId);
        }
        return false;
      })
      .map(tier => tier.name);
  };

  // Get the first tier with payment_url that gives access to a course
  const getTierWithPaymentUrlForCourse = (courseId: string): SubscriptionTier | null => {
    return allTiers.find(tier => {
      if (tier.is_free || !tier.price_monthly || tier.price_monthly <= 0) return false;
      const features = Array.isArray(tier.features) ? tier.features : [];
      if (features.includes('courses_all')) return true;
      if (features.includes('courses_selected')) {
        return (tier.selected_course_ids || []).includes(courseId);
      }
      return false;
    }) || null;
  };

  // Get access info text for a course
  const getAccessInfoText = (course: Course): string | null => {
    const accessTypes = getAccessTypes(course);
    const infoParts: string[] = [];
    
    if (accessTypes.includes('by_rating_level') && course.required_rating != null) {
      infoParts.push(
        language === 'ru' 
          ? `Рейтинг ≥ ${course.required_rating}` 
          : `Rating ≥ ${course.required_rating}`
      );
    }
    
    if (accessTypes.includes('delayed') && course.delay_days != null) {
      infoParts.push(
        language === 'ru' 
          ? `Через ${course.delay_days} дн.` 
          : `After ${course.delay_days} days`
      );
    }
    
    if (accessTypes.includes('promo_code')) {
      infoParts.push(language === 'ru' ? 'По промокоду' : 'Promo code');
    }
    
    if (accessTypes.includes('gifted')) {
      infoParts.push(language === 'ru' ? 'Подарочный' : 'Gifted');
    }
    
    if (accessTypes.includes('paid_subscription')) {
      const tierNames = getTierNamesForCourse(course.id);
      if (tierNames.length > 0) {
        infoParts.push(tierNames.join(', '));
      }
    }
    
    return infoParts.length > 0 ? infoParts.join(' • ') : null;
  };

  const handlePromoCodeSubmit = () => {
    if (!promoCourseId || !promoInput.trim()) return;
    
    const course = courses.find(c => c.id === promoCourseId);
    if (!course || !course.promo_code) {
      toast.error(language === 'ru' ? 'Неверный промокод' : 'Invalid promo code');
      return;
    }
    
    if (promoInput.trim().toLowerCase() === course.promo_code.toLowerCase()) {
      setUnlockedCourseIds(prev => new Set([...prev, promoCourseId]));
      setPromoDialogOpen(false);
      setPromoInput('');
      setPromoCourseId(null);
      toast.success(language === 'ru' ? 'Курс разблокирован!' : 'Course unlocked!');
    } else {
      toast.error(language === 'ru' ? 'Неверный промокод' : 'Invalid promo code');
    }
  };

  const handlePurchase = async (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast.error(language === 'ru' ? 'Войдите для покупки' : 'Please login to purchase');
      return;
    }

    // Check if user has telegram_id linked
    if (!userProfile?.telegram_id) {
      setTelegramDialogOpen(true);
      return;
    }

    // Find the tier that gives access to this course
    const tier = getTierWithPaymentUrlForCourse(course.id);
    
    // If tier has a custom payment URL, open it
    if (tier?.payment_url) {
      window.open(tier.payment_url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Otherwise use YooKassa with the tier
    const targetTier = tier || cheapestTier;
    if (!targetTier) {
      toast.error(language === 'ru' ? 'Подписка недоступна' : 'Subscription not available');
      return;
    }

    try {
      setPurchasingCourseId(course.id);
      
      const result = await paymentsApi.createSubscription({
        communityId,
        subscriptionTierId: targetTier.id,
        returnUrl: `${window.location.origin}/payment/callback?transactionId={transactionId}`
      });

      window.location.href = result.confirmationUrl;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error instanceof Error ? error.message : (language === 'ru' ? 'Ошибка оплаты' : 'Payment error'));
      setPurchasingCourseId(null);
    }
  };

  const handleGoToTelegramBot = () => {
    window.open('https://t.me/univer_skool_bot', '_blank', 'noopener,noreferrer');
    setTelegramDialogOpen(false);
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
        access_type: 'open',
        access_types: ['open']
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
      navigate(`/course/${data.id}/lessons`);
    }
    setCreating(false);
  };

  const isCourseLocked = (course: Course) => {
    return !hasAccessToCourse(course);
  };

  // Show pay button only for locked courses with paid_subscription access
  const showPayButton = (course: Course) => {
    if (isOwner) return false;
    if (!isCourseLocked(course)) return false;
    const accessTypes = getAccessTypes(course);
    return accessTypes.includes('paid_subscription');
  };

  // Show promo button for courses that need promo code
  const showPromoButton = (course: Course) => {
    if (isOwner) return false;
    return needsPromoCode(course);
  };

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
            const accessInfo = getAccessInfoText(course);
            const accessTypes = getAccessTypes(course);
            const isOpenCourse = accessTypes.length === 1 && accessTypes[0] === 'open';
            
            return (
              <Card 
                key={course.id}
                className={`overflow-hidden transition-all duration-300 border-border ${
                  locked 
                    ? 'opacity-70 grayscale cursor-default' 
                    : 'cursor-pointer hover:shadow-lg hover:-translate-y-1'
                }`}
                onClick={() => {
                  if (!userId) {
                    toast.error(language === 'ru' 
                      ? 'Зарегистрируйтесь и войдите, чтобы просмотреть содержимое' 
                      : 'Please register and login to view the content');
                    return;
                  }
                  if (!locked) {
                    navigate(`/course/${course.id}/preview`);
                  }
                }}
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
                  
                  {/* Lock overlay for locked courses */}
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
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <BookOpen className="h-3 w-3" />
                    <span>
                      {course.lesson_count} {language === 'ru' ? 'уроков' : 'lessons'}
                    </span>
                  </div>
                  
                  {/* Access info for non-open courses */}
                  {!isOpenCourse && accessInfo && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'ru' ? 'Доступ: ' : 'Access: '}
                      {accessInfo}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {/* Promo code button */}
                    {showPromoButton(course) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromoCourseId(course.id);
                          setPromoInput('');
                          setPromoDialogOpen(true);
                        }}
                      >
                        <Key className="h-3 w-3 mr-1" />
                        {language === 'ru' ? 'Промокод' : 'Promo'}
                      </Button>
                    )}
                    
                    {/* Buy button for locked paid courses */}
                    {showPayButton(course) && (
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
                            {language === 'ru' ? 'Оплатить' : 'Pay'}
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

      {/* Telegram Linking Dialog */}
      <Dialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Привязка Telegram' : 'Link Telegram'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ru' 
                ? 'Для оплаты нужно привязать Telegram. Нажмите на кнопку для перехода в бот. В боте нажмите Start и отправьте ему текст:'
                : 'To make a payment, you need to link your Telegram account. Click the button to go to the bot. In the bot, press Start and send the text:'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted p-3 rounded-md font-mono text-sm break-all select-all">
            {userId}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTelegramDialogOpen(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleGoToTelegramBot}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {language === 'ru' ? 'Перейти в бот' : 'Go to bot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
