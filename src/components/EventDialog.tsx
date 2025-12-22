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
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  description: string | null;
  community_id: string;
  creator_id: string;
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!event;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setEventDate(event.event_date);
      setEventTime(event.event_time || "");
    } else {
      setTitle("");
      setEventDate("");
      setEventTime("");
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

    setLoading(true);

    let error;

    if (isEditMode && event) {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title,
          event_date: eventDate,
          event_time: eventTime || null,
        })
        .eq('id', event.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('events').insert({
        title,
        event_date: eventDate,
        event_time: eventTime || null,
        community_id: communityId,
        creator_id: userId,
        description: '',
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
          <div className="space-y-4">
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
