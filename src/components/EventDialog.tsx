import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  description: string | null;
  community_id: string;
  creator_id: string;
  access: string;
  min_rating: number | null;
  required_tier: string | null;
  link: string | null;
  send_email: boolean;
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  userId: string;
  onEventCreated?: () => void;
  language?: string;
  event?: Event | null;
}

export function EventDialog({
  open,
  onOpenChange,
  communityId,
  userId,
  onEventCreated,
  language = 'en',
  event = null,
}: EventDialogProps) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [access, setAccess] = useState<string>("all");
  const [minRating, setMinRating] = useState("");
  const [requiredTier, setRequiredTier] = useState<string>("");
  const [sendEmail, setSendEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!event;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setEventDate(event.event_date);
      setEventTime(event.event_time || "");
      setDescription(event.description || "");
      setLink(event.link || "");
      setAccess(event.access || "all");
      setMinRating(event.min_rating ? event.min_rating.toString() : "");
      setRequiredTier(event.required_tier || "");
      setSendEmail(event.send_email || false);
    } else {
      setTitle("");
      setEventDate("");
      setEventTime("");
      setDescription("");
      setLink("");
      setAccess("all");
      setMinRating("");
      setRequiredTier("");
      setSendEmail(false);
    }
  }, [event, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !eventDate) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Заполните обязательные поля' : 'Please fill required fields',
        variant: 'destructive',
      });
      return;
    }

    if (access === 'for_rating' && !minRating) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Укажите минимальный рейтинг' : 'Please specify minimum rating',
        variant: 'destructive',
      });
      return;
    }

    if (access === 'for_tier' && !requiredTier) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Выберите уровень подписки' : 'Please select subscription tier',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const eventData = {
      title,
      event_date: eventDate,
      event_time: eventTime || null,
      description: description || null,
      link: link || null,
      access: access || 'all',
      min_rating: access === 'for_rating' && minRating ? parseInt(minRating) : null,
      required_tier: access === 'for_tier' ? requiredTier : null,
      send_email: sendEmail,
    };

    let error;

    if (isEditMode && event) {
      const { error: updateError } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', event.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('events').insert({
        ...eventData,
        community_id: communityId,
        creator_id: userId,
      });
      error = insertError;
    }

    setLoading(false);

    if (error) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: language === 'ru' ? 'Успех' : 'Success',
      description: isEditMode
        ? (language === 'ru' ? 'Событие обновлено' : 'Event updated successfully')
        : (language === 'ru' ? 'Событие создано' : 'Event created successfully'),
    });

    setTitle("");
    setEventDate("");
    setEventTime("");
    setDescription("");
    setLink("");
    setAccess("all");
    setMinRating("");
    setRequiredTier("");
    setSendEmail(false);
    onOpenChange(false);
    onEventCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? (language === 'ru' ? 'Редактировать событие' : 'Edit Event')
              : (language === 'ru' ? 'Новое событие' : 'New Event')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div>
              <Label htmlFor="title">
                {language === 'ru' ? 'Название' : 'Title'} *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === 'ru' ? 'Название события' : 'Event title'}
                required
              />
            </div>
            <div>
              <Label htmlFor="date">
                {language === 'ru' ? 'Дата' : 'Date'} *
              </Label>
              <Input
                id="date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">
                {language === 'ru' ? 'Время' : 'Time'}
              </Label>
              <Input
                id="time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">
                {language === 'ru' ? 'Описание' : 'Description'}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'ru' ? 'Описание события' : 'Event description'}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="link">
                {language === 'ru' ? 'Ссылка' : 'Link'}
              </Label>
              <Input
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={language === 'ru' ? 'https://example.com' : 'https://example.com'}
              />
            </div>
            <div>
              <Label>
                {language === 'ru' ? 'Уровень доступа' : 'Access Level'}
              </Label>
              <RadioGroup value={access} onValueChange={setAccess} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="access-all" />
                  <Label htmlFor="access-all" className="font-normal cursor-pointer">
                    {language === 'ru' ? 'Для всех' : 'For all'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="for_rating" id="access-rating" />
                  <Label htmlFor="access-rating" className="font-normal cursor-pointer">
                    {language === 'ru' ? 'По рейтингу' : 'For rating'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="for_tier" id="access-tier" />
                  <Label htmlFor="access-tier" className="font-normal cursor-pointer">
                    {language === 'ru' ? 'По уровню подписки' : 'For tier'}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {access === 'for_rating' && (
              <div>
                <Label htmlFor="minRating">
                  {language === 'ru' ? 'Минимальный рейтинг' : 'Minimum rating'} *
                </Label>
                <Input
                  id="minRating"
                  type="number"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            )}
            {access === 'for_tier' && (
              <div>
                <Label htmlFor="requiredTier">
                  {language === 'ru' ? 'Требуемый уровень подписки' : 'Required tier'} *
                </Label>
                <Select value={requiredTier} onValueChange={setRequiredTier}>
                  <SelectTrigger id="requiredTier">
                    <SelectValue placeholder={language === 'ru' ? 'Выберите уровень' : 'Select tier'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="sendEmail" className="font-normal cursor-pointer">
                {language === 'ru' ? 'Отправить email-уведомление' : 'Send email notification'}
              </Label>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? (isEditMode
                  ? (language === 'ru' ? 'Сохранение...' : 'Saving...')
                  : (language === 'ru' ? 'Создание...' : 'Creating...'))
                : (isEditMode
                  ? (language === 'ru' ? 'Сохранить' : 'Save')
                  : (language === 'ru' ? 'Создать' : 'Create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
