FROM php:8.2-cli

# Установка зависимостей
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    nodejs \
    npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Установка PHP расширений
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Установка Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Увеличиваем лимит памяти для Composer
ENV COMPOSER_MEMORY_LIMIT=-1

WORKDIR /var/www/html

# Копируем composer файлы
COPY backend/composer.json backend/composer.lock ./

# Устанавливаем зависимости
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Копируем остальной код
COPY backend/ ./

# Создаем папки для кэша и логов
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 777 storage \
    && chmod -R 777 bootstrap/cache

EXPOSE 8000

CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=8000"]
