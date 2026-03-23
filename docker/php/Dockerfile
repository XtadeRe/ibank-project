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

# Установка Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Копируем ВЕСЬ код сразу
COPY backend/ ./

# Устанавливаем зависимости (теперь artisan существует!)
RUN composer install --no-interaction --no-progress --optimize-autoloader

# Создаем папки для кэша и логов
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Генерируем ключ приложения (только если .env существует)
RUN if [ -f .env ]; then php artisan key:generate --no-interaction; fi

EXPOSE 9000

CMD ["php-fpm"]
