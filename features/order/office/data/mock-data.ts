/**
 * Office order UI mock data — shapes mirror Prisma `order` schema:
 * - PurchaseOrder, PurchaseOrderLineItem, ShopifyOrder (linked)
 * (see prisma/schema.prisma). Values are plain strings/numbers for client use.
 *
 * Type policy: use Prisma-aligned aliases where a column exists (still `string` if the
 * DB column is `String` with no enum). Hub-only concepts stay `string` so real data is
 * not over-constrained.
 */

import type { ShopifyOrderDisplayFulfillmentStatus } from '@/types/shopify';

// ─── String aliases (DB-aligned or UI-only) ───────────────────────────────────

/**
 * UI-derived PO display status — **not** a DB column. The raw `purchase_orders.status`
 * from the Shopify Auto Purchase Orders CSV is kept as-is (`String`) in the DB for
 * historical reference. Hub UI derives display status from fulfillment data instead:
 * - `active`    — PO exists, items still pending receipt
 * - `received`  — all line items received (`quantityReceived >= quantity`)
 * - `completed` — PO marked complete (`completedAt` set)
 *
 * @see mappers/map-purchase-order.ts `derivePurchaseOrderStatus`
 */
export type PurchaseOrderStatus = 'active' | 'completed' | 'received';

/**
 * Mock sidebar aggregate row id — not a Prisma PK. Real UI may use supplier id, PO id, etc.
 */
export type SupplierKey = string;

/** Hub comm panel: how we talk to the supplier (UI-only). */
export type CommMode = 'email' | 'chat' | 'sms';

/** Hub comm panel: customer vs supplier thread (UI-only). */
export type CommTab = 'customer' | 'supplier';

export const COMM_MODES: CommMode[] = ['email', 'chat', 'sms'];

export const COMM_TABS: CommTab[] = ['customer', 'supplier'];

/** Inbox-style work queue tab — UI only (not `purchase_orders.status`). */
export type StatusTab = 'inbox' | 'without_po' | 'po_created' | 'fulfilled';

/** Date-range filter key — UI only. */
export type PeriodKey = string;

/**
 * Same enum as Shopify Admin GraphQL `OrderDisplayFulfillmentStatus`
 * (`Order.displayFulfillmentStatus`).
 * @see https://shopify.dev/docs/api/admin-graphql/latest/enums/OrderDisplayFulfillmentStatus
 */
export type LineFulfillmentStatus = ShopifyOrderDisplayFulfillmentStatus;

// ─── Prisma-aligned: PurchaseOrderLineItem (mock) ───────────────────────────────

/**
 * Mirrors `order.PurchaseOrderLineItem`. Decimal fields are serialized as
 * plain numeric strings (e.g. `'38.00'`); UI formats with currency as needed.
 */
export type MockPurchaseOrderLineItem = {
  id: string;
  purchaseOrderId: string;
  sequence: number;
  quantity: number;
  quantityReceived: number;
  supplierRef: string | null;
  sku: string | null;
  variantTitle: string | null;
  productTitle: string | null;
  isCustom: boolean;
  /** Raw decimal string (e.g. `'38.00'`), NOT a formatted display string. */
  itemPrice: string | null;
  /** UI-derived: linked Shopify order # from joined `ShopifyOrder`. Not a Prisma column on `PurchaseOrderLineItem`. */
  shopifyOrderNumber: string;
  /** UI-derived: Shopify `OrderDisplayFulfillmentStatus`. Not a Prisma column on `PurchaseOrderLineItem`. */
  fulfillmentStatus: LineFulfillmentStatus;
};

// ─── Prisma-aligned: ShopifyOrder draft (pre-PO) ───────────────────────────────

/** Draft Shopify order before a PO exists — mirrors join row + line drafts. */
export type MockShopifyOrderDraft = {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  customerPhone: string | null;
  /** Flattened shipping (JSON in DB). */
  shippingAddressLine: string | null;
  customerDisplayName: string | null;
  note?: string;
  noteIsWarning?: boolean;
  lineItems: MockPrePoLineDraft[];
};

/** Line not yet on a PO — maps to future PurchaseOrderLineItem fields. */
export type MockPrePoLineDraft = {
  sku: string | null;
  productTitle: string;
  itemPrice: string | null;
  itemCost?: string | null;
  quantity: number;
  includeInPo: boolean;
  disabled?: boolean;
};

// ─── Sidebar / row aggregate (not a single Prisma row) ─────────────────────────

export type SupplierEntry = {
  /** Center subtitle when not drilling into a single PO */
  meta: string;
  /** `true` once a purchase order exists for this row (was `proc`); `false` = pre-PO only. */
  poCreated: boolean;
  /** Display ref: combined order keys or PO numbers */
  referenceKey: string;
  dateCreated: string | null;
  expectedDate: string | null;
  supplierCompany: string;
  supplierContactEmail: string;
  supplierEmailMissing: boolean;
  fulfillDoneCount: number;
  fulfillPendingCount: number;
  fulfillTotalCount: number;
  hasEmail: boolean;
  hasChat: boolean;
  hasSms: boolean;
  emailSent: boolean;
  sidebarDates: string;
};

// ─── Navigation ───────────────────────────────────────────────────────────────

export const STATUS_TABS: { id: StatusTab; label: string; count: number }[] = [
  { id: 'inbox', label: 'Inbox', count: 10 },
  { id: 'without_po', label: 'Without PO', count: 5 },
  { id: 'po_created', label: 'PO created', count: 8 },
  { id: 'fulfilled', label: 'Fulfilled', count: 24 },
];

export type Period = { id: PeriodKey; label: string };

export const PERIODS: Period[] = [
  { id: 'all', label: 'All' },
  { id: 'mar24', label: 'Mar 24–30' },
  { id: 'mar31', label: 'Mar 31–Apr 6' },
  { id: 'apr7', label: 'Apr 7–13' },
  { id: 'apr14', label: 'Apr 14–20' },
];

/**
 * Keys used by `INITIAL_STATES` / `VIEW_DATA` in this file only — not Prisma ids.
 * Real data should drive `SupplierKey` from whatever join key the API returns.
 */
export const OFFICE_MOCK_SUPPLIER_ROW_IDS = [
  'pre-a',
  'pre-b',
  'po-a',
  'po-b',
  'po-c',
] as const;

// ─── Sidebar structure ────────────────────────────────────────────────────────

export type PoPill = { label: string; id: string };

export type SidebarSupplierRow = {
  key: SupplierKey;
  name: string;
  poPills?: PoPill[];
};

export type SidebarCustomerGroup = {
  id: string;
  name: string;
  email: string;
  suppliers: SidebarSupplierRow[];
};

export const CUSTOMER_GROUPS: SidebarCustomerGroup[] = [
  {
    id: 'hq',
    name: 'C Market HQ',
    email: 'hq@cmarket.ca',
    suppliers: [
      { key: 'pre-a', name: 'Costco' },
      { key: 'pre-b', name: 'Snowcap' },
      { key: 'po-a', name: 'Millda' },
      { key: 'po-b', name: 'KAIA' },
      {
        key: 'po-c',
        name: 'Tapio',
        poPills: [
          { label: 'PO #5371', id: '5371' },
          { label: 'PO #5372 (custom)', id: '5372' },
        ],
      },
    ],
  },
];

// ─── Initial supplier states ──────────────────────────────────────────────────

export const INITIAL_STATES: Record<SupplierKey, SupplierEntry> = {
  'pre-a': {
    meta: 'C Market HQ · Costco · 2 orders · Without PO',
    poCreated: false,
    referenceKey: '5362_5363_HQ-Costco',
    dateCreated: null,
    expectedDate: null,
    supplierCompany: 'Costco',
    supplierContactEmail: 'no email on file',
    supplierEmailMissing: true,
    fulfillDoneCount: 0,
    fulfillPendingCount: 3,
    fulfillTotalCount: 3,
    hasEmail: false,
    hasChat: false,
    hasSms: false,
    emailSent: false,
    sidebarDates: 'Ordered Apr 5 · Without PO',
  },
  'pre-b': {
    meta: 'C Market HQ · Snowcap · 1 order · Without PO',
    poCreated: false,
    referenceKey: '5400_HQ-Snowcap',
    dateCreated: null,
    expectedDate: null,
    supplierCompany: 'Snowcap',
    supplierContactEmail: 'snowcap@sup.com',
    supplierEmailMissing: false,
    fulfillDoneCount: 0,
    fulfillPendingCount: 2,
    fulfillTotalCount: 2,
    hasEmail: true,
    hasChat: false,
    hasSms: false,
    emailSent: false,
    sidebarDates: 'Ordered Apr 5 · Without PO',
  },
  'po-a': {
    meta: 'C Market HQ · Millda · 3 orders · Created Apr 5 · Expected Apr 7',
    poCreated: true,
    referenceKey: '5362_5363_5955_HQ–Millda',
    dateCreated: '2026-04-05',
    expectedDate: '2026-04-07',
    supplierCompany: 'Millda',
    supplierContactEmail: 'millda@supplier.com',
    supplierEmailMissing: false,
    fulfillDoneCount: 1,
    fulfillPendingCount: 2,
    fulfillTotalCount: 3,
    hasEmail: true,
    hasChat: true,
    hasSms: true,
    emailSent: true,
    sidebarDates: 'Ordered Apr 5 · Created Apr 5 · Expected Apr 7',
  },
  'po-b': {
    meta: 'C Market HQ · KAIA · 1 order · Created Apr 5 · Expected Apr 7',
    poCreated: true,
    referenceKey: '5400_HQ–KAIA',
    dateCreated: '2026-04-05',
    expectedDate: '2026-04-07',
    supplierCompany: 'KAIA',
    supplierContactEmail: 'kaia@supplier.com',
    supplierEmailMissing: false,
    fulfillDoneCount: 0,
    fulfillPendingCount: 2,
    fulfillTotalCount: 2,
    hasEmail: true,
    hasChat: false,
    hasSms: false,
    emailSent: false,
    sidebarDates: 'Ordered Apr 5 · Created Apr 5 · Expected Apr 7',
  },
  'po-c': {
    meta: 'C Market HQ · Tapio · 2 POs · Created Apr 4–5 · Expected Apr 7',
    poCreated: true,
    referenceKey: '5371+5372',
    dateCreated: '2026-04-04',
    expectedDate: '2026-04-07',
    supplierCompany: 'Tapio',
    supplierContactEmail: 'tapio@supplier.com',
    supplierEmailMissing: false,
    fulfillDoneCount: 2,
    fulfillPendingCount: 2,
    fulfillTotalCount: 4,
    hasEmail: true,
    hasChat: true,
    hasSms: true,
    emailSent: true,
    sidebarDates: 'Ordered Apr 4 · Created Apr 4, 5 · Expected Apr 7',
  },
};

// ─── Post PO: block = one PurchaseOrder (header + lines) ──────────────────────

/** Per-PO panel fields — mirrors PurchaseOrder + fulfill rollups. */
export type PoPanelMeta = {
  poNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  dateCreated: string | null;
  expectedDate: string | null;
  fulfillDoneCount: number;
  fulfillPendingCount: number;
  fulfillTotalCount: number;
};

/** One PO card / subtree row — mirrors PurchaseOrder + lineItems[]. */
export type OfficePurchaseOrderBlock = {
  /** Same as PurchaseOrder.id (mock cuid or stable key). */
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  isAuto: boolean;
  title: string;
  shopifyOrderCount: number;
  lineItems: MockPurchaseOrderLineItem[];
  subtreeRowLabel?: string;
  panelMeta?: PoPanelMeta;
};

export type PreViewData = {
  type: 'pre';
  shopifyOrderDrafts: MockShopifyOrderDraft[];
};

export type PostViewData = {
  type: 'post';
  label?: string;
  extraLabel?: string;
  purchaseOrders: OfficePurchaseOrderBlock[];
  subtreeParentLabel?: string;
  multiPoSubtree?: boolean;
};

export type ViewData = PreViewData | PostViewData;

export const VIEW_DATA: Record<SupplierKey, ViewData> = {
  'pre-a': {
    type: 'pre',
    shopifyOrderDrafts: [
      {
        id: 'draft_ref_5362',
        orderNumber: '#5362',
        customerEmail: 'john@example.com',
        customerPhone: null,
        shippingAddressLine: '123 Main St, Vancouver',
        customerDisplayName: 'John Kim',
        note: 'Leave at door',
        lineItems: [
          {
            sku: 'C001',
            productTitle: 'Costco Olive Oil 5L',
            itemPrice: '28.00',
            quantity: 2,
            includeInPo: true,
          },
          {
            sku: 'C002',
            productTitle: 'Costco Canola Oil 3L',
            itemPrice: '14.00',
            quantity: 1,
            includeInPo: true,
          },
        ],
      },
      {
        id: 'draft_ref_5363',
        orderNumber: '#5363',
        customerEmail: 'sarah@corp.com',
        customerPhone: null,
        shippingAddressLine: '456 Oak Ave, Burnaby',
        customerDisplayName: 'Sarah Park',
        note: 'Fragile — handle with care',
        noteIsWarning: true,
        lineItems: [
          {
            sku: 'C003',
            productTitle: 'Costco Sugar 10KG',
            itemPrice: '22.00',
            quantity: 3,
            includeInPo: true,
          },
          {
            sku: 'C004',
            productTitle: 'Costco Salt 5KG',
            itemPrice: '9.00',
            quantity: 1,
            includeInPo: false,
            disabled: true,
          },
        ],
      },
    ],
  },
  'pre-b': {
    type: 'pre',
    shopifyOrderDrafts: [
      {
        id: 'draft_ref_5400',
        orderNumber: '#5400',
        customerEmail: 'mike@co.com',
        customerPhone: null,
        shippingAddressLine: '789 Pine Rd, Surrey',
        customerDisplayName: 'Mike Lee',
        lineItems: [
          {
            sku: 'S001',
            productTitle: 'Snowcap Flour 25KG',
            itemPrice: '44.00',
            quantity: 1,
            includeInPo: true,
          },
          {
            sku: 'S002',
            productTitle: 'Snowcap Baking Powder',
            itemPrice: '12.00',
            quantity: 4,
            includeInPo: true,
          },
        ],
      },
    ],
  },
  'po-a': {
    type: 'post',
    purchaseOrders: [
      {
        id: 'po-a-main',
        poNumber: 'AUTO-MILLDA-01',
        status: 'active',
        currency: 'CAD',
        isAuto: true,
        title: 'Items for PO',
        shopifyOrderCount: 3,
        lineItems: [
          {
            id: 'li_m_1',
            purchaseOrderId: 'po-a-main',
            sequence: 1,
            quantity: 1,
            quantityReceived: 1,
            supplierRef: 'E0224',
            sku: 'SKU-E0224-W',
            variantTitle: 'White–4KG',
            productTitle: 'Choco Curls',
            isCustom: false,
            itemPrice: '38.00',
            shopifyOrderNumber: '#5362',
            fulfillmentStatus: 'FULFILLED',
          },
          {
            id: 'li_m_2',
            purchaseOrderId: 'po-a-main',
            sequence: 2,
            quantity: 2,
            quantityReceived: 0,
            supplierRef: 'E0224',
            sku: 'SKU-E0224-W',
            variantTitle: 'White–4KG',
            productTitle: 'Choco Curls',
            isCustom: false,
            itemPrice: '38.00',
            shopifyOrderNumber: '#5363',
            fulfillmentStatus: 'UNFULFILLED',
          },
          {
            id: 'li_m_3',
            purchaseOrderId: 'po-a-main',
            sequence: 3,
            quantity: 1,
            quantityReceived: 0,
            supplierRef: 'E0225',
            sku: 'SKU-E0225-D',
            variantTitle: 'Dark–4KG',
            productTitle: 'Choco Curls',
            isCustom: false,
            itemPrice: '38.00',
            shopifyOrderNumber: '#5955',
            fulfillmentStatus: 'PENDING_FULFILLMENT',
          },
        ],
      },
    ],
  },
  'po-b': {
    type: 'post',
    purchaseOrders: [
      {
        id: 'po-b-main',
        poNumber: 'AUTO-KAIA-01',
        status: 'active',
        currency: 'CAD',
        isAuto: true,
        title: 'Items for PO',
        shopifyOrderCount: 1,
        lineItems: [
          {
            id: 'li_k_1',
            purchaseOrderId: 'po-b-main',
            sequence: 1,
            quantity: 2,
            quantityReceived: 0,
            supplierRef: 'K001',
            sku: 'K001',
            variantTitle: '2KG',
            productTitle: 'KAIA Kimchi',
            isCustom: false,
            itemPrice: '22.00',
            shopifyOrderNumber: '#5400',
            fulfillmentStatus: 'UNFULFILLED',
          },
          {
            id: 'li_k_2',
            purchaseOrderId: 'po-b-main',
            sequence: 2,
            quantity: 3,
            quantityReceived: 0,
            supplierRef: 'K002',
            sku: 'K002',
            variantTitle: '1L',
            productTitle: 'KAIA Soy Sauce',
            isCustom: false,
            itemPrice: '14.00',
            shopifyOrderNumber: '#5400',
            fulfillmentStatus: 'UNFULFILLED',
          },
        ],
      },
    ],
  },
  'po-c': {
    type: 'post',
    subtreeParentLabel: 'Tapio · 2 POs',
    multiPoSubtree: true,
    purchaseOrders: [
      {
        id: '5371',
        poNumber: '5371',
        status: 'completed',
        currency: 'CAD',
        isAuto: false,
        title: 'Items for PO #5371',
        subtreeRowLabel: 'PO #5371 — standard',
        shopifyOrderCount: 1,
        panelMeta: {
          poNumber: '5371',
          status: 'completed',
          currency: 'CAD',
          dateCreated: '2026-04-04',
          expectedDate: '2026-04-07',
          fulfillDoneCount: 2,
          fulfillPendingCount: 0,
          fulfillTotalCount: 2,
        },
        lineItems: [
          {
            id: 'li_t_1',
            purchaseOrderId: '5371',
            sequence: 1,
            quantity: 2,
            quantityReceived: 2,
            supplierRef: 'T001',
            sku: 'T001',
            variantTitle: '5L',
            productTitle: 'Tapio Syrup',
            isCustom: false,
            itemPrice: '45.00',
            shopifyOrderNumber: '#5371',
            fulfillmentStatus: 'FULFILLED',
          },
          {
            id: 'li_t_2',
            purchaseOrderId: '5371',
            sequence: 2,
            quantity: 1,
            quantityReceived: 1,
            supplierRef: 'T002',
            sku: 'T002',
            variantTitle: '1KG',
            productTitle: 'Tapio Starch',
            isCustom: false,
            itemPrice: '18.00',
            shopifyOrderNumber: '#5371',
            fulfillmentStatus: 'FULFILLED',
          },
        ],
      },
      {
        id: '5372',
        poNumber: '5372',
        status: 'active',
        currency: 'CAD',
        isAuto: false,
        title: 'Items for PO #5372 (custom)',
        subtreeRowLabel: 'PO #5372 — custom',
        shopifyOrderCount: 1,
        panelMeta: {
          poNumber: '5372',
          status: 'active',
          currency: 'CAD',
          dateCreated: '2026-04-05',
          expectedDate: '2026-04-07',
          fulfillDoneCount: 0,
          fulfillPendingCount: 2,
          fulfillTotalCount: 2,
        },
        lineItems: [
          {
            id: 'li_t_3',
            purchaseOrderId: '5372',
            sequence: 1,
            quantity: 1,
            quantityReceived: 0,
            supplierRef: 'T003',
            sku: 'T003',
            variantTitle: '20L',
            productTitle: 'Tapio Glucose',
            isCustom: true,
            itemPrice: '120.00',
            shopifyOrderNumber: '#5372',
            fulfillmentStatus: 'PENDING_FULFILLMENT',
          },
          {
            id: 'li_t_4',
            purchaseOrderId: '5372',
            sequence: 2,
            quantity: 4,
            quantityReceived: 0,
            supplierRef: 'T004',
            sku: 'T004',
            variantTitle: '10KG',
            productTitle: 'Tapio Maltose',
            isCustom: true,
            itemPrice: '55.00',
            shopifyOrderNumber: '#5372',
            fulfillmentStatus: 'UNFULFILLED',
          },
        ],
      },
    ],
  },
};

/** Primary + optional variant line for tables. */
export function formatProductLabel(line: MockPurchaseOrderLineItem): string {
  const title = line.productTitle ?? '(untitled)';
  if (line.variantTitle) {
    return `${title} — ${line.variantTitle}`;
  }
  return title;
}
