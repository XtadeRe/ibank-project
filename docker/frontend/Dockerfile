FROM node:18-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

# Копируем весь код фронтенда
COPY frontend/ ./

RUN npm run build
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
