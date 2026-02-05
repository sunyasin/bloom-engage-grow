import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Plus, Volume2, VolumeX, ChevronLeft, ChevronRight, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface GalleryCollection {
  id: number;
  name: string;
  slideshow_speed: number;
  playback_mode: 'repeat_one' | 'repeat_all' | 'shuffle' | null;
}

interface GalleryPhoto {
  id: number;
  url: string;
  description: string | null;
  price: number | null;
}

interface GalleryPost {
  id: number;
  title: string | null;
  content_html: string;
  thumbnail_url: string | null;
  price: number | null;
}

interface GalleryAudioTrack {
  id: number;
  url: string;
  audio_filename: string;
}

const PLAYBACK_MODE_CONFIG = {
  repeat_all: { icon: Repeat, label: 'repeat_all' },
  repeat_one: { icon: Repeat1, label: 'repeat_one' },
  shuffle: { icon: Shuffle, label: 'shuffle' },
} as const;

export default function GalleryCarouselPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/my-gallery';
  const collectionIdNum = collectionId ? parseInt(collectionId) : null;
  
  const [collection, setCollection] = useState<GalleryCollection | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [audioTracks, setAudioTracks] = useState<GalleryAudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slideshowRef = useRef<NodeJS.Timeout | null>(null);

  const allItems = [...photos.map(p => ({ type: 'photo' as const, ...p })), ...posts.map(p => ({ type: 'post' as const, ...p }))];
  const currentItem = allItems[currentIndex];
  const hasAudio = audioTracks.length > 0;
  const currentTrack = audioTracks[currentTrackIndex];
  const playbackMode = collection?.playback_mode || 'repeat_all';

  useEffect(() => {
    if (collectionIdNum) {
      loadCollection(collectionIdNum);
      loadItems(collectionIdNum);
    }
  }, [collectionIdNum]);

  useEffect(() => {
    if (collection) {
      setSpeed(collection.slideshow_speed);
    }
  }, [collection]);

  useEffect(() => {
    if (isPlaying && allItems.length > 1) {
      startSlideshow();
    } else {
      stopSlideshow();
    }
    return () => stopSlideshow();
  }, [isPlaying, currentIndex, speed, allItems.length]);

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = 0;
      } else {
        audioRef.current.volume = volume / 100;
      }
    }
  }, [volume, isMuted]);

  // Play current track when it changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack, isPlaying]);

  // Handle audio ended
  const handleAudioEnded = useCallback(() => {
    if (playbackMode === 'repeat_one') {
      // Replay same track
      audioRef.current?.play().catch(() => {});
    } else if (playbackMode === 'repeat_all') {
      // Next track or loop to first
      const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
      setCurrentTrackIndex(nextIndex);
    } else if (playbackMode === 'shuffle') {
      // Random track
      const randomIndex = Math.floor(Math.random() * audioTracks.length);
      setCurrentTrackIndex(randomIndex);
    }
  }, [playbackMode, currentTrackIndex, audioTracks.length]);

  // Autoplay audio when collection loads
  useEffect(() => {
    if (hasAudio && currentTrack && isPlaying) {
      const playAudio = async () => {
        try {
          audioRef.current.volume = isMuted ? 0 : volume / 100;
          await audioRef.current?.play();
        } catch (e) {
          console.log('Audio autoplay blocked:', e);
        }
      };
      playAudio();
    }
  }, [hasAudio, currentTrack]);

  const loadCollection = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('gallery_collections')
        .select('id, name, slideshow_speed, playback_mode')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setCollection(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadItems = async (id: number) => {
    try {
      setLoading(true);
      
      const [photosResult, postsResult, audioResult] = await Promise.all([
        supabase
          .from('gallery_photos')
          .select('id, url, description, price')
          .eq('collection_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('gallery_posts')
          .select('id, title, content_html, thumbnail_url, price')
          .eq('collection_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('gallery_audio')
          .select('id, url, audio_filename')
          .eq('collection_id', id)
          .order('id', { ascending: true })
      ]);

      if (photosResult.error) throw photosResult.error;
      if (postsResult.error) throw postsResult.error;

      setPhotos(photosResult.data || []);
      setPosts(postsResult.data || []);
      
      if (audioResult.data) {
        setAudioTracks(audioResult.data);
      }
    } catch (err: any) {
      if (err.message !== 'PGRST116') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const startSlideshow = () => {
    stopSlideshow();
    slideshowRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % allItems.length);
    }, speed * 1000);
  };

  const stopSlideshow = () => {
    if (slideshowRef.current) {
      clearTimeout(slideshowRef.current);
      slideshowRef.current = null;
    }
  };

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % allItems.length);
  }, [allItems.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + allItems.length) % allItems.length);
  }, [allItems.length]);

  const goToNextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
    setCurrentTrackIndex(nextIndex);
  };

  const goToPrevTrack = () => {
    const prevIndex = (currentTrackIndex - 1 + audioTracks.length) % audioTracks.length;
    setCurrentTrackIndex(prevIndex);
  };

  const handleAddToOrder = () => {
    setOrderQuantity(prev => prev + 1);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0) setIsMuted(false);
  };

  const handleSpeedChange = (value: number[]) => {
    setSpeed(value[0]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const currentPrice = currentItem?.type === 'photo' ? currentItem.price : currentItem?.type === 'post' ? currentItem.price : null;

  const ModeIcon = PLAYBACK_MODE_CONFIG[playbackMode as keyof typeof PLAYBACK_MODE_CONFIG]?.icon || Repeat;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>Назад</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Audio element */}
      {hasAudio && currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.url}
          onEnded={handleAudioEnded}
          autoPlay={isPlaying}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{collection?.name}</h1>
        </div>
        
        {/* Audio player info */}
        {hasAudio && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ModeIcon className="h-4 w-4" />
            <span>{playbackMode}</span>
            <span>•</span>
            <span>{currentTrackIndex + 1}/{audioTracks.length}</span>
            <span>•</span>
            <span className="truncate max-w-[200px]">{currentTrack?.audio_filename}</span>
          </div>
        )}
      </div>

      {/* Carousel Area */}
      <div className="relative px-16 py-6">
        {/* Left Arrow */}
        {allItems.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {/* Content */}
        <div className="aspect-[4/3] max-h-[60vh] flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          {currentItem ? (
            currentItem.type === 'photo' ? (
              <img
                src={currentItem.url}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div 
                className="w-full h-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: currentItem.content_html }}
              />
            )
          ) : (
            <p className="text-muted-foreground">Пусто</p>
          )}
        </div>

        {/* Right Arrow */}
        {allItems.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="flex items-center gap-4">
          {/* Price */}
          {currentPrice !== null && currentPrice > 0 && (
            <span className="text-lg font-semibold">{currentPrice} ₽</span>
          )}

          {/* Add to Order */}
          {currentPrice !== null && currentPrice > 0 && (
            <Button variant="outline" size="icon" onClick={handleAddToOrder}>
              <Plus className="h-4 w-4" />
              {orderQuantity > 1 && (
                <span className="ml-1 text-sm">{orderQuantity}</span>
              )}
            </Button>
          )}

          {/* Audio Controls */}
          {hasAudio && (
            <>
              <Button variant="ghost" size="icon" onClick={goToPrevTrack} title="Предыдущий трек">
                <Play className="h-4 w-4 rotate-180" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={handlePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button variant="ghost" size="icon" onClick={goToNextTrack} title="Следующий трек">
                <Play className="h-4 w-4" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-24"
                />
              </div>
            </>
          )}

          {/* Speed */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Скорость:</span>
            <Slider
              value={[speed]}
              onValueChange={handleSpeedChange}
              min={1}
              max={100}
              step={1}
              className="w-24"
            />
            <span className="text-sm w-8">{speed}c</span>
          </div>

          {/* Play/Pause */}
          <Button variant="outline" size="icon" onClick={handlePlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Description (only for photos) */}
      {currentItem?.type === 'photo' && currentItem.description && (
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground max-h-24 overflow-y-auto">
            {currentItem.description}
          </p>
        </div>
      )}
    </div>
  );
}
