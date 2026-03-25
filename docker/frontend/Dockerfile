FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY frontend/package*.json ./
RUN npm install

# Копируем исходный код
COPY frontend/ ./

# Принимаем переменную на этапе сборки
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Собираем приложение (здесь переменная подставляется в код)
RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]