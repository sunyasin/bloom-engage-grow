# План реализации страницы "Финансы"

## Задача
Добавить в кабинет `/profile` кнопку "Финансы". Страница с одной таблицей, объединяющей данные подписок и выплат.

---

## UI Структура

### В Кабинете (MyProfile.tsx)
```
┌────────────────────────────────────────┐
│  💰 Финансы  (кнопка)                  │
└────────────────────────────────────────┘
```

### Страница Финансы (/profile/finances)
```
┌─────────────────────────────────────────────────────┐
│ 💰 Финансы                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [<] Январь 2025 [>]   (переключатель месяцев)      │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Сообщество │ Tier │ Оплачено │ Выплачено     │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Community A│ Pro  │ 500₽     │ 0₽            │  │
│  │ Community B│ Basic│ 200₽     │ 200₽          │  │
│  │ Community C│ VIP  │ 1000₽    │ 500₽          │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Итого к выплате: 700₽                              │
│  Итого выплачено: 700₽                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Структура таблицы

### Колонки
1. **Сообщество** - название из `communities.name`
2. **Tier** - название тарифа из `subscription_tiers.name`
3. **Оплачено** - сумма из `memberships`/`transactions` (все поступления)
4. **Выплачено** - сумма из `community_payouts`/`transactions` (если есть запись, иначе 0)

### Источники данных

**Подписки (оплачено):**
```sql
SELECT 
  c.name as community_name,
  st.name as tier_name,
  SUM(t.amount) as total_paid
FROM transactions t
JOIN communities c ON t.community_id = c.id
JOIN subscription_tiers st ON t.subscription_tier_id = st.id
WHERE t.user_id = auth.uid()
  AND t.status = 'succeeded'
  AND t.payout_id IS NULL  -- не включено в выплату
  AND DATE_TRUNC('month', t.created_at) = :selectedMonth
GROUP BY c.id, c.name, st.id, st.name
```

**Выплаты (выплачено):**
```sql
SELECT 
  c.name as community_name,
  st.name as tier_name,
  SUM(cp.amount) as total_payout
FROM community_payouts cp
JOIN communities c ON cp.community_id = c.id
LEFT JOIN transactions t ON cp.id = t.payout_id
LEFT JOIN subscription_tiers st ON t.subscription_tier_id = st.id
WHERE cp.author_id = auth.uid()
  AND DATE_TRUNC('month', cp.paid_at) = :selectedMonth
GROUP BY c.id, c.name, st.id, st.name
```

---

## Фильтр периода

**UI:** Переключатель месяца со стрелками
- [<] Январь 2025 [>]
- По умолчанию: текущий месяц
- Логика:
  - Влево: предыдущий месяц
  - Вправо: следующий месяц
  - Ограничение: не ранее даты регистрации пользователя

**Технически:**
```typescript
const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

const prevMonth = () => {
  setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
};

const nextMonth = () => {
  const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
  if (next <= new Date()) {
    setCurrentMonth(next);
  }
};
```

---

## Итоги

Под таблицей выводить:
1. **Итого к выплате** - SUM(Оплачено) - SUM(Выплачено)
2. **Итого выплачено** - SUM(Выплачено)

---

## Кнопка "Финансы" в MyProfile.tsx

Добавить в секцию с другими кнопками:
```tsx
<Button 
  variant="outline" 
  onClick={() => navigate('/profile/finances')}
  className="gap-2"
>
  <Wallet className="h-4 w-4" />
  Финансы
</Button>
```

---

## Изменения в App.tsx

```tsx
import FinancePage from "./pages/FinancePage";

// Добавить маршрут:
<Route path="/profile/finances" element={<FinancePage />} />
```

---

## Новые файлы

### `src/pages/FinancePage.tsx`
Основная страница с:
- Навигацией "← В Кабинет"
- Переключателем месяца
- Таблицей финансов
- Итогами

### `src/components/finance/FinanceTable.tsx`
Компонент таблицы с:
- Загрузкой данных
- Отображением строк
- Группировкой (опционально)

### `src/components/finance/MonthSelector.tsx`
Компонент переключателя месяца со стрелками

### `src/hooks/useFinanceData.ts`
Хук для загрузки данных подписок и выплат

---

## RPC функции Supabase (опционально)

Для оптимизации можно создать одну RPC функцию:

```sql
CREATE OR REPLACE FUNCTION get_finance_data(
  user_uuid UUID,
  month_date TIMESTAMPTZ
)
RETURNS TABLE (
  community_name TEXT,
  tier_name TEXT,
  total_paid DECIMAL,
  total_payout DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Объединение данных подписок и выплат
  ...
END;
$$
```
