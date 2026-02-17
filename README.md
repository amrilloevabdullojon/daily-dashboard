# Daily Report Dashboard

Дашборд для просмотра ежедневных отчётов: Jira, Google Calendar, Gmail, Google Tasks.

## Деплой на Vercel

### Способ 1: через GitHub (рекомендуется)

1. Создайте репозиторий на [github.com](https://github.com/new)
2. Загрузите файлы:
   ```bash
   git init
   git add .
   git commit -m "init: daily report dashboard"
   git remote add origin https://github.com/ВАШ_ЛОГИН/daily-dashboard.git
   git push -u origin main
   ```
3. Откройте [vercel.com](https://vercel.com) → **Add New Project**
4. Выберите ваш репозиторий → **Deploy**
5. Готово! Vercel даст вам URL вида `daily-dashboard.vercel.app`

### Способ 2: через Vercel CLI

```bash
npm install -g vercel
cd daily-dashboard
vercel
```

Следуйте инструкциям в терминале.

### Способ 3: drag & drop

1. Откройте [vercel.com/new](https://vercel.com/new)
2. Перетащите папку `daily-dashboard` прямо в браузер
3. Нажмите **Deploy**

## Структура проекта

```
daily-dashboard/
├── public/
│   └── index.html    # Главная страница дашборда
├── vercel.json       # Конфиг Vercel
└── README.md
```

## Настройка данных

После деплоя откройте приложение → кнопка **⚙ Настройки** → введите:
- Jira Domain, Email, API Token
- Telegram Bot Token, Chat ID
