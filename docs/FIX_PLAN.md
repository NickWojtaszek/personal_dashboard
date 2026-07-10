# Fix Plan — verified defect inventory & implementation spec

**Audience:** Claude Opus (or any implementing agent) working in VS Code on this repo.
**Produced:** 2026-07-10, from a full scoping run (5 parallel audit passes) followed by a
manual verification recon. Every file:line below was re-checked against the live code on
this date — but re-verify each claim against the current file before editing; the repo
moves fast.

---

## Context

Two apps in one repo:

1. **Personal aggregator** — properties, vehicles, insurance, invoices, contracts,
   correspondence, shopping, documents. React 19 + Vite + Tailwind, Supabase persistence.
2. **Radiology suite** — dictation + report templates (`src/radiology/speaksync`, ~120
   files) with a local Whisper server (`dictation-server/`). Owner is a radiologist
   reporting in Polish.

**Deployment reality (owner-confirmed):** used from **multiple devices** and **deployed
publicly**. This makes cross-device document sync and client-side key exposure top
priority.

### Ground rules

- **This machine skips devDependencies** — always `npm install --include=dev`.
- Gates: `npx tsc --noEmit` (currently **29 errors** — see Phase 6) and `npx vitest run`
  (currently green: 1 file, 10 tests). Don't add new tsc errors; Phase 6 drives it to zero.
- Persistence model: single Supabase table `app_data(key, value jsonb, updated_at)`;
  each `launcher-*` / `speaksync_*` key is one row holding a whole JSON tree
  (`src/lib/storage.ts`). localStorage is a cache/fallback. IndexedDB (`dashboard-blobs`)
  holds document base64 (see Phase 1).
- The template macro engine (`src/radiology/speaksync/utils/templateMacros.ts`) and
  `reportPoints.ts` are good, tested code — don't churn them.
- Each phase is independently shippable. Commit per phase (or smaller).

### Actions only the owner can do (flag these, don't attempt)

1. **Rotate the Gemini API key** — the current one is baked into every deployed bundle
   (see Phase 2) and must be treated as burned.
2. **Create the Supabase Storage bucket** (Phase 1) and deploy the Edge Function
   (Phase 2) — needs Supabase dashboard/CLI access.
3. **Verify live RLS matches `supabase/schema.sql`** — the schema file *is* correct
   (allowlist-enforced via `is_allowed_user()`), but whether it was applied to the live
   project is unverifiable from the repo. Note: the SQL comment block in
   `src/lib/storage.ts:16-20` shows an old `using (true)` policy — that comment is
   **stale**; update it when touching the file.

---

## Phase 1 — Documents that actually persist (root cause of "document storage is broken")

### Current architecture (verified)

- Attaching a file → `fileToDocument` (`src/lib/documents.ts:24`) stores base64 in
  `Document.data` on the entity.
- On save, for keys in `BLOB_KEYS` (`src/lib/storage.ts:30-37`: properties, insurance,
  invoices, vehicles, contracts, correspondence-store), `stripBlobs`
  (`src/lib/blobBridge.ts:154`) walks the tree, moves any `data` string >256 chars into
  IndexedDB (`src/lib/blobStore.ts`, DB `dashboard-blobs`), and replaces it with a
  `__blob__:<key>` reference. Long text fields (`timeline`, `extractedText`, `summary`)
  get `__longstr__:` treatment.
- **What reaches Supabase/localStorage is the stripped tree.** The PDF bytes exist only
  in the local browser's IndexedDB.

### Defects (verified)

| # | Defect | Where |
|---|--------|-------|
| 1.1 | Document bytes never reach the cloud → no cross-device sync; cleared browser data = documents gone | `blobBridge.ts:75` (ref substitution), `storage.ts:94-121` |
| 1.2 | Rehydration miss silently maps to `data: undefined` — no user-visible error | `blobBridge.ts:134-135`; partial-failure path `blobStore.ts:104-106` |
| 1.3 | **Blob keys are unstable**: `blobKey()` embeds the tree path (with array indices) *and* an incrementing counter (`blobBridge.ts:30-32`, `:73`, `:83`). Every save regenerates keys and re-puts all blobs; old keys orphan in IndexedDB forever; reordering an array changes every key | `blobBridge.ts:30, 68, 73, 83` |
| 1.4 | Unguarded `atob(doc.data)` throws `InvalidCharacterError` if `data` is a leaked `__blob__:` ref or corrupted — kills the open/preview handler | `openDocument.ts:13`, `documents.ts:44` (the latter runs inside a render effect: `InvoicesPage.tsx` iframe preview) |
| 1.5 | PDF.js `GlobalWorkerOptions.workerSrc` is a global singleton set in 3 places: guarded+bundled in `pdfExtraction.ts:18-23`, but **unconditionally to an esm.sh CDN URL** in `extractPropertyData.ts:10` and `insurance-detail/AIAssistantSection.tsx:10`. Load-order race; CDN is a runtime SPOF | those 3 files |
| 1.6 | Insurance half-migrated: detail container binds `documents[]` only (`InsuranceDetailPage.tsx:230-231`) but AI extraction / `EditInsuranceModal.tsx:109` write the legacy singular `document` — those PDFs are invisible in the detail UI. Contract has the correct bridge to copy (`ContractDetailPage.tsx:365-366` reads `documents ?? [document]`, writes both) | |
| 1.7 | All-Documents hub omits correspondence attachments: `DocumentsPage` gets properties/insurance/invoices/vehicles/contracts but not `correspondenceStore` | `App.tsx:950-957` |

### Fix spec

1. **Stable blob keys first** (prerequisite for cloud storage): key blobs by `doc.id`
   (uuid — `fileToDocument` already sets one). In `walkAndStrip`, use
   `blob:<doc.id>` when `id` exists; assign a uuid on the fly for legacy docs missing
   one (mutating the stripped copy is fine — it gets saved). Keep reading old-style keys
   so existing refs still rehydrate. For `__longstr__:` fields, key by owner object id +
   field name where available.
2. **Swap `blobStore.ts` backend to Supabase Storage** — the module was explicitly
   designed for this (`blobStore.ts:5-8`; API: `putBlob/getBlob/deleteBlob/getAllBlobKeys/putBlobs/getBlobs`).
   - Private bucket `documents`. Store raw bytes (decode base64 → `Blob`), object path =
     the blob key (sanitize for path rules). Storage RLS: same allowlist as `app_data`.
   - Keep IndexedDB as a **local cache**: `getBlobs` → try IndexedDB, fetch misses from
     the bucket, backfill cache. `putBlobs` → write IndexedDB + upload; with stable keys,
     skip upload when the object already exists (`upsert: false`, ignore 409 — cheap
     dedupe).
   - All writes/reads must degrade gracefully offline (IndexedDB-only, queue nothing —
     next save retries naturally since stripBlobs re-puts).
3. **Rescue migration** (do this before anything destructive): on app load, one-time
   (localStorage flag `blob-migration-v1`), enumerate `getAllBlobKeys()` and upload every
   local blob absent from the bucket. **The owner's current browser likely holds the only
   copy of his PDFs.**
4. **Guard decoding**: one shared `base64ToBlob(data, mimeType): Blob | null` in
   `documents.ts` — try/catch around `atob`, strip a `data:*;base64,` prefix if present,
   return `null` on a `__blob__:`/`__longstr__:` prefix (that's a rehydration miss).
   Use it in `openDocument.ts` and `documentToBlobUrl`. On null: `alert`/toast
   "Document unavailable on this device" rather than silence (1.2).
5. **One worker config**: delete the two CDN `workerSrc` lines
   (`extractPropertyData.ts:10`, `AIAssistantSection.tsx:10`); have both import the
   bundled setup from `pdfExtraction.ts` (or extract a `lib/pdfWorker.ts`).
6. **Insurance bridge** (copy Contract's pattern): container reads
   `policy.documents ?? (policy.document ? [policy.document] : [])`; writes set both
   `documents` and `document: docs[0]`. Point AI-extract attachment at `documents[]`.
7. **Hub completeness**: pass `correspondenceStore` into `DocumentsPage` and index its
   attachments (`documentIndex.ts` already deep-walks arbitrary shapes).

### Acceptance

- Attach a PDF, save, delete the IndexedDB database in devtools, reload → document still
  opens (fetched from bucket).
- A stale/corrupt `data` value shows a friendly message; no uncaught exception.
- PDF AI-extraction works with devtools offline-blocking of `esm.sh`.
- Insurance AI-attached PDF appears in the policy's Documents section.

---

## Phase 2 — Security

### Defects (verified)

- `vite.config.ts:13-17` `define` string-replaces `process.env.API_KEY` /
  `process.env.GEMINI_API_KEY` with the real key at build time → **the Gemini key ships
  in plaintext in every deployed bundle**. Call sites (all in-browser `new GoogleGenAI({apiKey: ...})`):
  `src/lib/extractPropertyData.ts:635`, `src/lib/summarizeThread.ts:225`,
  `src/lib/pdfExtraction.ts:72`, `src/components/insurance-detail/AIAssistantSection.tsx:112`,
  `src/radiology/speaksync/services/providers/GeminiProvider.ts:17-18`
  (+ dead `geminiService.ts`, deleted in Phase 4).
- `.gitignore` does **not** ignore `.env` (only `*.local`). No secret is committed today
  (only `.env.example` patterns exist), but it's a latent leak.
- Radiology AI settings store per-provider keys in localStorage/Supabase and call vendors
  directly from the browser; Anthropic/OpenAI are CORS-blocked anyway (the UI already
  warns), so today only Gemini(+Local) can work in-browser.

### Fix spec

1. **Supabase Edge Function `ai-proxy`**: holds `GEMINI_API_KEY` as a function secret;
   accepts `{model, contents, config}`; requires a valid Supabase auth JWT and checks
   `is_allowed_user()` before forwarding. Client-side: one `src/lib/ai.ts` wrapper
   (`callGemini(model, request)`) used by all five live call sites. Remove the two
   `API_KEY`/`GEMINI_API_KEY` entries from `vite.config.ts` `define`
   (keep `GOOGLE_CLIENT_ID` — OAuth client ids are public by design).
2. **Owner rotates the key** after the proxy ships (old builds leaked it).
3. Add `.env` to `.gitignore`.
4. Radiology `GeminiProvider` routes through the same proxy (server key) with the
   user-set model passed through; leave Anthropic/OpenAI provider UIs but mark them
   browser-unsupported unless routed via the proxy later.
5. Update the stale RLS comment block in `storage.ts:8-25` to match `supabase/schema.sql`.

---

## Phase 3 — One date/money core (fixes the calendar, renewals, due-dates, forecasts)

### The systemic bug (verified)

Dates are stored as `'YYYY-MM-DD'`. `new Date('YYYY-MM-DD')` parses as **UTC midnight**;
comparisons/normalization use **local** time. In UTC+ timezones (UK/PL) everything shifts
one day.

Verified instances:

- `general/CalendarView.tsx:72` and `:123` — cell key `day.toISOString().slice(0,10)`
  built from **local** date arithmetic vs an event map keyed on raw stored strings →
  events render a day off / vanish.
- `general/dateUtils.ts:37` + `:97` — `parseRenewalDate` returns local end-of-month,
  then `.toISOString().split('T')[0]` rolls it back to the **previous** day (i.e. the
  wrong month).
- `dateUtils.ts:149` — `new Date(item.date) >= today` compares UTC-midnight to local
  midnight → items due *today* dropped as past.
- `dateUtils.ts:153-168` `formatDistanceToNow` — mixed bases, `Math.ceil`, plus
  "in 1 weeks" grammar at `:162`.
- `general/DueDateOverview.tsx:19` (`daysUntil`, `Math.ceil`) and `:46` (range cutoff).
- `lib/formatting.ts:26-31` (`formatDate` prints previous day) and `:34-42`
  (another `daysUntil`, `Math.round` — disagrees with the others).
- `lib/transactionClassifier.ts:122-135` — compliance next-due lands on Dec 31 instead
  of Jan 1.
- Radiology: `utils/studyUtils.ts:22-27` (UTC `todayStr` vs local month getters),
  `context/StudyContext.tsx:112` (`new Date(dateStr).toISOString()` shifts
  evening entries to the next day), `report/Specification.tsx:58`,
  `studyManager/ReportGenerator.tsx:38` (month filters on mixed bases).

### Fix spec

1. New `src/lib/dates.ts` (with vitest coverage):
   - `parseLocalDate(iso: string): Date` — split on `-`, `new Date(y, m-1, d)`.
   - `toLocalISO(d: Date): string` — from local getters, no `toISOString`.
   - `todayLocal(): Date` (local midnight).
   - `daysUntil(iso: string): number` — midnight-to-midnight, exact integer;
     **one** rounding convention everywhere.
   - `formatDistanceToNow` moved here; fix "1 weeks".
2. Swap in at every site above. Rule of thumb: **never** call `new Date(str)` or
   `.toISOString()` on a date-only value anywhere in `src/` (radiology included) —
   grep for both when done.
3. **One currency-symbol map**: canonical `currencySymbol()` in `lib/formatting.ts:6-12`.
   Delete the divergent copies in `general/CostForecastView.tsx:5`,
   `general/DueDateOverview.tsx:7` (both say `A$`), and
   `property-detail/FinancialHealthSection.tsx:10` (says `$`). Pick one rendering (A$
   recommended — unambiguous).
4. **Frequency-aware annualization**:
   - `dateUtils.ts:214-216` — non-Monthly insurance premium currently treated as annual;
     handle Quarterly/6-monthly (the `InsuranceInfo.paymentFrequency` values in
     `types.ts` are authoritative).
   - `dateUtils.ts:233` — unknown vehicle term silently defaults to 6 months; surface it.
   - `dateUtils.ts:248` — property forecast line hardcodes `'GBP'`; derive from
     `property.country` (see Phase 5 country map).
   - `insurance-detail/policyUtils.ts:112-117` `annualizePremium` — same gap.
5. `lib/duplicateDetection.ts:117` — include currency in the amount grouping key;
   `:171,:179` reason strings hardcode `$`.
6. Radiology zero-guard: `report/Summary.tsx:28, 66, 67` divide by `studies.length` /
   `totalPoints` — renders `NaN PLN` for empty reports (ReportGenerator explicitly
   allows 0-study reports). Guard with a friendly empty state.

---

## Phase 4 — Radiology repairs + dead-code purge

> **STATUS 2026-07-10: DONE** (in the "radiology iron-out" session). Model IDs fixed
> (+ one-time migration healing the broken model persisted in stored settings), `"2.0"`
> guard deleted, verifyReport now sets rejected status, `isCrossUserFraud` is now
> actually computed, study-ID collisions fixed, NaN guards added, active-tab highlight
> fixed, AccountingDashboard status colors converted to static maps, grammar-check
> button wired, study-code approval modal wired (triggers on copy / refinement-accept,
> once per loaded template), remote-mic feature removed (impossible by design),
> ~27 dead files deleted (incl. CorrectionModal + components/SettingsPage.tsx +
> AudioLevelMeter, found in the deeper pass). Whole repo is now `tsc`-green — a
> `src/vite-env.d.ts` was added and all 29 errors fixed. Remaining from this phase:
> only the optional dictation-robustness items (rAF stall wall-clock timer, dropped
> segment retry/marker).

### AI layer is broken out of the box (verified)

- `speaksync/constants/index.ts:1` — `GEMINI_FLASH_MODEL = 'gemini-3.5-flash'`
  **does not exist** (there is no Gemini 3.5 line). Same literal hardcoded in
  `context/SettingsContext.tsx:45` and `pages/AIConfigurationPage.tsx:26`. Default
  provider is Gemini → default enhance/merge/correct calls 404.
- `providers/GeminiProvider.ts:19` —
  `this.model = (model && !model.includes('2.0')) ? model : GEMINI_FLASH_MODEL;`
  silently rejects any user-configured model containing "2.0" *and* falls back to the
  fake model. Delete the `includes('2.0')` guard entirely.
- Fix: set the default to a real current model (verify against the Gemini docs at
  implementation time; `gemini-2.5-flash` was correct as of mid-2026). Route through the
  Phase 2 proxy. `providers/AnthropicProvider.ts:27` default `claude-3-opus-20240229` is
  ancient — update or leave marked unsupported per Phase 2.

### Other verified defects

- `context/StudyContext.tsx:107` — `id: Date.now()` collides for same-millisecond adds;
  `deleteStudy` filters by id. `Study.id` is a number, so either switch the type to a
  uuid string (ripples through `studyUtils`, reports — do it properly) or generate
  guaranteed-unique numbers (`maxExistingId + 1`). Prefer the uuid migration.
- `context/ReportContext.tsx:148-152` — `verifyReport` maps `r && r.id === reportId ? r : r`
  — a no-op in both branches. It should set the report's status from the
  `VerificationRecord` (accounting currently works by accident off the separate records).
- `components/AccountingDashboard.tsx:165-167, 183, 231-232, 421` — dynamic Tailwind
  classes (`` `bg-${color}-600` ``) are never emitted by JIT, and `${color}900/50` is
  invalid CSS. Replace with a static status→class map.
- `pages/MainPage.tsx:396` — active-tab ternary yields `null` for the active tab →
  no active styling.
- Dictation robustness (optional, lower priority): `hooks/silenceDetector.ts:105` uses
  `requestAnimationFrame` — VAD stalls in backgrounded tabs; add a wall-clock max-segment
  timer in `useServerTranscription`. Failed segments (`useServerTranscription.ts:157-160`)
  drop audio silently — surface a gap marker and retry once.

### Dead code — verified safe to delete (re-verify imports before each `git rm`)

- ~~`src/components/PropertyDetailModal.tsx`~~ (deleted 2026-07-10)
- ~~`src/components/property-detail/PropertyDetailPage.tsx`~~ (deleted 2026-07-10)
- `src/radiology/speaksync/components/StudyTypesPanel.tsx` (0 bytes)
- `src/radiology/speaksync/components/TemplatesPanel.tsx` (0 bytes)
- `src/radiology/RadiologyPage.tsx` (orphaned — App mounts DictationPage +
  RadiologyTemplatesPage directly)
- `src/radiology/speaksync/services/geminiService.ts` (only a comment mentions it)
- `src/radiology/speaksync/services/storage/` — all 4 files (abandoned abstraction;
  `EncryptedStorageService` was never wired in — note: this means radiology data is
  stored unencrypted; flag to owner, don't fix silently)
- `src/radiology/speaksync/hooks/useLocalStorage.ts`
- `src/radiology/speaksync/data/grudzienStudies.ts`, `data/kwiecienStudies.ts`,
  `data/mockTestData.ts`, `utils/testDataLoader.ts` (dead chain — only import each other)

**Do NOT delete** `context/ThemeContext.tsx` / `ThemeSwitcher` — an earlier audit pass
flagged them, but 26 files consume them (via `ThemeBridgeProvider`).

**Owner decision (already made): keep** the multi-user verify/approve workflow
(VerifierDashboard etc.) even though PIN auth is a single-user stub.

---

## Phase 5 — Property financials

All in `src/components/property-detail/FinancialHealthSection.tsx` (1,409 lines) unless
noted. The file needs splitting eventually; fix correctness first.

### Verified defects

- **Two conflicting annualisation methods**: on-screen metrics scale transactions by
  `365 / spanDays` (`:975-985`) but the CSV/tax export uses `avg payment × 12`
  (`:115, :130, :148-149`), and the same screen annualises **mortgage** with `avg × 12`
  (`:1025-1035`). Screen ≠ export; mortgage ≠ operating costs. Extract one
  `annualise(transactions, method)` utility, use it for both surfaces.
- **`avg × 12` assumes monthly payments**: `MortgagePayment` (`types.ts:109-117`) has no
  `frequency`. Add one (`monthly | fortnightly | weekly | quarterly`, default monthly for
  legacy rows) and use it in every `× 12` site above.
- **Hardcoded currency/locale**: `'AUD'` defaults at `:47, :62, :276, :937`;
  `toLocaleString('en-AU')` at `:61, :278` vs `'en-GB'` at `:722` and
  `PropertyDetailPage.tsx:584`. Property has `country` (`AU|UK|US|NZ|PL`). Add
  `countryFormat(country): {currency, locale}` to `lib/formatting.ts` and route
  everything through it (also fixes Phase 3 item 4c).
- **FY matching double-count**: `inFY` fallback (`:995-1001`, duplicated at `:170-175`)
  matches `year === selectedFY || year === selectedFY + 1` when a charge has no
  `dueDate` — one charge can count in two adjacent financial years. Consolidate the two
  copies into one tested helper; a year-only charge should map to exactly one FY
  (decide: the FY it *starts* in).
- **Disposal-blind**: the financial engine renders full yield/cash-flow for sold
  properties (lists/forecasts respect `disposal`, this section doesn't). Show a
  "sold on {date}" banner and freeze/annotate metrics. `disposal.amount` (sale proceeds)
  is currently write-only — surface it (realised proceeds line) or drop the field.
- `extractPropertyData.ts:662` — `JSON.parse(response.text.trim())` with no try/catch and
  no null-check (contrast the guarded `pdfExtraction.ts:85-89`). Also migrate this file's
  own PDF/Gemini plumbing onto the shared `pdfExtraction.ts` helpers (kills the CDN
  worker, Phase 1.5) and add **Polish number formats** (`1 234,56` — space thousands,
  comma decimal) to the extraction prompt with a post-parse sanity check.
- `PropertyDetailPage.tsx:185-197` `derivePrincipalInterest` assumes interest-only when
  no split is given (documented as intentional — leave, but add a UI hint that the split
  is assumed).

---

## Phase 6 — Foundation: make `tsc` green and keep it green

> **STATUS 2026-07-10: mostly DONE.** `tsc --noEmit` is now at **0 errors**:
> `src/vite-env.d.ts` created, BugNotes/PropertiesPage/ComplianceSection data-shape
> bugs fixed (ComplianceSection "Clear All" was a silent no-op writing a field nothing
> reads — now clears `operations.compliance`), icon `style` props added, prop
> mismatches aligned (InvoiceRow now actually applies the dnd-kit drag transform —
> another silent no-op found). Remaining: add a `"typecheck"` script + gate (item 5)
> and the deferred structural work below.

Original error inventory (for reference — all fixed):

1. **Missing Vite types** (3 errors): `src/lib/supabase.ts:3,4`, `src/lib/gmail.ts:129`
   — `import.meta.env` untyped. Fix: create `src/vite-env.d.ts` with
   `/// <reference types="vite/client" />` (check `tsconfig.json` `include` covers it).
2. **Real data-shape drift** (fix the code, not the types):
   - `BugNotes.tsx:24` — `PAGE_LABELS` missing the `'documents'` key (page was added to
     the `Page` union later). Add the label.
   - `PropertiesPage.tsx:42` (×2) — reads `property.address`; the field lives at
     `property.overview?.address`.
   - `property-detail/ComplianceSection.tsx:264` — writes a `compliance` key that doesn't
     exist on `PropertyInfo` (compliance lives under `operations.compliance`).
3. **Icon components rejecting `style`** (7 errors across AccountingDashboard,
   FinancialReportGenerator, PersonalInfoForm, StudyTypesAndTemplatesPanel,
   VerifierDashboard): the shared radiology `Icons.tsx` components only accept
   `className`. Add `style?: React.CSSProperties` to their props.
4. **Prop-shape mismatches** (fix by aligning props): `ReportSubmissionPage.tsx:433/440/446`
   (passes `date`/`personalInfo` that Specification/Invoice/Summary don't declare),
   `VerifierDashboard.tsx` (`isCrossUserFraud`, `kodNFZ` missing from types),
   `AccountingDashboard.tsx:105` (`kodNFZ`), `CodeEditForm.tsx:105`,
   `AudioLevelMeter.tsx:20`, `AppCard.tsx:22`, `SortableInvoiceCardItem.tsx:32`
   (spread includes `style` the row component doesn't accept).
5. Add `"typecheck": "tsc --noEmit"` to `package.json` scripts and run it alongside
   `npm test` before every commit.

**Deferred (worth doing, not in this pass):** URL-persisted routing (refresh currently
loses page/selection — `App.tsx:54` state-based tabs); per-record saves + `updated_at`
conflict detection (whole-blob last-writer-wins in `storage.ts:204-258` and the
17-dependency save effect in `App.tsx:200-229`); debounce radiology `useStorage` writes
(`useStorage.ts:84` fire-and-forget per keystroke); splitting the god files
(`App.tsx` 1,111 lines, `FinancialHealthSection.tsx` 1,409, `RadiologyTemplatesPage.tsx`
1,862); generic `<SortableItem>` to collapse the 7 copy-paste sortable wrappers.

---

## Suggested commit sequence

1. Phase 1.1–1.3 (stable keys + Supabase Storage + rescue migration) — **do first, it's
   a data-rescue**
2. Phase 1.4–1.7 (atob guards, worker, insurance bridge, hub completeness)
3. Phase 2 (proxy, gitignore, key rotation hand-off to owner)
4. Phase 3 (dates.ts + swaps + tests)
5. Phase 4 (radiology fixes + dead-code purge)
6. Phase 5 (property financials)
7. Phase 6 (tsc green + gate)
