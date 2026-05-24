# BlueVolt Roadmap

## Current Read

BlueVolt already has three meaningful layers:

- A public-facing ecosystem/brand site
- A working `stores24` retail surface with POS, dashboard, inventory, and reports
- A Prisma-backed backend model for products, sales, customers, suppliers, and contact inquiries

The main constraint is execution depth. The brand promises a broad platform, but the most mature product path is still `stores24`, and that path is split between database-backed server actions and browser-only local state/session handling.

## Recommendation

Prioritize BlueVolt as a platform company by making one product unmistakably production-ready first. That product should be `stores24`.

Do not expand feature count across all product lines yet.
Do not invest heavily in more landing pages until the core operating layer is stronger.

## 30-Day Plan

### Week 1: Foundation Hardening

Goal: remove demo-grade behavior from `stores24`.

Deliverables:

- Replace local-storage auth/session with server-backed authentication
- Add route protection and role checks for admin and cashier flows
- Introduce an explicit tenant model:
  - `Organization`
  - `Store`
  - `Register`
  - `UserStoreRole`
- Scope sales, products, inventory, staff, and customers to a store
- Define migration path from current flat schema

Success criteria:

- Two different users can sign in on different devices
- Data persists correctly without relying on browser-local storage
- Admin pages cannot be accessed by unsigned or unauthorized users

### Week 2: Inventory Depth

Goal: make BlueVolt POS useful beyond basic checkout.

Deliverables:

- Goods receipt / purchase receiving flow
- Stock adjustment flow for damaged, missing, and expired items
- Product category and supplier relationship cleanup
- Low-stock threshold per product
- Inventory movement log
- Stock valuation based on current inventory state

Success criteria:

- Staff can explain every stock change from an audit trail
- Owners can receive stock and adjust inventory without manual side systems
- Low-stock reporting becomes actionable, not just informational

### Week 3: Counter and Analytics Upgrade

Goal: make the product reliable during live operations.

Deliverables:

- POS keyboard shortcuts and barcode-first navigation
- Hold cart / resume cart flow
- Refund / void / cancelled bill handling
- Receipt print variants and cleaner invoice formatting
- Replace dashboard placeholder chart with real metrics
- Add:
  - top-selling products
  - hourly sales
  - low-stock urgency
  - payment-method split
  - dead-stock candidates

Success criteria:

- Cashiers can complete repeat sales faster with minimal pointer use
- Owners can understand what sold, when, and where margin is leaking
- Dashboard reflects real operating decisions

### Week 4: Sales Pipeline and Product Positioning

Goal: convert the website into a revenue tool.

Deliverables:

- Internal lead board for `ContactInquiry`
- Lead status workflow:
  - new
  - contacted
  - qualified
  - won
  - lost
- Owner assignment and follow-up notes
- Homepage and product-page messaging update:
  - BlueVolt as platform company
  - BlueVolt POS as current flagship product
  - Events24 and LifeOS as upcoming products with clear stage labels
- Add product proof:
  - screenshots
  - customer scenario copy
  - deployment workflow
  - feature comparison table

Success criteria:

- Every inbound lead has visible status and owner
- Public messaging matches actual product maturity
- `stores24` becomes easier to sell from the website alone

## Product Priorities After 30 Days

### Priority 1

- Multi-store management
- Branch transfer inventory
- Register-level sales tracking
- Real permission matrix
- Backup/export tooling
- Audit logs

### Priority 2

- Loyalty and CRM expansion
- Customer purchase history
- WhatsApp receipts
- Promo campaigns
- Return customer targeting

### Priority 3

- Shared BlueVolt platform services
- Unified identity across products
- Shared notification layer
- Common analytics/events pipeline
- Billing/subscription model
- File/document storage layer

## What Not To Do Yet

- Do not build too many new standalone product shells
- Do not market every ecosystem module equally
- Do not add cosmetic homepage complexity before the product core is stronger
- Do not keep both local-storage and database behavior long term

## Suggested Build Order

1. Server auth and tenancy
2. Inventory movement model
3. POS counter ergonomics
4. Real analytics dashboard
5. Lead management for contact inquiries
6. Marketing/message cleanup

## Immediate Implementation Targets

If work starts now, the highest-leverage code tracks are:

1. Refactor `stores24` auth/session away from `localStorage`
2. Introduce store-scoped Prisma models and migrations
3. Replace placeholder analytics with real report queries

These three changes move BlueVolt from a strong concept with an MVP to a platform with one credible flagship product.
