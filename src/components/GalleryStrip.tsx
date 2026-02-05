import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GalleryStripProps {
  title: string;
  items: {
    id: number | string;
    thumbnail_url: string | null;
    name: string;
    price?: number;
    url?: string;
  }[];
  language: string;
}

export function GalleryStrip({ title, items, language }: GalleryStripProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleItemClick = (id: number | string) => {
    // Всегда возвращаем на вкладку ?tab=gallery
    navigate(`/gallery/${id}`, { state: { returnTo: `${window.location.pathname}?tab=gallery` } });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="relative">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Items Strip */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
          onScroll={checkScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-[130px] cursor-pointer group"
              onClick={() => handleItemClick(item.id)}
            >
              <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted mb-2 relative h-[160px]">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                {item.price !== undefined && item.price > 0 && (
                  <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-sm font-medium px-2 py-1 rounded">
                    {item.price} ₽
                  </div>
                )}
              </div>
              <p className="font-medium text-sm truncate">{item.name}</p>
            </div>
          ))}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
