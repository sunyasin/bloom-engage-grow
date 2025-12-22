import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/lib/i18n";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EventDialog } from "@/components/EventDialog";
import { EventsListDialog } from "@/components/EventsListDialog";
import { DayContentProps } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  community_id?: string;
}

interface Community {
  id: string;
  name: string;
  role: string;
}

export default function Events() {
  const { language } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [showEventsListDialog, setShowEventsListDialog] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
      await fetchUserCommunities(user.id);
      await fetchEvents(user.id);
    }
  };

  const fetchUserCommunities = async (userId: string) => {
    const { data } = await supabase
      .from('community_members')
      .select('community_id, role, communities(id, name)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (data) {
      const communities = data
        .filter(item => item.communities)
        .map(item => ({
          id: item.communities.id,
          name: item.communities.name,
          role: item.role,
        }));
      setUserCommunities(communities);
    }
  };

  const fetchEvents = async (userId: string) => {
    const { data: memberData } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!memberData || memberData.length === 0) {
      setEvents([]);
      return;
    }

    const communityIds = memberData.map(m => m.community_id);

    const { data } = await supabase
      .from('events')
      .select('*')
      .in('community_id', communityIds)
      .order('event_date');

    if (data) {
      setEvents(data);
    }
  };

  const getEventsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(event => event.event_date === dateStr);
  };

  const handleDayClick = (date: Date) => {
    const eventsForDay = getEventsForDate(date);
    if (eventsForDay.length > 1) {
      setSelectedDateEvents(eventsForDay);
      setShowEventsListDialog(true);
    }
    setSelectedDate(date);
  };

  const renderDayContent = (props: DayContentProps) => {
    const eventsForDay = getEventsForDate(props.date);

    if (eventsForDay.length > 1) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <span>{props.date.getDate()}</span>
          <span
            className="absolute bottom-0 right-0 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
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
  const ownedCommunities = userCommunities.filter(c => c.role === 'owner' || c.role === 'moderator');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {language === 'ru' ? 'Календарь событий' : 'Events Calendar'}
          </h1>
          {currentUserId && ownedCommunities.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              {ownedCommunities.length === 1 ? (
                <Button
                  onClick={() => {
                    setSelectedCommunityId(ownedCommunities[0].id);
                    setShowEventDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ru' ? 'Новое событие' : 'New Event'}
                </Button>
              ) : (
                <>
                  <Select
                    value={selectedCommunityId || ""}
                    onValueChange={setSelectedCommunityId}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue
                        placeholder={
                          language === 'ru'
                            ? 'Выберите сообщество'
                            : 'Select community'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ownedCommunities.map((community) => (
                        <SelectItem key={community.id} value={community.id}>
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedCommunityId) {
                        setShowEventDialog(true);
                      }
                    }}
                    disabled={!selectedCommunityId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Новое событие' : 'New Event'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && handleDayClick(date)}
              className="rounded-lg border shadow-medium"
              components={{
                DayContent: renderDayContent,
              }}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              {selectedDate?.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </h2>
            {dayEvents.length > 0 ? (
              dayEvents.map((event) => (
                <Card
                  key={event.id}
                  className="p-4 cursor-pointer hover:shadow-medium transition-smooth"
                  onClick={() => setSelectedEvent(event)}
                >
                  <h3 className="font-semibold mb-2">{event.title}</h3>
                  {event.event_time && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {language === 'ru' ? 'Время' : 'Time'}: {event.event_time}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">
                {language === 'ru' ? 'Нет событий на эту дату' : 'No events scheduled for this day'}
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {language === 'ru' ? 'Дата и время' : 'Date & Time'}
                </p>
                <p>
                  {new Date(selectedEvent.event_date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
                  {selectedEvent.event_time && ` ${language === 'ru' ? 'в' : 'at'} ${selectedEvent.event_time}`}
                </p>
              </div>
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    {language === 'ru' ? 'Описание' : 'Description'}
                  </p>
                  <p className="text-foreground/80">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {currentUserId && selectedCommunityId && (
        <EventDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          communityId={selectedCommunityId}
          userId={currentUserId}
          onEventCreated={() => currentUserId && fetchEvents(currentUserId)}
          language={language}
        />
      )}

      <EventsListDialog
        open={showEventsListDialog}
        onOpenChange={setShowEventsListDialog}
        events={selectedDateEvents}
        date={selectedDate || new Date()}
        language={language}
      />
    </div>
  );
}
