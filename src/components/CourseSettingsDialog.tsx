import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AccessType = Database['public']['Enums']['access_type'];
type CourseStatus = Database['public']['Enums']['course_status'];
type SubscriptionPeriod = 'lifetime' | 'monthly' | 'yearly';

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  access_type: AccessType | null;
  status: CourseStatus | null;
}

interface CourseSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onSave: (updatedCourse: Course) => void;
}

type SettingsTab = 'title' | 'description' | 'cover' | 'access' | 'status';

export default function CourseSettingsDialog({ 
  open, 
  onOpenChange, 
  course, 
  onSave 
}: CourseSettingsDialogProps) {
  const { language } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('title');
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [coverUrl, setCoverUrl] = useState(course.cover_image_url || '');
  const [accessType, setAccessType] = useState<AccessType>(course.access_type || 'open');
  const [status, setStatus] = useState<CourseStatus>(course.status || 'draft');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Subscription pricing state
  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(0);
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<SubscriptionPeriod>('monthly');
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description || '');
    setCoverUrl(course.cover_image_url || '');
    setAccessType(course.access_type || 'open');
    setStatus(course.status || 'draft');
    
    // Load subscription pricing from course_access_rules
    if (course.id) {
      loadAccessRules();
    }
  }, [course]);
  
  const loadAccessRules = async () => {
    const { data } = await supabase
      .from('course_access_rules')
      .select('*')
      .eq('course_id', course.id)
      .eq('rule_type', 'subscription_pricing')
      .single();
    
    if (data?.value) {
      const value = data.value as { price?: number; period?: SubscriptionPeriod; payment_url?: string };
      setSubscriptionPrice(value.price || 0);
      setSubscriptionPeriod(value.period || 'monthly');
      setPaymentUrl(value.payment_url || '');
    } else {
      setSubscriptionPrice(0);
      setSubscriptionPeriod('monthly');
      setPaymentUrl('');
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Выберите изображение' : 'Please select an image',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${course.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('course-covers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-covers')
        .getPublicUrl(fileName);

      setCoverUrl(publicUrl);
      toast({
        title: language === 'ru' ? 'Успешно' : 'Success',
        description: language === 'ru' ? 'Обложка загружена' : 'Cover uploaded',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Не удалось загрузить обложку' : 'Failed to upload cover',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverUrl('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Введите название курса' : 'Enter course title',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl || null,
          access_type: accessType,
          status: status,
        })
        .eq('id', course.id);

      if (error) throw error;
      
      // Save subscription pricing if paid_subscription
      if (accessType === 'paid_subscription') {
        // Upsert the access rule
        const { data: existingRule } = await supabase
          .from('course_access_rules')
          .select('id')
          .eq('course_id', course.id)
          .eq('rule_type', 'subscription_pricing')
          .single();
        
        const pricingValue = { 
          price: subscriptionPrice, 
          period: subscriptionPeriod,
          payment_url: paymentUrl.trim() || null
        };
        
        if (existingRule) {
          await supabase
            .from('course_access_rules')
            .update({ value: pricingValue })
            .eq('id', existingRule.id);
        } else {
          await supabase
            .from('course_access_rules')
            .insert({
              course_id: course.id,
              rule_type: 'subscription_pricing',
              value: pricingValue
            });
        }
      }

      onSave({
        ...course,
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: coverUrl || null,
        access_type: accessType,
        status: status,
      });

      toast({
        title: language === 'ru' ? 'Сохранено' : 'Saved',
        description: language === 'ru' ? 'Настройки курса обновлены' : 'Course settings updated',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Не удалось сохранить' : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'title', label: language === 'ru' ? 'Название' : 'Title' },
    { id: 'description', label: language === 'ru' ? 'Описание' : 'Description' },
    { id: 'cover', label: language === 'ru' ? 'Обложка' : 'Cover' },
    { id: 'access', label: language === 'ru' ? 'Видимость' : 'Visibility' },
    { id: 'status', label: language === 'ru' ? 'Статус' : 'Status' },
  ];

  const periodOptions: { value: SubscriptionPeriod; label: string }[] = [
    { value: 'lifetime', label: language === 'ru' ? 'Навсегда' : 'Lifetime' },
    { value: 'monthly', label: language === 'ru' ? 'Раз в месяц' : 'Monthly' },
    { value: 'yearly', label: language === 'ru' ? 'Раз в год' : 'Yearly' },
  ];
  
  const getPeriodLabel = (period: SubscriptionPeriod) => {
    return periodOptions.find(p => p.value === period)?.label || period;
  };
  
  const formatPriceDisplay = () => {
    if (subscriptionPrice <= 0) return '';
    const periodLabel = subscriptionPeriod === 'lifetime' 
      ? '' 
      : ` / ${subscriptionPeriod === 'monthly' ? (language === 'ru' ? 'мес' : 'mo') : (language === 'ru' ? 'год' : 'yr')}`;
    return `${subscriptionPrice} ₽${periodLabel}`;
  };

  const accessOptions: { value: AccessType; label: string }[] = [
    { value: 'open', label: language === 'ru' ? 'Открыто для всех' : 'Open to all' },
    { value: 'paid_subscription', label: language === 'ru' ? 'По подписке' : 'Paid subscription' },
    { value: 'by_rating_level', label: language === 'ru' ? 'По уровню рейтинга' : 'By rating level' },
    { value: 'delayed', label: language === 'ru' ? 'С отложенным доступом' : 'Delayed access' },
    { value: 'promo_code', label: language === 'ru' ? 'По промокоду' : 'By promo code' },
    { value: 'gifted', label: language === 'ru' ? 'Подарочный' : 'Gifted' },
  ];

  const statusOptions: { value: CourseStatus; label: string; desc: string }[] = [
    { 
      value: 'draft', 
      label: language === 'ru' ? 'Черновик' : 'Draft',
      desc: language === 'ru' ? 'Курс виден только вам' : 'Only visible to you'
    },
    { 
      value: 'published', 
      label: language === 'ru' ? 'Опубликован' : 'Published',
      desc: language === 'ru' ? 'Курс доступен участникам' : 'Available to members'
    },
    { 
      value: 'archived', 
      label: language === 'ru' ? 'В архиве' : 'Archived',
      desc: language === 'ru' ? 'Курс скрыт и недоступен' : 'Hidden and unavailable'
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {language === 'ru' ? 'Настройки курса' : 'Course Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 min-h-[400px]">
          {/* Left sidebar - tabs */}
          <div className="w-40 space-y-1 border-r border-border pr-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1">
            {activeTab === 'title' && (
              <div className="space-y-4">
                <Label htmlFor="title">
                  {language === 'ru' ? 'Название курса' : 'Course Title'}
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'ru' ? 'Введите название' : 'Enter title'}
                />
              </div>
            )}

            {activeTab === 'description' && (
              <div className="space-y-4">
                <Label htmlFor="description">
                  {language === 'ru' ? 'Описание курса' : 'Course Description'}
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={language === 'ru' ? 'Введите описание' : 'Enter description'}
                  rows={6}
                />
              </div>
            )}

            {activeTab === 'cover' && (
              <div className="space-y-4">
                <Label>
                  {language === 'ru' ? 'Обложка курса' : 'Course Cover'}
                </Label>
                
                {coverUrl ? (
                  <div className="relative">
                    <img
                      src={coverUrl}
                      alt="Cover"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveCover}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {language === 'ru' ? 'Нажмите для загрузки' : 'Click to upload'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCover}
                  className="hidden"
                />

                {coverUrl && (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {language === 'ru' ? 'Заменить обложку' : 'Replace cover'}
                  </Button>
                )}
              </div>
            )}

            {activeTab === 'access' && (
              <div className="space-y-4">
                <Label>
                  {language === 'ru' ? 'Тип доступа' : 'Access Type'}
                </Label>
                <RadioGroup value={accessType} onValueChange={(v) => setAccessType(v as AccessType)}>
                  {accessOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="font-normal cursor-pointer flex items-center gap-2">
                        {option.label}
                        {option.value === 'paid_subscription' && accessType === 'paid_subscription' && subscriptionPrice > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({formatPriceDisplay()})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                {/* Subscription pricing fields */}
                {accessType === 'paid_subscription' && (
                  <div className="mt-4 p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                    <h4 className="font-medium text-sm">
                      {language === 'ru' ? 'Настройки подписки' : 'Subscription Settings'}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price" className="text-sm">
                          {language === 'ru' ? 'Цена (₽)' : 'Price (₽)'}
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          value={subscriptionPrice}
                          onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">
                          {language === 'ru' ? 'Период' : 'Period'}
                        </Label>
                        <Select value={subscriptionPeriod} onValueChange={(v) => setSubscriptionPeriod(v as SubscriptionPeriod)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {periodOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label htmlFor="payment_url" className="text-sm">
                        {language === 'ru' ? 'Ссылка на оплату (необязательно)' : 'Payment URL (optional)'}
                      </Label>
                      <Input
                        id="payment_url"
                        type="url"
                        value={paymentUrl}
                        onChange={(e) => setPaymentUrl(e.target.value)}
                        placeholder={language === 'ru' ? 'https://... или оставьте пустым для ЮKassa' : 'https://... or leave empty for YooKassa'}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ru' 
                          ? 'Если указана — откроется в новом окне. Если пустая — оплата через ЮKassa.'
                          : 'If set — opens in new tab. If empty — uses YooKassa payment.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'status' && (
              <div className="space-y-4">
                <Label>
                  {language === 'ru' ? 'Статус курса' : 'Course Status'}
                </Label>
                <RadioGroup value={status} onValueChange={(v) => setStatus(v as CourseStatus)}>
                  {statusOptions.map(option => (
                    <div key={option.value} className="flex items-start space-x-2 py-2">
                      <RadioGroupItem value={option.value} id={`status-${option.value}`} className="mt-0.5" />
                      <div>
                        <Label htmlFor={`status-${option.value}`} className="font-normal cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ru' ? 'Отмена' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {language === 'ru' ? 'Сохранить' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}