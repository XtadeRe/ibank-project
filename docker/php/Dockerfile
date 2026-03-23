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
    netcat-openbsd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Установка PHP расширений
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

WORKDIR /var/www/html

# Копируем ВЕСЬ код (vendor уже есть в репозитории)
COPY backend/ ./

# Создаем папки для кэша и логов
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 777 storage \
    && chmod -R 777 bootstrap/cache \
    && chown -R www-data:www-data storage \
    && chown -R www-data:www-data bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
