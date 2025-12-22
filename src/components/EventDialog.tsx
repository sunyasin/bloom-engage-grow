import { useState } from "react";
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

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  userId: string;
  onEventCreated?: () => void;
  language?: string;
}

export function EventDialog({
  open,
  onOpenChange,
  communityId,
  userId,
  onEventCreated,
  language = 'en',
}: EventDialogProps) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

    const { error } = await supabase.from('events').insert({
      title,
      event_date: eventDate,
      event_time: eventTime || null,
      community_id: communityId,
      creator_id: userId,
      description: '',
    });

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
      description: language === 'ru' ? 'Событие создано' : 'Event created successfully',
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
            {language === 'ru' ? 'Новое событие' : 'New Event'}
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
                ? (language === 'ru' ? 'Создание...' : 'Creating...')
                : (language === 'ru' ? 'Создать' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
