# Auto Tech Management System

React MVP for the vehicle service and repair management portal described in `Auto_Tech_Management_System_Documentation.docx`.

## Current Build

- React + React Router dashboard
- Role-aware flows for admin, customer, and mechanic
- Local seeded data for users, vehicles, services, bookings, invoices, payments, and feedback
- PKR-based service pricing, invoices, and payment recording
- Mock API-style actions that can later be replaced by Laravel REST endpoints

## Run

```bash
npm.cmd install
npm.cmd run dev
```

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

The frontend is organized around the documented endpoints:

- `POST /login`
- `POST /register`
- `GET /services`
- `POST /bookings`
- `GET /bookings`
- `PUT /bookings/{id}`
- `GET /invoices`

Once PHP, Composer, Laravel, and MySQL are installed, replace the local action layer in `src/App.jsx` with Axios calls to the Laravel API.
