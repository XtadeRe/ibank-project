FROM php:8.2-fpm

# Установка зависимостей
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Установка PHP расширений
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Composer не нужен для runtime, только для разработки
# COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Копируем ВЕСЬ код (vendor уже есть в репозитории)
COPY backend/ ./

# Создаем папки для кэша и логов
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Генерируем ключ приложения (будет выполнен при запуске, а не при сборке)
# RUN php artisan key:generate --no-interaction

EXPOSE 9000

CMD ["php-fpm"]
