import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date');

    if (data) {
      setEvents(data);
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.event_date === dateStr);
  };

  const dayEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Events Calendar
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-lg border shadow-medium"
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">
              {selectedDate?.toLocaleDateString('en-US', { 
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
                      Time: {event.event_time}
                    </p>
                  )}
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {event.description}
                  </p>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No events scheduled for this day</p>
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
                <p className="text-sm font-semibold text-muted-foreground">Date & Time</p>
                <p>
                  {new Date(selectedEvent.event_date).toLocaleDateString()} 
                  {selectedEvent.event_time && ` at ${selectedEvent.event_time}`}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">Description</p>
                <p className="text-foreground/80">{selectedEvent.description}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
