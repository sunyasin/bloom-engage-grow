import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  community_id?: string;
}

interface EventsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: Event[];
  date: Date;
  language?: string;
}

export function EventsListDialog({
  open,
  onOpenChange,
  events,
  date,
  language = 'en',
}: EventsListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === 'ru' ? 'События на ' : 'Events for '}
            {date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-lg border hover:bg-accent transition-smooth cursor-pointer"
            >
              <div className="flex items-baseline gap-2">
                {event.event_time && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {event.event_time}
                  </span>
                )}
                <span className="font-medium">{event.title}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
