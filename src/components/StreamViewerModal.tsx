import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, ExternalLink, Play } from "lucide-react";
import { differenceInSeconds, format, isPast, isFuture } from "date-fns";

interface StreamViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamType: 'zoom' | 'youtube';
  zoomLink?: string;
  youtubeEmbedUrl?: string;
  streamStatus?: string;
  streamStartTime?: string;
  streamEndTime?: string;
  eventTitle: string;
  language?: string;
}

export function StreamViewerModal({
  open,
  onOpenChange,
  streamType,
  zoomLink,
  youtubeEmbedUrl,
  streamStatus = 'scheduled',
  streamStartTime,
  streamEndTime,
  eventTitle,
  language = 'ru',
}: StreamViewerModalProps) {
  const [countdown, setCountdown] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState(streamStatus);

  useEffect(() => {
    if (!streamStartTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(streamStartTime);
      const end = streamEndTime ? new Date(streamEndTime) : null;

      if (isFuture(start)) {
        const seconds = differenceInSeconds(start, now);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        setCurrentStatus('scheduled');
      } else if (end && isPast(end)) {
        setCountdown("");
        setCurrentStatus('ended');
      } else {
        setCountdown("");
        setCurrentStatus('live');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [streamStartTime, streamEndTime]);

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'live':
        return (
          <Badge className="bg-red-500 text-white animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            {language === 'ru' ? 'В эфире' : 'Live Now'}
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="secondary">
            {language === 'ru' ? 'Завершено' : 'Ended'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {language === 'ru' ? 'Запланировано' : 'Scheduled'}
          </Badge>
        );
    }
  };

  const handleJoinZoom = () => {
    if (zoomLink) {
      window.open(zoomLink, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {eventTitle}
            </DialogTitle>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Countdown timer */}
          {countdown && currentStatus === 'scheduled' && (
            <div className="bg-muted rounded-lg p-6 text-center">
              <p className="text-muted-foreground mb-2">
                {language === 'ru' ? 'До начала трансляции:' : 'Broadcast starts in:'}
              </p>
              <div className="text-4xl font-mono font-bold text-primary">
                {countdown}
              </div>
              {streamStartTime && (
                <p className="text-sm text-muted-foreground mt-2">
                  {format(new Date(streamStartTime), 'd MMM yyyy, HH:mm')}
                </p>
              )}
            </div>
          )}

          {/* Zoom stream */}
          {streamType === 'zoom' && zoomLink && (
            <div className="space-y-4">
              {currentStatus === 'live' || currentStatus === 'scheduled' ? (
                <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg">
                  <Video className="w-16 h-16 text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Zoom Meeting</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    {language === 'ru' 
                      ? 'Нажмите кнопку ниже, чтобы присоединиться к трансляции в Zoom'
                      : 'Click the button below to join the Zoom broadcast'}
                  </p>
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    onClick={handleJoinZoom}
                  >
                    <Play className="w-5 h-5" />
                    {language === 'ru' ? 'Присоединиться к трансляции' : 'Join Live Broadcast'}
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <p className="text-muted-foreground">
                    {language === 'ru' ? 'Трансляция завершена' : 'Broadcast has ended'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* YouTube stream */}
          {streamType === 'youtube' && youtubeEmbedUrl && (
            <div className="space-y-4">
              {currentStatus === 'live' && (
                <div className="flex items-center justify-center mb-4">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white gap-2 animate-pulse"
                  >
                    <Play className="w-5 h-5" />
                    {language === 'ru' ? 'Смотреть сейчас' : 'Join Live Now'}
                  </Button>
                </div>
              )}
              
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={youtubeEmbedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* YouTube Chat embed for mobile/desktop */}
              {currentStatus === 'live' && youtubeEmbedUrl && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">
                    {language === 'ru' ? 'Чат трансляции' : 'Live Chat'}
                  </h4>
                  <div className="relative w-full h-[300px] lg:h-[400px]">
                    <iframe
                      src={youtubeEmbedUrl.replace('/embed/', '/live_chat?v=').replace('?', '&is_popout=1&')}
                      className="w-full h-full rounded-lg border"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media"
                    />
                  </div>
                </div>
              )}

              {currentStatus === 'ended' && (
                <div className="text-center py-4">
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    {language === 'ru' ? '📺 Смотрите запись' : '📺 Watch Replay'}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Stream end time info */}
          {streamEndTime && currentStatus === 'live' && (
            <div className="text-center text-sm text-muted-foreground">
              {language === 'ru' ? 'Окончание:' : 'Ends at:'}{' '}
              {format(new Date(streamEndTime), 'HH:mm')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}