import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Course {
  id: string;
  title: string;
}

interface SubscriptionTier {
  id?: string;
  community_id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
  selected_course_ids?: string[];
  payment_url?: string | null;
}

interface SubscriptionTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: SubscriptionTier | null;
  communityId: string;
  maxSortOrder: number;
  onSaved: () => void;
}

const FEATURE_OPTIONS = [
  { key: "community_access", labelRu: "Доступ к чату", labelEn: "Chat access" },
  { key: "courses_all", labelRu: "Доступ ко всем курсам", labelEn: "Access to all courses" },
  { key: "courses_selected", labelRu: "Доступ к выбранным курсам", labelEn: "Access to selected courses" },
  // { key: "call_replays", labelRu: "Записи созвонов", labelEn: "Call replays" },
  { key: "group_calls", labelRu: "Еженедельные живые созвоны", labelEn: "Weekly live calls" },
  { key: "private_chat", labelRu: "Приватные сообщения", labelEn: "Private chat" },
  // { key: "discounts", labelRu: "Скидки на мероприятия/продукты", labelEn: "Discounts on events/products" },
];

const CURRENCIES = ["RUB"];

export function SubscriptionTierDialog({
  open,
  onOpenChange,
  tier,
  communityId,
  maxSortOrder,
  onSaved,
}: SubscriptionTierDialogProps) {
  const { language } = useI18n();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isPortalFree, setIsPortalFree] = useState(false);
  const [loadingPortalStatus, setLoadingPortalStatus] = useState(true);

  const [formData, setFormData] = useState<SubscriptionTier>({
    community_id: communityId,
    name: "",
    slug: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    currency: "RUB",
    is_free: false,
    is_active: true,
    sort_order: maxSortOrder + 1,
    features: [],
    selected_course_ids: [],
    payment_url: "",
  });

  // Check if user has free portal subscription
  useEffect(() => {
    const checkPortalSubscription = async () => {
      if (!open) return;
      setLoadingPortalStatus(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingPortalStatus(false);
        return;
      }

      // Get user's profile with portal subscription
      const { data: profile } = await supabase
        .from("profiles")
        .select("portal_subscription_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.portal_subscription_id) {
        // Check if portal subscription is free (price = 0)
        const { data: portalSub } = await supabase
          .from("portal_subscriptions")
          .select("price")
          .eq("id", profile.portal_subscription_id)
          .maybeSingle();

        setIsPortalFree(portalSub?.price === 0);
      } else {
        // No portal subscription = treat as free
        setIsPortalFree(true);
      }
      
      setLoadingPortalStatus(false);
    };
    checkPortalSubscription();
  }, [open]);

  // Fetch community courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!open) return;
      setLoadingCourses(true);
      const { data } = await supabase
        .from("courses")
        .select("id, title")
        .eq("community_id", communityId)
        .order("title");
      setCourses(data || []);
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [communityId, open]);

  useEffect(() => {
    if (tier) {
      setFormData({
        ...tier,
        features: Array.isArray(tier.features) ? tier.features : [],
        selected_course_ids: Array.isArray(tier.selected_course_ids) ? tier.selected_course_ids : [],
        payment_url: tier.payment_url || "",
        // Force is_free for portal free users
        is_free: isPortalFree ? true : tier.is_free,
      });
    } else {
      setFormData({
        community_id: communityId,
        name: "",
        slug: "",
        description: "",
        price_monthly: 0,
        price_yearly: 0,
        currency: "RUB",
        is_free: isPortalFree ? true : false,
        is_active: true,
        sort_order: maxSortOrder + 1,
        features: [],
        selected_course_ids: [],
        payment_url: "",
      });
    }
  }, [tier, communityId, maxSortOrder, isPortalFree]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !tier ? generateSlug(name) : prev.slug,
    }));
  };

  const handleFeatureToggle = (featureKey: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureKey)
        ? prev.features.filter((f) => f !== featureKey)
        : [...prev.features, featureKey],
    }));
  };

  const handleCourseToggle = (courseId: string) => {
    setFormData((prev) => ({
      ...prev,
      selected_course_ids: (prev.selected_course_ids || []).includes(courseId)
        ? (prev.selected_course_ids || []).filter((id) => id !== courseId)
        : [...(prev.selected_course_ids || []), courseId],
    }));
  };

  const handleIsFreeChange = (isFree: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_free: isFree,
      price_monthly: isFree ? 0 : prev.price_monthly,
      price_yearly: isFree ? 0 : prev.price_yearly,
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: language === "ru" ? "Ошибка" : "Error",
        description: language === "ru" ? "Введите название" : "Enter name",
        variant: "destructive",
      });
      return;
    }
    if (!formData.slug.trim()) {
      toast({
        title: language === "ru" ? "Ошибка" : "Error",
        description: language === "ru" ? "Введите slug" : "Enter slug",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const dataToSave = {
      community_id: communityId,
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description || null,
      price_monthly: formData.is_free ? 0 : formData.price_monthly || 0,
      price_yearly: formData.is_free ? 0 : formData.price_yearly || 0,
      currency: formData.currency,
      is_free: formData.is_free,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
      features: formData.features,
      selected_course_ids: formData.features.includes("courses_selected") ? formData.selected_course_ids : [],
      payment_url: formData.is_free ? null : formData.payment_url?.trim() || null,
    };

    let error;
    if (tier?.id) {
      const { error: updateError } = await supabase.from("subscription_tiers").update(dataToSave).eq("id", tier.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("subscription_tiers").insert(dataToSave);
      error = insertError;
    }

    setSaving(false);

    if (error) {
      toast({ title: language === "ru" ? "Ошибка" : "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: language === "ru" ? "Сохранено" : "Saved" });
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tier
              ? language === "ru"
                ? "Редактировать уровень"
                : "Edit tier"
              : language === "ru"
                ? "Новый уровень подписки"
                : "New subscription tier"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Is Free toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_free">{language === "ru" ? "Бесплатный уровень" : "Free tier"}</Label>
            {isPortalFree ? (
              <Popover>
                <PopoverTrigger asChild>
                  <div>
                    <Switch 
                      id="is_free" 
                      checked={true} 
                      disabled 
                      className="cursor-not-allowed"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="left">
                  <p className="text-sm">
                    {language === "ru" 
                      ? "На бесплатном тарифе функция отключена" 
                      : "This feature is disabled on free plan"}
                  </p>
                </PopoverContent>
              </Popover>
            ) : (
              <Switch id="is_free" checked={formData.is_free} onCheckedChange={handleIsFreeChange} />
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{language === "ru" ? "Название" : "Name"}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={language === "ru" ? "Например: Pro" : "e.g. Pro"}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="pro"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{language === "ru" ? "Описание" : "Description"}</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={language === "ru" ? "Что получит участник" : "What member will get"}
              rows={3}
            />
          </div>

          {/* Prices - hidden for portal free users */}
          {!isPortalFree && (
            <>
              <div className="space-y-2">
                <Label>{language === "ru" ? "Цены" : "Pricing"}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="price_monthly" className="text-xs text-muted-foreground">
                      {language === "ru" ? "Месячная" : "Monthly"}
                    </Label>
                    <Input
                      id="price_monthly"
                      type="number"
                      min="0"
                      value={formData.price_monthly || 0}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
                      disabled={formData.is_free}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="price_yearly" className="text-xs text-muted-foreground">
                      {language === "ru" ? "Годовая" : "Yearly"}
                    </Label>
                    <Input
                      id="price_yearly"
                      type="number"
                      min="0"
                      value={formData.price_yearly || 0}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price_yearly: parseFloat(e.target.value) || 0 }))}
                      disabled={formData.is_free}
                    />
                  </div>
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label>{language === "ru" ? "Валюта" : "Currency"}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                  disabled={formData.is_free}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Payment URL - only for paid tiers */}
          {/*!formData.is_free && (formData.price_monthly || 0) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="payment_url">
                {language === "ru" ? "Ссылка на оплату (необязательно)" : "Payment URL (optional)"}
              </Label>
              <Input
                id="payment_url"
                type="url"
                value={formData.payment_url || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, payment_url: e.target.value }))}
                placeholder={language === "ru" ? "https://..." : "https://..."}
              />
              <p className="text-xs text-muted-foreground">
                {language === "ru"
                  ? 'Если указана — откроется по кнопке "Оплатить". Если пустая — оплата через ЮKassa.'
                  : 'If set — opens on "Pay" button click. If empty — uses YooKassa payment.'}
              </p>
            </div>
          )*/}

          {/* Features */}
          <div className="space-y-2">
            <Label>{language === "ru" ? "Что входит в уровень" : "Features included"}</Label>
            <div className="space-y-2 border border-border rounded-lg p-3">
              {FEATURE_OPTIONS.map((feature) => (
                <div key={feature.key}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={feature.key}
                      checked={formData.features.includes(feature.key)}
                      onCheckedChange={() => handleFeatureToggle(feature.key)}
                    />
                    <label htmlFor={feature.key} className="text-sm cursor-pointer">
                      {language === "ru" ? feature.labelRu : feature.labelEn}
                    </label>
                  </div>

                  {/* Show course selection when courses_selected is checked */}
                  {feature.key === "courses_selected" && formData.features.includes("courses_selected") && (
                    <div className="ml-6 mt-2 pl-3 border-l-2 border-border space-y-2">
                      {loadingCourses ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {language === "ru" ? "Загрузка курсов..." : "Loading courses..."}
                        </div>
                      ) : courses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {language === "ru" ? "Нет курсов в сообществе" : "No courses in community"}
                        </p>
                      ) : (
                        courses.map((course) => (
                          <div key={course.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`course-${course.id}`}
                              checked={(formData.selected_course_ids || []).includes(course.id)}
                              onCheckedChange={() => handleCourseToggle(course.id)}
                            />
                            <label
                              htmlFor={`course-${course.id}`}
                              className="text-sm cursor-pointer flex items-center gap-1"
                            >
                              <BookOpen className="h-3 w-3 text-muted-foreground" />
                              {course.title}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">{language === "ru" ? "Активен" : "Active"}</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === "ru" ? "Отмена" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {language === "ru" ? "Сохранить" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
