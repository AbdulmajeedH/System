# Feature Audit

Date: 2026-07-13  
Scope: read-only audit of the existing Next.js/Prisma application. The only repository change made for this task is this report.

## Executive summary

The application has a substantial operational backbone: custom DB-backed authentication, role-based navigation, department scoping in many financial workflows, Prisma models for the major restaurant-management domains, and server actions for income, expenses, invoices, inventory master data, stock requests/transfers, stock counts, damages, attendance, approvals, users, suppliers, audit logs, and attachment storage.

However, implementation completeness varies by module. CRUD/list/detail flows exist for most core entities, but several features are partial because they are missing edit screens, filters, dedicated reports, notification delivery, settings UI, complete attachment coverage, robust UI/Prisma parity, or full department/location scoping. Some high-risk areas were identified: file storage defaults to local disk unless `STORAGE_DRIVER=s3`, the S3 provider validates only `S3_BUCKET`, no settings page exists despite a permission and `SystemSetting` model, no notifications model/UI exists, `reports.view` has no reports route, and some actions trust form-submitted IDs without verifying active related records or ownership deeply enough.

## Status counts

| Classification | Count |
|---|---:|
| Fully implemented | 14 |
| Partially implemented | 21 |
| UI only / mock data | 0 |
| Backend only | 6 |
| Broken or incomplete | 7 |
| Not implemented | 7 |

Requested roll-up:

- Fully implemented features: **14**
- Partial features: **21**
- Mock or UI-only features: **0**
- Missing features: **7**

## Application routes

| Route | Files | Status | Evidence / notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Fully implemented | Redirect/landing behavior exists; protected app layout uses `requireUser` in `src/app/(app)/layout.tsx`. |
| `/login` | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/lib/auth/auth-actions.ts` | Fully implemented | Form calls `login`, validates credentials, creates DB session cookie. |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Partially implemented | Reads live aggregates from DB, but is a dashboard only; no drill-down reporting filters beyond current hardcoded summaries. |
| `/menu` | `src/app/(app)/menu/page.tsx` | Fully implemented | Mobile “more” menu renders permission-filtered nav items. |
| `/income` | `src/app/(app)/income/page.tsx` | Partially implemented | Live list with department scoping, but limited filtering/export/reporting. |
| `/income/new` | `src/app/(app)/income/new/page.tsx`, `src/app/(app)/income/income-form.tsx`, `src/app/(app)/income/actions.ts` | Partially implemented | Creates/updates DB submissions and important product counts; attachment support exists. Missing edit permission nuance and duplicate exception policy is basic. |
| `/income/[id]` | `src/app/(app)/income/[id]/page.tsx`, `review-buttons.tsx` | Partially implemented | Detail/review works for scoped users; attachments displayed. |
| `/income/[id]/edit` | `src/app/(app)/income/[id]/edit/page.tsx` | Partially implemented | Edit exists but audit should verify status restrictions before production use. |
| `/expenses` | `src/app/(app)/expenses/page.tsx` | Partially implemented | Live list with scoping. |
| `/expenses/new` | `src/app/(app)/expenses/new/page.tsx`, `expense-form.tsx`, `actions.ts` | Partially implemented | Creates DB expense, approval request, and attachments. No edit route. |
| `/expenses/[id]` | `src/app/(app)/expenses/[id]/page.tsx`, `decide-buttons.tsx` | Partially implemented | Detail/approval works, scoped by department. |
| `/invoices` | `src/app/(app)/invoices/page.tsx` | Partially implemented | Live purchase invoice list. |
| `/invoices/new` | `src/app/(app)/invoices/new/page.tsx`, `invoice-form.tsx`, `actions.ts` | Partially implemented | Creates invoice/items and approval request. No invoice attachment UI even though schema supports invoice attachments. |
| `/invoices/[id]` | `src/app/(app)/invoices/[id]/page.tsx`, `invoice-actions.tsx` | Partially implemented | Approval and warehouse receive actions exist; receive posts inventory movements. |
| `/invoices/[id]/edit` | `src/app/(app)/invoices/[id]/edit/page.tsx` | Partially implemented | Edit route exists for draft/rejected style lifecycle; needs manual status validation. |
| `/inventory` | `src/app/(app)/inventory/page.tsx` | Partially implemented | Live item list, balances, low-stock indicators. Search appears URL/UI-level only and needs server filtering confirmation. |
| `/inventory/new` | `src/app/(app)/inventory/new/page.tsx`, `item-form.tsx`, `actions.ts` | Partially implemented | Creates master items; no image upload despite `imageKey` in Prisma. |
| `/inventory/[id]` | `src/app/(app)/inventory/[id]/page.tsx` | Partially implemented | Detail shows balances and ledger movements. Department-location scoping needs review for non-`inventory.viewAll` users. |
| `/inventory/[id]/edit` | `src/app/(app)/inventory/[id]/edit/page.tsx` | Partially implemented | Updates master item fields. |
| `/inventory/categories` | `src/app/(app)/inventory/categories/page.tsx`, `categories/category-form.tsx` | Partially implemented | Create/list categories only; no edit/deactivate category UI. |
| `/stock-requests` | `src/app/(app)/stock-requests/page.tsx` | Partially implemented | Live request list; scoped for departments. |
| `/stock-requests/new` | `src/app/(app)/stock-requests/new/page.tsx`, `request-form.tsx`, `actions.ts` | Partially implemented | Creates request/items. |
| `/stock-requests/[id]` | `src/app/(app)/stock-requests/[id]/page.tsx`, `panels.tsx` | Partially implemented | Approval, warehouse stage advancement, transfer preparation, receipt confirmation and ledger postings exist, but lifecycle is simplified. |
| `/stock-counts` | `src/app/(app)/stock-counts/page.tsx` | Partially implemented | Live count list. |
| `/stock-counts/new` | `src/app/(app)/stock-counts/new/page.tsx`, `count-form.tsx`, `actions.ts` | Partially implemented | Creates count snapshot and approval request. |
| `/stock-counts/[id]` | `src/app/(app)/stock-counts/[id]/page.tsx`, `decide-buttons.tsx` | Partially implemented | Approval posts count adjustments through ledger. |
| `/damages` | `src/app/(app)/damages/page.tsx` | Partially implemented | Live list. |
| `/damages/new` | `src/app/(app)/damages/new/page.tsx`, `damage-form.tsx`, `actions.ts` | Partially implemented | Creates damage/expiry/waste and optionally posts movement after approval. Attachments supported. |
| `/damages/[id]` | `src/app/(app)/damages/[id]/page.tsx`, `decide-buttons.tsx` | Partially implemented | Detail/approval exists. |
| `/attendance` | `src/app/(app)/attendance/page.tsx`, `buttons.tsx`, `actions.ts` | Fully implemented | User can record attendance events; settings are read from DB defaults. |
| `/attendance/report` | `src/app/(app)/attendance/report/page.tsx` | Partially implemented | Department/all reports from DB, but no export/scheduling and no settings UI. |
| `/approvals` | `src/app/(app)/approvals/page.tsx` | Backend/list only | Lists pending approval requests, but decisions are performed from entity detail pages, not this page. |
| `/suppliers` | `src/app/(app)/suppliers/page.tsx` | Fully implemented | Live supplier list with manage permission. |
| `/suppliers/new` | `src/app/(app)/suppliers/new/page.tsx`, `supplier-form.tsx`, `actions.ts` | Fully implemented | Creates supplier with validation/audit. |
| `/suppliers/[id]/edit` | `src/app/(app)/suppliers/[id]/edit/page.tsx` | Fully implemented | Updates/soft-deactivates supplier. |
| `/users` | `src/app/(app)/users/page.tsx` | Fully implemented | Live list, permission-protected. |
| `/users/new` | `src/app/(app)/users/new/page.tsx`, `user-form.tsx`, `actions.ts` | Fully implemented | Creates users, hashes passwords, requires department for scoped roles. |
| `/users/[id]` | `src/app/(app)/users/[id]/page.tsx`, `manage-forms.tsx` | Fully implemented | Edit user, active toggle, password reset. |
| `/audit-log` | `src/app/(app)/audit-log/page.tsx` | Fully implemented | Paginated latest audit logs from DB. |
| `/api/files/[...key]` | `src/app/api/files/[...key]/route.ts` | Partially implemented | Authenticated file serving works, but authorization is based on uploader/same department rather than entity-specific access rules. |
| Settings route | none | Not implemented | `settings.manage` permission and `SystemSetting` model exist, but no UI/actions. |
| Reports route | none | Not implemented | `reports.view` permission exists; no `/reports` route or report module. |
| Notifications route | none | Not implemented | No Prisma notification model, no UI, no API/actions. |

## Feature inventory by module

### Authentication and sessions — Fully implemented

- Custom auth uses bcrypt verification and `Session` rows with httpOnly cookie handling in `src/lib/auth/auth-actions.ts`, `src/lib/auth/session.ts`, `src/lib/auth/password.ts`, and `src/lib/auth/cookie-name.ts`.
- Guards centralize `requireUser`, `requirePermission`, `actionUser`, and `actionPermission` in `src/lib/auth/guards.ts`.
- Evidence: Prisma `User` and `Session` models in `prisma/schema.prisma`; login UI in `src/app/(auth)/login/login-form.tsx`.

Known issues:
- Password reset token fields exist in Prisma but no forgot-password flow exists. Classification: Backend only.
- No rate limiting or account lockout was found on login. Classification: Broken or incomplete/security hardening gap.

### Roles, permissions, and navigation — Fully implemented with gaps

- Six fixed roles are defined in Prisma and mapped to permissions in `src/lib/auth/permissions.ts`.
- Sidebar/mobile bottom navigation is permission-filtered in `src/components/layout/nav.ts`, `src/components/layout/app-shell.tsx`, and `src/components/layout/nav-link.tsx`.
- Department scoping helpers exist: `canAccessDepartment` and `departmentScope`.

Known issues:
- Permission names exist for `reports.view` and `settings.manage`, but no corresponding feature route exists. Classification: Not implemented.
- Some pages use `requireUser` plus inline checks rather than `requirePermission`; this is acceptable but should be standardized.

### Department-level access — Partially implemented

Implemented:
- Income, expenses, stock requests, and many dashboard queries apply `departmentScope`/`canAccessDepartment`.
- File API restricts by uploader or uploader department.

Issues:
- Inventory detail/list access for department-scoped users needs stricter location scoping; `inventory.view` users can reach inventory pages and item detail movements, while `inventory.viewAll` is only partly used in page logic.
- Attachment access should be based on the attached entity and its department/location, not only uploader department.

### Dashboard — Partially implemented

- `src/app/(app)/dashboard/page.tsx` reads live income, expenses, recent submissions, department summaries, approvals, invoices, stock requests, low stock, attendance, purchases, and damage aggregates.
- No mock data was found.

Gaps:
- No configurable date ranges beyond current logic.
- No export/download.
- No dedicated reports pages despite `reports.view`.

### Daily income — Partially implemented

Implemented:
- List/new/detail/edit pages exist under `src/app/(app)/income/`.
- `saveIncome` validates with Zod in `src/lib/validations/income.ts`, computes totals in `src/lib/services/income.ts`, writes `DailyIncomeSubmission` and `ImportantProductDailyCount`, saves attachments, audits, and redirects.
- `reviewIncome` updates status and writes audit log.

Gaps/issues:
- Approval engine is not used for daily income exceptions despite `ApprovalTransactionType.DAILY_INCOME_EXCEPTION` in Prisma.
- Duplicate/exception rules should be reviewed manually.
- Important products can be counted, but no UI to manage `ImportantProduct` master list was found.

### Expenses — Partially implemented

Implemented:
- Create/list/detail/approve/reject flows exist; `createExpense` validates with `expenseFormSchema`, creates `Expense`, creates approval request, saves attachments, audits.
- Department scoping exists in create/detail/list.

Gaps:
- No edit/cancel route.
- `ExpenseCategory` model exists but no category management UI was found. Classification: Backend only.
- Category/supplier IDs are accepted from the form; existence is enforced by DB FKs but active-status validation is limited.

### Suppliers — Fully implemented

- Supplier list, create, edit, and soft activation/deactivation exist in `src/app/(app)/suppliers/` and `src/app/(app)/suppliers/actions.ts`.
- Actions validate with `supplierFormSchema`, write audit logs, and avoid hard deletion.

### Purchasing and invoices — Partially implemented

Implemented:
- Invoice list/create/detail/edit routes exist.
- `saveInvoice` creates invoice/items and approval request.
- `decideInvoice` approves/rejects through the approval service.
- `receiveInvoice` posts `PURCHASE_RECEIPT` inventory movements and updates moving average cost.

Gaps/issues:
- No invoice file upload UI, despite `AttachmentEntityType.PURCHASE_INVOICE` and `FileAttachment` support.
- Invoice form line unit selection is simplified: Prisma has `unitId`, but validation line schema does not expose selectable `unitId`; server appears to use item purchase unit.
- No supplier return workflow UI despite `SUPPLIER_RETURN` movement type.

### Inventory master data and ledger — Partially implemented

Implemented:
- Item list/new/detail/edit and category list/create exist.
- Inventory movements are inserted via `postMovement` in `src/lib/services/inventory.ts`; balances are updated inside transactions.
- Purchase receipt, transfer, damage/expiry, and count adjustment movement types are used.

Gaps/issues:
- No manual adjustment UI even though `MANUAL_ADJUSTMENT` exists in schema.
- No opening balance UI even though `OPENING_BALANCE` exists.
- No unit-definition or conversion management UI even though `UnitDef` and `UnitConversion` exist.
- No inventory item image upload despite `imageKey`.
- Batch tracking is in Prisma but not in the item form/workflows.

### Stock requests and transfers — Partially implemented

Implemented:
- Department creates requests; warehouse approves/rejects, prepares, marks ready/delivered; department confirms receipt.
- `confirmStockReceipt` posts `TRANSFER_OUT`, `TRANSFER_IN`, and damage movements through the ledger.

Gaps/issues:
- No standalone stock transfer route for transfers not tied to requests, despite `StockTransfer.requestId` being optional.
- Partial approvals/receipts exist in enums but workflow is simplified.
- Delivery proof/attachments not implemented despite `AttachmentEntityType.STOCK_TRANSFER`.

### Stock counts — Partially implemented

Implemented:
- Count creation snapshots system quantity, stores actual quantity and differences, requests approval, and approved counts post `COUNT_ADJUSTMENT` movements.

Gaps/issues:
- No attachments UI despite `AttachmentEntityType.STOCK_COUNT`.
- No recurring count schedules.
- No count edit/recount workflow before approval.

### Damaged, wasted, spoiled, expired products — Partially implemented

Implemented:
- Create/list/detail/approve/reject flows exist; approved records post `DAMAGE` or `EXPIRY` movements.
- Attachments supported.

Gaps/issues:
- No expiry alert/report based on batches because batch-level expiry data is not modeled in stock balances/movements.
- `estimatedCost` is user-entered/calculated in action context rather than a full costing workflow.

### Attendance — Partially implemented

Implemented:
- Users can check in/out and break start/end; attendance service derives allowed next events and warnings.
- Report page supports department/all visibility based on permissions.
- `SystemSetting` keys for attendance are read.

Gaps/issues:
- No attendance settings UI even though settings are consumed.
- No geofence/device policy UI.
- Attendance file attachment enum exists but no upload flow for attendance events.

### Approvals — Partially implemented/backend-centric

Implemented:
- Approval rules, requests, and actions are modeled.
- Approval service supports matching active rules and recording approval actions.
- Entity pages call `decideApproval` for expenses, invoices, damages, and stock counts.
- `/approvals` lists pending approval requests.

Gaps/issues:
- `/approvals` itself does not provide generic approve/reject buttons; users must open entity detail pages.
- No approval rule management UI. Classification: Backend only.
- Daily income exception approval type exists but is not wired.

### Notifications — Not implemented

- No notification Prisma model, route, UI component, server action, email/SMS/push integration, or in-app notification center was found.

### Reports — Not implemented as a module

- Dashboard and attendance report exist, but there is no reports route/menu item/action/export module even though `reports.view` permission exists.

### File uploads — Partially implemented

Implemented:
- `saveAttachments` validates JPEG/PNG/WebP/PDF up to 10MB and writes `FileAttachment` rows.
- `LocalStorageProvider` and `S3StorageProvider` exist behind `getStorage`.
- `/api/files/[...key]` serves authenticated files.

Issues likely to fail on Vercel:
- Default storage is local `uploads`, which is not durable on Vercel/serverless. Production must set `STORAGE_DRIVER=s3` and S3 credentials.
- S3 provider only explicitly throws if `S3_BUCKET` is missing; empty access key/secret can fail later at runtime.
- Attachment auth is not entity-specific.

### Audit logs — Fully implemented

- `AuditLog` model exists.
- Sensitive actions call `audit` across auth, users, suppliers, inventory, income, expenses, invoices, stock requests, stock counts, damages, attendance.
- `/audit-log` displays entries to users with `audit.view`.

### Settings — Not implemented

- `SystemSetting` model exists and attendance service reads attendance settings, but there is no settings page, navigation item, validation schema, or server action.

### Mobile and Arabic RTL — Fully implemented foundation

- Root layout sets `lang="ar"` and `dir="rtl"` in `src/app/layout.tsx`.
- App shell includes desktop sidebar and mobile bottom nav.
- Arabic dictionary exists in `src/lib/i18n/ar.ts`.

Issues:
- A grep found some hardcoded placeholder strings such as `0.00`, `0`, and `user@example.com`; these are mostly numeric/examples, but the rule “all UI strings in dictionary” should be manually audited for every component.

## Buttons that do nothing

No obvious `href="#"`, `alert(...)`, TODO placeholder button, or permanently unconnected mock button was found. Dynamic add/remove line buttons in invoice and stock request forms are client-side only by design and do modify form state.

Buttons/actions that are intentionally indirect:
- `/approvals` rows navigate to entity detail pages instead of deciding inline.
- Mobile “more” routes to `/menu`.

## Pages with placeholder content

No page with obvious placeholder text or mock data was found. The main missing modules simply have no routes: settings, reports, notifications, approval-rule management, expense-category management, important-product management, unit/conversion management.

## Forms not connected to the database

No submitted form was found that is clearly disconnected from the database. All major forms import server actions. Missing forms are noted above rather than existing as disconnected UI.

## Missing validations and integrity checks

- Active-state validation for selected related rows is inconsistent. Many forms filter active records in the UI, but server actions often rely on DB foreign keys rather than verifying the related row is still active.
- File API authorization should be tied to entity access logic.
- Login has no visible rate limiting.
- S3 env validation is incomplete.
- Some numeric validations use strings/regex then `Number(...)`; Decimal usage is good at persistence, but server logic should avoid JS number for meaningful money/quantity decisions where possible.

## Broken routes

No syntactically broken route was identified by inspection. Build must be run to confirm. Known missing routes are listed separately.

## Features that may fail on Vercel

- Local file uploads (`STORAGE_DIR`/`uploads`) are ephemeral. Use S3/R2/Supabase Storage with `STORAGE_DRIVER=s3`.
- Prisma migrations/seed are not automatically part of Vercel runtime; `DATABASE_URL` and generated Prisma client must be present. `vercel-build` runs `prisma generate && next build`.
- S3 credentials may fail at runtime because only bucket is hard-required in constructor.

## Local storage / localhost dependencies

- Local file storage defaults to `uploads` when `STORAGE_DRIVER` is not `s3`.
- Local PostgreSQL is documented via Docker Compose and `.env DATABASE_URL`; production requires external PostgreSQL.
- No hardcoded localhost URL was found in inspected source files.

## Missing environment variables

Required/expected:
- `DATABASE_URL` for Prisma PostgreSQL.
- `STORAGE_DRIVER=s3` for durable production uploads.
- For S3: `S3_BUCKET`, `S3_REGION` (or default `auto`), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, optional `S3_ENDPOINT`.
- `STORAGE_DIR` optional for local storage.

## Prisma/UI mismatches

- `SystemSetting` exists; no settings UI.
- `ApprovalRule` exists; no rule management UI.
- `ExpenseCategory` exists; no category management UI.
- `ImportantProduct` exists; no master-data UI.
- `UnitDef` and `UnitConversion` exist; no management UI.
- `InventoryItem.imageKey` and `batchTracking` exist; no image upload or batch workflow UI.
- `AttachmentEntityType` includes purchase invoices, stock counts, transfers, inventory items, and attendance events; upload UI appears only wired in income, expenses, and damages.
- `MovementType.OPENING_BALANCE`, `MANUAL_ADJUSTMENT`, `RETURN_TO_WAREHOUSE`, and `SUPPLIER_RETURN` are modeled but no dedicated UI was found.
- Password reset token fields exist; no forgot/reset-password route.

## Recommended priorities

1. Production readiness: configure durable file storage, validate all S3 env vars, document deployment envs, and run full build/test against a production-like DB.
2. Access control hardening: centralize entity-specific authorization, especially inventory details/movements and file attachments.
3. Complete missing admin modules: settings, approval rules, expense categories, important products, units/conversions.
4. Complete operational workflows: invoice attachments, stock-count attachments, transfer attachments, opening balance/manual adjustment, supplier returns, standalone stock transfers.
5. Add reports module with filters/export and align `reports.view` nav/route.
6. Add notifications model and in-app notification center for pending approvals, low stock, stock request lifecycle, and attendance anomalies.
7. Add security hardening: login rate limiting, audit of all server actions for active-row validation, CSRF posture review for server actions.

## Manual testing checklist

### Authentication/RBAC
- [ ] Login succeeds with seeded users for every role.
- [ ] Invalid login fails without creating sessions.
- [ ] Logout destroys the session and redirects appropriately.
- [ ] Each role sees only permitted nav items.
- [ ] Department manager cannot access another department's income/expense/stock request detail by URL.

### Income
- [ ] Create income with each payment method amount and verify totals/cash difference.
- [ ] Upload valid and invalid attachments.
- [ ] Review approve/reject flow and audit logs.
- [ ] Test duplicate same department/date/shift behavior and exception behavior.

### Expenses
- [ ] Create department-scoped and general expenses.
- [ ] Upload attachments.
- [ ] Approve/reject and verify approval request/action rows.
- [ ] Confirm department user cannot submit for another department.

### Purchasing/invoices
- [ ] Create draft/submitted invoice with multiple lines.
- [ ] Edit invoice before approval.
- [ ] Approve/reject invoice.
- [ ] Receive approved invoice and verify inventory balances and movement ledger.
- [ ] Attempt duplicate supplier invoice number.

### Inventory
- [ ] Create/edit/deactivate item.
- [ ] Create category.
- [ ] Verify item detail balances and movement history.
- [ ] Test low-stock indicators after movements.

### Stock requests/transfers
- [ ] Department creates request.
- [ ] Warehouse approves with approved quantities.
- [ ] Warehouse advances preparing/ready/delivered.
- [ ] Department confirms receipt with missing/damaged quantities.
- [ ] Verify transfer and movement rows.

### Stock counts
- [ ] Create count and verify system quantity snapshot.
- [ ] Approve count and verify count adjustment movements.
- [ ] Reject count and verify no movement posted.

### Damages/expiry
- [ ] Create damage and expired product records.
- [ ] Approve and verify inventory movement.
- [ ] Reject and verify no movement posted.
- [ ] Confirm insufficient stock is blocked.

### Attendance
- [ ] Check in, break start/end, check out in valid order.
- [ ] Invalid next events are disabled or rejected.
- [ ] Department manager sees department report only.
- [ ] General manager/owner sees all attendance report.

### Files/audit/deployment
- [ ] Open uploaded file as uploader, same-department user, privileged user, and unrelated user.
- [ ] Verify audit entries for every sensitive mutation.
- [ ] Run production build with `STORAGE_DRIVER=s3` env set.
- [ ] Deploy to Vercel preview and verify uploads use durable storage.
