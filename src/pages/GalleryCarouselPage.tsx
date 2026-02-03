import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Plus, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface GalleryCollection {
  id: number;
  name: string;
  slideshow_speed: number;
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

interface GalleryAudio {
  id: number;
  url: string;
  title: string | null;
  playback_mode: string;
}

export default function GalleryCarouselPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const collectionIdNum = collectionId ? parseInt(collectionId) : null;
  
  const [collection, setCollection] = useState<GalleryCollection | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [audio, setAudio] = useState<GalleryAudio | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const hasAudio = !!audio;

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
  }, [isPlaying, currentIndex, speed]);

  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = 0;
      } else {
        audioRef.current.volume = volume / 100;
      }
    }
  }, [volume, isMuted]);

  const loadCollection = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from('gallery_collections')
        .select('id, name, slideshow_speed')
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
          .select('id, url, title, playback_mode')
          .eq('collection_id', id)
          .limit(1)
          .single()
      ]);

      if (photosResult.error) throw photosResult.error;
      if (postsResult.error) throw postsResult.error;

      setPhotos(photosResult.data || []);
      setPosts(postsResult.data || []);
      
      if (audioResult.data) {
        setAudio(audioResult.data);
      }
    } catch (err: any) {
      setError(err.message);
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

  const handleAddToOrder = () => {
    setOrderQuantity(prev => prev + 1);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
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
      {hasAudio && audio && (
        <audio
          ref={audioRef}
          src={audio.url}
          loop={audio.playback_mode === 'repeat_all' || audio.playback_mode === 'mix'}
          onEnded={() => {
            if (audio.playback_mode === 'repeat_one') {
              audioRef.current?.play();
            }
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{collection?.name}</h1>
        </div>
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

          {/* Volume */}
          {hasAudio && (
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
