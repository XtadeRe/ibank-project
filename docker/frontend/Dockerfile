FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY frontend/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь исходный код фронтенда
COPY frontend/ ./

# Собираем приложение
RUN npm run build

# Устанавливаем serve для продакшена
RUN npm install -g serve

EXPOSE 3000

# Запускаем сервер с собранными файлами
CMD ["serve", "-s", "build", "-l", "3000"]
