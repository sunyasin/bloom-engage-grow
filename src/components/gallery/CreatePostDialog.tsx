import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import RichTextEditor from '@/components/RichTextEditor';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: number;
  userId: string;
  onPostCreated: () => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  collectionId,
  userId,
  onPostCreated
}: CreatePostDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('gallery_posts')
        .insert({
          title,
          content_html: content,
          price: price ? parseFloat(price) : null,
          collection_id: collectionId,
          user_id: userId
        });

      if (error) throw error;

      setTitle('');
      setContent('');
      setPrice('');
      onPostCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить пост</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="grid gap-4 py-4 flex-1 overflow-auto">
            <div className="grid gap-2">
              <Label htmlFor="title">Заголовок</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Заголовок поста"
              />
            </div>
            <div className="grid gap-2">
              <Label>Содержимое</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                language="ru"
                placeholder="Напишите ваш пост..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Цена (₽, необязательно)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !content.trim()}>
              {loading ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
