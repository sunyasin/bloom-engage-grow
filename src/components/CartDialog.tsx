import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { Trash2, ShoppingCart, X } from 'lucide-react';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDialog({ open, onOpenChange }: CartDialogProps) {
  const { cart, removeItem, clearCart, getTotalPrice } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Группируем товары по авторам для отображения
  const authorCarts = Object.entries(cart).map(([authorId, items]) => ({
    authorId,
    items,
    authorTotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }));

  const totalPrice = getTotalPrice();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Имитация отправки заказа
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
    clearCart();
  };

  const handleClose = () => {
    setSubmitted(false);
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Заказ оформлен!</h3>
            <p className="text-muted-foreground mb-4">
              Спасибо за ваш заказ. Мы свяжемся с вами в ближайшее время.
            </p>
            <Button onClick={handleClose}>Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Корзина
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {authorCarts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Корзина пуста</p>
            </div>
          ) : (
            <div className="space-y-6">
              {authorCarts.map(({ authorId, items, authorTotal }) => (
                <div key={authorId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b">
                    <span className="font-medium">Автор: {authorId.slice(0, 8)}...</span>
                    <span className="font-semibold">{authorTotal.toLocaleString()} ₽</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.collectionName}</p>
                          <p className="text-sm text-muted-foreground">{item.price} ₽ × {item.quantity}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(authorId, item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Итоговая сумма */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-semibold">Итого:</span>
                  <span className="font-bold">{totalPrice.toLocaleString()} ₽</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center pt-4 border-t">
          {authorCarts.length > 0 && (
            <Button variant="outline" onClick={clearCart}>
              Очистить
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={authorCarts.length === 0 || isSubmitting}
            className={authorCarts.length > 0 ? "" : "ml-auto"}
          >
            {isSubmitting ? 'Оформление...' : 'Оформить заказ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
