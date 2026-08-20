# Phase 1 Implementation Plan: Tax Report Generator

> **Scope:** Tax Rules Engine (shared foundation) + Tax Report Generator (Module 3)  
> **Owner:** Jawad  
> **Constraint:** Read-only access to existing modules. No modifications to teammates' code, schemas, or endpoints.  
> **Output:** Working PDF tax report generation pipeline, seeded for Bangladesh FY 2025–26.

---

## 0. Assumed Existing Modules (Read-Only)

Do not modify these. Treat their collections and endpoints as external data sources.

| Module | Owner | What We Read |
|--------|-------|--------------|
| **Income Tracking** | Sanjoy | `Income` collection: `userId`, `amount`, `currency`, `date`, `source`, `clientId` |
| **Expense Tracking** | Sanjoy | `Expense` collection: `userId`, `amount`, `currency`, `date`, `category`, `type` (`business` \| `personal`), `receiptVaultId` |
| **Subscription Tracking** | Lamia | `Subscription` collection: `userId`, `name`, `amount`, `currency`, `billingCycle`, `renewalDate`, `isWorkRelated` |
| **Subscription Usage Analytics** | Lamia | `UsageLog` collection: `subscriptionId`, `usageCount`, `period` — used to confidence-weight subscription deductions |
| **Exchange Rate API** | Shared | Existing endpoint/service for currency conversion with rate caching |
| **Document Vault** | Sanjay | `Document` collection: stores files, returns `documentId` and download URL |
| **User Profile** | Shared | `User` collection: `baseCurrency`, `jurisdictionCode` (e.g. `"BD"`), `taxpayerCategory` (e.g. `"general"` \| `"woman-senior"` \| `"disabled"` \| `"freelancer"`), `name`, `businessName` |
| **Project/Client Profitability** | Jawad | `Client` / `Project` collections — optional, for income grouping by client in the report |

---

## 1. Step-by-Step Implementation

### Step 1.1 — Create Tax Rules Engine Schemas

Create four new Mongoose models in a dedicated `src/models/tax/` directory.

#### 1.1.1 `TaxJurisdiction`
```js
{
  code: String,          // "BD", "US", etc. Unique, indexed
  name: String,          // "Bangladesh"
  currency: String,      // "BDT"
  supportedTaxYears: [String], // ["2025-26", "2024-25"]
  createdAt: Date
}
```

#### 1.1.2 `TaxBracketSet`
```js
{
  jurisdictionCode: String,     // "BD"
  taxYear: String,              // "2025-26"
  taxpayerCategory: String,     // "general" | "woman-senior" | "disabled" | "freelancer"
  slabs: [
    {
      min: Number,            // inclusive
      max: Number,            // inclusive, or null for top slab
      rate: Number            // 0.10 for 10%
    }
  ],
  basicExemption: Number,       // e.g. 0 (if already in slab 0% threshold)
  minimumTax: Number,           // e.g. 5000 if applicable
  dataSource: String,           // "manual-seed" | "external-api-verified"
  sourceUrl: String,            // NBR doc URL
  lastVerifiedAt: Date,
  isActive: Boolean,            // true for current live set
  version: Number,              // increment on change
  createdAt: Date
}
```
**Index:** compound unique on `[jurisdictionCode, taxYear, taxpayerCategory, version]`.

#### 1.1.3 `DeductibleCategoryRule`
```js
{
  jurisdictionCode: String,     // "BD"
  taxYear: String,              // "2025-26"
  categoryTag: String,          // matches Expense.category values, e.g. "office-rent", "internet", "software"
  description: String,          // human-readable rule description
  capType: String,              // "none" | "flat" | "percent-of-income" | "percent-of-expense"
  capValue: Number,             // e.g. 250000 or 0.25
  appliesToRole: [String],     // ["freelancer", "professional", "small-business"]
  isActive: Boolean
}
```

#### 1.1.4 `TaxReport` (The main new collection for this phase)
```js
{
  userId: ObjectId,
  periodStart: Date,
  periodEnd: Date,
  jurisdictionCode: String,
  taxYear: String,
  taxpayerCategory: String,
  bracketSetVersion: ObjectId,  // refs TaxBracketSet
  currency: String,             // reporting currency (from user profile)

  summary: {
    grossIncome: Number,
    totalDeductions: Number,
    estimatedTaxableIncome: Number,
    estimatedTax: Number,
    exchangeRateCount: Number
  },

  lineItems: [
    {
      sourceType: String,       // "income" | "expense" | "subscription"
      sourceId: ObjectId,       // ref to original doc
      description: String,
      category: String,
      deductible: Boolean,
      deductionRuleApplied: ObjectId, // refs DeductibleCategoryRule, or null
      confidence: String,       // "high" | "medium" | "low" — for subscriptions based on usage
      originalAmount: Number,
      originalCurrency: String,
      convertedAmount: Number,
      exchangeRate: Number,     // rate used at generation time
      documentVaultRef: ObjectId, // linked receipt/invoice
      clientId: ObjectId        // optional, for income grouping
    }
  ],

  uncategorizedItems: [         // items that couldn't be matched to a rule
    {
      sourceType: String,
      sourceId: ObjectId,
      description: String,
      amount: Number,
      reason: String            // e.g. "no matching DeductibleCategoryRule"
    }
  ],

  documentVaultRef: ObjectId,   // refs the generated PDF in Document Vault
  status: String,               // "generated" | "superseded"
  createdAt: Date
}
```

---

### Step 1.2 — Seed Bangladesh FY 2025–26 Data

Create a seed script `src/seeds/seed-bd-tax-rules.ts` that runs once.

**Data to seed (from NBR FY 2025–26 budget):**

For `taxpayerCategory: "general"`:
| Slab | Min (৳) | Max (৳) | Rate |
|------|---------|---------|------|
| 1 | 0 | 375,000 | 0% |
| 2 | 375,001 | 475,000 | 10% |
| 3 | 475,001 | 575,000 | 15% |
| 4 | 575,001 | 875,000 | 20% |
| 5 | 875,001 | 1,075,000 | 25% |
| 6 | 1,075,001 | null | 30% |

Also seed variants for:
- `woman-senior` (different threshold if NBR specifies)
- `disabled` (different threshold if NBR specifies)
- `freelancer` (same slabs but note any freelancer-specific exemptions if applicable)

Set `dataSource: "manual-seed"`, `lastVerifiedAt: new Date()`, `version: 1`, `isActive: true`.

**DeductibleCategoryRule seeds for Bangladesh (examples):**
- `categoryTag: "office-rent"` — capType: "flat", capValue: 300000, appliesToRole: ["freelancer", "professional"]
- `categoryTag: "internet"` — capType: "percent-of-income", capValue: 0.05, appliesToRole: ["freelancer", "professional"]
- `categoryTag: "software"` — capType: "none", appliesToRole: ["freelancer", "professional", "small-business"]
- `categoryTag: "equipment"` — capType: "flat", capValue: 500000, appliesToRole: ["freelancer", "professional"]
- `categoryTag: "professional-development"` — capType: "flat", capValue: 100000, appliesToRole: ["freelancer", "professional"]

*Note:* These caps are illustrative. Verify against current NBR schedules or use reasonable placeholders clearly marked as such.

---

### Step 1.3 — Build Shared Tax Utilities

Create `src/utils/tax-utils.ts` with pure functions (no DB writes):

```
function categorizeForDeductions(expense, jurisdictionCode, taxpayerCategory, taxYear)
  → returns { deductible: boolean, rule: DeductibleCategoryRule | null, confidence: "high" | "medium" | "low" }

function computeTaxLiability(taxableIncome, taxBracketSet)
  → returns { estimatedTax: number, taxableIncome: number, slabsApplied: [] }

function applyDeductionCap(expenseAmount, rule, totalIncome)
  → returns capped amount
```

**Logic for `categorizeForDeductions`:**
1. Query `DeductibleCategoryRule` where `categoryTag === expense.category`, `jurisdictionCode`, `taxYear`, `isActive: true`.
2. If `appliesToRole` includes user's work type → `deductible: true`, `confidence: "high"`.
3. If no match → `deductible: false`.
4. For subscriptions: if `isWorkRelated === true` and usage analytics show >0 usage → `deductible: true`, `confidence: "high"`. If usage is very low (< 20% of expected), `confidence: "low"` but still flag as deductible — let the user decide.

**Logic for `computeTaxLiability`:**
1. Subtract `basicExemption` from income if not already handled by 0% slab.
2. Iterate slabs progressively: for each slab, calculate tax on the portion of income that falls within it.
3. Sum slab taxes. Ensure result >= `minimumTax` if applicable.
4. Return breakdown.

---

### Step 1.4 — Backend Report Generation Service

Create `src/services/taxReportService.ts` with the following flow:

#### 1.4.1 Main Function: `generateTaxReport(userId, periodStart, periodEnd, jurisdictionCode, taxpayerCategory)`

**Phase A — Validation**
- Verify user exists.
- Fetch active `TaxBracketSet` for `(jurisdictionCode, taxYearFromPeriod(periodEnd), taxpayerCategory)`.
- If none found → throw `400: Tax rules not available for this jurisdiction/category`.

**Phase B — Income Aggregation**
- Query `Income` collection: `{ userId, date: { $gte: periodStart, $lte: periodEnd } }`.
- Group by `source` and `currency`.
- For each income entry not in `currency` (reporting currency):
  - Call existing Exchange Rate API to convert.
  - Cache the rate used on the report line item.
- Sum to `grossIncome`.

**Phase C — Expense Aggregation**
- Query `Expense` collection: `{ userId, date: { $gte: periodStart, $lte: periodEnd }, type: "business" }`.
- **Exclude** `type: "personal"` entirely — do not include in report.
- For each expense:
  - Convert currency if needed.
  - Call `categorizeForDeductions()`.
  - If deductible: apply cap via `applyDeductionCap()`, add to `totalDeductions`, push to `lineItems`.
  - If not deductible OR no rule found: push to `uncategorizedItems` with reason.

**Phase D — Subscription Aggregation**
- Query `Subscription` collection: `{ userId, isWorkRelated: true, renewalDate overlaps with period }`.
- For each qualifying subscription:
  - Check `UsageLog` for the period. If available and usage is low, set `confidence: "low"`.
  - Convert currency if needed.
  - Treat as deductible expense under category `"subscription"`.
  - Push to `lineItems`.

**Phase E — Tax Computation**
- `estimatedTaxableIncome = grossIncome - totalDeductions` (floor at 0).
- Call `computeTaxLiability(estimatedTaxableIncome, bracketSet)`.

**Phase F — Snapshot Persistence**
- Create `TaxReport` document with all line items, uncategorized items, and summary.
- Save to DB. Return the document ID.

#### 1.4.2 PDF Rendering Service

Create `src/services/pdfRenderService.ts`:

- Accept a `TaxReport` document.
- Build an HTML template server-side (use a templating engine like EJS or Handlebars, or plain string concatenation).
- **Required PDF sections (in order):**
  1. **Header:** User name/business name, reporting period (`periodStart` – `periodEnd`), jurisdiction, tax year, taxpayer category, generation date.
  2. **Business Income:** Table grouped by source. Columns: Source, Original Amount, Original Currency, Converted Amount.
  3. **Deductible Expenses:** Table grouped by `category`. Columns: Description, Category, Original Amount, Converted Amount, Deduction Rule Applied.
  4. **Work-Related Subscriptions:** Separate table. Columns: Name, Amount, Confidence (High/Medium/Low with note if usage is low).
  5. **Uncategorized — Needs Review:** Table of items with no matching rule. Columns: Description, Amount, Date, Reason.
  6. **Summary Block:**
     - Gross Income: ৳X
     - Total Deductions: ৳Y
     - Estimated Taxable Income: ৳Z
     - Estimated Tax: ৳A
     - Bracket Set Version: `[version number]`
     - Rules Effective Date: `[lastVerifiedAt]`
  7. **Disclaimer Footer (always present):**
     > "This document is an estimate for planning purposes only, generated using TaxBracketSet version [version] rules effective [date]. It is not a certified tax filing. Please consult a qualified tax professional before submitting to tax authorities."
  8. **Appendix (if applicable):** Exchange rates used for conversions.

- Convert HTML to PDF using `puppeteer` (headless Chrome) or a library like `html-pdf-node` / `puppeteer-core`.
- **Do not** install heavy dependencies if already constrained — use whatever PDF approach the team agrees on. If Puppeteer is too heavy for Vercel, use a lightweight HTML-to-PDF library or generate the PDF client-side as a fallback. *Recommended:* server-side with `puppeteer` on Express/Node if deployed on a VPS; if strictly serverless/Vercel, use `html-pdf-node` or similar.

#### 1.4.3 Document Vault Integration

After PDF generation:
- Upload the PDF buffer to the existing Document Vault endpoint/service.
- Store the returned `documentId` in `TaxReport.documentVaultRef`.
- Also, for each `lineItem` with a `receiptVaultId` from the original expense, optionally append a note in the PDF appendix: "Supporting documents available in Document Vault."

---

### Step 1.5 — API Endpoints

Create `src/routes/taxReports.ts` (or add to existing route structure).

#### `POST /api/tax-reports/generate`
**Body:**
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-03-31",
  "jurisdictionCode": "BD",
  "taxpayerCategory": "general"
}
```
**Auth:** Must be logged in. `userId` from auth token.
**Validation:**
- `periodEnd` > `periodStart`
- `jurisdictionCode` exists in `TaxJurisdiction`
- Active `TaxBracketSet` exists for the combo

**Response:**
```json
{
  "success": true,
  "reportId": "...",
  "downloadUrl": "/api/tax-reports/.../download",
  "summary": {
    "grossIncome": 500000,
    "totalDeductions": 75000,
    "estimatedTaxableIncome": 425000,
    "estimatedTax": 5000
  },
  "uncategorizedCount": 2
}
```

**Behavior:**
- If a report already exists for the same user + period + jurisdiction + category, mark the old one `status: "superseded"` before creating the new one. Never delete old reports.

#### `GET /api/tax-reports`
**Query:** `?page=1&limit=10`
**Response:** List of reports for the authenticated user, sorted `createdAt` desc. Fields: `reportId`, `periodStart`, `periodEnd`, `jurisdictionCode`, `status`, `createdAt`, `downloadUrl`.

#### `GET /api/tax-reports/:id`
**Response:** Full `TaxReport` document (for preview/review).

#### `GET /api/tax-reports/:id/download`
**Response:** PDF file stream. Fetch the file from Document Vault using `documentVaultRef` and pipe to response with `Content-Type: application/pdf`.

#### `POST /api/tax-reports/preview` (Optional but Recommended)
**Body:** Same as generate.
**Response:** Same summary + uncategorizedCount, but does NOT create a `TaxReport` document or PDF. Used for the frontend preview screen.

---

### Step 1.6 — Frontend Implementation

Create new pages/components. Use existing TailwindCSS patterns.

#### 1.6.1 Report Builder Page
**Route:** `/dashboard/tax-reports/new` (or existing app route pattern)

**Components:**
- **Period Selector:**
  - Quick presets: "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026", "FY 2025–26", "FY 2026–27"
  - Custom date range pickers (`periodStart`, `periodEnd`)
- **Jurisdiction Selector:** Dropdown populated from `TaxJurisdiction`. Default to user's profile `jurisdictionCode`.
- **Taxpayer Category Selector:** Dropdown (general, woman-senior, disabled, freelancer). Default to user's profile `taxpayerCategory`.
- **Preview Button:** Calls `POST /api/tax-reports/preview`. Shows inline summary:
  - Gross Income
  - Total Deductions
  - Estimated Taxable Income
  - Estimated Tax
  - Count of Uncategorized Items (with warning if > 0)
- **Generate Report Button:** Disabled until preview is shown. On click, calls `POST /api/tax-reports/generate`. Shows loading state ("Generating PDF..."). On success, redirects to Past Reports or shows download link.

#### 1.6.2 Past Reports Page
**Route:** `/dashboard/tax-reports`

**Components:**
- Table with columns: Period, Jurisdiction, Generated Date, Status, Actions (Download, View).
- "Regenerate" action for any past period — creates a new report, old one marked `superseded`.
- Empty state: "No reports generated yet."

#### 1.6.3 Report Detail / Review View (Optional)
**Route:** `/dashboard/tax-reports/:id`

**Components:**
- Inline display of summary numbers.
- List of line items grouped by type (Income, Expenses, Subscriptions).
- Highlight uncategorized items with a link to go categorize them in Expense Tracking.
- Download PDF button.

---

## 2. File Structure

```
src/
├── models/
│   └── tax/
│       ├── TaxJurisdiction.ts
│       ├── TaxBracketSet.ts
│       ├── DeductibleCategoryRule.ts
│       └── TaxReport.ts
├── utils/
│   └── tax-utils.ts          # pure functions: categorize, compute, cap
├── services/
│   ├── taxReportService.ts   # aggregation, snapshot creation
│   ├── pdfRenderService.ts   # HTML template → PDF
│   └── exchangeRateService.ts # wrapper around existing exchange rate API
├── seeds/
│   └── seed-bd-tax-rules.ts  # one-time seed script
├── routes/
│   └── taxReports.ts         # REST endpoints
├── templates/
│   └── tax-report.html       # HTML template for PDF rendering
└── types/
    └── tax.ts                # shared TypeScript interfaces
```

Frontend (React):
```
src/
├── pages/
│   └── tax/
│       ├── ReportBuilder.tsx
│       ├── PastReports.tsx
│       └── ReportDetail.tsx
├── components/
│   └── tax/
│       ├── PeriodSelector.tsx
│       ├── TaxReportPreview.tsx
│       ├── TaxReportSummary.tsx
│       └── UncategorizedAlert.tsx
└── hooks/
    └── useTaxReports.ts      # React Query / SWR hook for fetching reports
```

---

## 3. Integration Touchpoints (Read-Only)

| Existing System | How We Use It | Read Method |
|-----------------|---------------|-------------|
| **Income collection** | Pull income entries for period | `Income.find({ userId, date })` |
| **Expense collection** | Pull business expenses | `Expense.find({ userId, date, type: "business" })` |
| **Subscription collection** | Pull work-related subs | `Subscription.find({ userId, isWorkRelated: true })` |
| **UsageLog collection** | Weight subscription confidence | `UsageLog.find({ subscriptionId, period })` |
| **Exchange Rate API** | Convert non-BDT amounts | Call existing service/endpoint |
| **Document Vault** | Store generated PDF | Call existing upload endpoint |
| **User Profile** | Default jurisdiction/category | Read from auth context or `User.findById` |

---

## 4. Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| No income logged for period | Generate report with `grossIncome: 0`. Do not block. |
| No business expenses logged | `totalDeductions: 0`. Report still generated. |
| Currency conversion API down | Use most recent cached rate. Flag in `lineItems.exchangeRate` note. Do not fail generation. |
| Tax rules missing for jurisdiction/category | Return `400` with clear message: "Tax rules not configured for [jurisdiction]/[category]." Do not silently fall back. |
| Expense has no matching `DeductibleCategoryRule` | Push to `uncategorizedItems`. Show count in UI. |
| Subscription `isWorkRelated: true` but no usage data | Assume deductible, confidence `"medium"`. |
| User regenerates for same period | Mark old report `superseded`. Create new. Never mutate old snapshots. |
| Expense edited after report generation | No effect on existing report (snapshot). Future reports use new data. |
| Very large number of line items | Paginate PDF if needed, but for student scope, assume < 500 items per quarter. |

---

## 5. Testing Checklist

### Backend Tests
- [ ] Seed script creates Bangladesh `TaxBracketSet` and `DeductibleCategoryRule` correctly.
- [ ] `computeTaxLiability` calculates progressive tax correctly (test with known Bangladesh slabs).
- [ ] `categorizeForDeductions` returns correct rule for known category tags.
- [ ] Report generation aggregates income, expenses, subscriptions accurately.
- [ ] Currency conversion uses exchange rate API and caches rate on line item.
- [ ] Personal expenses are excluded entirely.
- [ ] Uncategorized items are captured, not dropped.
- [ ] Regeneration marks old report `superseded`.
- [ ] Missing tax rules returns 400, not 500.
- [ ] PDF renders all required sections including disclaimer.
- [ ] PDF is stored in Document Vault and linked via `documentVaultRef`.

### Frontend Tests
- [ ] Period presets populate dates correctly.
- [ ] Preview shows summary without creating DB record.
- [ ] Generate button shows loading state.
- [ ] Past Reports list shows superseded status.
- [ ] Download button streams PDF correctly.
- [ ] Uncategorized count alert visible when > 0.

### Integration Tests
- [ ] End-to-end: Create income + expense → generate report → download PDF → verify numbers.
- [ ] Multi-currency: Create USD income → report shows converted BDT amount with rate.

---

## 6. Definition of Done (Phase 1)

- [ ] `TaxJurisdiction`, `TaxBracketSet`, `DeductibleCategoryRule`, `TaxReport` schemas created and migrated.
- [ ] Bangladesh FY 2025–26 tax data seeded (general + variant categories).
- [ ] `POST /api/tax-reports/generate` works end-to-end for a test user.
- [ ] `GET /api/tax-reports` and `GET /api/tax-reports/:id/download` work.
- [ ] PDF contains all required sections and disclaimer.
- [ ] Frontend Report Builder allows period selection, preview, and generation.
- [ ] Frontend Past Reports page lists downloads.
- [ ] No modifications made to teammates' modules or schemas.
- [ ] All code committed; seed script documented in README.

---

## 7. Notes for the Coding Agent

1. **Do not build the external API sync yet.** That is Phase 5. For Phase 1, the Tax Rules Engine is purely manual-seed.
2. **Do not build the Deduction Optimizer yet.** That is Phase 2. For Phase 1, only build the Report Generator.
3. **Use existing auth middleware** — all endpoints require login. Extract `userId` from the auth token/session.
4. **Use existing UI components** where possible (buttons, tables, date pickers, dropdowns). Match Tailwind patterns already in the codebase.
5. **PDF generation approach:** If the team already has a preferred PDF library, use it. If not, `puppeteer` is the most reliable for HTML-to-PDF with CSS. For Vercel serverless, consider `html-pdf-node` or `@sparticuz/chromium` with Puppeteer.
6. **Currency:** Default reporting currency is the user's `baseCurrency`. All conversions happen at generation time and are frozen in the snapshot.
7. **Snapshot philosophy:** The `TaxReport` document must be completely self-contained. If the original expense is deleted next month, the report must still display correctly.
