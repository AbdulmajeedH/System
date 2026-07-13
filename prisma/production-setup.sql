--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ApprovalDecision; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalDecision" AS ENUM (
    'APPROVED',
    'REJECTED'
);


--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: ApprovalTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ApprovalTransactionType" AS ENUM (
    'PURCHASE_INVOICE',
    'STOCK_ADJUSTMENT',
    'DAMAGE',
    'EXPENSE',
    'DAILY_INCOME_EXCEPTION'
);


--
-- Name: AttachmentEntityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttachmentEntityType" AS ENUM (
    'DAILY_INCOME',
    'EXPENSE',
    'PURCHASE_INVOICE',
    'DAMAGE_RECORD',
    'STOCK_COUNT',
    'STOCK_TRANSFER',
    'INVENTORY_ITEM',
    'ATTENDANCE_EVENT'
);


--
-- Name: AttendanceEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceEventType" AS ENUM (
    'CHECK_IN',
    'CHECK_OUT',
    'BREAK_START',
    'BREAK_END'
);


--
-- Name: DamageType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DamageType" AS ENUM (
    'DAMAGED',
    'WASTED',
    'SPOILED',
    'EXPIRED'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'RECEIVED'
);


--
-- Name: LocationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LocationType" AS ENUM (
    'WAREHOUSE',
    'DEPARTMENT'
);


--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovementType" AS ENUM (
    'PURCHASE_RECEIPT',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'DAMAGE',
    'EXPIRY',
    'RETURN_TO_WAREHOUSE',
    'SUPPLIER_RETURN',
    'COUNT_ADJUSTMENT',
    'MANUAL_ADJUSTMENT',
    'OPENING_BALANCE'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'CARD',
    'BANK_TRANSFER',
    'CREDIT',
    'OTHER'
);


--
-- Name: RequestPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RequestPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'OWNER',
    'GENERAL_MANAGER',
    'DEPARTMENT_MANAGER',
    'PURCHASING_OFFICER',
    'WAREHOUSE_MANAGER',
    'EMPLOYEE'
);


--
-- Name: ShiftType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShiftType" AS ENUM (
    'MORNING',
    'EVENING',
    'FULL_DAY'
);


--
-- Name: StockCountStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockCountStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'POSTED'
);


--
-- Name: StockCountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockCountType" AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'ADHOC'
);


--
-- Name: StockRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockRequestStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'PARTIALLY_APPROVED',
    'REJECTED',
    'PREPARING',
    'READY',
    'DELIVERED',
    'PARTIALLY_RECEIVED',
    'COMPLETED',
    'DISPUTED',
    'CANCELLED'
);


--
-- Name: SubmissionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubmissionStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'REVIEWED',
    'APPROVED',
    'REJECTED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ApprovalAction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalAction" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "userId" text NOT NULL,
    decision public."ApprovalDecision" NOT NULL,
    comment text,
    "previousStatus" text NOT NULL,
    "newStatus" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ApprovalRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalRequest" (
    id text NOT NULL,
    "transactionType" public."ApprovalTransactionType" NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    amount numeric(12,2),
    "departmentId" text,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "currentLevel" integer DEFAULT 1 NOT NULL,
    "requiredLevels" integer DEFAULT 1 NOT NULL,
    "requiredRole" public."Role" NOT NULL,
    "requestedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ApprovalRule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApprovalRule" (
    id text NOT NULL,
    "transactionType" public."ApprovalTransactionType" NOT NULL,
    "minAmount" numeric(12,2),
    "maxAmount" numeric(12,2),
    "departmentId" text,
    "requiredRole" public."Role" NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: AttendanceEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AttendanceEvent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."AttendanceEventType" NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "departmentId" text,
    "deviceInfo" text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "entityType" text,
    "entityId" text,
    metadata jsonb,
    ip text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DailyIncomeSubmission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DailyIncomeSubmission" (
    id text NOT NULL,
    "departmentId" text NOT NULL,
    date date NOT NULL,
    "shiftType" public."ShiftType" NOT NULL,
    "cashIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "cardIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "bankTransferIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "deliveryAppsIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "otherIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "cashExpenses" numeric(12,2) DEFAULT 0 NOT NULL,
    "cashRefunds" numeric(12,2) DEFAULT 0 NOT NULL,
    "actualDelivered" numeric(12,2) DEFAULT 0 NOT NULL,
    "totalIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "netIncome" numeric(12,2) DEFAULT 0 NOT NULL,
    "expectedCash" numeric(12,2) DEFAULT 0 NOT NULL,
    "cashDifference" numeric(12,2) DEFAULT 0 NOT NULL,
    "differenceReason" text,
    notes text,
    status public."SubmissionStatus" DEFAULT 'DRAFT'::public."SubmissionStatus" NOT NULL,
    "isException" boolean DEFAULT false NOT NULL,
    "rejectionReason" text,
    "submittedById" text NOT NULL,
    "submittedAt" timestamp(3) without time zone,
    "reviewedById" text,
    "reviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DamageRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DamageRecord" (
    id text NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    type public."DamageType" NOT NULL,
    reason text NOT NULL,
    date date NOT NULL,
    "reportedById" text NOT NULL,
    "estimatedCost" numeric(12,2) DEFAULT 0 NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    notes text,
    "postedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    code text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Expense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    date date NOT NULL,
    "departmentId" text,
    "categoryId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    description text NOT NULL,
    "supplierId" text,
    "submittedById" text NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "rejectionReason" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ExpenseCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExpenseCategory" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: FileAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FileAttachment" (
    id text NOT NULL,
    "entityType" public."AttachmentEntityType" NOT NULL,
    "entityId" text NOT NULL,
    "storageKey" text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "uploadedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ImportantProduct; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ImportantProduct" (
    id text NOT NULL,
    "departmentId" text NOT NULL,
    "nameAr" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ImportantProductDailyCount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ImportantProductDailyCount" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "submissionId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InventoryBalance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryBalance" (
    id text NOT NULL,
    "itemId" text NOT NULL,
    "locationId" text NOT NULL,
    quantity numeric(14,3) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryCategory" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "parentId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryItem" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "nameEn" text,
    sku text NOT NULL,
    barcode text,
    "categoryId" text,
    "baseUnitId" text NOT NULL,
    "purchaseUnitId" text NOT NULL,
    "conversionFactor" numeric(12,4) DEFAULT 1 NOT NULL,
    "currentPrice" numeric(12,4) DEFAULT 0 NOT NULL,
    "averageCost" numeric(12,4) DEFAULT 0 NOT NULL,
    "minStock" numeric(12,3) DEFAULT 0 NOT NULL,
    "reorderLevel" numeric(12,3) DEFAULT 0 NOT NULL,
    "preferredSupplierId" text,
    "expiryTracking" boolean DEFAULT false NOT NULL,
    "batchTracking" boolean DEFAULT false NOT NULL,
    "imageKey" text,
    "storageLocation" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryLocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryLocation" (
    id text NOT NULL,
    code text NOT NULL,
    "nameAr" text NOT NULL,
    type public."LocationType" NOT NULL,
    "departmentId" text,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: InventoryMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryMovement" (
    id text NOT NULL,
    "itemId" text NOT NULL,
    quantity numeric(14,3) NOT NULL,
    type public."MovementType" NOT NULL,
    "sourceLocationId" text,
    "destLocationId" text,
    "refType" text,
    "refId" text,
    "userId" text NOT NULL,
    reason text,
    "prevSourceQty" numeric(14,3),
    "newSourceQty" numeric(14,3),
    "prevDestQty" numeric(14,3),
    "newDestQty" numeric(14,3),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PurchaseInvoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseInvoice" (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    "invoiceNumber" text NOT NULL,
    "invoiceDate" date NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    vat numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    "paymentMethod" public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    notes text,
    "rejectionReason" text,
    "enteredById" text NOT NULL,
    "receivedById" text,
    "receivedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PurchaseInvoiceItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PurchaseInvoiceItem" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "itemId" text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    "unitId" text NOT NULL,
    "unitPrice" numeric(12,4) NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    "lineTotal" numeric(12,2) NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    ip text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StockCount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockCount" (
    id text NOT NULL,
    "locationId" text NOT NULL,
    "countDate" date NOT NULL,
    type public."StockCountType" DEFAULT 'ADHOC'::public."StockCountType" NOT NULL,
    "assignedToId" text NOT NULL,
    status public."StockCountStatus" DEFAULT 'DRAFT'::public."StockCountStatus" NOT NULL,
    notes text,
    "postedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockCountItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockCountItem" (
    id text NOT NULL,
    "countId" text NOT NULL,
    "itemId" text NOT NULL,
    "systemQty" numeric(14,3) NOT NULL,
    "actualQty" numeric(14,3) NOT NULL,
    difference numeric(14,3) NOT NULL,
    "unitCost" numeric(12,4) NOT NULL,
    "differenceValue" numeric(12,2) NOT NULL,
    reason text
);


--
-- Name: StockRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockRequest" (
    id text NOT NULL,
    "departmentId" text NOT NULL,
    "requestedById" text NOT NULL,
    "requiredDate" date NOT NULL,
    priority public."RequestPriority" DEFAULT 'NORMAL'::public."RequestPriority" NOT NULL,
    status public."StockRequestStatus" DEFAULT 'DRAFT'::public."StockRequestStatus" NOT NULL,
    notes text,
    "warehouseNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockRequestItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockRequestItem" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "itemId" text NOT NULL,
    "requestedQty" numeric(12,3) NOT NULL,
    "approvedQty" numeric(12,3),
    notes text
);


--
-- Name: StockTransfer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockTransfer" (
    id text NOT NULL,
    "requestId" text,
    "fromLocationId" text NOT NULL,
    "toLocationId" text NOT NULL,
    "preparedById" text,
    "deliveredAt" timestamp(3) without time zone,
    "receivedById" text,
    "receivedAt" timestamp(3) without time zone,
    notes text,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockTransferItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockTransferItem" (
    id text NOT NULL,
    "transferId" text NOT NULL,
    "itemId" text NOT NULL,
    "preparedQty" numeric(12,3) NOT NULL,
    "receivedQty" numeric(12,3),
    "missingQty" numeric(12,3),
    "damagedQty" numeric(12,3),
    notes text
);


--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    "nameAr" text NOT NULL,
    "contactPerson" text,
    phone text,
    email text,
    "taxNumber" text,
    address text,
    categories text,
    "paymentTerms" text,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemSetting" (
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: UnitConversion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UnitConversion" (
    id text NOT NULL,
    "fromUnitId" text NOT NULL,
    "toUnitId" text NOT NULL,
    factor numeric(12,4) NOT NULL
);


--
-- Name: UnitDef; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UnitDef" (
    id text NOT NULL,
    code text NOT NULL,
    "nameAr" text NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    phone text,
    role public."Role" NOT NULL,
    "departmentId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "passwordResetToken" text,
    "passwordResetExpires" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: ApprovalAction; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ApprovalRequest; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ApprovalRule; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002noc7djkrsf4zx', 'PURCHASE_INVOICE', NULL, 500.00, NULL, 'PURCHASING_OFFICER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002ooc7dqor3a0zc', 'PURCHASE_INVOICE', 500.00, 2000.00, NULL, 'GENERAL_MANAGER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002poc7dl7fylfgz', 'PURCHASE_INVOICE', 2000.00, NULL, NULL, 'OWNER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002qoc7dm0o4lmas', 'STOCK_ADJUSTMENT', NULL, 50.00, NULL, 'WAREHOUSE_MANAGER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002roc7duyt5cst6', 'STOCK_ADJUSTMENT', 50.00, 500.00, NULL, 'GENERAL_MANAGER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002soc7daithncic', 'STOCK_ADJUSTMENT', 500.00, NULL, NULL, 'OWNER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy5002toc7d9cy5qrr3', 'DAMAGE', NULL, 100.00, NULL, 'WAREHOUSE_MANAGER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy6002uoc7des24sjhf', 'DAMAGE', 100.00, 500.00, NULL, 'GENERAL_MANAGER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy6002voc7ddk5un9h0', 'DAMAGE', 500.00, NULL, NULL, 'OWNER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy6002woc7d7wz2y3z6', 'EXPENSE', NULL, 500.00, NULL, 'GENERAL_MANAGER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy6002xoc7dawmcgitr', 'EXPENSE', 500.00, NULL, NULL, 'OWNER', 1, true);
INSERT INTO public."ApprovalRule" VALUES ('cmrizkxy6002yoc7dlqrhmmqh', 'DAILY_INCOME_EXCEPTION', NULL, NULL, NULL, 'GENERAL_MANAGER', 1, true);


--
-- Data for Name: AttendanceEvent; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: DailyIncomeSubmission; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: DamageRecord; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Department" VALUES ('cmrizkxjd0000oc7dt6pzqgmz', 'RESTAURANT', 'المطعم', 'Restaurant', true, '2026-07-13 08:54:47.497', '2026-07-13 08:54:47.497');
INSERT INTO public."Department" VALUES ('cmrizkxkq0001oc7dh8ckibb6', 'CAFE', 'المقهى', 'Café', true, '2026-07-13 08:54:47.546', '2026-07-13 08:54:47.546');
INSERT INTO public."Department" VALUES ('cmrizkxku0002oc7dasrzvwnu', 'MINIMARKET', 'الميني ماركت', 'Mini-market', true, '2026-07-13 08:54:47.55', '2026-07-13 08:54:47.55');


--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ExpenseCategory; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxnz000uoc7dfor2exuk', 'صيانة', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxo6000voc7dev3jh8pq', 'نقل ومواصلات', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxoa000woc7d4hvjm43d', 'مشتريات طارئة', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxoe000xoc7duw6c2p32', 'نظافة', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxoj000yoc7dy7uv4pcl', 'تغليف', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxon000zoc7d90a4fmel', 'وجبات موظفين', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxou0010oc7d0uldhqme', 'فواتير خدمات', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxoz0011oc7d8grx3n6p', 'معدات', true);
INSERT INTO public."ExpenseCategory" VALUES ('cmrizkxp80012oc7d0w0g6vbv', 'أخرى', true);


--
-- Data for Name: FileAttachment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ImportantProduct; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."ImportantProduct" VALUES ('cmrizkxx1002aoc7d3h6ucfvf', 'cmrizkxjd0000oc7dt6pzqgmz', 'سندويشات تورتيلا', 0, true, '2026-07-13 08:54:47.989', '2026-07-13 08:54:47.989');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxx6002boc7dgthbyx7v', 'cmrizkxjd0000oc7dt6pzqgmz', 'برجر', 1, true, '2026-07-13 08:54:47.994', '2026-07-13 08:54:47.994');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxx8002coc7dlb5jhk2v', 'cmrizkxjd0000oc7dt6pzqgmz', 'وجبات دجاج', 2, true, '2026-07-13 08:54:47.996', '2026-07-13 08:54:47.996');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxb002doc7dhvjagfwr', 'cmrizkxjd0000oc7dt6pzqgmz', 'سندويشات مسحب', 3, true, '2026-07-13 08:54:47.999', '2026-07-13 08:54:47.999');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxd002eoc7dv95bwcry', 'cmrizkxkq0001oc7dh8ckibb6', 'لاتيه', 0, true, '2026-07-13 08:54:48.001', '2026-07-13 08:54:48.001');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxg002foc7dwtda6muy', 'cmrizkxkq0001oc7dh8ckibb6', 'سبانش لاتيه', 1, true, '2026-07-13 08:54:48.004', '2026-07-13 08:54:48.004');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxi002goc7ddvlodq0f', 'cmrizkxkq0001oc7dh8ckibb6', 'أمريكانو', 2, true, '2026-07-13 08:54:48.006', '2026-07-13 08:54:48.006');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxk002hoc7dgjs7qy02', 'cmrizkxkq0001oc7dh8ckibb6', 'شاي', 3, true, '2026-07-13 08:54:48.008', '2026-07-13 08:54:48.008');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxm002ioc7dl0rknn1y', 'cmrizkxkq0001oc7dh8ckibb6', 'حلويات', 4, true, '2026-07-13 08:54:48.01', '2026-07-13 08:54:48.01');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxo002joc7dl1o0vuyg', 'cmrizkxku0002oc7dasrzvwnu', 'سندويشات', 0, true, '2026-07-13 08:54:48.012', '2026-07-13 08:54:48.012');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxr002koc7dqqlxbsvu', 'cmrizkxku0002oc7dasrzvwnu', 'مشروبات مختارة', 1, true, '2026-07-13 08:54:48.015', '2026-07-13 08:54:48.015');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxt002loc7dqqlilswa', 'cmrizkxku0002oc7dasrzvwnu', 'أصناف عالية القيمة', 2, true, '2026-07-13 08:54:48.017', '2026-07-13 08:54:48.017');
INSERT INTO public."ImportantProduct" VALUES ('cmrizkxxv002moc7ds0o4g5fe', 'cmrizkxku0002oc7dasrzvwnu', 'أصناف سريعة الحركة', 3, true, '2026-07-13 08:54:48.019', '2026-07-13 08:54:48.019');


--
-- Data for Name: ImportantProductDailyCount; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: InventoryBalance; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."InventoryBalance" VALUES ('cmrizkxrw001hoc7davztickm', 'cmrizkxre001goc7d7mztw1ek', 'cmrizkxlb0003oc7dob77ildw', 50.000, '2026-07-13 08:54:47.809');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxsr001koc7d26h1hz0u', 'cmrizkxsf001joc7d9t3tcuyz', 'cmrizkxlb0003oc7dob77ildw', 25.000, '2026-07-13 08:54:47.838');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxtb001noc7dysscdqu3', 'cmrizkxt3001moc7d3q59e6q4', 'cmrizkxlb0003oc7dob77ildw', 40.000, '2026-07-13 08:54:47.857');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxtv001qoc7dj2uczxrd', 'cmrizkxto001poc7dsgru2r5a', 'cmrizkxlb0003oc7dob77ildw', 100.000, '2026-07-13 08:54:47.877');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxua001toc7ddzmjkan3', 'cmrizkxu3001soc7dpuhv47i2', 'cmrizkxlb0003oc7dob77ildw', 400.000, '2026-07-13 08:54:47.892');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxuo001woc7dnhk0l1jm', 'cmrizkxuh001voc7dcfxwtmrr', 'cmrizkxlb0003oc7dob77ildw', 120.000, '2026-07-13 08:54:47.906');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxv3001zoc7dj2gjh8lt', 'cmrizkxuw001yoc7d442fur0o', 'cmrizkxlb0003oc7dob77ildw', 15.000, '2026-07-13 08:54:47.921');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxvm0022oc7d3tcy14wt', 'cmrizkxve0021oc7dq2zkhxem', 'cmrizkxlb0003oc7dob77ildw', 240.000, '2026-07-13 08:54:47.94');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxw20025oc7d9znitrmt', 'cmrizkxvu0024oc7dm6hzwflf', 'cmrizkxlb0003oc7dob77ildw', 1000.000, '2026-07-13 08:54:47.956');
INSERT INTO public."InventoryBalance" VALUES ('cmrizkxwn0028oc7dkmvzggnm', 'cmrizkxwc0027oc7dl9pwu5wg', 'cmrizkxlb0003oc7dob77ildw', 16.000, '2026-07-13 08:54:47.979');


--
-- Data for Name: InventoryCategory; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."InventoryCategory" VALUES ('cmrizkxpm0013oc7dgjzea8wd', 'مواد غذائية', NULL, true, '2026-07-13 08:54:47.722', '2026-07-13 08:54:47.722');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxpt0014oc7dw5lgq7se', 'لحوم ودواجن', 'cmrizkxpm0013oc7dgjzea8wd', true, '2026-07-13 08:54:47.729', '2026-07-13 08:54:47.729');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxpw0015oc7dk9g3fome', 'خضروات وفواكه', 'cmrizkxpm0013oc7dgjzea8wd', true, '2026-07-13 08:54:47.732', '2026-07-13 08:54:47.732');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxq00016oc7div0r89rn', 'مواد جافة', 'cmrizkxpm0013oc7dgjzea8wd', true, '2026-07-13 08:54:47.736', '2026-07-13 08:54:47.736');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxq30017oc7djh2hoxod', 'ألبان وأجبان', 'cmrizkxpm0013oc7dgjzea8wd', true, '2026-07-13 08:54:47.739', '2026-07-13 08:54:47.739');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxq80018oc7dzieh08p5', 'مشروبات', NULL, true, '2026-07-13 08:54:47.744', '2026-07-13 08:54:47.744');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxqd0019oc7dz40raqns', 'قهوة وشاي', 'cmrizkxq80018oc7dzieh08p5', true, '2026-07-13 08:54:47.749', '2026-07-13 08:54:47.749');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxqj001aoc7dpevqy5im', 'مشروبات غازية وعصائر', 'cmrizkxq80018oc7dzieh08p5', true, '2026-07-13 08:54:47.755', '2026-07-13 08:54:47.755');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxqn001boc7do9es6gh1', 'مواد تغليف', NULL, true, '2026-07-13 08:54:47.759', '2026-07-13 08:54:47.759');
INSERT INTO public."InventoryCategory" VALUES ('cmrizkxqq001coc7dincwqfjh', 'مواد تنظيف', NULL, true, '2026-07-13 08:54:47.762', '2026-07-13 08:54:47.762');


--
-- Data for Name: InventoryItem; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."InventoryItem" VALUES ('cmrizkxre001goc7d7mztw1ek', 'دجاج طازج', NULL, 'MEAT-001', NULL, 'cmrizkxpt0014oc7dw5lgq7se', 'cmrizkxmv000ioc7deq4bjngh', 'cmrizkxmv000ioc7deq4bjngh', 1.0000, 18.0000, 18.0000, 20.000, 30.000, 'cmrizkxqx001doc7du9xkfv0t', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.786', '2026-07-13 08:54:47.786');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxsf001joc7d9t3tcuyz', 'لحم بقري مفروم', NULL, 'MEAT-002', NULL, 'cmrizkxpt0014oc7dw5lgq7se', 'cmrizkxmv000ioc7deq4bjngh', 'cmrizkxmv000ioc7deq4bjngh', 1.0000, 38.0000, 38.0000, 10.000, 15.000, 'cmrizkxqx001doc7du9xkfv0t', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.823', '2026-07-13 08:54:47.823');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxt3001moc7d3q59e6q4', 'طماطم', NULL, 'VEG-001', NULL, 'cmrizkxpw0015oc7dk9g3fome', 'cmrizkxmv000ioc7deq4bjngh', 'cmrizkxn4000noc7d3lx3vrks', 10.0000, 25.0000, 2.5000, 15.000, 25.000, 'cmrizkxqx001doc7du9xkfv0t', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.847', '2026-07-13 08:54:47.847');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxto001poc7dsgru2r5a', 'أرز بسمتي', NULL, 'DRY-001', NULL, 'cmrizkxq00016oc7div0r89rn', 'cmrizkxmv000ioc7deq4bjngh', 'cmrizkxn4000noc7d3lx3vrks', 10.0000, 85.0000, 8.5000, 30.000, 50.000, 'cmrizkxr5001foc7drfxwgcpx', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.868', '2026-07-13 08:54:47.868');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxu3001soc7dpuhv47i2', 'خبز تورتيلا', NULL, 'DRY-002', NULL, 'cmrizkxq00016oc7div0r89rn', 'cmrizkxmq000foc7d2wiot3zo', 'cmrizkxn1000moc7dfb5vvj24', 20.0000, 12.0000, 0.6000, 100.000, 200.000, 'cmrizkxr5001foc7drfxwgcpx', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.883', '2026-07-13 08:54:47.883');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxuh001voc7dcfxwtmrr', 'حليب طازج ١ لتر', NULL, 'DAIRY-001', NULL, 'cmrizkxq30017oc7djh2hoxod', 'cmrizkxmq000foc7d2wiot3zo', 'cmrizkxmu000hoc7dbm0b17cs', 12.0000, 54.0000, 4.5000, 48.000, 72.000, 'cmrizkxr1001eoc7dxg6c5c6u', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.897', '2026-07-13 08:54:47.897');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxuw001yoc7d442fur0o', 'حبوب قهوة إسبريسو ١ كجم', NULL, 'BEV-001', NULL, 'cmrizkxqd0019oc7dz40raqns', 'cmrizkxmq000foc7d2wiot3zo', 'cmrizkxmq000foc7d2wiot3zo', 1.0000, 95.0000, 95.0000, 5.000, 10.000, 'cmrizkxr1001eoc7dxg6c5c6u', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.912', '2026-07-13 08:54:47.912');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxve0021oc7dq2zkhxem', 'مشروب غازي ٣٣٠ مل', NULL, 'BEV-002', NULL, 'cmrizkxqj001aoc7dpevqy5im', 'cmrizkxn8000poc7da1evnfam', 'cmrizkxmu000hoc7dbm0b17cs', 24.0000, 36.0000, 1.5000, 96.000, 144.000, 'cmrizkxr1001eoc7dxg6c5c6u', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.93', '2026-07-13 08:54:47.93');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxvu0024oc7dm6hzwflf', 'علب تغليف وجبات', NULL, 'PKG-001', NULL, 'cmrizkxqn001boc7do9es6gh1', 'cmrizkxmq000foc7d2wiot3zo', 'cmrizkxmu000hoc7dbm0b17cs', 200.0000, 60.0000, 0.3000, 300.000, 500.000, 'cmrizkxr5001foc7drfxwgcpx', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.946', '2026-07-13 08:54:47.946');
INSERT INTO public."InventoryItem" VALUES ('cmrizkxwc0027oc7dl9pwu5wg', 'منظف أرضيات ٤ لتر', NULL, 'CLN-001', NULL, 'cmrizkxqq001coc7dincwqfjh', 'cmrizkxn6000ooc7dl3l1cqq2', 'cmrizkxms000goc7dfbk1ixv1', 4.0000, 48.0000, 12.0000, 8.000, 12.000, 'cmrizkxr5001foc7drfxwgcpx', false, false, NULL, NULL, NULL, true, '2026-07-13 08:54:47.964', '2026-07-13 08:54:47.964');


--
-- Data for Name: InventoryLocation; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."InventoryLocation" VALUES ('cmrizkxlb0003oc7dob77ildw', 'MAIN_WAREHOUSE', 'المستودع الرئيسي', 'WAREHOUSE', NULL, true);
INSERT INTO public."InventoryLocation" VALUES ('cmrizkxll0004oc7dugm7tqxn', 'RESTAURANT', 'مخزون المطعم', 'DEPARTMENT', 'cmrizkxjd0000oc7dt6pzqgmz', true);
INSERT INTO public."InventoryLocation" VALUES ('cmrizkxlq0005oc7d2qps5tv6', 'CAFE', 'مخزون المقهى', 'DEPARTMENT', 'cmrizkxkq0001oc7dh8ckibb6', true);
INSERT INTO public."InventoryLocation" VALUES ('cmrizkxlu0006oc7dvrqrf4f0', 'MINIMARKET', 'مخزون الميني ماركت', 'DEPARTMENT', 'cmrizkxku0002oc7dasrzvwnu', true);


--
-- Data for Name: InventoryMovement; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."InventoryMovement" VALUES ('cmrizkxs8001ioc7dz9lvexuf', 'cmrizkxre001goc7d7mztw1ek', 50.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 50.000, '2026-07-13 08:54:47.816');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxsv001loc7d9lz4cpc2', 'cmrizkxsf001joc7d9t3tcuyz', 25.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 25.000, '2026-07-13 08:54:47.839');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxtf001ooc7dbqr6j717', 'cmrizkxt3001moc7d3q59e6q4', 40.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 40.000, '2026-07-13 08:54:47.859');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxtz001roc7dwk4f226h', 'cmrizkxto001poc7dsgru2r5a', 100.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 100.000, '2026-07-13 08:54:47.879');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxud001uoc7dlu4sw9rg', 'cmrizkxu3001soc7dpuhv47i2', 400.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 400.000, '2026-07-13 08:54:47.893');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxus001xoc7dm4ltxzdf', 'cmrizkxuh001voc7dcfxwtmrr', 120.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 120.000, '2026-07-13 08:54:47.908');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxv70020oc7d7yz5n0qz', 'cmrizkxuw001yoc7d442fur0o', 15.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 15.000, '2026-07-13 08:54:47.923');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxvp0023oc7d4eoook1w', 'cmrizkxve0021oc7dq2zkhxem', 240.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 240.000, '2026-07-13 08:54:47.941');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxw50026oc7d7venamnj', 'cmrizkxvu0024oc7dm6hzwflf', 1000.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 1000.000, '2026-07-13 08:54:47.957');
INSERT INTO public."InventoryMovement" VALUES ('cmrizkxws0029oc7dr5f6djmu', 'cmrizkxwc0027oc7dl9pwu5wg', 16.000, 'OPENING_BALANCE', NULL, 'cmrizkxlb0003oc7dob77ildw', NULL, NULL, 'cmrizkxly0007oc7d3rukl8h9', 'رصيد افتتاحي', NULL, NULL, 0.000, 16.000, '2026-07-13 08:54:47.98');


--
-- Data for Name: PurchaseInvoice; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: PurchaseInvoiceItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: StockCount; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: StockCountItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: StockRequest; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: StockRequestItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: StockTransfer; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: StockTransferItem; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Supplier" VALUES ('cmrizkxqx001doc7du9xkfv0t', 'مؤسسة الغذاء الطازج', 'أبو خالد', '0501111111', NULL, NULL, NULL, 'لحوم، دواجن، خضروات', 'نقدي', NULL, true, '2026-07-13 08:54:47.769', '2026-07-13 08:54:47.769');
INSERT INTO public."Supplier" VALUES ('cmrizkxr1001eoc7dxg6c5c6u', 'شركة المشروبات المتحدة', 'أبو فهد', '0502222222', NULL, NULL, NULL, 'مشروبات، عصائر، مياه', 'آجل ٣٠ يوم', NULL, true, '2026-07-13 08:54:47.773', '2026-07-13 08:54:47.773');
INSERT INTO public."Supplier" VALUES ('cmrizkxr5001foc7drfxwgcpx', 'مستودع التموين الشامل', 'أبو محمد', '0503333333', NULL, NULL, NULL, 'مواد جافة، تغليف، تنظيف', 'آجل ١٤ يوم', NULL, true, '2026-07-13 08:54:47.777', '2026-07-13 08:54:47.777');


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."SystemSetting" VALUES ('attendance.workday_start', '08:00', '2026-07-13 08:54:48.037');
INSERT INTO public."SystemSetting" VALUES ('attendance.workday_end', '23:00', '2026-07-13 08:54:48.04');
INSERT INTO public."SystemSetting" VALUES ('attendance.late_after_minutes', '15', '2026-07-13 08:54:48.042');
INSERT INTO public."SystemSetting" VALUES ('attendance.max_break_minutes', '60', '2026-07-13 08:54:48.045');


--
-- Data for Name: UnitConversion; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."UnitConversion" VALUES ('cmrizkxnd000qoc7dp6d5az9i', 'cmrizkxmu000hoc7dbm0b17cs', 'cmrizkxmq000foc7d2wiot3zo', 24.0000);
INSERT INTO public."UnitConversion" VALUES ('cmrizkxnh000roc7ds35z0hnc', 'cmrizkxms000goc7dfbk1ixv1', 'cmrizkxmq000foc7d2wiot3zo', 12.0000);
INSERT INTO public."UnitConversion" VALUES ('cmrizkxnk000soc7dmc323byx', 'cmrizkxmv000ioc7deq4bjngh', 'cmrizkxmx000joc7d5n91wa6a', 1000.0000);
INSERT INTO public."UnitConversion" VALUES ('cmrizkxnn000toc7d7bw6mjae', 'cmrizkxmy000koc7dsinxco44', 'cmrizkxmz000loc7d5jyo9x34', 1000.0000);


--
-- Data for Name: UnitDef; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."UnitDef" VALUES ('cmrizkxmq000foc7d2wiot3zo', 'PIECE', 'حبة');
INSERT INTO public."UnitDef" VALUES ('cmrizkxms000goc7dfbk1ixv1', 'BOX', 'علبة');
INSERT INTO public."UnitDef" VALUES ('cmrizkxmu000hoc7dbm0b17cs', 'CARTON', 'كرتون');
INSERT INTO public."UnitDef" VALUES ('cmrizkxmv000ioc7deq4bjngh', 'KG', 'كيلوغرام');
INSERT INTO public."UnitDef" VALUES ('cmrizkxmx000joc7d5n91wa6a', 'G', 'غرام');
INSERT INTO public."UnitDef" VALUES ('cmrizkxmy000koc7dsinxco44', 'L', 'لتر');
INSERT INTO public."UnitDef" VALUES ('cmrizkxmz000loc7d5jyo9x34', 'ML', 'مل');
INSERT INTO public."UnitDef" VALUES ('cmrizkxn1000moc7dfb5vvj24', 'PACK', 'ربطة');
INSERT INTO public."UnitDef" VALUES ('cmrizkxn4000noc7d3lx3vrks', 'BAG', 'كيس');
INSERT INTO public."UnitDef" VALUES ('cmrizkxn6000ooc7dl3l1cqq2', 'BOTTLE', 'قارورة');
INSERT INTO public."UnitDef" VALUES ('cmrizkxn8000poc7da1evnfam', 'CAN', 'عبوة');


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" VALUES ('cmrizkxly0007oc7d3rukl8h9', 'owner@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'المالك', NULL, 'OWNER', NULL, true, NULL, NULL, NULL, '2026-07-13 08:54:47.59', '2026-07-13 08:54:47.59');
INSERT INTO public."User" VALUES ('cmrizkxm40008oc7d4oclfmrb', 'gm@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'مدير العمليات', NULL, 'GENERAL_MANAGER', NULL, true, NULL, NULL, NULL, '2026-07-13 08:54:47.596', '2026-07-13 08:54:47.596');
INSERT INTO public."User" VALUES ('cmrizkxm80009oc7d90ex9x3s', 'restaurant@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'مدير المطعم', NULL, 'DEPARTMENT_MANAGER', 'cmrizkxjd0000oc7dt6pzqgmz', true, NULL, NULL, NULL, '2026-07-13 08:54:47.6', '2026-07-13 08:54:47.6');
INSERT INTO public."User" VALUES ('cmrizkxmb000aoc7ddbm7b6lu', 'cafe@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'مدير المقهى', NULL, 'DEPARTMENT_MANAGER', 'cmrizkxkq0001oc7dh8ckibb6', true, NULL, NULL, NULL, '2026-07-13 08:54:47.603', '2026-07-13 08:54:47.603');
INSERT INTO public."User" VALUES ('cmrizkxmc000boc7d5hxbnukl', 'minimarket@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'مدير الميني ماركت', NULL, 'DEPARTMENT_MANAGER', 'cmrizkxku0002oc7dasrzvwnu', true, NULL, NULL, NULL, '2026-07-13 08:54:47.604', '2026-07-13 08:54:47.604');
INSERT INTO public."User" VALUES ('cmrizkxmf000coc7d99z8v32q', 'purchasing@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'مسؤول المشتريات', NULL, 'PURCHASING_OFFICER', NULL, true, NULL, NULL, NULL, '2026-07-13 08:54:47.608', '2026-07-13 08:54:47.608');
INSERT INTO public."User" VALUES ('cmrizkxmk000doc7d7dehi4mg', 'warehouse@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'مدير المستودع', NULL, 'WAREHOUSE_MANAGER', NULL, true, NULL, NULL, NULL, '2026-07-13 08:54:47.612', '2026-07-13 08:54:47.612');
INSERT INTO public."User" VALUES ('cmrizkxmn000eoc7dr9jf1k9w', 'employee@rbms.local', '$2b$12$9hsjYWcBre61Q6DcbK3q.eneGPCT517Hu5In2ciGTZzVSMHsjpqIO', 'موظف المطعم', NULL, 'EMPLOYEE', 'cmrizkxjd0000oc7dt6pzqgmz', true, NULL, NULL, NULL, '2026-07-13 08:54:47.615', '2026-07-13 08:54:47.615');


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public._prisma_migrations VALUES ('54ae83da-91ec-48d6-be22-54d79c294fd1', '7860cd754157c71de73e614262c9fa2fb0b077513ea6653b87bb3c7ba28d6c49', '2026-07-13 08:54:43.401183+00', '20260712113620_init', NULL, NULL, '2026-07-13 08:54:42.830554+00', 1);


--
-- Name: ApprovalAction ApprovalAction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalRequest ApprovalRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalRule ApprovalRule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRule"
    ADD CONSTRAINT "ApprovalRule_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceEvent AttendanceEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: DailyIncomeSubmission DailyIncomeSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyIncomeSubmission"
    ADD CONSTRAINT "DailyIncomeSubmission_pkey" PRIMARY KEY (id);


--
-- Name: DamageRecord DamageRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DamageRecord"
    ADD CONSTRAINT "DamageRecord_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseCategory ExpenseCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExpenseCategory"
    ADD CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: FileAttachment FileAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FileAttachment"
    ADD CONSTRAINT "FileAttachment_pkey" PRIMARY KEY (id);


--
-- Name: ImportantProductDailyCount ImportantProductDailyCount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportantProductDailyCount"
    ADD CONSTRAINT "ImportantProductDailyCount_pkey" PRIMARY KEY (id);


--
-- Name: ImportantProduct ImportantProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportantProduct"
    ADD CONSTRAINT "ImportantProduct_pkey" PRIMARY KEY (id);


--
-- Name: InventoryBalance InventoryBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryBalance"
    ADD CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY (id);


--
-- Name: InventoryCategory InventoryCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCategory"
    ADD CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY (id);


--
-- Name: InventoryItem InventoryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_pkey" PRIMARY KEY (id);


--
-- Name: InventoryLocation InventoryLocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryLocation"
    ADD CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY (id);


--
-- Name: InventoryMovement InventoryMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseInvoiceItem PurchaseInvoiceItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoiceItem"
    ADD CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseInvoice PurchaseInvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoice"
    ADD CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StockCountItem StockCountItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCountItem"
    ADD CONSTRAINT "StockCountItem_pkey" PRIMARY KEY (id);


--
-- Name: StockCount StockCount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCount"
    ADD CONSTRAINT "StockCount_pkey" PRIMARY KEY (id);


--
-- Name: StockRequestItem StockRequestItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockRequestItem"
    ADD CONSTRAINT "StockRequestItem_pkey" PRIMARY KEY (id);


--
-- Name: StockRequest StockRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockRequest"
    ADD CONSTRAINT "StockRequest_pkey" PRIMARY KEY (id);


--
-- Name: StockTransferItem StockTransferItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY (id);


--
-- Name: StockTransfer StockTransfer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (key);


--
-- Name: UnitConversion UnitConversion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UnitConversion"
    ADD CONSTRAINT "UnitConversion_pkey" PRIMARY KEY (id);


--
-- Name: UnitDef UnitDef_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UnitDef"
    ADD CONSTRAINT "UnitDef_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ApprovalAction_requestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalAction_requestId_idx" ON public."ApprovalAction" USING btree ("requestId");


--
-- Name: ApprovalRequest_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON public."ApprovalRequest" USING btree ("entityType", "entityId");


--
-- Name: ApprovalRequest_status_requiredRole_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalRequest_status_requiredRole_idx" ON public."ApprovalRequest" USING btree (status, "requiredRole");


--
-- Name: ApprovalRule_transactionType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApprovalRule_transactionType_idx" ON public."ApprovalRule" USING btree ("transactionType");


--
-- Name: AttendanceEvent_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_timestamp_idx" ON public."AttendanceEvent" USING btree ("timestamp");


--
-- Name: AttendanceEvent_userId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AttendanceEvent_userId_timestamp_idx" ON public."AttendanceEvent" USING btree ("userId", "timestamp");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: DailyIncomeSubmission_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyIncomeSubmission_date_idx" ON public."DailyIncomeSubmission" USING btree (date);


--
-- Name: DailyIncomeSubmission_departmentId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyIncomeSubmission_departmentId_date_idx" ON public."DailyIncomeSubmission" USING btree ("departmentId", date);


--
-- Name: DailyIncomeSubmission_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DailyIncomeSubmission_status_idx" ON public."DailyIncomeSubmission" USING btree (status);


--
-- Name: DamageRecord_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DamageRecord_date_idx" ON public."DamageRecord" USING btree (date);


--
-- Name: DamageRecord_locationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DamageRecord_locationId_status_idx" ON public."DamageRecord" USING btree ("locationId", status);


--
-- Name: Department_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Department_code_key" ON public."Department" USING btree (code);


--
-- Name: ExpenseCategory_nameAr_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExpenseCategory_nameAr_key" ON public."ExpenseCategory" USING btree ("nameAr");


--
-- Name: Expense_departmentId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Expense_departmentId_date_idx" ON public."Expense" USING btree ("departmentId", date);


--
-- Name: Expense_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Expense_status_idx" ON public."Expense" USING btree (status);


--
-- Name: FileAttachment_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FileAttachment_entityType_entityId_idx" ON public."FileAttachment" USING btree ("entityType", "entityId");


--
-- Name: FileAttachment_storageKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FileAttachment_storageKey_key" ON public."FileAttachment" USING btree ("storageKey");


--
-- Name: ImportantProductDailyCount_productId_submissionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ImportantProductDailyCount_productId_submissionId_key" ON public."ImportantProductDailyCount" USING btree ("productId", "submissionId");


--
-- Name: ImportantProduct_departmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ImportantProduct_departmentId_idx" ON public."ImportantProduct" USING btree ("departmentId");


--
-- Name: InventoryBalance_itemId_locationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryBalance_itemId_locationId_key" ON public."InventoryBalance" USING btree ("itemId", "locationId");


--
-- Name: InventoryBalance_locationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryBalance_locationId_idx" ON public."InventoryBalance" USING btree ("locationId");


--
-- Name: InventoryCategory_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryCategory_parentId_idx" ON public."InventoryCategory" USING btree ("parentId");


--
-- Name: InventoryItem_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_categoryId_idx" ON public."InventoryItem" USING btree ("categoryId");


--
-- Name: InventoryItem_nameAr_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_nameAr_idx" ON public."InventoryItem" USING btree ("nameAr");


--
-- Name: InventoryItem_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryItem_sku_key" ON public."InventoryItem" USING btree (sku);


--
-- Name: InventoryLocation_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryLocation_code_key" ON public."InventoryLocation" USING btree (code);


--
-- Name: InventoryLocation_departmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryLocation_departmentId_key" ON public."InventoryLocation" USING btree ("departmentId");


--
-- Name: InventoryMovement_destLocationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_destLocationId_idx" ON public."InventoryMovement" USING btree ("destLocationId");


--
-- Name: InventoryMovement_itemId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_itemId_createdAt_idx" ON public."InventoryMovement" USING btree ("itemId", "createdAt");


--
-- Name: InventoryMovement_refType_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_refType_refId_idx" ON public."InventoryMovement" USING btree ("refType", "refId");


--
-- Name: InventoryMovement_sourceLocationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_sourceLocationId_idx" ON public."InventoryMovement" USING btree ("sourceLocationId");


--
-- Name: InventoryMovement_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryMovement_type_idx" ON public."InventoryMovement" USING btree (type);


--
-- Name: PurchaseInvoiceItem_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PurchaseInvoiceItem_invoiceId_idx" ON public."PurchaseInvoiceItem" USING btree ("invoiceId");


--
-- Name: PurchaseInvoiceItem_itemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PurchaseInvoiceItem_itemId_idx" ON public."PurchaseInvoiceItem" USING btree ("itemId");


--
-- Name: PurchaseInvoice_invoiceDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PurchaseInvoice_invoiceDate_idx" ON public."PurchaseInvoice" USING btree ("invoiceDate");


--
-- Name: PurchaseInvoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PurchaseInvoice_status_idx" ON public."PurchaseInvoice" USING btree (status);


--
-- Name: PurchaseInvoice_supplierId_invoiceNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PurchaseInvoice_supplierId_invoiceNumber_key" ON public."PurchaseInvoice" USING btree ("supplierId", "invoiceNumber");


--
-- Name: Session_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_expiresAt_idx" ON public."Session" USING btree ("expiresAt");


--
-- Name: Session_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_tokenHash_key" ON public."Session" USING btree ("tokenHash");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: StockCountItem_countId_itemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockCountItem_countId_itemId_key" ON public."StockCountItem" USING btree ("countId", "itemId");


--
-- Name: StockCount_locationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockCount_locationId_status_idx" ON public."StockCount" USING btree ("locationId", status);


--
-- Name: StockRequestItem_requestId_itemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockRequestItem_requestId_itemId_key" ON public."StockRequestItem" USING btree ("requestId", "itemId");


--
-- Name: StockRequest_departmentId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockRequest_departmentId_status_idx" ON public."StockRequest" USING btree ("departmentId", status);


--
-- Name: StockRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockRequest_status_idx" ON public."StockRequest" USING btree (status);


--
-- Name: StockTransferItem_transferId_itemId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockTransferItem_transferId_itemId_key" ON public."StockTransferItem" USING btree ("transferId", "itemId");


--
-- Name: StockTransfer_requestId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockTransfer_requestId_idx" ON public."StockTransfer" USING btree ("requestId");


--
-- Name: UnitConversion_fromUnitId_toUnitId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UnitConversion_fromUnitId_toUnitId_key" ON public."UnitConversion" USING btree ("fromUnitId", "toUnitId");


--
-- Name: UnitDef_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UnitDef_code_key" ON public."UnitDef" USING btree (code);


--
-- Name: User_departmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_departmentId_idx" ON public."User" USING btree ("departmentId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_passwordResetToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_passwordResetToken_key" ON public."User" USING btree ("passwordResetToken");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: ApprovalAction ApprovalAction_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."ApprovalRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalAction ApprovalAction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApprovalRequest ApprovalRequest_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ApprovalRequest ApprovalRequest_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRequest"
    ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApprovalRule ApprovalRule_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApprovalRule"
    ADD CONSTRAINT "ApprovalRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceEvent AttendanceEvent_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AttendanceEvent AttendanceEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DailyIncomeSubmission DailyIncomeSubmission_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyIncomeSubmission"
    ADD CONSTRAINT "DailyIncomeSubmission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DailyIncomeSubmission DailyIncomeSubmission_reviewedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyIncomeSubmission"
    ADD CONSTRAINT "DailyIncomeSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DailyIncomeSubmission DailyIncomeSubmission_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DailyIncomeSubmission"
    ADD CONSTRAINT "DailyIncomeSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DamageRecord DamageRecord_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DamageRecord"
    ADD CONSTRAINT "DamageRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DamageRecord DamageRecord_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DamageRecord"
    ADD CONSTRAINT "DamageRecord_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DamageRecord DamageRecord_reportedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DamageRecord"
    ADD CONSTRAINT "DamageRecord_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Expense Expense_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ExpenseCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Expense Expense_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_submittedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Expense Expense_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FileAttachment FileAttachment_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FileAttachment"
    ADD CONSTRAINT "FileAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ImportantProductDailyCount ImportantProductDailyCount_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportantProductDailyCount"
    ADD CONSTRAINT "ImportantProductDailyCount_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."ImportantProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ImportantProductDailyCount ImportantProductDailyCount_submissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportantProductDailyCount"
    ADD CONSTRAINT "ImportantProductDailyCount_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public."DailyIncomeSubmission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ImportantProduct ImportantProduct_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportantProduct"
    ADD CONSTRAINT "ImportantProduct_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryBalance InventoryBalance_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryBalance"
    ADD CONSTRAINT "InventoryBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryBalance InventoryBalance_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryBalance"
    ADD CONSTRAINT "InventoryBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryCategory InventoryCategory_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryCategory"
    ADD CONSTRAINT "InventoryCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."InventoryCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryItem InventoryItem_baseUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES public."UnitDef"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryItem InventoryItem_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."InventoryCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryItem InventoryItem_preferredSupplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryItem InventoryItem_purchaseUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES public."UnitDef"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryLocation InventoryLocation_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryLocation"
    ADD CONSTRAINT "InventoryLocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryMovement InventoryMovement_destLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_destLocationId_fkey" FOREIGN KEY ("destLocationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryMovement InventoryMovement_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryMovement InventoryMovement_sourceLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryMovement InventoryMovement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryMovement"
    ADD CONSTRAINT "InventoryMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseInvoiceItem PurchaseInvoiceItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoiceItem"
    ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."PurchaseInvoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PurchaseInvoiceItem PurchaseInvoiceItem_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoiceItem"
    ADD CONSTRAINT "PurchaseInvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseInvoiceItem PurchaseInvoiceItem_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoiceItem"
    ADD CONSTRAINT "PurchaseInvoiceItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."UnitDef"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseInvoice PurchaseInvoice_enteredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoice"
    ADD CONSTRAINT "PurchaseInvoice_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseInvoice PurchaseInvoice_receivedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoice"
    ADD CONSTRAINT "PurchaseInvoice_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PurchaseInvoice PurchaseInvoice_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PurchaseInvoice"
    ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockCountItem StockCountItem_countId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCountItem"
    ADD CONSTRAINT "StockCountItem_countId_fkey" FOREIGN KEY ("countId") REFERENCES public."StockCount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockCountItem StockCountItem_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCountItem"
    ADD CONSTRAINT "StockCountItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockCount StockCount_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCount"
    ADD CONSTRAINT "StockCount_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockCount StockCount_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockCount"
    ADD CONSTRAINT "StockCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockRequestItem StockRequestItem_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockRequestItem"
    ADD CONSTRAINT "StockRequestItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockRequestItem StockRequestItem_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockRequestItem"
    ADD CONSTRAINT "StockRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."StockRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockRequest StockRequest_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockRequest"
    ADD CONSTRAINT "StockRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockRequest StockRequest_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockRequest"
    ADD CONSTRAINT "StockRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockTransferItem StockTransferItem_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockTransferItem StockTransferItem_transferId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransferItem"
    ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES public."StockTransfer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockTransfer StockTransfer_fromLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockTransfer StockTransfer_preparedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockTransfer StockTransfer_receivedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockTransfer StockTransfer_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."StockRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockTransfer StockTransfer_toLocationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockTransfer"
    ADD CONSTRAINT "StockTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES public."InventoryLocation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UnitConversion UnitConversion_fromUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UnitConversion"
    ADD CONSTRAINT "UnitConversion_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES public."UnitDef"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UnitConversion UnitConversion_toUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UnitConversion"
    ADD CONSTRAINT "UnitConversion_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES public."UnitDef"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


