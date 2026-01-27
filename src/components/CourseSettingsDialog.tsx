import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
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
import type { Database } from '@/integrations/supabase/types';

type AccessType = Database['public']['Enums']['access_type'];
type CourseStatus = Database['public']['Enums']['course_status'];

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  access_type: AccessType | null;
  status: CourseStatus | null;
  delay_days?: number | null;
  required_rating?: number | null;
  promo_code?: string | null;
  gifted_emails?: string | null;
  access_types?: string[] | null;
}

interface CourseSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onSave: (updatedCourse: Course) => void;
  onDelete?: () => void;
}

type SettingsTab = 'title' | 'description' | 'cover' | 'access' | 'status' | 'danger';

export default function CourseSettingsDialog({ 
  open, 
  onOpenChange, 
  course, 
  onSave,
  onDelete 
}: CourseSettingsDialogProps) {
  const { language } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('title');
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [coverUrl, setCoverUrl] = useState(course.cover_image_url || '');
  const [status, setStatus] = useState<CourseStatus>(course.status || 'draft');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-select access types
  const [selectedAccessTypes, setSelectedAccessTypes] = useState<AccessType[]>([]);
  
  // Access type specific fields
  const [delayDays, setDelayDays] = useState<number | null>(null);
  const [requiredRating, setRequiredRating] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [giftedEmails, setGiftedEmails] = useState('');

  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description || '');
    setCoverUrl(course.cover_image_url || '');
    setStatus(course.status || 'draft');
    setDelayDays(course.delay_days ?? null);
    setRequiredRating(course.required_rating ?? null);
    setPromoCode(course.promo_code || '');
    setGiftedEmails(course.gifted_emails || '');
    
    // Load access_types or fallback to single access_type
    if (course.access_types && course.access_types.length > 0) {
      setSelectedAccessTypes(course.access_types as AccessType[]);
    } else if (course.access_type) {
      setSelectedAccessTypes([course.access_type]);
    } else {
      setSelectedAccessTypes(['open']);
    }
  }, [course]);

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

  const toggleAccessType = (type: AccessType) => {
    setSelectedAccessTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow empty selection
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
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
      // Determine primary access_type (first selected or 'open')
      const primaryAccessType = selectedAccessTypes[0] || 'open';

      const { error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl || null,
          access_type: primaryAccessType,
          access_types: selectedAccessTypes,
          status: status,
          delay_days: selectedAccessTypes.includes('delayed') ? delayDays : null,
          required_rating: selectedAccessTypes.includes('by_rating_level') ? requiredRating : null,
          promo_code: selectedAccessTypes.includes('promo_code') ? promoCode.trim() || null : null,
          gifted_emails: selectedAccessTypes.includes('gifted') ? giftedEmails.trim() || null : null,
        })
        .eq('id', course.id);

      if (error) throw error;

      onSave({
        ...course,
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: coverUrl || null,
        access_type: primaryAccessType,
        access_types: selectedAccessTypes,
        status: status,
        delay_days: selectedAccessTypes.includes('delayed') ? delayDays : null,
        required_rating: selectedAccessTypes.includes('by_rating_level') ? requiredRating : null,
        promo_code: selectedAccessTypes.includes('promo_code') ? promoCode.trim() || null : null,
        gifted_emails: selectedAccessTypes.includes('gifted') ? giftedEmails.trim() || null : null,
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

  const tabs: { id: SettingsTab; label: string; danger?: boolean }[] = [
    { id: 'title', label: language === 'ru' ? 'Название' : 'Title' },
    { id: 'description', label: language === 'ru' ? 'Описание' : 'Description' },
    { id: 'cover', label: language === 'ru' ? 'Обложка' : 'Cover' },
    { id: 'access', label: language === 'ru' ? 'Видимость' : 'Visibility' },
    { id: 'status', label: language === 'ru' ? 'Статус' : 'Status' },
    { id: 'danger', label: language === 'ru' ? 'Удаление' : 'Delete', danger: true },
  ];

  const accessOptions: { value: AccessType; label: string; desc?: string }[] = [
    { value: 'open', label: language === 'ru' ? 'Открыто для всех' : 'Open to all' },
    { 
      value: 'paid_subscription', 
      label: language === 'ru' ? 'По подписке на сообщество' : 'Community subscription',
      desc: language === 'ru' 
        ? 'Доступен участникам с оплаченной подпиской'
        : 'Available to members with paid subscription'
    },
    { 
      value: 'by_rating_level', 
      label: language === 'ru' ? 'По уровню рейтинга' : 'By rating level',
      desc: language === 'ru' 
        ? 'Доступен при достижении порога рейтинга'
        : 'Available when rating threshold is reached'
    },
    { 
      value: 'delayed', 
      label: language === 'ru' ? 'С отложенным доступом' : 'Delayed access',
      desc: language === 'ru' 
        ? 'Доступен через N дней после подписки на сообщество'
        : 'Available N days after community subscription'
    },
    { 
      value: 'promo_code', 
      label: language === 'ru' ? 'По промокоду' : 'By promo code',
      desc: language === 'ru' 
        ? 'Доступен при вводе промокода'
        : 'Available with promo code'
    },
    { 
      value: 'gifted', 
      label: language === 'ru' ? 'Подарочный' : 'Gifted',
      desc: language === 'ru' 
        ? 'Доступен для указанных email адресов'
        : 'Available for specified email addresses'
    },
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
                    ? tab.danger 
                      ? 'bg-destructive/10 text-destructive font-medium'
                      : 'bg-primary/10 text-primary font-medium'
                    : tab.danger
                      ? 'text-destructive/70 hover:bg-destructive/5 hover:text-destructive'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
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
                <div>
                  <Label>
                    {language === 'ru' ? 'Условия доступа' : 'Access Conditions'}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'ru' 
                      ? 'Курс доступен, если выполнено хотя бы одно условие'
                      : 'Course is accessible if at least one condition is met'}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {accessOptions.map(option => (
                    <div key={option.value} className="space-y-2">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={selectedAccessTypes.includes(option.value)}
                          onCheckedChange={() => toggleAccessType(option.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <Label htmlFor={option.value} className="font-normal cursor-pointer">
                            {option.label}
                          </Label>
                          {option.desc && (
                            <p className="text-xs text-muted-foreground">{option.desc}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Conditional fields based on access type */}
                      {option.value === 'by_rating_level' && selectedAccessTypes.includes('by_rating_level') && (
                        <div className="ml-6 mt-2">
                          <Label htmlFor="required-rating" className="text-sm">
                            {language === 'ru' ? 'Минимальный рейтинг' : 'Minimum rating'}
                          </Label>
                          <Input
                            id="required-rating"
                            type="number"
                            min={0}
                            value={requiredRating ?? ''}
                            onChange={(e) => setRequiredRating(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={language === 'ru' ? 'Введите число' : 'Enter number'}
                            className="mt-1 max-w-[200px]"
                          />
                        </div>
                      )}
                      
                      {option.value === 'delayed' && selectedAccessTypes.includes('delayed') && (
                        <div className="ml-6 mt-2">
                          <Label htmlFor="delay-days" className="text-sm">
                            {language === 'ru' ? 'Дней с момента подписки' : 'Days since subscription'}
                          </Label>
                          <Input
                            id="delay-days"
                            type="number"
                            min={1}
                            value={delayDays ?? ''}
                            onChange={(e) => setDelayDays(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={language === 'ru' ? 'Введите число дней' : 'Enter number of days'}
                            className="mt-1 max-w-[200px]"
                          />
                        </div>
                      )}
                      
                      {option.value === 'promo_code' && selectedAccessTypes.includes('promo_code') && (
                        <div className="ml-6 mt-2">
                          <Label htmlFor="promo-code" className="text-sm">
                            {language === 'ru' ? 'Промокод' : 'Promo code'}
                          </Label>
                          <Input
                            id="promo-code"
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder={language === 'ru' ? 'Введите промокод' : 'Enter promo code'}
                            className="mt-1 max-w-[250px]"
                          />
                        </div>
                      )}
                      
                      {option.value === 'gifted' && selectedAccessTypes.includes('gifted') && (
                        <div className="ml-6 mt-2">
                          <Label htmlFor="gifted-emails" className="text-sm">
                            {language === 'ru' ? 'Email адреса (через запятую)' : 'Email addresses (comma-separated)'}
                          </Label>
                          <Textarea
                            id="gifted-emails"
                            value={giftedEmails}
                            onChange={(e) => setGiftedEmails(e.target.value)}
                            placeholder="user1@example.com, user2@example.com"
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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

            {activeTab === 'danger' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <h3 className="font-medium text-destructive mb-2">
                    {language === 'ru' ? 'Опасная зона' : 'Danger Zone'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'ru' 
                      ? 'Удаление курса нельзя отменить. Все уроки и данные будут безвозвратно удалены.'
                      : 'Deleting a course cannot be undone. All lessons and data will be permanently removed.'}
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Удалить курс' : 'Delete Course'}
                  </Button>
                </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
            <AlertDialogCancel>{language === 'ru' ? 'Отмена' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onDelete) {
                  setDeleting(true);
                  onDelete();
                }
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'ru' ? 'Удалить' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
