# Auto Tech Laravel API

Laravel REST API for the Auto Tech Management System.

## Requirements

- PHP 8.2+
- Composer
- MySQL

## Setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Demo accounts use password `password`:

- `admin@autotech.test`
- `customer@autotech.test`
- `mechanic@autotech.test`

## Main Endpoints

- `POST /api/login`
- `POST /api/register`
- `GET /api/services`
- `GET /api/bookings`
- `POST /api/bookings`
- `PUT /api/bookings/{booking}`
- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/payments`
- `POST /api/payments`
- `GET /api/feedback`
- `POST /api/feedback`
- `GET /api/reports`
