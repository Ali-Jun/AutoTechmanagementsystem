# Auto Tech Management System

Full-stack vehicle service and repair management portal described in `Auto_Tech_Management_System_Documentation.docx`.

## Current Build

- React + React Router dashboard
- Laravel REST API source in `backend`
- Laravel Sanctum token authentication
- MySQL migrations and seed data
- Role-aware flows for admin, customer, and mechanic
- Local seeded data for users, vehicles, services, bookings, invoices, payments, and feedback
- PKR-based service pricing, invoices, and payment recording
- Axios API client configured for Laravel endpoints

## Run

```bash
npm.cmd install
npm.cmd run dev
```

## Laravel API

PHP, Composer, and MySQL are required for the backend.

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Point the frontend at the API:

```bash
copy .env.example .env
npm.cmd run dev
```

`VITE_API_URL` defaults to `http://127.0.0.1:8000/api`.

## Deploy

Build output is generated in `dist`.

```bash
npm.cmd run build
```

Recommended static host settings:

- Build command: `npm run build`
- Publish/output directory: `dist`
- SPA fallback: configured in `vercel.json` and `netlify.toml`

Demo accounts all use the password `password`:

- `admin@autotech.test`
- `customer@autotech.test`
- `mechanic@autotech.test`

## Laravel API Contract

- `POST /login`
- `POST /register`
- `GET /services`
- `POST /bookings`
- `GET /bookings`
- `PUT /bookings/{id}`
- `GET /invoices`
- `GET /payments`
- `POST /payments`
- `GET /feedback`
- `POST /feedback`
- `GET /reports`
