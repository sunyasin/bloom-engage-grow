# Backend Setup - Quick Start Guide

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните:

```env
# Supabase (получите в Supabase Dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Backend
PORT=3001
FRONTEND_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3001

# YooKassa (получите на https://yookassa.ru)
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

**Где взять ключи:**
- Supabase: Dashboard → Settings → API
- YooKassa: https://yookassa.ru → Настройки → Протокол API

### 3. Запуск проекта

**Вариант 1: Frontend и Backend вместе**
```bash
npm run dev:all
```

**Вариант 2: Отдельно**

Терминал 1:
```bash
npm run dev
```

Терминал 2:
```bash
npm run dev:backend
```

### 4. Настройка Webhook (для локальной разработки)

Установите ngrok:
```bash
npm install -g ngrok
ngrok http 3001
```

Скопируйте URL и добавьте в ЮKassa Dashboard:
```
https://xxxxx.ngrok.io/api/payments/webhook/yookassa
```

## Структура Backend

```
server/
├── index.js                 # Express сервер
├── config/
│   └── supabase.js         # Supabase клиент
├── services/
│   └── yookassa.js         # YooKassa API
├── middleware/
│   └── auth.js             # JWT аутентификация
├── controllers/
│   └── paymentsController.js
└── routes/
    └── payments.js
```

## API Endpoints

### POST /api/payments/create-subscription
Создание платежа
- Требует аутентификации
- Body: `{ communityId, subscriptionTierId }`

### POST /api/payments/webhook/yookassa
Webhook от ЮKassa
- Публичный endpoint
- Обрабатывает уведомления о платежах

### GET /api/payments/memberships
Получение подписок пользователя
- Требует аутентификации
- Query: `?communityId=uuid` (опционально)

## Тестирование

### Тестовая карта МИР

```
Номер: 5555 5555 5555 4444
Срок: 12/25
CVC: 123
```

### Проверка работы

1. Запустите frontend и backend
2. Войдите в систему
3. Перейдите в любое сообщество
4. Создайте план подписки (если владелец)
5. Попробуйте подписаться
6. Используйте тестовую карту

## Troubleshooting

### CORS ошибки
Проверьте `FRONTEND_URL` в `.env`

### 401 Unauthorized
Проверьте `SUPABASE_SERVICE_ROLE_KEY`

### Webhook не работает
Используйте ngrok для локальной разработки

### Payment не создается
Проверьте ключи ЮKassa в `.env`

## Production

```bash
# Build frontend
npm run build

# Start backend
npm run start:backend
```

Рекомендуется использовать PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name backend
pm2 save
```

## Документация

Полная документация: `YOOKASSA_EXPRESS_INTEGRATION.md`
