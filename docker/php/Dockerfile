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
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Установка PHP расширений
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Установка OPcache
RUN docker-php-ext-install opcache

# Настройка OPcache
RUN { \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.interned_strings_buffer=8'; \
        echo 'opcache.max_accelerated_files=10000'; \
        echo 'opcache.revalidate_freq=0'; \
        echo 'opcache.fast_shutdown=1'; \
        echo 'opcache.enable_cli=1'; \
    } > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Установка Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

ENV COMPOSER_MEMORY_LIMIT=-1

WORKDIR /var/www/html

# Копируем composer файлы
COPY backend/composer.json backend/composer.lock ./

# Устанавливаем зависимости
RUN composer install --no-dev --no-scripts --no-interaction --optimize-autoloader

# Копируем остальной код
COPY backend/ ./

# Копируем .env.example если есть
RUN if [ -f .env.example ]; then cp .env.example .env; fi

# Выполняем скрипты после установки
RUN composer run-script post-autoload-dump

# Создаем папки для кэша и логов
RUN mkdir -p storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chmod -R 777 storage \
    && chmod -R 777 bootstrap/cache

# Кэшируем конфигурацию для ускорения
RUN php artisan config:cache || true && \
    php artisan route:cache || true && \
    php artisan view:cache || true

EXPOSE 8000

# Запускаем с очисткой кэша перед запуском
CMD ["sh", "-c", "php artisan config:clear && php artisan cache:clear && php artisan view:clear && php artisan route:clear && php -S 0.0.0.0:8000 -t public"]