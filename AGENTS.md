# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Restaurant Business Management System — internal management app (NOT a POS) for a restaurant, café, and mini-market with one central warehouse. Departments submit daily/shift income summaries; the system manages expenses, purchasing, inventory (immutable movement ledger), stock transfers/counts, damage, attendance, approvals, dashboards, and audit logs. UI is Arabic RTL by default, mobile-first.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (must pass before committing)
- `npm run lint` — ESLint
- `npx prisma migrate dev` — apply/create migrations
- `npx prisma db seed` — seed data (see `prisma/seed.ts`)
- `npm test` — Vitest (unit + integration; integration tests need the local PostgreSQL running)

Local PostgreSQL: `docker compose up -d` (or a native cluster); connection in `.env` (`DATABASE_URL`).

## Architecture

- Next.js App Router, TypeScript, Tailwind v4. Mutations are Server Actions validated with Zod (`src/lib/validations/`).
- Custom session auth (bcryptjs + DB-backed `Session` table, httpOnly cookie) in `src/lib/auth/`. RBAC: 6 fixed roles (enum on `User`) + department scoping; permission checks via `can()` in `src/lib/auth/permissions.ts` — enforce in every server action.
- Domain services in `src/lib/services/`: inventory ledger posting (all stock changes go through `InventoryMovement` transactions — never edit balances directly), approval rule engine, audit writer, storage abstraction (local disk now, S3-ready interface).
- Money is `Decimal(12,2)`, quantities `Decimal(12,3)` — never floats. Serialize Decimals to strings before passing to client components.
- All UI strings live in the typed dictionary `src/lib/i18n/ar.ts` — no hardcoded strings in components. Default locale Arabic, `dir="rtl"`; use logical CSS properties (ms-/me-/ps-/pe-, start/end) instead of left/right.

## Rules

- No POS features: no checkout screens, no per-transaction sales entry.
- Never update inventory without a confirmed human action; no direct quantity edits.
- Financial/inventory records are never hard-deleted — use soft deletion (`isActive`/`deletedAt`).
- Every sensitive mutation writes an `AuditLog` entry.
- Department-scoped users must never see other departments' financial data — check scoping in queries, not just UI.
