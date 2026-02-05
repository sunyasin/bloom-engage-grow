import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  id: string;           // photo_<id> или post_<id>
  type: 'photo' | 'post';
  itemId: number;       // ID фото или поста
  authorId: string;     // ID автора коллекции
  name: string;         // Название фото/поста
  price: number;        // Цена
  quantity: number;     // Количество
  collectionName: string;
}

interface Cart {
  [authorId: string]: CartItem[];
}

interface CartContextType {
  cart: Cart;
  totalItems: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (authorId: string, itemId: string) => void;
  clearCart: () => void;
  getAuthorCart: (authorId: string) => CartItem[];
  getTotalPrice: () => number;
}

const CART_STORAGE_KEY = 'gallery_cart';

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const { toast } = useToast();

  // Загрузка корзины из sessionStorage при инициализации
  useEffect(() => {
    try {
      const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        // Валидация структуры данных
        if (typeof parsedCart === 'object' && parsedCart !== null) {
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error('Error loading cart from sessionStorage:', error);
    }
  }, []);

  // Сохранение корзины в sessionStorage при изменении
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to sessionStorage:', error);
    }
  }, [cart]);

  // Вычисление общего количества товаров
  const totalItems = Object.values(cart).reduce((sum, authorItems) => {
    return sum + authorItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  // Добавление товара в корзину
  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const authorCart = prev[item.authorId] || [];
      
      // Проверяем, есть ли уже этот товар
      const existingIndex = authorCart.findIndex(i => i.id === item.id);
      
      let newAuthorCart: CartItem[];
      
      if (existingIndex >= 0) {
        // Товар уже есть - увеличиваем количество
        newAuthorCart = [...authorCart];
        newAuthorCart[existingIndex] = {
          ...newAuthorCart[existingIndex],
          quantity: newAuthorCart[existingIndex].quantity + 1
        };
      } else {
        // Новый товар
        newAuthorCart = [...authorCart, { ...item, quantity: 1 }];
      }
      
      toast({
        title: 'Добавлено в корзину',
        description: `${item.name}`,
        duration: 2000,
      });
      
      return {
        ...prev,
        [item.authorId]: newAuthorCart
      };
    });
  }, [toast]);

  // Удаление товара из корзины
  const removeItem = useCallback((authorId: string, itemId: string) => {
    setCart(prev => {
      const authorCart = prev[authorId];
      if (!authorCart) return prev;
      
      const newAuthorCart = authorCart.filter(i => i.id !== itemId);
      
      toast({
        title: 'Удалено из корзины',
        duration: 2000,
      });
      
      if (newAuthorCart.length === 0) {
        const { [authorId]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [authorId]: newAuthorCart
      };
    });
  }, [toast]);

  // Очистка всей корзины
  const clearCart = useCallback(() => {
    setCart({});
    toast({
      title: 'Корзина очищена',
      duration: 2000,
    });
  }, [toast]);

  // Получить товары конкретного автора
  const getAuthorCart = useCallback((authorId: string) => {
    return cart[authorId] || [];
  }, [cart]);

  // Общая сумма заказа
  const getTotalPrice = useCallback(() => {
    return Object.values(cart).reduce((sum, authorItems) => {
      return sum + authorItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0);
  }, [cart]);

  return (
    <CartContext.Provider value={{
      cart,
      totalItems,
      addItem,
      removeItem,
      clearCart,
      getAuthorCart,
      getTotalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
