# Docker Agent

Backend-сервис на Node.js/Express для оркестрации Docker-стеков через docker-compose.

Описание и требования: см. файл **`DESCRIPTION_RU.md`**.

## Быстрый старт
1) Установить зависимости:
```bash
npm ci
```

2) Запустить сервер:
```bash
npm start
```

3) Проверить health:
- `http://localhost:3001/api/health`

