#!/bin/bash
set -e

# Ждем готовности MySQL
until nc -z db 3306; do
    echo "Waiting for MySQL to be ready..."
    sleep 2
done

# Генерируем ключ, если его нет
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Генерируем ключ приложения
php artisan key:generate --no-interaction

# Выполняем миграции
php artisan migrate --force

# Очищаем кэш
php artisan config:clear
php artisan cache:clear

# Запускаем PHP-FPM
exec php-fpm
