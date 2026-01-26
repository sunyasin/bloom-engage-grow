

# План: Исправление отображения Telegram ID на странице профиля

## Обнаруженная проблема

В таблице `profiles` существуют две разные колонки для Telegram:
- `telegram_user_id` (bigint) — актуальная колонка, куда Edge Function записывает ID
- `telegram_id` (text) — устаревшая колонка, которую читает страница профиля

Бот успешно записал `telegram_user_id = 274151371`, но UI отображает пустую колонку `telegram_id`.

## Изменения

### 1. Файл: `src/pages/MyProfile.tsx`

Заменить чтение из `telegram_id` на `telegram_user_id`:

```typescript
// Было:
value={profile.telegram_id || 'Не привязан'}

// Станет:
value={profile.telegram_user_id ? String(profile.telegram_user_id) : 'Не привязан'}
```

### 2. Файл: `src/components/CoursesTab.tsx`

Обновить проверку привязки Telegram при покупке:

```typescript
// Было:
if (!userProfile?.telegram_id) {

// Станет:
if (!userProfile?.telegram_user_id) {
```

Также обновить интерфейс `UserProfile` и запрос к базе данных.

## Результат

После исправления:
- Страница профиля будет корректно показывать привязанный Telegram ID
- Проверка при покупке будет использовать правильную колонку
- Пользователи с уже привязанным Telegram смогут оплачивать без повторной привязки

## Техническая информация

- Колонка `telegram_id` (text) — устаревшая, можно удалить в будущем
- Колонка `telegram_user_id` (bigint) — актуальная, используется Edge Function
- Текущий пользователь уже имеет привязку: `telegram_user_id = 274151371`

