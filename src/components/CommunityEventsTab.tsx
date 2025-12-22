import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/lib/i18n";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Clock, Edit, Trash2, Link as LinkIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EventDialog } from "@/components/EventDialog";
import { EventsListDialog } from "@/components/EventsListDialog";
import { DayContentProps } from "react-day-picker";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  community_id: string;
  creator_id: string;
  access: string;
  min_rating: number | null;
  required_tier: string | null;
  link: string | null;
  send_email: boolean;
}

interface CommunityEventsTabProps {
  communityId: string;
  userId: string | null;
  isOwnerOrModerator: boolean;
  userRating?: number;
  userTier?: string | null;
}

export const CommunityEventsTab = ({ communityId, userId, isOwnerOrModerator, userRating = 0, userTier = null }: CommunityEventsTabProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showEventsListDialog, setShowEventsListDialog] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (communityId) {
      fetchEvents();
    }
  }, [communityId]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('community_id', communityId)
      .order('event_date');

    if (data) {
      setEvents(data);
    }
  };

  const hasAccessToEvent = (event: Event) => {
    if (isOwnerOrModerator) return true;

    if (event.access === 'all') return true;

    if (event.access === 'for_rating') {
      return userRating >= (event.min_rating || 0);
    }

    if (event.access === 'for_tier') {
      if (!userTier) return false;
      if (event.required_tier === 'vip') {
        return userTier === 'vip';
      }
      if (event.required_tier === 'pro') {
        return userTier === 'pro' || userTier === 'vip';
      }
    }

    return false;
  };

  const getEventsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(event => event.event_date === dateStr && hasAccessToEvent(event));
  };

  const handleDeleteEvent = async () => {
    if (!deletingEvent) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', deletingEvent.id);

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
      description: language === 'ru' ? 'Событие удалено' : 'Event deleted successfully',
    });

    setDeletingEvent(null);
    fetchEvents();
  };

  const handleDayClick = (date: Date) => {
    const eventsForDay = getEventsForDate(date);
    if (eventsForDay.length > 1) {
      setSelectedDateEvents(eventsForDay);
      setShowEventsListDialog(true);
    } else if (eventsForDay.length === 1 && isOwnerOrModerator) {
      setSelectedDate(date);
    }
  };

  const DayContent = (props: DayContentProps) => {
    const eventsForDay = getEventsForDate(props.date);

    if (eventsForDay.length > 0) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <span>{props.date.getDate()}</span>
          <span
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDateEvents(eventsForDay);
              setShowEventsListDialog(true);
            }}
          >
            {eventsForDay.length}
          </span>
        </div>
      );
    }

    return <span>{props.date.getDate()}</span>;
  };

  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {isOwnerOrModerator && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowEventDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ru' ? 'Новое событие' : 'New Event'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onDayClick={handleDayClick}
            components={{
              DayContent
            }}
            className="rounded-xl border border-border bg-card shadow-lg"
          />
        </div>

        <div>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedDate
                ? format(selectedDate, language === 'ru' ? 'd MMMM yyyy' : 'MMMM d, yyyy')
                : (language === 'ru' ? 'Выберите дату' : 'Select a date')}
            </h2>

            {dayEvents.length > 0 ? (
              <div className="space-y-4">
                {dayEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-primary pl-4 py-2 relative group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        {event.description && (
                          <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                        )}
                        <div className="flex flex-col gap-2 mt-2 text-sm">
                          {event.event_time && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{event.event_time}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.link && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <LinkIcon className="h-4 w-4" />
                              <a
                                href={event.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {event.link}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      {userId && event.creator_id === userId && (
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingEvent(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingEvent(event)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {language === 'ru'
                  ? 'На эту дату событий нет'
                  : 'No events for this date'}
              </p>
            )}
          </Card>
        </div>
      </div>

      {showEventDialog && userId && (
        <EventDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          communityId={communityId}
          userId={userId}
          onEventCreated={() => {
            fetchEvents();
            setShowEventDialog(false);
          }}
          language={language}
        />
      )}

      {editingEvent && userId && (
        <EventDialog
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          communityId={communityId}
          userId={userId}
          event={editingEvent}
          onEventCreated={() => {
            fetchEvents();
            setEditingEvent(null);
          }}
          language={language}
        />
      )}

      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => !open && setDeletingEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ru' ? 'Удалить событие?' : 'Delete event?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ru'
                ? 'Вы уверены, что хотите удалить это событие? Это действие нельзя отменить.'
                : 'Are you sure you want to delete this event? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'ru' ? 'Удалить' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEventsListDialog && (
        <EventsListDialog
          open={showEventsListDialog}
          onOpenChange={setShowEventsListDialog}
          events={selectedDateEvents}
          onClose={() => setShowEventsListDialog(false)}
        />
      )}
    </div>
  );
};
