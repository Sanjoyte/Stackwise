# Phase 4 Implementation Plan: AI-Assisted Deduction Scan (Gemini Layer)

> **Scope:** AI-powered missed deduction detection for the Tax Deduction Optimizer  
> **Owner:** Jawad  
> **Constraint:** Read-only access to existing modules. No modifications to teammates' code, schemas, or endpoints.  
> **Output:** Batch AI scan (nightly + on-demand) that flags missed deductions and ambiguous items, surfaced in a dedicated UI panel.

---

## 0. What Already Exists (From Phases 1–3)

These are already built and treated as read-only data sources:

| Collection / Module | What It Contains |
|-------------------|------------------|
| `TaxBracketSet` | Versioned tax slabs per jurisdiction/year/category |
| `DeductibleCategoryRule` | Deterministic rules mapping expense categories → deductible |
| `DeductionFlag` | Rule-matched flags (`detectionMethod: 'rule'`, `confidence: 'high'`) from Phase 2 |
| `QuarterlyLiabilityEstimate` | Live tax estimate from Phase 3 |
| `TaxReport` | Snapshot reports from Phase 1 |

**Existing collections we read from (teammates' modules):**

| Collection | Owner | Fields We Read |
|------------|-------|----------------|
| `Expense` | Sanjoy | `userId`, `amount`, `currency`, `date`, `category`, `type`, `description`, `receiptVaultId` |
| `Subscription` | Lamia | `userId`, `name`, `amount`, `currency`, `billingCycle`, `isWorkRelated`, `category` |
| `UsageLog` | Lamia | `subscriptionId`, `usageCount`, `periodStart`, `periodEnd` |
| `Income` | Sanjoy | `userId`, `amount`, `currency`, `date`, `source`, `description` |
| `User` | Shared | `baseCurrency`, `jurisdictionCode`, `taxpayerCategory`, `workType`, `name` |

---

## 1. New Schemas to Create

### 1.1 `MissedDeductionSuggestion`

Represents a deduction the AI believes the user is eligible for, but has **no corresponding logged expense entry**.

```js
{
  userId: ObjectId,              // ref User, indexed
  jurisdictionCode: String,      // e.g. "BD"
  taxYear: String,               // e.g. "2025-26"

  suggestedCategory: String,     // e.g. "home-office", "internet", "professional-development"
  categoryTag: String,           // matches DeductibleCategoryRule.categoryTag

  rationale: String,             // human-readable explanation from AI
  aiReasoning: String,           // longer AI explanation for debugging

  estimatedAmount: Number,       // suggested deductible amount (if AI can estimate)
  estimatedAmountCurrency: String,

  supportingEntries: [
    {
      sourceType: String,        // "income" | "expense" | "subscription"
      sourceId: ObjectId,
      description: String,       // snapshot of what the AI saw
      amount: Number,
      date: Date
    }
  ],

  confidence: String,            // "high" | "medium" | "low" — AI-assessed

  status: String,                // "suggested" | "accepted" | "dismissed" | "user-overridden"
  overriddenBy: String,          // "user" | null

  // Audit trail for the AI call
  scanId: ObjectId,              // refs AiDeductionScan

  createdAt: Date,
  resolvedAt: Date               // set when accepted or dismissed
}
```

**Indexes:**
- `{ userId: 1, status: 1, createdAt: -1 }` — for listing active suggestions
- `{ userId: 1, suggestedCategory: 1, status: 1 }` — for deduplication checks

---

### 1.2 `AiDeductionScan`

Audit log for every batch scan run (useful for debugging, defense, and cost tracking).

```js
{
  userId: ObjectId,
  trigger: String,               // "scheduled" | "manual" | "on-demand"

  periodStart: Date,             // scan window
  periodEnd: Date,

  jurisdictionCode: String,
  taxpayerCategory: String,

  context: {
    expenseCount: Number,          // how many expenses were scanned
    subscriptionCount: Number,
    incomeCount: Number,
    ruleFlagCount: Number          // how many rule-based flags already existed
  },

  geminiRequest: {
    model: String,                 // e.g. "gemini-1.5-flash"
    promptTokens: Number,
    responseTokens: Number,
    latencyMs: Number
  },

  results: {
    newDeductionFlags: Number,     // DeductionFlag entries created (detectionMethod: 'ai')
    newMissedSuggestions: Number,  // MissedDeductionSuggestion entries created
    errors: [String]               // any parsing errors
  },

  rawPrompt: String,               // the full prompt sent to Gemini (truncated if > 10KB)
  rawResponse: String,             // the full raw response (truncated if > 10KB)

  status: String,                  // "success" | "partial" | "failed"
  errorMessage: String,            // if failed

  createdAt: Date
}
```

**Retention policy:** Keep for 30 days, then archive or delete. Document this in code comments.

---

### 1.3 Extend `DeductionFlag` (if not already done in Phase 2)

Ensure `DeductionFlag` supports AI-sourced entries:

```js
{
  // ... existing fields from Phase 2 ...

  detectionMethod: String,         // "rule" | "ai"
  confidence: String,              // "high" (rule) | "medium" | "low" (AI)

  aiRationale: String,             // AI explanation (populated when detectionMethod === 'ai')
  scanId: ObjectId,                // refs AiDeductionScan

  // Ensure these exist:
  status: String,                  // "suggested" | "accepted" | "dismissed" | "user-overridden"
  overriddenBy: String             // "user" | null
}
```

---

## 2. Backend Implementation

### 2.1 File Structure

```
src/
├── models/
│   └── tax/
│       ├── MissedDeductionSuggestion.ts    # NEW
│       └── AiDeductionScan.ts              # NEW
│       └── DeductionFlag.ts                # EXTEND (if needed)
├── services/
│   └── ai/
│       ├── geminiDeductionScanner.ts       # main scan orchestrator
│       ├── scanContextBuilder.ts           # assembles user context payload
│       ├── geminiPromptBuilder.ts          # builds structured prompt
│       └── geminiResponseParser.ts         # parses Gemini output into DB records
├── jobs/
│   └── nightlyDeductionScan.ts             # scheduled job entry point
├── routes/
│   └── taxOptimizer.ts                     # add AI scan endpoints
└── types/
    └── ai-scan.ts                          # TypeScript interfaces
```

---

### 2.2 Core Service: `geminiDeductionScanner.ts`

**Main function:** `runDeductionScan(userId, options)`

#### Phase A — Context Assembly (`scanContextBuilder.ts`)

1. **Fetch user profile:** `jurisdictionCode`, `taxpayerCategory`, `workType`, `baseCurrency`.
2. **Fetch active tax rules:**
   - `TaxBracketSet` for jurisdiction + current tax year + taxpayer category.
   - `DeductibleCategoryRule` list for same jurisdiction/year.
3. **Fetch user's financial data for the scan period** (default: current quarter, or last 90 days):
   - `Expense.find({ userId, date: { $gte: periodStart, $lte: periodEnd } })`
   - `Subscription.find({ userId })` with `UsageLog` joined for the period
   - `Income.find({ userId, date: { $gte: periodStart, $lte: periodEnd } })`
4. **Fetch existing flags:**
   - `DeductionFlag.find({ userId, createdAt: { $gte: periodStart } })` — to avoid re-flagging items already evaluated.
   - `MissedDeductionSuggestion.find({ userId, status: { $in: ['suggested', 'accepted'] } })` — to avoid duplicate suggestions.
5. **Build context payload:**
   ```ts
   interface ScanContext {
     user: { workType, taxpayerCategory, jurisdiction, baseCurrency };
     taxRules: DeductibleCategoryRule[];
     expenses: Expense[];           // exclude those with existing DeductionFlag
     subscriptions: Subscription[];   // with usage data
     income: Income[];
     existingFlags: DeductionFlag[];
     existingSuggestions: MissedDeductionSuggestion[];
   }
   ```

#### Phase B — Prompt Construction (`geminiPromptBuilder.ts`)

Build a structured prompt for Gemini. **The prompt must be deterministic and constrained** — we are not asking Gemini to invent tax rules, only to apply the provided rules to the user's data.

**Prompt template:**

```
You are a tax deduction assistant. Your job is to review a user's financial records and identify potential tax deductions they may have missed, using ONLY the tax rules provided below. Do not invent new rules. Do not give financial advice beyond categorization.

## USER CONTEXT
- Work Type: {workType}
- Taxpayer Category: {taxpayerCategory}
- Jurisdiction: {jurisdictionCode}
- Reporting Currency: {baseCurrency}

## TAX DEDUCTION RULES (apply ONLY these)
{JSON.stringify(deductibleRules, null, 2)}

## USER'S INCOME (last 90 days)
{JSON.stringify(incomeEntries, null, 2)}

## USER'S EXPENSES (last 90 days)
{JSON.stringify(expenseEntries, null, 2)}

## USER'S SUBSCRIPTIONS (active)
{JSON.stringify(subscriptionEntries, null, 2)}

## EXISTING DEDUCTION FLAGS (already identified — do NOT duplicate)
{JSON.stringify(existingFlags, null, 2)}

## EXISTING MISSED DEDUCTION SUGGESTIONS (already suggested — do NOT duplicate)
{JSON.stringify(existingSuggestions, null, 2)}

## YOUR TASK
Analyze the data and respond with a STRICT JSON object (no markdown, no explanation outside JSON) with this exact structure:

{
  "expenseFlags": [
    {
      "sourceId": "string (expense _id)",
      "suggestedCategory": "string (must match a categoryTag from rules)",
      "rationale": "string (1-2 sentences explaining why this expense may be deductible)",
      "confidence": "medium | low"
    }
  ],
  "missedDeductions": [
    {
      "suggestedCategory": "string (must match a categoryTag from rules)",
      "rationale": "string (why the user likely qualifies but has no logged expense)",
      "estimatedAmount": number | null,
      "supportingEntryIds": ["array of expense/subscription/income _ids that support this inference"],
      "confidence": "medium | low"
    }
  ],
  "subscriptionFlags": [
    {
      "sourceId": "string (subscription _id)",
      "suggestedCategory": "string",
      "rationale": "string",
      "confidence": "medium | low"
    }
  ]
}

RULES:
1. Only suggest categories that exist in the provided rules.
2. Do NOT flag an expense that already has a rule-based high-confidence DeductionFlag.
3. Do NOT suggest a missed deduction category that already has a pending MissedDeductionSuggestion.
4. For ambiguous expenses (e.g., category "Other", vague descriptions), use your judgment but explain the ambiguity.
5. For subscriptions with low usage, lower the confidence or omit entirely.
6. If nothing is found, return empty arrays.
```

**Important constraints on the prompt:**
- Truncate very large payloads. If expenses > 200 items, take the most recent 200.
- Never include PII (names, client names) in the prompt if possible — use anonymized descriptions.
- Include the raw prompt and response in `AiDeductionScan` for audit.

#### Phase C — Gemini API Call

```ts
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();
```

**Error handling:**
- If Gemini API times out (> 30s) → log `status: "failed"`, `errorMessage: "Gemini timeout"`, exit gracefully.
- If Gemini returns non-JSON → attempt regex extraction of JSON block. If still invalid → log `status: "partial"`, capture raw response for manual review, skip this user.
- If rate limited → back off, retry once after 5s, then fail gracefully.

#### Phase D — Response Parsing (`geminiResponseParser.ts`)

Parse the JSON response into database records.

**For each item in `expenseFlags`:**
1. Validate `sourceId` exists in `Expense` collection.
2. Validate `suggestedCategory` exists in `DeductibleCategoryRule`.
3. Check no existing `DeductionFlag` with `overriddenBy: "user"` for this `sourceId`.
4. Create `DeductionFlag`:
   - `detectionMethod: "ai"`
   - `confidence: item.confidence` (default "medium")
   - `status: "suggested"`
   - `rationale: item.rationale`
   - `aiRationale: item.rationale`
   - `scanId: scan._id`
   - `deductionRuleApplied: matchingRule._id`

**For each item in `subscriptionFlags`:**
- Same as above, but `sourceType: "subscription"`.

**For each item in `missedDeductions`:**
1. Validate `suggestedCategory` exists in rules.
2. Check no duplicate pending `MissedDeductionSuggestion` for same user + category.
3. Resolve `supportingEntryIds` to actual entries for the `supportingEntries` array.
4. Create `MissedDeductionSuggestion`:
   - `status: "suggested"`
   - `confidence: item.confidence`
   - `rationale: item.rationale`
   - `aiReasoning: item.rationale`
   - `scanId: scan._id`
   - `estimatedAmount: item.estimatedAmount || null`

**For each created record, increment counters in `AiDeductionScan.results`.**

#### Phase E — Post-Scan Cleanup

1. Update `AiDeductionScan` with final counts and `status: "success"`.
2. If any `MissedDeductionSuggestion` or `DeductionFlag` was created with `confidence: "high"` (rare for AI), optionally trigger a notification. But default: all AI suggestions are medium/low confidence.
3. **Do NOT auto-accept anything.** All records land in `status: "suggested"`.

---

### 2.3 Scheduled Job: `nightlyDeductionScan.ts`

**Trigger:** Run once per night (e.g., 2:00 AM) for all active users.

**Implementation:**
```ts
// Pseudo-code
const activeUsers = await User.find({ lastLoginAt: { $gte: thirtyDaysAgo } });
for (const user of activeUsers) {
  try {
    await runDeductionScan(user._id, { trigger: "scheduled", periodDays: 90 });
  } catch (err) {
    console.error(`Scan failed for user ${user._id}:`, err);
    // Continue to next user — never let one failure block others
  }
}
```

**Scheduling:** Use the existing job scheduler if the team has one (e.g., `node-cron`, `bull`, or Vercel Cron). If none exists, create a simple cron job entry point.

**Rate limiting / cost control:**
- Batch users. Process max 50 users per night if needed.
- Track Gemini API usage (token counts) in `AiDeductionScan.geminiRequest`.
- If costs spike, throttle: only scan users with new expenses since last scan.

---

### 2.4 On-Demand Endpoint

#### `POST /api/tax-optimizer/scan`
**Auth:** Logged-in user only.
**Body:** (optional)
```json
{
  "periodStart": "2026-01-01",
  "periodEnd": "2026-03-31"
}
```
**Behavior:**
- If no body, default to current quarter.
- Call `runDeductionScan(req.user._id, { trigger: "manual", periodStart, periodEnd })`.
- Return scan summary:
```json
{
  "success": true,
  "scanId": "...",
  "newFlags": 3,
  "newMissedSuggestions": 1,
  "status": "success"
}
```
- **Rate limit:** Max 1 manual scan per user per hour to prevent abuse.

---

### 2.5 Query Endpoints

#### `GET /api/tax-optimizer/deduction-flags`
**Query:** `?status=suggested&detectionMethod=ai`
**Response:** List of `DeductionFlag` for the user, filtered by status and method.

#### `GET /api/tax-optimizer/missed-suggestions`
**Query:** `?status=suggested`
**Response:** List of `MissedDeductionSuggestion` for the user.

#### `POST /api/tax-optimizer/deduction-flags/:id/accept`
**Body:** none
**Behavior:** Set `status: "accepted"`, `resolvedAt: now`. If this flag was previously counted in `QuarterlyLiabilityEstimate`, trigger a recompute (Phase 3 logic).

#### `POST /api/tax-optimizer/deduction-flags/:id/dismiss`
**Body:** none
**Behavior:** Set `status: "dismissed"`, `resolvedAt: now`, `overriddenBy: "user"`. Future scans must skip this item.

#### `POST /api/tax-optimizer/missed-suggestions/:id/accept`
**Behavior:** Set `status: "accepted"`. UI should then prompt the user to log a corresponding expense. The suggestion itself does not create an expense — the user must do that manually or via a redirect.

#### `POST /api/tax-optimizer/missed-suggestions/:id/dismiss`
**Behavior:** Set `status: "dismissed"`, `overriddenBy: "user"`. Future scans skip.

---

## 3. Frontend Implementation

### 3.1 File Structure

```
src/
├── pages/
│   └── tax/
│       └── DeductionOptimizer.tsx          # Main page (extends Phase 2)
├── components/
│   └── tax/
│       ├── DeductionReviewList.tsx         # Existing from Phase 2
│       ├── AIDeductionFlagsPanel.tsx       # NEW — AI-suggested expense/subscription flags
│       ├── MissedDeductionPanel.tsx        # NEW — missed deduction suggestions
│       ├── ScanNowButton.tsx               # NEW — manual trigger + loading state
│       ├── ScanStatusBadge.tsx             # NEW — shows last scan time/status
│       └── SuggestionCard.tsx              # NEW — reusable card for accept/dismiss
└── hooks/
    └── useAiScan.ts                        # NEW — React Query hooks for scan endpoints
```

---

### 3.2 Components

#### `ScanNowButton.tsx`
- Button: "Scan for Missed Deductions"
- On click: calls `POST /api/tax-optimizer/scan`
- States:
  - Idle: "Scan Now"
  - Loading: "Scanning with AI..." (spinner)
  - Success: "Scan complete — 3 new suggestions found" (auto-dismiss after 5s)
  - Error: "Scan failed. Try again later."
- **Rate limit awareness:** If backend returns 429, show "You can scan again in X minutes."
- **Last scan info:** Display "Last scan: 2 hours ago" fetched from `GET /api/tax-optimizer/scan-status` (or derive from most recent `AiDeductionScan` for the user).

#### `AIDeductionFlagsPanel.tsx`
- Section title: "AI-Suggested Deductions"
- Subtitle: "These expenses were flagged by our AI as potentially deductible. Review and accept or dismiss."
- List of `DeductionFlag` where `detectionMethod === 'ai'` and `status === 'suggested'`.
- Each card shows:
  - Expense/subscription description
  - Amount + currency
  - Suggested category
  - **Rationale** (prominently displayed — this is the key differentiator from rule-based flags)
  - Confidence badge ("Medium confidence" / "Low confidence")
  - Accept button → calls `POST .../accept`
  - Dismiss button → calls `POST .../dismiss`
- Empty state: "No AI-suggested deductions right now. Run a scan to check."

#### `MissedDeductionPanel.tsx`
- Section title: "Deductions You May Have Missed"
- Subtitle: "Based on your income and spending patterns, you may be eligible for these deductions."
- List of `MissedDeductionSuggestion` where `status === 'suggested'`.
- Each card shows:
  - Suggested category
  - Rationale
  - Estimated amount (if available)
  - Supporting entries: "Based on your internet bill and freelance income..."
  - **"Log This Expense" button** → redirects to Expense Tracking page with pre-filled category
  - Dismiss button
- Empty state: "No missed deductions detected. Great job keeping your records up to date!"

#### `ScanStatusBadge.tsx`
- Small inline component showing:
  - "Last AI scan: 8 hours ago"
  - Status dot (green = success, yellow = partial, red = failed)
- Clickable → opens a modal with recent scan history (last 5 `AiDeductionScan` entries).

---

### 3.3 Deduction Optimizer Page Layout

The main `/dashboard/tax-optimizer` page should now have three sections:

```
┌─────────────────────────────────────────────┐
│  Tax Deduction Optimizer                    │
│  [Scan Now Button]  Last scan: 8h ago ✓     │
├─────────────────────────────────────────────┤
│  SECTION 1: Rule-Based Deductions           │
│  (existing from Phase 2)                    │
│  — High confidence, auto-flagged            │
├─────────────────────────────────────────────┤
│  SECTION 2: AI-Suggested Deductions         │
│  (AIDeductionFlagsPanel)                    │
│  — Review expenses the AI thinks qualify   │
├─────────────────────────────────────────────┤
│  SECTION 3: Missed Deductions               │
│  (MissedDeductionPanel)                     │
│  — Deductions with no logged expense        │
├─────────────────────────────────────────────┤
│  SECTION 4: Quarterly Liability Estimate    │
│  (existing from Phase 3)                    │
└─────────────────────────────────────────────┘
```

---

## 4. Gemini Integration Details

### 4.1 API Setup

- Use the existing Gemini API key/config already in the project (from Module 1/4).
- If not yet configured, add `GEMINI_API_KEY` to environment variables.
- Use model: `gemini-1.5-flash` (fast, cheap, good enough for categorization).
- **Do NOT use Gemini for tax computation** — only for categorization and pattern detection. Tax math stays in `tax-utils.ts` (Phase 1).

### 4.2 Prompt Engineering Guidelines

1. **Be explicit about the output format.** JSON schema in the prompt reduces parsing errors.
2. **Provide the rules as context.** Never let Gemini hallucinate deduction categories.
3. **Include negative examples.** Add to prompt: "Do NOT flag personal meals, entertainment, or clothing unless the rules explicitly allow them."
4. **Handle Bangladesh specifics.** If jurisdiction is BD, mention: "Bangladesh allows investment-based tax rebates on certain savings/insurance instruments up to a capped percentage of income." (if applicable)
5. **Keep prompts under 20KB.** Truncate old data if needed.

### 4.3 Response Safety

```ts
// Safety wrapper
function safeJsonParse(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code block
    const match = text.match(/```json\n?([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);

    // Try finding first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Could not parse Gemini response");
  }
}
```

---

## 5. Integration Touchpoints (Read-Only)

| Existing System | How We Use It | Read Method |
|-----------------|---------------|-------------|
| **Expense collection** | Feed into AI context; flag unflagged items | `Expense.find({ userId, date })` |
| **Subscription collection** | Include in context; flag work-related but uncategorized subs | `Subscription.find({ userId })` |
| **UsageLog collection** | Lower confidence for low-usage subscriptions | `UsageLog.find({ subscriptionId })` |
| **Income collection** | Context for missed deduction inference | `Income.find({ userId, date })` |
| **User profile** | Work type, jurisdiction, category | `User.findById(userId)` |
| **Tax Rules Engine** | Rules provided to Gemini as context | `TaxBracketSet`, `DeductibleCategoryRule` |
| **DeductionFlag** | Prevent duplicates; respect overrides | `DeductionFlag.find({ userId })` |
| **QuarterlyLiabilityEstimate** | Trigger recompute on accept/dismiss | Call existing Phase 3 service |
| **Notifications (Gmail API)** | Notify on new missed deductions | Call existing notification service |

---

## 6. Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| **Gemini API is down / timeout** | Log `AiDeductionScan.status: "failed"`. Rule-based layer (Phase 2) continues working. Retry next scheduled run. |
| **Gemini returns invalid JSON** | Log raw response. Mark scan as `"partial"`. Do not create any flags from that response. |
| **Gemini suggests a category not in our rules** | Reject the suggestion. Log as parse error. Only accept categories that exist in `DeductibleCategoryRule`. |
| **User has > 500 expenses in period** | Truncate to most recent 200. Log the truncation in `AiDeductionScan.context`. |
| **Duplicate suggestion** | Before creating, check `MissedDeductionSuggestion` for same `userId + suggestedCategory + status: "suggested"`. Skip if exists. |
| **User dismisses a suggestion, then scans again** | Respect `overriddenBy: "user"`. Future scans skip dismissed suggestions. |
| **AI flag conflicts with rule flag** | If rule says "deductible" and AI says "not deductible", do NOT overwrite. Surface both in UI with note: "Rule and AI disagree." |
| **Subscription has very low usage** | Include in prompt. Let Gemini decide to lower confidence or omit. Do not pre-filter on the backend. |
| **User has no expenses in period** | Still run scan. Gemini may infer missed deductions from income pattern alone. Context will show empty expenses array. |
| **Cost control — Gemini bill too high** | Track token usage per scan. If avg > threshold, reduce scan frequency (weekly instead of nightly) or truncate context further. |

---

## 7. Testing Checklist

### Backend Tests
- [ ] `scanContextBuilder` correctly assembles context from all existing collections.
- [ ] `geminiPromptBuilder` produces a valid prompt under 20KB.
- [ ] `geminiResponseParser` correctly creates `DeductionFlag` records for `expenseFlags`.
- [ ] `geminiResponseParser` correctly creates `MissedDeductionSuggestion` records for `missedDeductions`.
- [ ] Duplicate detection prevents re-creating existing suggestions.
- [ ] `overriddenBy: "user"` is respected — dismissed items are skipped in future scans.
- [ ] Invalid Gemini response is handled gracefully (no crash, no bad data written).
- [ ] Gemini timeout is handled gracefully.
- [ ] `AiDeductionScan` audit log is written for every run.
- [ ] `POST /api/tax-optimizer/scan` respects rate limit (1/hour).
- [ ] `POST .../accept` and `POST .../dismiss` update status correctly.
- [ ] Accepting an AI flag triggers `QuarterlyLiabilityEstimate` recompute.

### Frontend Tests
- [ ] "Scan Now" button shows loading state during scan.
- [ ] Scan result summary displays correctly ("3 new suggestions found").
- [ ] `AIDeductionFlagsPanel` renders AI flags with rationale visible.
- [ ] `MissedDeductionPanel` renders missed suggestions with "Log This Expense" button.
- [ ] Accept/Dismiss actions update UI optimistically.
- [ ] Empty states render when no AI suggestions exist.
- [ ] Rate limit message shows when user tries to scan too frequently.

### Integration / E2E Tests
- [ ] End-to-end: Log expense → run scan → AI flags it → accept flag → liability estimate updates.
- [ ] End-to-end: Run scan → missed suggestion appears → dismiss → re-scan → suggestion does not reappear.
- [ ] End-to-end: Gemini returns invalid JSON → scan logs failure → no bad records created.

---

## 8. Definition of Done (Phase 4)

- [ ] `MissedDeductionSuggestion` and `AiDeductionScan` schemas created.
- [ ] `DeductionFlag` extended to support `detectionMethod: 'ai'` and `aiRationale`.
- [ ] `geminiDeductionScanner` service implemented with context builder, prompt builder, and response parser.
- [ ] Nightly scheduled job runs scans for all active users.
- [ ] `POST /api/tax-optimizer/scan` endpoint works for manual on-demand scans.
- [ ] Query and action endpoints (`GET` flags/suggestions, `POST` accept/dismiss) all functional.
- [ ] Frontend panels for AI-suggested deductions and missed deductions are built and integrated into the Optimizer page.
- [ ] "Scan Now" button with loading states and rate limiting works.
- [ ] All AI suggestions land in `status: "suggested"` — nothing auto-applies.
- [ ] `AiDeductionScan` audit trail captures prompt, response, and results for debugging.
- [ ] No modifications made to teammates' modules or schemas.
- [ ] All code committed; Gemini integration documented in README.

---

## 9. Notes for the Coding Agent

1. **This is purely additive.** Nothing built in Phases 1–3 should change. The AI layer sits alongside the rule layer.
2. **Gemini is a categorization assistant, not a tax advisor.** It never computes tax amounts. It only suggests which category an expense might fall under.
3. **Never trust Gemini's output blindly.** Always validate `suggestedCategory` against `DeductibleCategoryRule`. Always parse defensively.
4. **The audit log (`AiDeductionScan`) is critical for defense.** It proves you know what the AI said and when. Keep raw prompts/responses for 30 days.
5. **Respect user overrides above all else.** If a user dismisses something, it stays dismissed forever (unless they manually clear the override).
6. **Cost awareness:** Gemini API calls cost money. Batch per user, limit context size, and track usage. The free tier of Gemini is generous but not infinite.
7. **Use the existing Gemini client config** if the project already has one set up for Module 1 (income/expense analysis). Don't create a second API key unless necessary.
