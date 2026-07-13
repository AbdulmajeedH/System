# نظام إدارة الأعمال — Restaurant Business Management System

Internal business management web application for a restaurant, café, and mini-market operating inside a college, supplied by one central warehouse.

**This is NOT a POS system.** Sales stay fully manual — each department submits one daily/shift income summary instead of recording individual transactions.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL 16 + Prisma 7 (driver adapter)
- Arabic RTL by default, mobile-first UI
- Server Actions + Zod validation, custom session auth, role-based access control
- Vitest (unit + integration tests)

## Phase 1 modules

| Module | Highlights |
|---|---|
| Authentication & users | bcrypt + DB sessions, activate/deactivate, password reset, full audit |
| Daily income | 1–2 minute mobile closing form, auto totals, cash-difference reason, duplicate prevention, review/approve flow, important-product counts |
| Expenses | Categories, receipts, threshold-based approvals |
| Purchase invoices | Manual entry with line items and VAT, duplicate detection, approval thresholds (500 / 2000 SAR), warehouse receipt |
| Inventory | Item master with units & conversions, per-location balances, **immutable movement ledger** (no direct quantity edits), moving-average cost |
| Stock requests & transfers | Two-sided workflow: request → approve (full/partial) → prepare → deliver → department confirmation with received/damaged/missing |
| Stock counts | Count sheets with system snapshot, difference values, threshold-routed approval, adjustment posting |
| Damage/waste/expiry | Photo evidence, estimated cost, approvals, ledger write-off |
| Attendance | Check-in/out and breaks with a state machine, warnings, manager report |
| Approvals | Configurable rule engine (type + amount band + department + role) with unified inbox |
| Dashboard | Role-scoped stats, 14-day income trend, income by department |
| Audit log | Every sensitive action recorded; viewer for the owner |

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

Default password for **all** seeded users: `Passw0rd!` (change in any real deployment).

| Email | Role |
|---|---|
| `owner@rbms.local` | Owner — everything |
| `gm@rbms.local` | Operations manager — reviews & approvals |
| `restaurant@rbms.local` | Restaurant manager |
| `cafe@rbms.local` | Café manager |
| `minimarket@rbms.local` | Mini-market manager |
| `purchasing@rbms.local` | Purchasing officer |
| `warehouse@rbms.local` | Warehouse manager |
| `employee@rbms.local` | Employee (attendance only) |

## Tests

```bash
# one-time: create the test database (matches DATABASE_URL_TEST in .env.example)
createdb rbms_test   # or: docker compose exec postgres createdb -U rbms rbms_test

npm test
```

Unit tests cover the money calculations, approval-rule matching, unit conversion / moving-average cost, and the attendance state machine. Integration tests run the inventory ledger and approval workflows against the real test database, including the balance-equals-sum-of-movements invariant.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (integration tests need PostgreSQL running) |
| `npx prisma migrate dev` | Apply/create migrations |
| `npx prisma db seed` | Seed data |

## Project structure

```
prisma/            Prisma schema, migrations, seed
src/app/(auth)/    login
src/app/(app)/     dashboard, income, expenses, invoices, suppliers,
                   inventory, stock-requests, stock-counts, damages,
                   attendance, approvals, users, audit-log
src/app/api/files/ authenticated attachment serving
src/lib/auth/      sessions, password hashing, RBAC (permissions.ts)
src/lib/services/  inventory ledger, approvals engine, income math,
                   attendance state machine, audit writer, storage
src/lib/i18n/ar.ts typed Arabic dictionary (all UI strings)
src/components/    UI kit, layout (RTL sidebar + mobile bottom nav)
tests/             Vitest unit + integration suites
uploads/           local file storage (dev only, gitignored)
```

## Deploying to Vercel

Vercel can't run Docker or keep files on disk, so you need a hosted database and object storage:

1. **Database** — create a free PostgreSQL database on [Neon](https://neon.tech) (also available directly from the Vercel dashboard under **Storage → Create Database → Neon**). Copy the **pooled** connection string.
2. **File storage** — create an S3-compatible bucket (Cloudflare R2 has a free tier, or AWS S3 / Supabase Storage) and an access key for it.
3. **Import the repo** at [vercel.com/new](https://vercel.com/new), and under *Build and Output Settings* set the **Build Command** to:
   ```
   npm run vercel-build
   ```
   (runs `prisma generate && next build` — the build does not touch the database.)
4. **Environment variables** (Project → Settings → Environment Variables):
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Neon **pooled** connection string (used by the running app) |
   | `DIRECT_DATABASE_URL` | the Neon **direct/unpooled** connection string (used by `migrate deploy` during the build) |
   | `AUTH_SECRET` | output of `openssl rand -hex 32` |
   | `STORAGE_DRIVER` | `s3` |
   | `S3_BUCKET` / `S3_REGION` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | from step 2 (`S3_REGION=auto` and set `S3_ENDPOINT` for R2; omit `S3_ENDPOINT` for AWS) |
5. **Initialize the database once** — no terminal needed: open the Neon console → **SQL Editor**, paste the full contents of [`prisma/production-setup.sql`](prisma/production-setup.sql) (schema + seed data, generated from a verified database), and click **Run**. Must be run against an **empty** database.
   - Terminal alternative: `DATABASE_URL="<direct-string>" npx prisma migrate deploy && DATABASE_URL="<direct-string>" npx prisma db seed`
   - For **future schema changes**, run `npx prisma migrate deploy` against the direct URL (the Vercel build intentionally skips migrations).
6. Deploy, then log in with the seeded owner account and **immediately change the seeded passwords** from the users screen.

## Architecture rules

- All stock changes go through `InventoryMovement` transactions — never edit balances directly.
- Money is `Decimal(12,2)`, quantities `Decimal(12,3)` — never floats.
- Every sensitive mutation writes an `AuditLog` entry.
- Department-scoped users can never read other departments' financial data (enforced in queries).
- Financial/inventory records are soft-deleted (`isActive`/`deletedAt`), never hard-deleted.
- File storage is behind a provider interface (`src/lib/services/storage`) — local disk in dev, S3-compatible adapter slot for production.
- Attendance and (future) invoice-OCR are behind provider abstractions so Telegram/WhatsApp/QR and AI extraction can plug in during Phase 2/3.
