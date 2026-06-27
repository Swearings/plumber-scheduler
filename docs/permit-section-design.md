# PlumberPro — Permit Packet Builder
### Full design document (plumbing-only MVP, trade-extensible architecture)

> ⚠️ **Legal disclaimer (must ship in-app):** Permit requirements vary by municipality and change over time. This tool helps *prepare and track* permit packets — it does not guarantee approval and does not submit permits automatically unless a city API is connected. Always confirm requirements with the city before starting work.

---

## 0. Guiding principles

1. **Config-driven, not hard-coded.** No city's questions live in component code. The wizard renders from a rules engine (`FormFields` × `MunicipalityRules`). Adding Electrical later = inserting rows, not rewriting screens.
2. **Progressive disclosure.** Screening first, then only the sections that the city + permit type + scope unlock. Target: a water-heater swap is ~1 short screen; commercial TI is many.
3. **Trade as a first-class dimension.** Everything keys off `trade_id`. Plumbing is the only active trade now; the schema already carries the column.
4. **Offline-tolerant, autosave-first.** Plumbers work in basements. Draft autosaves locally, syncs when online.
5. **No false promises.** Statuses reflect *our* packet state + *manually-entered* city state. We never imply we talked to the city unless an API exists.

---

## 1. Product Requirements Document (PRD)

### 1.1 Problem
Solo plumbers and small shops waste hours figuring out *which* form each of 8+ municipalities wants, gathering the right documents, and tracking submissions/inspections across email, paper, and city portals. Mistakes cause rejections and re-trips.

### 1.2 Goal
A guided "Permit Packet Builder" that, given **City + Work Type + Scope**, asks only the relevant questions, assembles a complete document packet, exports a submission-ready PDF + checklist, and tracks the permit through inspection and closeout.

### 1.3 Users / personas
- **Solo plumber (primary):** mobile-first, wants the shortest correct path.
- **Office admin (secondary):** desktop, manages many permits, kanban + calendar.
- **Apprentice/agent:** fills drafts; owner/contractor signs off.

### 1.4 In scope (MVP)
- Plumbing trade only, 8 cities (Surrey, Vancouver, Richmond, Burnaby, Delta, Township of Langley, Coquitlam, White Rock).
- Permit-required screening, conditional wizard, completeness checker, document center, packet PDF export, manual-submission tracking, inspections, closeout, dashboard, kanban, calendar, contractor profile, archive.

### 1.5 Explicitly NOT in scope (MVP)
- Automatic submission to city portals (no public APIs). We provide a **"Open city portal"** deep link + **"Mark as submitted"** manual action.
- Online permit-fee payment to the city.
- Electrical/HVAC/mechanical content (architecture ready, data not loaded).
- Multi-user roles/permissions beyond the existing dispatcher/technician.

### 1.6 Success metrics
- Time to assemble a standard residential permit packet < 10 min.
- % packets that reach "Ready to submit" without manual review.
- Rejection/return rate (user-reported) trending down.
- # permits tracked per active company.

### 1.7 Key product decisions
- **"Prepare packet," not "submit."** Verbs throughout: *prepare, track, store, inspect, close*.
- **Rules are versioned and dated.** Each `MunicipalityRules` row has `verified_on`; UI shows "Rules last verified: <date> — confirm with city."
- **Screening is advisory.** Output is one of *Likely required / May not be required / Needs manual review*, never a guarantee.

### 1.8 Submission / forwarding model (how the packet leaves the app)
The app does **not** submit to the city. When a packet reaches "Ready," the **Forward** action sends the assembled info to the contractor (you), who then files it with the city manually. Delivery channels, designed to be swappable:

1. **Email forward (MVP default):** generate the packet PDF + a structured summary and email it to a configurable address (the contractor's own inbox by default). Reuses the same email-backend pattern as invoices (Supabase Edge Function + Resend). Until that's wired, a **local "Share/Export"** action hands the PDF to the OS share sheet.
2. **Database record (wire up later):** on Forward, write/flag the permit so an external system can pick it up — i.e., the permit row itself *is* the forwarded payload. A `forwarded_at`, `forwarded_to`, and `forward_channel` set of fields on `permits` records that it was sent. Later this can push to a webhook, a shared inbox, or a city portal API without changing the UI.
3. **Manual city link (always available):** "Open city portal" deep-link + "Mark as submitted" so the contractor can record the real city permit number afterward.

The **Forward** button replaces any implication of automatic city submission. Copy: *"Forward packet to me"* / *"Email packet"* / *"Export PDF."* No language claims the city received anything.

---

## 2. User flow

```
Permit Dashboard
   │  ("New Permit")
   ▼
[1] City  ──────────────► pick from 8 active municipalities
   ▼
[2] Work Type ──────────► permit category + work type (new/replace/alter/…)
   ▼
[3] Permit-Required Screening
        ├─ Likely required ───────► continue wizard
        ├─ May not be required ───► show note, allow continue anyway (save as "info")
        └─ Needs manual review ───► flag, allow continue
   ▼
[4] Applicant
   ▼
[5] Property
   ▼
[6] Owner / Customer
   ▼
[7] Contractor  (prefilled from Contractor Profile)
   ▼
[8] Scope of Work  (toggles: gas? backflow? fire? hydronic? site service? underground?)
   ▼
[9] Technical Details  (ONLY the sub-sections unlocked by scope toggles + category)
   ▼
[10] City-Specific Questions  (from MunicipalityRules)
   ▼
[11] Uploads  (document checklist driven by rules)
   ▼
[12] Review  (completeness %, missing items, packet preview)
   ▼
[13] Forward / Track  (Forward packet to me [email/DB] · Export PDF · Open city portal link · "Mark as submitted")
   ▼
[14] Inspection  (request → schedule → pass/fail → reinspection)
   ▼
[15] Closeout  (final approval, fees paid, archive)
```

**Navigation rules**
- Every step autosaves; user can exit and resume from dashboard (Draft).
- Back/Next always available; Next never *blocks* (you can save incomplete) but Review/Submit enforces completeness.
- A persistent right rail (desktop) / collapsible top bar (mobile) shows **completeness %** and **current city requirements**.

---

## 3. Dynamic form question list (canonical field catalog)

Fields are grouped by `section`. Each has a stable `key` (snake_case), `type`, and is shown only when its **visibility condition** passes. The full base catalog from the brief is implemented as `FormFields` rows; below is the organizing structure + the conditional triggers (the exhaustive field list from your spec is preserved verbatim in `seed/form_fields.ts`).

### 3.1 Sections (render order)
`applicant → property → owner_customer → contractor → scope → tech_fixtures → tech_piping → tech_water_heater → tech_gas → tech_backflow → tech_hydronic → tech_fire → tech_sewer_site → city_specific → uploads`

### 3.2 Field types
`text, textarea, number, integer, money, date, select, multiselect, boolean, phone, email, file, file[], repeatable_group, computed, signature, info_banner`

### 3.3 Conditional triggers (what unlocks each technical section)

| Section | Shown when |
|---|---|
| `tech_fixtures` | category ∈ {Plumbing, Renovation, Commercial, Multi-family, TI} OR scope.fixtures_changed |
| `tech_piping` | scope.new_piping OR scope.repiping OR scope.site_service OR category ∈ {Re-piping, Site Services} |
| `tech_water_heater` | category = Water Heater OR fixtures.water_heaters > 0 |
| `tech_gas` | scope.includes_gas = true OR category = Gas |
| `tech_backflow` | scope.includes_backflow = true OR category = Backflow |
| `tech_hydronic` | scope.includes_hydronic = true OR category ∈ {Hydronic, Boiler} |
| `tech_fire` | scope.includes_fire_sprinkler = true OR category = Fire Sprinkler |
| `tech_sewer_site` | scope.includes_site_service OR scope.underground OR category ∈ {Sewer/Drainage, Site Services} |
| `owner_customer.strata_letter` | owner.is_strata = true |
| `owner_customer.tenant_*` | owner.has_tenant = true |
| `scope.related_building_permit_number` | scope.connected_to_building_permit = true |

### 3.4 Computed fields
- `total_fixture_count` = Σ fixture inputs.
- `total_fixture_units` = Σ (count × fixture-unit weight) — weights table per BCBC; MVP can store raw and leave FU optional.
- `total_cost` (fees) = permit + inspection + reinspection + admin.
- `completeness_pct` (see §8).

*(The complete enumerated field list — applicant, owner/customer, property, contractor, scope, fixture counts, piping, water heater, gas, backflow, hydronic, fire, sewer/site, and all document categories from your brief — is stored as seed data, not duplicated here, so there is exactly one source of truth.)*

---

## 4. City-by-city conditional field matrix

Legend: ● required · ○ optional/visible · — hidden · ▲ document required

| Field group | Surrey | Vancouver | Richmond | Burnaby | Delta | Langley Twp | Coquitlam | White Rock |
|---|---|---|---|---|---|---|---|---|
| Permit-required screening | ○ | ● (emphasized) | ○ | ○ | ● (SFD instant vs review) | ● (is plumbing on building permit?) | ○ | ○ |
| Building category selector | ● (res/accessory/comm/onsite) | ○ | ● (new/add/alter/completion) | ● (install/finish/repipe/rough/site) | ● (SFD vs non-SFD) | ○ | ● (interior/exterior/fire) | ● (plumbing/fire/radiant/irrigation) |
| Municipal business licence | ● | ● (Van or intermunicipal) | ● | ● | ● | ● | ● | ● |
| Intermunicipal licence | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| TQ / Red Seal number | ● | ○ | ● | ○ | ○ | ● | ○ | ● |
| Related building permit # | ○ | ○ | ○ | ○ | ○ | ● (linkage) | ○ | ○ |
| Fixture count table | ● (detailed) | ● | ● (count table) | ● (inside) | ○ | ● | ● | ● |
| Site service lines (W/S/St) | ● (each length) | ○ | ● | ● (per-30m buckets) | ● (hydrant/service) | ○ | ● (water+fire len) | — |
| Fire sprinkler block | ● (heads/standpipe/FDC/hose) | ○ | ○ | ○ | ○ | — | ● (standpipes/underground) | ● |
| Hydronic block | ● | ● (equipment) | ○ | ● (hydronic permit) | ○ | — | ○ | ● (radiant HW) |
| Gas workflow | ○ | ● (separate gas permit) | ● (notif of completion) | ○ | ○ | ○ | ○ | ○ |
| Backflow test report ▲ | ▲ if backflow | ▲ | ▲ | ▲ if backflow | ▲ if backflow | ▲ if backflow | ▲ if backflow | ▲ if backflow |
| Chlorination certificate ▲ | ○ | ○ | ▲ (water service) | ○ | ○ | ○ | ○ | ○ |
| Drawings (DWV/water/sizing) ▲ | ▲ comm/multifam | ▲ multi-floor | ▲ comm/multifam + naming rules | ▲ site services | ▲ non-SFD | ▲ checklist | ▲ + large-file/digital | ▲ |
| Strata authorization ▲ | ▲ if strata | ▲ if strata | ▲ if strata | ▲ if strata | ▲ if strata | ▲ if strata | ▲ if strata | ▲ if strata |
| Agent/owner authorization ▲ | ○ | ○ | ○ | ○ | ○ | ▲ checklist | ○ | ▲ (agent auth form, reject if missing) |
| Re-piping unit count | ● | ○ | ○ | ● | ○ | ● (waterlines) | ● (replacement len) | ○ |
| Variance request | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |

**Per-city notable behaviors (encoded as rules):**
- **Vancouver:** screening can short-circuit to "may not need permit" for faucet/valve repair, same-location fixture replacement, stoppage clearing, leak repair. Gas spawns a *separate* gas permit record (linked).
- **Delta:** SFD → "instant issue" packet (smaller); non-SFD → "review required" (drawings unlocked).
- **Langley Twp:** first question is "Is plumbing already covered on the building permit?" — if yes, route to a lighter "additional fixtures only" path.
- **Coquitlam:** uploads step enables "large file / digital submission" guidance; special underground inspection type available.
- **White Rock:** completeness checker hard-blocks submit if agent authorization missing (explicit rejection logic).
- **Burnaby:** site-service lengths captured in **per-30m buckets** (storm/sanitary/water/future).
- **Richmond:** enforces document **file-naming convention** hints + requires sizing/loads/grades on drawings.
- **Surrey:** richest fixture table (grease/oil interceptor, island sink, urinal, wash basin, auto washer…) + fire-service line fields.

---

## 5. Database schema

> Postgres / Supabase. `snake_case`. All tables get `created_at`, `updated_at`. RLS scoped to `company_id`. Config tables (Municipalities, Trades, PermitTypes, FormFields, MunicipalityRules) are global/admin-managed; permit data tables are company-scoped.

```sql
-- ===== CONFIG (global, admin-managed) =====

create table trades (
  id uuid primary key default gen_random_uuid(),
  name text not null,            -- 'Plumbing', later 'Electrical', 'HVAC'
  slug text unique not null,
  active boolean not null default true
);

create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null default 'BC',
  portal_url text,
  permit_page_url text,
  inspection_url text,
  phone text, email text, notes text,
  active boolean not null default true
);

create table permit_types (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id),
  name text not null,            -- 'Water Heater Replacement'
  category text not null,        -- 'Water Heater' (one of the permit categories)
  description text
);

create table form_fields (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid references trades(id),   -- null = applies to all trades (base fields)
  key text unique not null,              -- 'fixture_water_closets'
  label text not null,
  type text not null,                    -- text|number|select|boolean|file|repeatable_group|computed|...
  options jsonb,                         -- for select/multiselect
  help_text text, placeholder text,
  section text not null,                 -- 'tech_fixtures'
  repeatable boolean not null default false,
  validation jsonb,                      -- {required?, min, max, regex, ...} (defaults; cities override)
  sort_order int not null default 0,
  active boolean not null default true
);

create table municipality_rules (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references municipalities(id),
  trade_id uuid not null references trades(id),
  permit_type_id uuid references permit_types(id),  -- null = applies to all types for that trade/city
  field_key text not null,               -- matches form_fields.key OR a document_type
  required boolean not null default false,
  visible boolean not null default true,
  condition_json jsonb,                  -- show/require only if condition passes (see §6)
  document_required boolean not null default false,
  notes text,
  verified_on date,                      -- when these rules were last confirmed against the city
  unique (municipality_id, trade_id, permit_type_id, field_key)
);

-- ===== PERMIT DATA (company-scoped) =====

create table properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  site_address text, unit text, city text, postal_code text,
  pid text, legal_description text, lot text, block text, plan text,
  property_type text, storeys int, units int, occupancy_type text,
  building_permit_number text, development_permit_number text
);

create table owners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  customer_name text, customer_phone text, customer_email text,
  owner_name text, owner_mailing_address text, owner_phone text, owner_email text,
  owner_company text, is_strata boolean, has_tenant boolean,
  tenant_contact_name text, tenant_contact_phone text,
  site_access_instructions text, access_code text, preferred_inspection_contact text
);

create table contractors (   -- usually one per company (profile), but allow many
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  company_name text, contact_person text, phone text, email text, address text,
  municipal_licence text, intermunicipal_licence text, plumbing_licence text,
  tq_number text, red_seal_number text, tq_holder_name text, gas_licence text,
  worksafe_number text, insurance_policy text, insurance_expiry date,
  default_municipality_id uuid references municipalities(id),
  is_default boolean default false
);

create table permits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  internal_reference text not null,      -- e.g. 'PM-2026-0042'
  trade_id uuid not null references trades(id),
  status text not null default 'draft',  -- see status enum §PRD
  municipality_id uuid not null references municipalities(id),
  permit_type_id uuid references permit_types(id),
  category text,
  property_id uuid references properties(id),
  owner_id uuid references owners(id),
  contractor_id uuid references contractors(id),
  applicant_json jsonb,                  -- small, permit-specific applicant block
  scope_description text,
  project_value numeric, labour_cost numeric, material_cost numeric,
  est_start date, est_completion date,
  city_permit_number text,               -- the number the city assigns (manual entry)
  screening_result text,                 -- likely_required|may_not_be_required|needs_review
  created_at timestamptz default now(),
  submitted_at timestamptz, approved_at timestamptz, closed_at timestamptz,
  archived_at timestamptz,
  -- forwarding (how the packet was sent to the contractor / external system)
  forwarded_at timestamptz,
  forwarded_to text,                     -- email or destination id
  forward_channel text                   -- 'email' | 'database' | 'export' | 'webhook'
);

create table permit_field_values (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  field_key text not null,
  value jsonb,                           -- jsonb handles text/number/bool/array/group
  unique (permit_id, field_key)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  document_type text not null,           -- 'backflow_test_report', etc.
  file_url text, file_name text,
  uploaded_by uuid, uploaded_at timestamptz default now(),
  required boolean default false,
  status text default 'present'          -- present|missing|rejected|approved
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  inspection_type text not null,         -- rough_in|final|gas|backflow|underground|hydronic|fire|special
  requested_date date, scheduled_date date, time_window text,
  inspector text, inspection_number text,
  site_access_contact text, access_instructions text,
  result text default 'pending',         -- pending|passed|failed|cancelled|reinspection_required
  deficiency_notes text, correction_deadline date,
  deficiency_photos jsonb,               -- [file_url]
  reinspection_date date, final_approval_date date
);

create table permit_events (             -- timeline
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  event_type text not null,              -- created|info_requested|submitted|approved|...
  description text,
  created_by uuid, created_at timestamptz default now()
);

create table permit_fees (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  permit_fee numeric default 0, inspection_fee numeric default 0,
  reinspection_fee numeric default 0, admin_fee numeric default 0,
  paid_by text,                          -- contractor|customer|company
  payment_status text default 'unpaid',  -- unpaid|partial|paid
  receipt_number text, receipt_url text, invoice_generated boolean default false
);
```

**Why this shape is future-proof**
- New trade = rows in `trades`, `permit_types`, trade-specific `form_fields`, and `municipality_rules`. Zero schema change.
- `permit_field_values` (EAV with jsonb) means new fields never require `ALTER TABLE`.
- `municipality_rules.condition_json` lets one rule express "required only when commercial," etc.

---

## 6. Example JSON configuration for municipality rules

A rule row's `condition_json` uses a small, serializable expression format the engine evaluates against current answers.

```json
[
  {
    "municipality": "Vancouver",
    "trade": "Plumbing",
    "permit_type": null,
    "field_key": "screening_basic_work",
    "visible": true,
    "required": false,
    "notes": "Faucet/valve repair, same-location fixture replacement, stoppage, leak repair may not need a permit.",
    "verified_on": "2026-06-01"
  },
  {
    "municipality": "Vancouver",
    "trade": "Plumbing",
    "permit_type": "Plumbing Renovation",
    "field_key": "floor_by_floor_details",
    "visible": true,
    "required": true,
    "condition_json": { "all": [ { "field": "scope.number_of_floors", "op": ">", "value": 1 } ] }
  },
  {
    "municipality": "Richmond",
    "trade": "Plumbing",
    "permit_type": null,
    "field_key": "doc_chlorination_certificate",
    "document_required": true,
    "condition_json": { "any": [ { "field": "scope.includes_site_service", "op": "=", "value": true } ] },
    "notes": "Required when a new water service is installed."
  },
  {
    "municipality": "White Rock",
    "trade": "Plumbing",
    "permit_type": null,
    "field_key": "doc_agent_authorization",
    "document_required": true,
    "required": true,
    "condition_json": { "all": [ { "field": "applicant.applicant_type", "op": "=", "value": "agent" } ] },
    "notes": "Application is rejected without agent authorization form."
  },
  {
    "municipality": "Surrey",
    "trade": "Plumbing",
    "permit_type": "Fire Sprinkler",
    "field_key": "fire_sprinkler_heads",
    "visible": true,
    "required": true
  },
  {
    "municipality": "Burnaby",
    "trade": "Plumbing",
    "permit_type": null,
    "field_key": "piping_storm_per_30m",
    "visible": true,
    "required": false,
    "notes": "Burnaby captures site-service lengths in 30m buckets."
  }
]
```

**Condition grammar (`condition_json`)**
```ts
type Cond =
  | { field: string; op: '='|'!='|'>'|'<'|'>='|'<='|'in'|'truthy'; value?: any }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };
```
The engine resolves `field` paths against a merged answer object (`scope.*`, `applicant.*`, plus flat `permit_field_values` keys).

---

## 7. Component structure (Expo React Native — your actual stack)

> Mirrors your existing `src/screens` + `src/components` layout. (For a Next.js web port, the same files map 1:1 to `app/permits/*` routes — the engine, types, and config are shared.)

```
src/
  permits/
    types.ts                       # Permit, FieldDef, Rule, Condition, Status enums
    engine/
      visibility.ts                # evaluateCondition(), getVisibleFields(city,type,answers)
      completeness.ts              # computeCompleteness() -> {pct, missingFields, missingDocs, blockers}
      screening.ts                 # runScreening(answers) -> 'likely'|'maybe'|'review'
      rulesLoader.ts               # fetch + cache municipality_rules, form_fields
    config/
      seedFormFields.ts            # canonical field catalog (the big list)
      seedRules.ts                 # per-city rules (JSON above, typed)
    api/
      permitsApi.ts                # CRUD (demo-mode + Supabase, same pattern as jobsApi)
      documentsApi.ts
      inspectionsApi.ts
    screens/
      PermitDashboardScreen.tsx
      PermitWizardScreen.tsx       # hosts steps, autosave, progress rail
      PermitDetailScreen.tsx       # tabbed (Overview/Customer/Contractor/Scope/Tech/Docs/City/Timeline/Inspections/Fees/Notes/Messages)
      PermitPipelineScreen.tsx     # kanban by status
      InspectionCalendarScreen.tsx
      DocumentCenterScreen.tsx
      MunicipalityRulesScreen.tsx  # read-only rules DB browser
      PermitSettingsScreen.tsx     # contractor profile
      PermitArchiveScreen.tsx
    components/
      wizard/
        WizardStep.tsx
        WizardProgress.tsx         # % complete + city requirements panel
        FieldRenderer.tsx          # switch on FieldDef.type -> input
        RepeatableGroup.tsx        # fixture rows, appliances, zones
        SectionGate.tsx            # renders children only if section visible
      ScreeningResultCard.tsx
      CompletenessMeter.tsx
      DocumentChecklist.tsx
      StatusBadge.tsx
      PermitCard.tsx
      InspectionCard.tsx
      CityRequirementsPanel.tsx
    pdf/
      buildPacket.ts               # assemble packet PDF (export/share)
```

**Key component: `FieldRenderer`** — one switch maps `FieldDef.type` → a controlled input, so adding a field type is one case. The wizard never hard-codes a question; it maps over `getVisibleFields(...)`.

**Reuse from current app:** `MiniCalendar` (inspection dates), the dark theme tokens, `SafeAreaProvider`, the bottom-sheet modal pattern from `JobFormModal`, and `useSafeAreaInsets`.

---

## 8. Validation logic / pseudocode

```ts
function computeCompleteness(permit, fields, rules, docs): Completeness {
  const answers = mergeAnswers(permit);           // field_key -> value
  const visible = getVisibleFields(permit.city, permit.permit_type, answers, fields, rules);

  const requiredFields = visible.filter(f => isRequired(f, rules, answers));
  const missingFields  = requiredFields.filter(f => isEmpty(answers[f.key]));

  const requiredDocs = getRequiredDocs(permit, rules, answers);
  const missingDocs  = requiredDocs.filter(d => !docs.some(x => x.document_type === d && x.status !== 'rejected'));

  const blockers = [];
  // city/type-specific hard blocks
  if (permit.city === 'White Rock' && answers['applicant.applicant_type'] === 'agent'
        && !hasDoc(docs,'doc_agent_authorization'))
    blockers.push('White Rock requires an agent authorization form.');
  if (answers['scope.includes_gas'] && !hasDoc(docs,'gas_piping_test_certificate'))
    blockers.push('Gas selected: gas piping test certificate required.');
  if (answers['scope.includes_backflow'] && !hasDoc(docs,'backflow_assembly_test_report'))
    blockers.push('Backflow selected: assembly test report required.');
  if (answers['owner.is_strata'] && !hasDoc(docs,'strata_authorization_letter'))
    blockers.push('Strata property: strata authorization letter required.');
  if (isCommercialOrMultifam(answers) && !hasAnyDrawing(docs))
    blockers.push('Commercial/multi-family: plumbing drawings required.');
  if (answers['scope.connected_to_building_permit'] && !answers['scope.related_building_permit_number'])
    blockers.push('Related building permit number required.');
  if (!permit.contractor?.tq_number && cityRequiresTQ(permit.city))
    blockers.push('TQ/Red Seal number required for this city.');

  const totalRequired = requiredFields.length + requiredDocs.length;
  const satisfied = totalRequired - missingFields.length - missingDocs.length;
  const pct = totalRequired === 0 ? 100 : Math.round((satisfied / totalRequired) * 100);

  const readiness =
    blockers.length === 0 && missingFields.length === 0 && missingDocs.length === 0 ? 'ready'
    : permit.screening_result === 'needs_review' ? 'needs_manual_review'
    : 'not_ready';

  return { pct, missingFields, missingDocs, blockers, readiness };
}

function runScreening(a): 'likely_required'|'may_not_be_required'|'needs_review' {
  if (a.city === 'Vancouver' && a.work_type === 'repair'
      && a.same_location_replacement && !a.new_piping && !a.includes_gas)
    return 'may_not_be_required';
  if (a.new_installation || a.new_piping || a.includes_gas || a.includes_site_service
      || a.underground || a.includes_fire_sprinkler)
    return 'likely_required';
  if (a.piping_moved || a.alteration || a.addition || a.rough_in)
    return 'likely_required';
  return 'needs_review';  // never a hard "no"
}
```

Submit gate: **Review screen** calls `computeCompleteness`; "Mark as ready / Submit" is enabled only when `readiness === 'ready'`. Otherwise shows the missing list (deep-links back to the offending step) and the disclaimer.

---

## 9. MVP scope vs later versions

### MVP (v1) — plumbing, 8 cities
- Screening, conditional wizard, autosave/draft, completeness meter.
- Dashboard (core counts), kanban, inspection calendar, document center.
- Permit detail (all tabs), timeline, fees (manual), inspections.
- Contractor profile, archive.
- Packet **PDF export** + **"Open city portal"** link + **manual "Mark as submitted."**
- Rules engine with seeded data + `verified_on` dates and disclaimers.

### v1.1
- Repeatable groups polish (fixtures/appliances/zones), FU auto-calc.
- Reusable customers/properties (pick existing), permit duplication.
- Document file-naming helper (Richmond), large-file guidance (Coquitlam).
- Dashboard analytics: avg approval time, by-city/by-type, revenue.

### v2
- Second trade (**Electrical** or **Gas** standalone) — proves the architecture; data-only.
- Multi-user roles/permissions; client-facing status link.
- E-signature flows (owner/agent authorization).
- Reminders (insurance expiry, inspection deadlines) via the existing scheduling/notification layer.

### v3+ (gated on availability)
- City portal **API integration** where it exists (only then claim "submit").
- Online fee payment, inspector scheduling APIs.
- Additional trades (HVAC, mechanical, fire) as full data packs.

---

## 10. UI layout suggestions

### Mobile (primary — matches current dark theme)
- **Dashboard:** stat tiles in 2-col grid (Active, Drafts, Needs Info, Ready, Submitted, Under Review, Upcoming Inspections, Failed). Below: "Permits needing attention" list. FAB → New Permit.
- **Wizard:** one section per screen; sticky top bar = step title + **completeness %** + "Save & exit"; bottom bar = Back / Next. Scope toggles use the chip pattern from `JobFormModal`. Conditional sections animate in.
- **Permit detail:** horizontal scrollable tab strip (Overview default); each tab a scroll view. Primary action button changes with status (e.g., "Request inspection" when Approved).
- **Inspections:** reuse `MiniCalendar`; tap a day → inspections list; request/schedule via bottom sheet.
- **Document center:** checklist with ●/▲ status chips; tap to upload (camera/file); missing-required items pinned to top in red.

### Desktop / tablet (office admin)
- **Two-pane:** left = permit list with search/filter (city, status, type, "missing docs"); right = detail or kanban.
- **Kanban:** columns = statuses; cards draggable to advance status (writes a timeline event).
- **Wizard on desktop:** left vertical stepper, center form, **right rail** = live completeness checklist + City Requirements panel (with `verified_on` + disclaimer).
- **Calendar:** month/week with inspection blocks color-coded by result.

### Cross-cutting UI rules
- Always show the **"Rules last verified <date> — confirm with city"** banner on city-specific steps.
- Completeness meter visible at all times during the wizard.
- Never block Next; only block Submit — with a clear, tappable missing-items list.
- Status badges use a consistent palette (Draft=gray, NeedsInfo=amber, Ready=blue, Submitted/Review=indigo, Approved=green, Rejected/Failed=red, Closed=slate).

---

## Appendix A — Status & category enums (implementation reference)
**Statuses:** draft, needs_information, ready_to_submit, submitted, under_review, approved, rejected, revision_required, inspection_requested, inspection_scheduled, inspection_passed, inspection_failed, reinspection_required, closed, archived.
**Categories:** plumbing, gas, backflow, sewer_drainage, fire_sprinkler, hydronic_boiler, water_heater, renovation_roughin, site_services, lawn_irrigation, re_piping, commercial_plumbing, multifamily_plumbing, tenant_improvement.

## Appendix B — Trade extensibility checklist (adding Electrical later)
1. Insert `trades` row (Electrical).
2. Insert `permit_types` for Electrical.
3. Add `form_fields` with `trade_id = Electrical` (panel size, circuits, service amperage…).
4. Add `municipality_rules` for each city × Electrical.
5. No frontend changes — wizard renders from config.

> ⚠️ Reiterated: city rules in seed data are a **starting point** and must be verified against each municipality's current requirements before production use.
