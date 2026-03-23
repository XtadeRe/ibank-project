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

# Копируем код
COPY backend/ ./

# Устанавливаем зависимости только если есть composer.json
RUN if [ -f composer.json ]; then \
        composer install --no-interaction --no-progress --optimize-autoloader || echo "Composer install failed, continuing..."; \
    else \
        echo "No composer.json found, skipping composer install"; \
    fi

# Создаем необходимые папки
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
