FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY frontend/package*.json ./
RUN npm install

# Копируем исходный код
COPY frontend/ ./

# Принимаем аргумент и устанавливаем переменную окружения
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Выводим для отладки (важно!)
RUN echo "REACT_APP_API_URL during build: $REACT_APP_API_URL"

# Собираем приложение
RUN npm run build

# Устанавливаем serve
RUN npm install -g serve

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]




#FROM node:18-alpine

#WORKDIR /app

# Копируем package.json и package-lock.json
#COPY frontend/package*.json ./

# Устанавливаем зависимости
#RUN npm install

# Копируем весь исходный код фронтенда
#COPY frontend/ ./

# Собираем приложение
#RUN npm run build

# Устанавливаем serve для продакшена
#RUN npm install -g serve

#EXPOSE 3000

# Запускаем сервер с собранными файлами
#CMD ["serve", "-s", "build", "-l", "3000"]
