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
import { Video, Youtube } from "lucide-react";

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
  zoom_link?: string | null;
  is_zoom_stream?: boolean;
  youtube_stream_url?: string | null;
  youtube_embed_url?: string | null;
  is_youtube_stream?: boolean;
  stream_status?: string;
  stream_start_time?: string | null;
  stream_end_time?: string | null;
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
  
  // Streaming fields
  const [isZoomStream, setIsZoomStream] = useState(false);
  const [zoomLink, setZoomLink] = useState("");
  const [isYoutubeStream, setIsYoutubeStream] = useState(false);
  const [youtubeStreamUrl, setYoutubeStreamUrl] = useState("");
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState("");
  const [streamStartTime, setStreamStartTime] = useState("");
  const [streamEndTime, setStreamEndTime] = useState("");
  
  const { toast } = useToast();

  const isEditMode = !!event;

  // Auto-detect Zoom link
  useEffect(() => {
    if (zoomLink) {
      const isZoom = zoomLink.includes('zoom.us') || zoomLink.includes('zoom.com');
      if (isZoom && !isZoomStream) {
        setIsZoomStream(true);
      }
    }
  }, [zoomLink]);

  // Extract YouTube embed URL from stream URL
  useEffect(() => {
    if (youtubeStreamUrl) {
      const videoIdMatch = youtubeStreamUrl.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (videoIdMatch && videoIdMatch[1]) {
        setYoutubeEmbedUrl(`https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1`);
      }
    }
  }, [youtubeStreamUrl]);

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
      setIsZoomStream(event.is_zoom_stream || false);
      setZoomLink(event.zoom_link || "");
      setIsYoutubeStream(event.is_youtube_stream || false);
      setYoutubeStreamUrl(event.youtube_stream_url || "");
      setYoutubeEmbedUrl(event.youtube_embed_url || "");
      setStreamStartTime(event.stream_start_time ? event.stream_start_time.slice(0, 16) : "");
      setStreamEndTime(event.stream_end_time ? event.stream_end_time.slice(0, 16) : "");
    } else {
      resetForm();
    }
  }, [event, open]);

  const resetForm = () => {
    setTitle("");
    setEventDate("");
    setEventTime("");
    setDescription("");
    setLink("");
    setAccess("all");
    setMinRating("");
    setRequiredTier("");
    setSendEmail(false);
    setIsZoomStream(false);
    setZoomLink("");
    setIsYoutubeStream(false);
    setYoutubeStreamUrl("");
    setYoutubeEmbedUrl("");
    setStreamStartTime("");
    setStreamEndTime("");
  };

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
      is_zoom_stream: isZoomStream,
      zoom_link: isZoomStream ? zoomLink : null,
      is_youtube_stream: isYoutubeStream,
      youtube_stream_url: isYoutubeStream ? youtubeStreamUrl : null,
      youtube_embed_url: isYoutubeStream ? youtubeEmbedUrl : null,
      stream_status: (isZoomStream || isYoutubeStream) ? 'scheduled' : null,
      stream_start_time: (isZoomStream || isYoutubeStream) && streamStartTime ? new Date(streamStartTime).toISOString() : null,
      stream_end_time: (isZoomStream || isYoutubeStream) && streamEndTime ? new Date(streamEndTime).toISOString() : null,
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

    resetForm();
    onOpenChange(false);
    onEventCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
            <div className="grid grid-cols-2 gap-4">
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
                placeholder="https://example.com"
              />
            </div>

            {/* Streaming options */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <Video className="w-4 h-4" />
                {language === 'ru' ? 'Трансляция' : 'Streaming'}
              </h4>

              {/* Zoom streaming */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isZoomStream"
                    checked={isZoomStream}
                    onCheckedChange={(checked) => {
                      setIsZoomStream(checked === true);
                      if (checked) setIsYoutubeStream(false);
                    }}
                  />
                  <Label htmlFor="isZoomStream" className="flex items-center gap-2 cursor-pointer">
                    <Video className="w-4 h-4 text-blue-500" />
                    {language === 'ru' ? 'Zoom трансляция по ссылке' : 'Zoom broadcast by link'}
                  </Label>
                </div>
                {isZoomStream && (
                  <Input
                    value={zoomLink}
                    onChange={(e) => setZoomLink(e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="ml-6"
                  />
                )}
              </div>

              {/* YouTube streaming */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isYoutubeStream"
                    checked={isYoutubeStream}
                    onCheckedChange={(checked) => {
                      setIsYoutubeStream(checked === true);
                      if (checked) setIsZoomStream(false);
                    }}
                  />
                  <Label htmlFor="isYoutubeStream" className="flex items-center gap-2 cursor-pointer">
                    <Youtube className="w-4 h-4 text-red-500" />
                    {language === 'ru' ? 'YouTube трансляция' : 'YouTube broadcast'}
                  </Label>
                </div>
                {isYoutubeStream && (
                  <div className="space-y-2 ml-6">
                    <Input
                      value={youtubeStreamUrl}
                      onChange={(e) => setYoutubeStreamUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... или https://youtube.com/live/..."
                    />
                    {youtubeEmbedUrl && (
                      <p className="text-xs text-muted-foreground">
                        Embed URL: {youtubeEmbedUrl}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Stream timing */}
              {(isZoomStream || isYoutubeStream) && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <Label htmlFor="streamStartTime" className="text-xs">
                      {language === 'ru' ? 'Начало трансляции' : 'Stream start'}
                    </Label>
                    <Input
                      id="streamStartTime"
                      type="datetime-local"
                      value={streamStartTime}
                      onChange={(e) => setStreamStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="streamEndTime" className="text-xs">
                      {language === 'ru' ? 'Окончание' : 'Stream end'}
                    </Label>
                    <Input
                      id="streamEndTime"
                      type="datetime-local"
                      value={streamEndTime}
                      onChange={(e) => setStreamEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
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
