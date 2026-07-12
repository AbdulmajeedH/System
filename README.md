# نظام إدارة الأعمال — Restaurant Business Management System

Internal business management web application for a restaurant, café, and mini-market operating inside a college, supplied by one central warehouse.

**This is NOT a POS system.** Sales stay fully manual — each department submits one daily/shift income summary instead of recording individual transactions.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL 16 + Prisma ORM
- Arabic RTL by default, mobile-first UI
- Server Actions + Zod validation, custom session auth, role-based access control

## Local setup

Requirements: Node.js 20+, Docker (or a local PostgreSQL 16).

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Configure environment
cp .env.example .env
# then set AUTH_SECRET to a random value: openssl rand -hex 32

# 3. Install dependencies
npm install

# 4. Create the database schema and seed data
npx prisma migrate dev
npx prisma db seed

# 5. Run the app
npm run dev
```

The app runs at http://localhost:3000.

### Seeded accounts

See `prisma/seed.ts`. Default password for all seeded users is documented there (change in production).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx prisma migrate dev` | Apply/create migrations |
| `npx prisma db seed` | Seed data |
| `npm test` | Run tests |

## Project structure

```
prisma/          Prisma schema, migrations, seed
src/app/         Next.js App Router pages (RTL Arabic)
src/lib/         auth, db, i18n, domain services, validations
src/components/  UI kit and layout components
uploads/         local file storage (dev only, gitignored)
```
