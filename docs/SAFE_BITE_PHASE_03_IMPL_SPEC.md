# SafeBite Travel - Implementation Spec for Phase 03

Version: 0.1  
Date: 2026-07-09  
Target reader: Claude / coding agent / implementation engineer  
Source context: `README.md-ver_0.2.txt`, `PRD_v2.txt`, `SAFE_BITE_PHASE_02_IMPL_SPEC.md`, existing SafeBite repository

---

## 0. Mission

Implement **Phase 03: Feedback Loop** on top of the completed SafeBite Travel Phase 02 Restaurant MVP.

The current system already provides:

```text
- Next.js 15 App Router PWA
- React 19
- locale-prefixed public routes: /en, /vi
- next-intl routing
- Tailwind CSS v3 + sb-* design tokens
- Prisma 6 + PostgreSQL 16 + PostGIS
- Zod validation at every API boundary
- Zustand profile store
- TanStack Query server-state cache
- Dexie IndexedDB offline storage
- Serwist service worker
- @safebite/domain package with evaluateDishes, evaluateMenuItem, evaluateRestaurantReadiness, buildQuestionCard
- local-first onboarding/profile
- offline allergy card
- dish guide
- deterministic EN/VI question card with optional dish/menu-item context
- restaurant guide: /restaurants and /restaurants/[restaurantIdOrSlug]
- restaurant recommendation APIs using profile POST body, never profile URL query
- menu item risk classification
- A-E restaurant readiness scoring
- location-triggered distance sorting
- offline restaurant cache
- admin CRUD for dishes, ingredients, dish risks, restaurants, menu items, menu-item allergen statuses
- restaurant source trust display
- OpenMap/OSM discovery rows capped at readiness C and never treated as allergy verification
- CI quality gates: typecheck, lint, test, copy:check, e2e
```

Phase 03 must add a **structured post-meal feedback loop**:

```text
restaurant/menu recommendation
-> user eats or asks staff
-> user submits structured feedback
-> severe report creates urgent admin review signal
-> admin reviews report
-> active feedback signals influence confidence/readiness conservatively
```

The product remains **risk reduction, not risk elimination**.

This phase must improve trust without turning user reports into automatic verification. Because apparently we have to explicitly tell software not to promote unreviewed anecdotes into truth, otherwise it will proudly do exactly that.

---

## 1. Scope Lock

### 1.1 Implement in Phase 03

Implement:

```text
- Public post-meal feedback flow
- Feedback entry points from restaurant detail and menu-item recommendation cards
- Feedback submission API
- Offline feedback queue using IndexedDB/Dexie
- Foreground sync of queued feedback when browser returns online
- Feedback persistence in PostgreSQL via Prisma
- Admin feedback review queue
- Admin feedback detail page
- Admin review actions and audit trail
- Severe reaction flagging
- Active safety/feedback flags that affect restaurant/menu recommendations conservatively
- Confidence/readiness adjustment logic v1
- Feedback summary display in public restaurant/menu recommendation UI
- E2E tests for public feedback and admin review
- README update after implementation
```

### 1.2 Do not implement in Phase 03

Do **not** implement yet:

```text
- OCR
- LLM menu parser
- menu photo upload
- PDF upload
- camera flow
- restaurant self-onboarding public form
- user accounts
- email notification system
- SMS notification system
- push notifications
- Google Places integration
- Google Maps scraping
- Google reviews/photos ingestion
- full restaurant portal
- payment
- analytics that include allergy profile payloads
- medical advice engine
- emergency service integration
```

Phase 03 can add schema fields that support future notification/onboarding/moderation, but must not expose those flows yet.

---

## 2. Current System Constraints to Respect

### 2.1 Existing architecture

Do not rewrite the existing architecture. Extend it.

Use current conventions:

```text
apps/web                 -> Next.js app, routes, API handlers, Prisma schema
packages/domain          -> framework-free domain logic and Zod schemas
locale public routes     -> /en/* and /vi/*
admin routes             -> /admin/*, not locale-prefixed
admin auth               -> ADMIN_TOKEN httpOnly cookie
public profile transport -> profile object sent in POST body, never in URL
client profile storage   -> IndexedDB/Zustand, no user account
server validation        -> Zod at every API boundary
server ORM               -> Prisma
offline storage          -> Dexie
service worker           -> Serwist
```

### 2.2 Safety invariants

Allowed public status labels only:

```text
Suitable
Ask First
Risky
Avoid
Unknown
```

Do not introduce public claims such as:

```text
Guaranteed Safe
100% Safe
Allergy-proof
This dish is safe.
```

Rules:

```text
- Unknown risk is never upgraded to Suitable.
- User feedback never creates restaurant_verified or admin_verified evidence.
- Positive feedback never upgrades a recommendation status by itself.
- A no-reaction report does not prove a dish is suitable for another user.
- Severe reaction reports must be escalated to admin review.
- Severe reaction reports may suppress or downgrade recommendations while pending review.
- Active feedback flags must be visible as uncertainty/risk signals, not hidden.
- OSM/OpenMap data remains discovery-only and capped as Phase 02 defined.
- Suitable cards still carry the confirm-with-staff caveat.
- Feedback does not replace restaurant/admin verification.
```

### 2.3 Privacy constraints

The allergy profile is health-adjacent sensitive data.

Do:

```text
- Store only the minimum profile snapshot required to interpret the report.
- Store allergy ids/severity/cross-contact snapshot, not the entire browser profile state.
- Never put allergy profile data in URL query params.
- Never put allergy profile data in analytics events.
- Never store exact user location in feedback.
- Never store user geolocation from Phase 02 in IndexedDB feedback records.
- Validate and length-limit all free-text fields.
- Make feedback anonymous by default.
```

Do not:

```text
- Require account creation.
- Collect name/email/phone in Phase 03.
- Ask for detailed medical history.
- Ask for photos of reactions.
- Ask for medication details.
- Give medical advice.
```

### 2.4 Copy guard

The repository has `pnpm copy:check`. Any new public copy, admin copy, i18n message, seed fixture, test fixture, offline shell copy, or generated template must pass the existing copy guard.

If the guard blocks wording, rewrite the wording conservatively. Do not weaken the guard. Yes, that means resisting the ancient engineer instinct to comment out the test and call it productivity.

---

## 3. Phase 03 Product Goal

### 3.1 User goal

A traveler can:

```text
1. Open a restaurant detail page.
2. Select a menu item they ate or asked about.
3. Submit structured post-meal feedback.
4. Report whether they asked staff.
5. Record the restaurant's answer in a structured way.
6. Report reaction severity.
7. Submit the report online, or queue it offline for sync later.
8. See a clear non-medical message after submission.
```

### 3.2 Admin goal

An admin can:

```text
1. Open a feedback review queue.
2. Prioritize severe/anaphylaxis reports.
3. Inspect restaurant/menu item/allergen context.
4. Compare feedback with current recommendation/source/confidence.
5. Add review notes.
6. Mark reports as reviewed/dismissed/resolved.
7. Apply conservative flags or confidence adjustments.
8. Clear flags after review.
9. See an audit trail of admin actions.
```

### 3.3 Recommendation goal

The recommendation system can:

```text
1. Read active feedback/safety flags.
2. Downgrade confidence when relevant reports exist.
3. Suppress Suitable output for a matching allergen/menu item when there is a pending severe report.
4. Cap restaurant readiness when there is an active severe report for the profile allergen.
5. Show feedback-under-review copy publicly.
6. Avoid blindly overriding verified/admin data.
```

---

## 4. User Stories

### 4.1 Public user stories

```text
As a traveler, I can report what happened after eating at a restaurant so the app can improve future guidance.

As a traveler, I can submit feedback without creating an account.

As a traveler, I can report that I asked staff and record their answer.

As a traveler, I can report no reaction, mild reaction, moderate reaction, severe reaction, or that I am not sure.

As a traveler, if I am offline, I can queue my feedback and sync it later.

As a traveler, I can see when a restaurant/menu item has feedback under review so I do not treat stale information as fresh certainty.
```

### 4.2 Admin user stories

```text
As an admin, I can review new feedback sorted by urgency.

As an admin, I can see severe reports first.

As an admin, I can see which restaurant, menu item, dish, and allergen the report relates to.

As an admin, I can apply a temporary flag to a restaurant/menu item while verifying.

As an admin, I can resolve or dismiss a report with a reason.

As an admin, I can see all admin actions taken on a report.
```

---

## 5. UX Scope

### 5.1 Public routes

Add locale-prefixed public routes:

```text
/[locale]/feedback/new
/[locale]/feedback/thanks
```

Optional if it fits current routing style:

```text
/[locale]/restaurants/[restaurantIdOrSlug]/feedback
```

Recommended implementation:

```text
/[locale]/feedback/new?restaurantId=<id>&menuItemId=<id optional>
```

Notes:

```text
- restaurantId and menuItemId in URL are allowed.
- Allergy profile data is not allowed in URL.
- Feedback form reads the active profile from Zustand/IndexedDB.
- If profile is missing, the form can still accept basic feedback but must ask user to choose relevant allergen manually.
```

### 5.2 Public entry points

Add entry points:

```text
- Restaurant detail header: “Share meal feedback”
- Menu item recommendation card: “I ate this / Share feedback”
- Menu item recommendation card: “Report staff answer”
- Optional post-question-card CTA: “After you ask, you can share what staff said”
```

Do not nag the user with popups. Hungry travelers already have enough problems without the app behaving like a needy toaster.

### 5.3 Feedback form steps

Use a mobile-first multi-step or sectioned form. Keep it short.

#### Step 1: Context confirmation

Show:

```text
Restaurant name
Menu item name, if available
Dish mapping, if available
Current recommendation status at time of report
Current confidence/source/last checked
```

Fields:

```text
restaurantId: required
menuItemId: optional
dishId: optional, derived from menu item if available
```

If `menuItemId` is missing, show a menu item selector with:

```text
- Existing restaurant menu items
- “Other / not listed”
- “I do not remember”
```

#### Step 2: What happened?

Fields:

```text
ateHere: yes | no | not_sure
visitedAt: date, default today
```

Copy:

```text
This report helps improve confidence and review outdated information.
It does not prove that a dish is suitable for other travelers.
```

#### Step 3: Relevant allergen/profile concern

Prefill from local profile.

Fields:

```text
allergenIds: array of supported allergen ids, required if profile has allergy allergens
profileConcernType: allergy | diet | unknown
severitySnapshot: mild | moderate | severe | anaphylaxis_risk | unknown
crossContactSensitiveSnapshot: boolean | unknown
```

For dietary profiles, allow dietary concern selection but keep Phase 03 recommendation impact focused on allergy signals first.

#### Step 4: Did you ask staff?

Fields:

```text
askedStaff: yes | no | not_sure
staffAnswer: enum, shown only if askedStaff=yes
staffAnswerText: optional short note
```

`staffAnswer` enum:

```text
confirmed_no_allergen
confirmed_contains_allergen
confirmed_can_remove
confirmed_cannot_remove
kitchen_checked
not_sure
language_barrier
no_answer
other
```

Copy for free text:

```text
Do not include personal medical details.
```

#### Step 5: Reaction outcome

Fields:

```text
reaction: none | mild | moderate | severe | anaphylaxis_or_emergency | not_sure | prefer_not_to_say
reactionTiming: during_meal | within_2_hours | later_same_day | next_day_or_later | not_sure | not_applicable
```

If reaction is `severe` or `anaphylaxis_or_emergency`, show a non-medical safety notice:

```text
If you may be having a serious allergic reaction, seek local emergency help immediately.
This app cannot provide medical advice or emergency support.
```

Do not ask for symptoms, medication, photos, or diagnosis in Phase 03.

#### Step 6: Trust rating and submit

Fields:

```text
userTrustRating: 1..5 optional
notes: optional, max 500 chars
```

Submit button:

```text
Submit feedback
```

Offline submit state:

```text
You are offline. This report will be saved on this device and sent when you are back online.
```

Success copy:

```text
Thank you. Your report was submitted for review.
Recommendations may show a review warning while the team checks this information.
```

For queued offline feedback:

```text
Saved on this device. It will sync when you are online.
```

### 5.4 Public feedback summary display

Add lightweight public feedback indicators to restaurant detail and menu item cards when relevant.

Show only aggregate/privacy-safe information:

```text
Feedback under review
Recent reports: <count>
Last report: <relative date>
Action: Ask staff directly before ordering.
```

For active severe flag:

```text
Recent feedback for this allergen is under review.
For severe allergy profiles, consider avoiding this item until the information is reviewed.
```

Do not show:

```text
- raw user notes
- user medical details
- exact visit timestamp beyond coarse date/relative label
- any statement implying causality has been proven
```

---

## 6. Admin UX Scope

### 6.1 Admin routes

Add admin routes:

```text
/admin/feedback
/admin/feedback/[reportId]
```

Optional nested route:

```text
/admin/restaurants/[restaurantId]/feedback
```

### 6.2 Admin navigation

Add `Feedback` item to admin navigation.

Badge count:

```text
- urgent count: severe/anaphylaxis pending reports
- pending count: all needs_review reports
```

### 6.3 Feedback queue page

Columns:

```text
Priority
Status
Reaction
Restaurant
Menu item
Allergen
Asked staff
Report date
Last action
```

Filters:

```text
status: needs_review | in_review | resolved | dismissed | spam
priority: urgent | high | normal | low
reaction: none | mild | moderate | severe | anaphylaxis_or_emergency | not_sure
restaurant
allergen
hasActiveFlag: true | false
createdAt range
```

Default sort:

```text
urgent first
then high
then newest
```

### 6.4 Feedback detail page

Sections:

```text
1. Report summary
2. Restaurant context
3. Menu item context
4. Profile/allergen snapshot
5. Staff answer
6. Reaction outcome
7. Recommendation snapshot at time of report
8. Current recommendation
9. Related recent reports
10. Active flags
11. Admin actions/audit log
```

Report summary should show:

```text
report id
client report id
created at
source: online | offline_synced
status
priority
reaction
```

Restaurant context:

```text
restaurant name
verification status
source
last checked
current readiness for relevant profile/allergen if computable
```

Menu item context:

```text
menu item name
dish mapping
current status
current risk level
current confidence
current source
last verified/checked
```

### 6.5 Admin actions

Implement actions:

```text
start_review
resolve_no_change
dismiss_report
mark_spam
confirm_feedback_flag
clear_feedback_flag
request_reverification
apply_confidence_downgrade
suppress_suitable_until_review
hide_menu_item_temporarily
```

Not every action must have complicated side effects in v1. But every action must create an audit row.

Minimum side effects:

```text
start_review                       -> report.status = in_review
resolve_no_change                  -> report.status = resolved; active auto-created flags can be cleared if admin chooses
 dismiss_report                     -> report.status = dismissed
mark_spam                          -> report.status = spam; report ignored by recommendation logic
confirm_feedback_flag              -> keeps/creates active flag
clear_feedback_flag                -> flag.status = resolved
request_reverification             -> restaurant/menu item gets review/verification-needed marker if existing schema supports it
apply_confidence_downgrade         -> creates or updates active confidence adjustment flag
suppress_suitable_until_review     -> creates active suppress_suitable flag for matching restaurant/menuItem/allergen
hide_menu_item_temporarily         -> if existing schema supports public visibility, hide item; otherwise create active hide_recommendation flag
```

If current schema uses different field names for restaurant/menu review status, inspect and reuse them. Do not invent parallel review systems unless necessary.

### 6.6 Admin notes

Admin notes:

```text
- max 1000 chars
- internal only
- stored in audit/action record
- never shown publicly
```

---

## 7. Data Model Requirements

Before editing Prisma, inspect the current schema.

Do not duplicate existing models if Phase 02 already added similar feedback/flag fields. Extend them.

### 7.1 Enums

Add or reuse enums similar to:

```prisma
enum FeedbackReportStatus {
  needs_review
  in_review
  resolved
  dismissed
  spam
}

enum FeedbackPriority {
  low
  normal
  high
  urgent
}

enum FeedbackReaction {
  none
  mild
  moderate
  severe
  anaphylaxis_or_emergency
  not_sure
  prefer_not_to_say
}

enum FeedbackReactionTiming {
  during_meal
  within_2_hours
  later_same_day
  next_day_or_later
  not_sure
  not_applicable
}

enum StaffAnswer {
  confirmed_no_allergen
  confirmed_contains_allergen
  confirmed_can_remove
  confirmed_cannot_remove
  kitchen_checked
  not_sure
  language_barrier
  no_answer
  other
}

enum FeedbackFlagStatus {
  active
  resolved
  dismissed
  expired
}

enum FeedbackFlagEffect {
  flag_for_review
  downgrade_confidence
  suppress_suitable
  cap_restaurant_readiness
  hide_recommendation
}

enum FeedbackEntityType {
  restaurant
  menu_item
  dish
}

enum FeedbackAdminActionType {
  start_review
  resolve_no_change
  dismiss_report
  mark_spam
  confirm_feedback_flag
  clear_feedback_flag
  request_reverification
  apply_confidence_downgrade
  suppress_suitable_until_review
  hide_menu_item_temporarily
  add_note
}
```

If the current codebase uses PascalCase enum values, follow current convention. Consistency beats aesthetic preference, a lesson database migrations teach with a baseball bat.

### 7.2 FeedbackReport model

Add model:

```prisma
model FeedbackReport {
  id                   String   @id @default(cuid())
  clientReportId       String   @unique
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  city                 String
  locale               String?
  clientPlatform       String   @default("pwa_web")
  submissionSource     String   @default("online") // online | offline_synced
  offlineCreatedAt     DateTime?

  restaurantId         String
  restaurant           Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  menuItemId           String?
  menuItem             RestaurantMenuItem? @relation(fields: [menuItemId], references: [id], onDelete: SetNull)

  dishId               String?
  dish                 Dish? @relation(fields: [dishId], references: [id], onDelete: SetNull)

  allergenIds          String[]
  profileSnapshot      Json
  recommendationSnapshot Json?

  ateHere              Boolean?
  visitedAt            DateTime?
  askedStaff           Boolean?
  staffAnswer          StaffAnswer?
  staffAnswerText      String?

  reaction             FeedbackReaction
  reactionTiming       FeedbackReactionTiming?
  userTrustRating      Int?
  notes                String?

  status               FeedbackReportStatus @default(needs_review)
  priority             FeedbackPriority     @default(normal)
  severeAutoFlagged    Boolean              @default(false)

  reviewedAt           DateTime?
  reviewedBy           String?
  reviewOutcome        String?
  adminSummary         String?

  flags                FeedbackFlag[]
  actions              FeedbackAdminAction[]

  @@index([restaurantId, createdAt])
  @@index([menuItemId, createdAt])
  @@index([dishId, createdAt])
  @@index([status, priority, createdAt])
}
```

Notes:

```text
- allergenIds uses scalar list if current DB supports it. PostgreSQL does.
- If scalar list conflicts with current Prisma conventions, create FeedbackReportAllergen relation instead.
- profileSnapshot must be minimal.
- recommendationSnapshot should capture status/readiness/confidence/source at submission time.
- staffAnswerText and notes must be length-limited in Zod and UI.
```

### 7.3 FeedbackFlag model

Add model:

```prisma
model FeedbackFlag {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reportId        String?
  report          FeedbackReport? @relation(fields: [reportId], references: [id], onDelete: SetNull)

  entityType      FeedbackEntityType
  entityId        String
  restaurantId    String?
  menuItemId      String?
  dishId          String?
  allergenId      String?

  effect          FeedbackFlagEffect
  status          FeedbackFlagStatus @default(active)
  priority        FeedbackPriority   @default(normal)

  reason          String
  publicReasonKey String?
  confidenceDelta Float?
  readinessCap    String?
  expiresAt       DateTime?

  resolvedAt      DateTime?
  resolvedBy      String?
  adminNote       String?

  actions         FeedbackAdminAction[]

  @@index([entityType, entityId, status])
  @@index([restaurantId, status])
  @@index([menuItemId, status])
  @@index([dishId, status])
  @@index([allergenId, status])
}
```

Usage:

```text
- Severe/anaphylaxis reports create active flags immediately.
- Admin actions can create, confirm, resolve, or dismiss flags.
- Public APIs use active flags only.
- Flags are scoped by allergen when possible.
```

### 7.4 FeedbackAdminAction model

Add model:

```prisma
model FeedbackAdminAction {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  reportId    String
  report      FeedbackReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  flagId      String?
  flag        FeedbackFlag? @relation(fields: [flagId], references: [id], onDelete: SetNull)

  actionType  FeedbackAdminActionType
  actor       String
  note        String?
  before      Json?
  after       Json?

  @@index([reportId, createdAt])
  @@index([flagId, createdAt])
}
```

`actor` can be:

```text
admin
system
```

If the existing admin auth has a richer user identity, use it. If not, `admin` is enough for Phase 03.

### 7.5 Existing model relations

Add relation arrays if needed:

```prisma
model Restaurant {
  feedbackReports FeedbackReport[]
}

model RestaurantMenuItem {
  feedbackReports FeedbackReport[]
}

model Dish {
  feedbackReports FeedbackReport[]
}
```

If current model names differ, adapt accordingly.

---

## 8. Domain Package Requirements

All feedback influence logic should live in `packages/domain` where possible.

### 8.1 Add Zod schemas

Add schemas:

```text
FeedbackReactionSchema
FeedbackReactionTimingSchema
StaffAnswerSchema
FeedbackReportInputSchema
FeedbackReportResponseSchema
FeedbackAdminActionInputSchema
FeedbackFlagSchema
FeedbackSignalSchema
FeedbackSummarySchema
```

The public API must import schemas from `@safebite/domain` where consistent with existing patterns.

### 8.2 Feedback signal type

Add domain type:

```ts
export type FeedbackSignal = {
  id: string;
  entityType: 'restaurant' | 'menu_item' | 'dish';
  entityId: string;
  restaurantId?: string;
  menuItemId?: string;
  dishId?: string;
  allergenId?: string;
  effect:
    | 'flag_for_review'
    | 'downgrade_confidence'
    | 'suppress_suitable'
    | 'cap_restaurant_readiness'
    | 'hide_recommendation';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  expiresAt?: string | null;
  confidenceDelta?: number | null;
  readinessCap?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  publicReasonKey?: string | null;
};
```

### 8.3 Add pure functions

Add:

```ts
export function getFeedbackPriority(input: {
  reaction: FeedbackReaction;
  ateHere?: boolean | null;
}): FeedbackPriority;

export function shouldAutoCreateFeedbackFlag(input: {
  reaction: FeedbackReaction;
  restaurantId: string;
  menuItemId?: string | null;
  dishId?: string | null;
  allergenIds: string[];
}): boolean;

export function feedbackSignalWeight(input: {
  createdAt: Date | string;
  now?: Date | string;
  priority: FeedbackPriority;
  status?: 'active' | 'resolved' | 'dismissed' | 'expired';
}): number;

export function applyFeedbackSignalsToMenuItemEvaluation(input: {
  evaluation: MenuItemEvaluation;
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  severityByAllergen?: Record<string, string>;
  now?: Date | string;
}): MenuItemEvaluation;

export function applyFeedbackSignalsToRestaurantReadiness(input: {
  readiness: RestaurantReadinessEvaluation;
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  severityByAllergen?: Record<string, string>;
  now?: Date | string;
}): RestaurantReadinessEvaluation;

export function summarizeFeedbackSignals(input: {
  signals: FeedbackSignal[];
  profileAllergenIds: string[];
  now?: Date | string;
}): FeedbackSummary;
```

### 8.4 Domain rules

#### Priority

```text
reaction=anaphylaxis_or_emergency -> urgent
reaction=severe                    -> urgent
reaction=moderate                  -> high
reaction=mild                      -> normal
reaction=none                      -> low
reaction=not_sure                  -> normal
reaction=prefer_not_to_say         -> normal
```

#### Auto flags

Auto-create flags only for:

```text
reaction=severe
reaction=anaphylaxis_or_emergency
```

For severe/anaphylaxis reports:

```text
- Create restaurant-level flag: cap_restaurant_readiness, readinessCap=D, priority=urgent
- If menuItemId exists, create menu-item-level flag: suppress_suitable, priority=urgent
- If dishId exists and menuItemId does not, create dish-level flag: flag_for_review, priority=high
- Flags are scoped to relevant allergenIds when present.
```

#### Menu item adjustment

For active matching signals:

```text
suppress_suitable:
  - If current status is Suitable, change status to Risky or Ask First based on severity.
  - For severe/anaphylaxis profile, change to Risky.
  - For mild/moderate profile, change to Ask First.
  - Add feedback-under-review reason.
  - Reduce confidence one level, minimum low.

downgrade_confidence:
  - Do not change status.
  - Reduce confidence one level.
  - Add feedback-under-review reason.

hide_recommendation:
  - Do not remove the menu item entirely unless existing UI supports hidden items.
  - Mark as not recommended and show review warning.
```

Do not convert a status to Suitable from feedback.

#### Restaurant readiness adjustment

For active matching signals:

```text
cap_restaurant_readiness with D:
  - If readiness is A/B/C, cap to D.
  - Keep E as E.
  - Add feedback-under-review summary.
  - Reduce confidence one level.

flag_for_review:
  - Keep readiness class unless explicit cap exists.
  - Add feedback-under-review summary.
  - Reduce confidence one level if recent.
```

#### Positive feedback

For reaction=none:

```text
- Create report only.
- Do not auto-create active flag.
- Do not auto-upgrade status/readiness.
- Admin-reviewed positive signals may increase confidence slightly in future, but Phase 03 v1 should not implement automatic positive upgrades.
```

This is important. One person's non-reaction is not a clinical trial, despite the internet's best efforts to turn anecdotes into infrastructure.

#### Signal decay

Implement decay for non-severe signals:

```text
0-30 days       weight 1.0
31-90 days      weight 0.7
91-180 days     weight 0.4
>180 days       weight 0.15
```

Active severe/anaphylaxis flags do not decay automatically in v1. They remain active until admin resolves/dismisses them.

---

## 9. Public API Requirements

All public APIs must validate with Zod.

### 9.1 Submit feedback

Add:

```http
POST /api/v1/feedback
```

Request:

```json
{
  "clientReportId": "web-uuid-v4",
  "restaurantId": "rest_123",
  "menuItemId": "item_456",
  "dishId": "dish_789",
  "city": "hanoi",
  "locale": "en",
  "clientPlatform": "pwa_web",
  "submissionSource": "online",
  "offlineCreatedAt": null,
  "profileSnapshot": {
    "allergies": [
      {
        "allergenId": "peanut",
        "severity": "anaphylaxis_risk",
        "crossContactSensitive": true
      }
    ],
    "dietaryProfiles": []
  },
  "allergenIds": ["peanut"],
  "recommendationSnapshot": {
    "restaurantReadiness": "B",
    "menuItemStatus": "Ask First",
    "riskLevel": "possible",
    "confidence": "medium",
    "source": "admin_verified",
    "lastCheckedAt": "2026-07-09T00:00:00.000Z"
  },
  "ateHere": true,
  "visitedAt": "2026-07-09T12:00:00.000Z",
  "askedStaff": true,
  "staffAnswer": "kitchen_checked",
  "staffAnswerText": "Staff said they checked with the kitchen.",
  "reaction": "none",
  "reactionTiming": "not_applicable",
  "userTrustRating": 4,
  "notes": "Clear answer from staff."
}
```

Response:

```json
{
  "reportId": "fb_123",
  "clientReportId": "web-uuid-v4",
  "status": "needs_review",
  "priority": "low",
  "severeAutoFlagged": false,
  "createdAt": "2026-07-09T12:01:00.000Z"
}
```

Severe response example:

```json
{
  "reportId": "fb_urgent_123",
  "clientReportId": "web-uuid-v4",
  "status": "needs_review",
  "priority": "urgent",
  "severeAutoFlagged": true,
  "activeFlagIds": ["flag_rest_1", "flag_item_1"],
  "createdAt": "2026-07-09T12:01:00.000Z"
}
```

### 9.2 Idempotency

`clientReportId` is required and unique.

If the same `clientReportId` is submitted twice:

```text
- Return the existing report response.
- Do not create duplicate reports.
- Do not create duplicate flags.
```

This is required for offline queue sync. The browser will retry things because networks are unreliable and apparently we built civilization on spinning radio waves.

### 9.3 Validation rules

Required:

```text
clientReportId
restaurantId
city
profileSnapshot or allergenIds
reaction
```

Optional:

```text
menuItemId
dishId
visitedAt
askedStaff
staffAnswer
staffAnswerText
reactionTiming
userTrustRating
notes
recommendationSnapshot
offlineCreatedAt
```

Limits:

```text
staffAnswerText max 500 chars
notes max 500 chars
allergenIds max 10
userTrustRating integer 1..5
visitedAt cannot be more than 30 days in future
visitedAt cannot be more than 180 days in past for Phase 03
```

Entity checks:

```text
- restaurantId must exist.
- menuItemId, if provided, must belong to restaurantId.
- dishId, if provided, must exist.
- if menuItemId maps to a dish, use that dishId when dishId is omitted.
- public user can submit feedback for approved public restaurants.
- allow feedback for approved discovery-only restaurants, but menuItemId may be null.
```

Security:

```text
- Rate limit by IP/browser fingerprint if current app has rate limiter.
- If no rate limiter exists, add a simple server-side limit where possible.
- Do not expose raw Prisma errors.
```

### 9.4 Feedback options

Add optional helper endpoint:

```http
GET /api/v1/feedback/options?restaurantId=<id>
```

Response:

```json
{
  "restaurant": {
    "id": "rest_123",
    "name": "Example Restaurant",
    "city": "hanoi"
  },
  "menuItems": [
    {
      "id": "item_456",
      "name": "Mì Quảng gà",
      "dishId": "mi_quang",
      "dishName": "Mì Quảng"
    }
  ],
  "allergens": [
    {
      "id": "peanut",
      "nameEn": "Peanut",
      "nameVi": "Đậu phộng"
    }
  ]
}
```

This endpoint returns public metadata only.

### 9.5 Recommendation APIs must include feedback signals

Update existing APIs:

```http
POST /api/v1/recommendations/restaurants
POST /api/v1/recommendations/restaurants/[idOrSlug]
```

Implementation:

```text
1. Fetch active FeedbackFlag rows relevant to restaurant/menu item/dish and profile allergenIds.
2. Convert rows into domain FeedbackSignal[]
3. Apply feedback signals after base evaluation.
4. Return feedbackSummary in response.
```

Response addition:

```json
{
  "feedbackSummary": {
    "hasActiveFlags": true,
    "highestPriority": "urgent",
    "pendingReviewCount": 1,
    "recentReportCount": 2,
    "lastReportAt": "2026-07-09T12:01:00.000Z",
    "publicMessageKey": "feedback_under_review"
  }
}
```

For menu item recommendations:

```json
{
  "menuRecommendations": [
    {
      "menuItemId": "item_456",
      "status": "Risky",
      "confidence": "low",
      "reason": "Recent feedback for this allergen is under review.",
      "feedbackSummary": {
        "hasActiveFlags": true,
        "highestPriority": "urgent",
        "pendingReviewCount": 1
      }
    }
  ]
}
```

Do not expose raw report details publicly.

---

## 10. Admin API Requirements

All admin APIs require existing admin auth.

### 10.1 List feedback reports

Add:

```http
GET /api/v1/admin/feedback
```

Query params:

```text
status
priority
reaction
restaurantId
menuItemId
allergenId
hasActiveFlag
cursor
limit
```

Default:

```text
limit=50
sort=priority desc, createdAt desc
```

Response:

```json
{
  "items": [
    {
      "id": "fb_123",
      "clientReportId": "web-uuid-v4",
      "createdAt": "2026-07-09T12:01:00.000Z",
      "status": "needs_review",
      "priority": "urgent",
      "reaction": "severe",
      "restaurant": { "id": "rest_123", "name": "Example Restaurant" },
      "menuItem": { "id": "item_456", "name": "Mì Quảng gà" },
      "allergenIds": ["peanut"],
      "askedStaff": true,
      "hasActiveFlags": true
    }
  ],
  "nextCursor": null
}
```

### 10.2 Get feedback detail

Add:

```http
GET /api/v1/admin/feedback/[reportId]
```

Return:

```text
- report details
- restaurant details
- menu item details
- dish details
- allergen details
- recommendation snapshot
- current recommendation if computable
- active flags
- related reports for same restaurant/menu item/allergen in last 90 days
- admin action history
```

### 10.3 Update report basic state

Add:

```http
PATCH /api/v1/admin/feedback/[reportId]
```

Request:

```json
{
  "status": "in_review",
  "adminSummary": "Checking with restaurant.",
  "reviewOutcome": null
}
```

Use for simple state changes only.

### 10.4 Apply admin action

Add:

```http
POST /api/v1/admin/feedback/[reportId]/actions
```

Request:

```json
{
  "actionType": "suppress_suitable_until_review",
  "note": "Severe peanut report. Suppress item recommendation until rechecked.",
  "target": {
    "entityType": "menu_item",
    "entityId": "item_456",
    "allergenId": "peanut"
  },
  "expiresAt": null
}
```

Response:

```json
{
  "actionId": "act_123",
  "reportId": "fb_123",
  "createdFlagId": "flag_123",
  "status": "ok"
}
```

Action side effects:

| Action | Side effect |
|---|---|
| start_review | report.status = in_review |
| resolve_no_change | report.status = resolved |
| dismiss_report | report.status = dismissed; active report-created flags may be dismissed if action requests it |
| mark_spam | report.status = spam; ignore in recommendation logic |
| confirm_feedback_flag | create/keep active flag |
| clear_feedback_flag | flag.status = resolved |
| request_reverification | mark report reviewOutcome and optionally existing restaurant/menu status if supported |
| apply_confidence_downgrade | create active flag effect=downgrade_confidence |
| suppress_suitable_until_review | create active flag effect=suppress_suitable |
| hide_menu_item_temporarily | create active flag effect=hide_recommendation |
| add_note | action row only |

Every action writes `FeedbackAdminAction` with `before` and `after` snapshots when practical.

---

## 11. Recommendation Integration

### 11.1 Data loading

In restaurant recommendation handlers:

```text
- Determine profile allergen ids from POST body.
- Fetch active feedback flags for restaurants in result set.
- Fetch active feedback flags for menu items included in detail view.
- Fetch active dish-level flags only if menu item maps to dish.
- Ignore dismissed/resolved/expired/spam reports.
```

### 11.2 Matching logic

A feedback flag matches a profile if:

```text
- flag.allergenId is null, or
- flag.allergenId is included in profile allergen ids
```

Entity matching:

```text
restaurant page/card:
  match restaurant-level flags for restaurantId

restaurant detail/menu item:
  match menu-item-level flags for menuItemId
  match restaurant-level flags for restaurantId
  match dish-level flags for dishId if present
```

### 11.3 Readiness cap

If active matching restaurant flag has:

```text
effect=cap_restaurant_readiness
readinessCap=D
```

Then:

```text
A -> D
B -> D
C -> D
D -> D
E -> E
```

If multiple caps exist, use most conservative cap:

```text
E stricter than D stricter than C stricter than B stricter than A
```

### 11.4 Suppress Suitable

If active matching menu item flag has:

```text
effect=suppress_suitable
```

Then:

```text
Suitable -> Risky for severe/anaphylaxis profile
Suitable -> Ask First for mild/moderate profile
Ask First stays Ask First but confidence can lower
Risky stays Risky
Avoid stays Avoid
Unknown stays Unknown or Risky only if signal is severe and item-specific
```

The output must include:

```text
source includes feedback_under_review or equivalent internal source marker
reason includes feedback-under-review copy
confidence downgraded
```

### 11.5 Hide recommendation

If active matching flag has:

```text
effect=hide_recommendation
```

Do not physically remove the menu item by default. Instead display:

```text
Status: Unknown or Risky
Reason: This item is temporarily under review.
Action: Ask staff directly or choose another option.
```

If existing UI has a hidden/unpublished item mechanism, admin can hide it from public UI.

### 11.6 Public source labels

Add source label:

```text
Feedback under review
```

This is not a verification source.

Do not show:

```text
User verified
Community verified
Reported safe
```

That last phrase is especially cursed. Do not let it happen.

---

## 12. Offline Feedback Queue

### 12.1 Dexie schema extension

Extend IndexedDB schema with:

```ts
type PendingFeedbackReport = {
  clientReportId: string;
  payload: FeedbackReportInput;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string | null;
};
```

Table:

```text
pendingFeedbackReports
```

Key:

```text
clientReportId
```

### 12.2 Offline submit behavior

When user taps submit:

```text
if online:
  POST /api/v1/feedback
  if success -> show submitted screen
  if network error -> queue locally and show queued screen

if offline:
  queue locally and show queued screen
```

Do not queue validation errors. Validation errors must be shown to user immediately.

### 12.3 Foreground sync

Implement foreground sync:

```text
- On app startup, check pendingFeedbackReports.
- On window online event, sync pending reports.
- Add manual “Sync now” button in Profile or feedback thank-you screen if pending reports exist.
```

Do not depend on background sync in Phase 03.

### 12.4 Sync API behavior

Use the same endpoint:

```http
POST /api/v1/feedback
```

Set:

```json
{
  "submissionSource": "offline_synced",
  "offlineCreatedAt": "2026-07-09T11:30:00.000Z"
}
```

Idempotency via `clientReportId` prevents duplicates.

### 12.5 Offline privacy

Store only the feedback payload needed to sync.

Do not store:

```text
- exact user geolocation
- entire profile object
- auth tokens
- detailed medical notes beyond limited optional feedback notes
```

---

## 13. UI Components

Add reusable components:

```text
FeedbackEntryButton
FeedbackForm
FeedbackContextCard
FeedbackStaffAnswerSection
FeedbackReactionSection
FeedbackOfflineQueueBanner
FeedbackSuccessPanel
FeedbackUnderReviewBadge
FeedbackSummaryBanner
AdminFeedbackQueueTable
AdminFeedbackPriorityBadge
AdminFeedbackStatusBadge
AdminFeedbackDetailPanel
AdminFeedbackActionPanel
AdminFeedbackAuditTrail
```

Use existing design system tokens and status badge conventions.

Accessibility:

```text
- All inputs have labels.
- Reaction severity radio group is keyboard accessible.
- Do not rely on color alone.
- Severe reaction notice uses role="alert" only when user selects severe/anaphylaxis.
- Full mobile width buttons are acceptable.
```

---

## 14. i18n Requirements

Add EN and VI messages for:

```text
feedback entry points
feedback form labels
reaction options
staff answer options
offline queue states
sync states
success screen
admin feedback queue
admin action labels
feedback-under-review public badges
severe reaction non-medical notice
```

Vietnamese copy should be plain and calm, not legal goblin language.

Example EN:

```text
Share meal feedback
What did staff tell you?
Did you have any reaction after eating?
Feedback under review
This report will be sent when you are online.
```

Example VI:

```text
Gửi phản hồi sau bữa ăn
Nhân viên đã trả lời bạn thế nào?
Bạn có phản ứng nào sau khi ăn không?
Phản hồi đang được kiểm tra
Báo cáo này sẽ được gửi khi bạn có mạng.
```

Severe notice EN:

```text
If you may be having a serious allergic reaction, seek local emergency help immediately. This app cannot provide medical advice or emergency support.
```

Severe notice VI:

```text
Nếu bạn có thể đang gặp phản ứng dị ứng nghiêm trọng, hãy tìm hỗ trợ khẩn cấp tại địa phương ngay. Ứng dụng này không thể cung cấp tư vấn y tế hoặc hỗ trợ khẩn cấp.
```

---

## 15. Public Page Behavior

### 15.1 Restaurant detail

Add CTA near header:

```text
Share meal feedback
```

Pass:

```text
restaurantId
```

### 15.2 Menu item card

Add CTA:

```text
I ate this / Share feedback
```

Pass:

```text
restaurantId
menuItemId
dishId if available
recommendation snapshot
```

### 15.3 Feedback form loading

On route load:

```text
1. Read restaurantId/menuItemId from URL.
2. Fetch public metadata via existing restaurant API or feedback options endpoint.
3. Read active profile from IndexedDB/Zustand.
4. Build minimal profileSnapshot.
5. Build recommendationSnapshot from route state if available; otherwise fetch current recommendation.
```

If profile is missing:

```text
- Allow user to select allergen manually.
- Show CTA to create allergy profile after submit.
```

### 15.4 Success states

Online success:

```text
Submitted for review.
```

Offline queued:

```text
Saved on this device.
```

Severe/anaphylaxis selection:

```text
show non-medical emergency notice before submit and after submit
```

Do not show:

```text
We will contact emergency services.
We can assess your symptoms.
You are safe now.
```

---

## 16. Admin Page Behavior

### 16.1 Queue summary cards

At top of `/admin/feedback`, show:

```text
Urgent reports
Needs review
In review
Resolved this week
Active flags
```

### 16.2 Row actions

From queue row:

```text
Open
Start review
Resolve no change
Dismiss
```

Severe rows should be visually prominent but not color-only.

### 16.3 Detail actions

On detail page, admin can:

```text
- Start review
- Add note
- Confirm active flag
- Suppress menu item recommendation until review
- Apply confidence downgrade
- Request re-verification
- Clear active flag
- Resolve no change
- Dismiss report
- Mark spam
```

### 16.4 Audit trail

Every action displays:

```text
createdAt
actionType
actor
note
flag/status changes
```

No silent mutation. Silent mutation is how data systems turn into haunted houses.

---

## 17. API and Service Implementation Notes

### 17.1 Service modules

Create or extend modules:

```text
apps/web/src/features/feedback/
apps/web/src/features/admin/feedback/
apps/web/src/server/feedback/
packages/domain/src/feedback/
```

Suggested files:

```text
packages/domain/src/feedback/schemas.ts
packages/domain/src/feedback/signals.ts
packages/domain/src/feedback/apply-feedback-signals.ts
packages/domain/src/feedback/index.ts

apps/web/src/server/feedback/create-feedback-report.ts
apps/web/src/server/feedback/create-auto-flags.ts
apps/web/src/server/feedback/get-feedback-signals.ts
apps/web/src/server/feedback/admin-actions.ts
apps/web/src/features/feedback/offline-feedback-queue.ts
apps/web/src/features/feedback/use-feedback-sync.ts
```

Follow existing import aliases and repo layout.

### 17.2 Transaction boundaries

Feedback submission should be transactional:

```text
transaction:
  create FeedbackReport
  if severe/anaphylaxis:
    create FeedbackFlag rows
    create system FeedbackAdminAction row(s)
commit
```

If a duplicate `clientReportId` exists:

```text
return existing report with existing flags
```

### 17.3 Severe auto-flag details

For severe/anaphylaxis reports:

Create restaurant flag:

```text
entityType=restaurant
entityId=restaurantId
restaurantId=restaurantId
effect=cap_restaurant_readiness
priority=urgent
readinessCap=D
status=active
reason=Recent severe feedback pending review for matching allergen.
publicReasonKey=feedback_under_review_severe
```

If menuItemId exists, create menu item flag:

```text
entityType=menu_item
entityId=menuItemId
restaurantId=restaurantId
menuItemId=menuItemId
effect=suppress_suitable
priority=urgent
status=active
reason=Recent severe feedback pending review for this menu item/allergen.
publicReasonKey=feedback_under_review_severe_item
```

If dishId exists and menuItemId missing, create dish flag:

```text
entityType=dish
entityId=dishId
dishId=dishId
effect=flag_for_review
priority=high
status=active
reason=Recent severe feedback pending review for this dish/allergen.
publicReasonKey=feedback_under_review
```

### 17.4 Admin action transactions

Admin action endpoint should:

```text
1. Validate action.
2. Load report.
3. Load target entity if applicable.
4. Capture before snapshot.
5. Apply side effect.
6. Create FeedbackAdminAction.
7. Return updated report/flag summary.
```

### 17.5 Error handling

Public API errors:

```text
400 invalid input
404 restaurant/menu item not found
409 duplicate handled as success, not error
429 rate limited if implemented
500 generic error
```

Do not leak internal stack traces.

Admin API errors:

```text
401 not authenticated
403 not allowed if future role system exists
404 not found
400 invalid action
```

---

## 18. Recommendation Data Contract Additions

Extend restaurant recommendation response with optional fields:

```ts
type FeedbackSummary = {
  hasActiveFlags: boolean;
  highestPriority?: 'low' | 'normal' | 'high' | 'urgent';
  pendingReviewCount: number;
  recentReportCount: number;
  lastReportAt?: string | null;
  publicMessageKey?:
    | 'feedback_under_review'
    | 'feedback_under_review_severe'
    | 'feedback_under_review_severe_item';
};
```

Menu item recommendation addition:

```ts
type MenuItemRecommendation = ExistingMenuItemRecommendation & {
  feedbackSummary?: FeedbackSummary;
};
```

Restaurant recommendation addition:

```ts
type RestaurantRecommendation = ExistingRestaurantRecommendation & {
  feedbackSummary?: FeedbackSummary;
};
```

Keep additions backward-compatible. Existing UI/tests should not break if field is absent.

---

## 19. Seed and Demo Data

Add dev-only script:

```text
pnpm seed:feedback-demo
```

Script should:

```text
- require NODE_ENV !== production
- require existing demo restaurants/menu items from seed:restaurant-demo-menu
- create one no-reaction feedback report
- create one mild feedback report
- create one severe pending feedback report with active flags
- create one resolved feedback report
```

Do not auto-run this in production or normal seed.

Update README scripts table after implementation.

---

## 20. Testing Requirements

### 20.1 Domain unit tests

Add tests:

```text
getFeedbackPriority maps reactions correctly.
shouldAutoCreateFeedbackFlag returns true only for severe/anaphylaxis.
feedbackSignalWeight decays non-severe signals over time.
applyFeedbackSignalsToMenuItemEvaluation does not upgrade to Suitable.
applyFeedbackSignalsToMenuItemEvaluation suppresses Suitable for severe active item flag.
applyFeedbackSignalsToRestaurantReadiness caps A/B/C to D for active severe restaurant flag.
Positive no-reaction report does not change status.
Resolved/dismissed/expired flags are ignored.
Allergen-scoped flags only affect matching profile allergens.
```

### 20.2 API tests

Add tests:

```text
POST /api/v1/feedback creates report.
POST /api/v1/feedback validates required fields.
POST /api/v1/feedback rejects menu item that does not belong to restaurant.
POST /api/v1/feedback is idempotent by clientReportId.
Severe report creates urgent active flags.
No-reaction report does not create active flags.
Feedback notes are length-limited.
Admin feedback list requires auth.
Admin can start review.
Admin can resolve report.
Admin action creates audit row.
Admin can clear feedback flag.
Recommendation API applies active severe flag.
Recommendation API does not expose raw feedback notes.
```

### 20.3 E2E tests

Extend Playwright with:

```text
1. User completes onboarding.
2. User opens restaurant detail.
3. User clicks menu item feedback CTA.
4. User submits no-reaction feedback.
5. Success page appears.
6. Admin logs in and sees report in feedback queue.
```

Add severe flow:

```text
1. User submits severe report for menu item.
2. Public restaurant detail shows feedback-under-review warning.
3. Admin feedback queue shows urgent report.
4. Admin resolves/clears flag.
```

Offline flow if practical:

```text
1. User opens cached restaurant detail.
2. Browser goes offline.
3. User submits feedback.
4. Queued feedback banner appears.
5. Browser goes online.
6. Sync sends report.
```

If offline E2E is flaky, keep it as integration/unit tests and document manual QA.

### 20.4 Copy guard

Ensure:

```text
pnpm copy:check
```

passes.

Do not add forbidden wording in test fixtures.

### 20.5 Quality gate

Existing merge gate must remain:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm copy:check
```

E2E must include feedback path when seeded DB includes demo feedback/menu data.

---

## 21. Manual QA Checklist

Add README section `Feedback (§17.5)`:

```text
- [ ] Restaurant detail shows “Share meal feedback”.
- [ ] Menu item card opens feedback form with restaurant/menu item context.
- [ ] Feedback form submits online without account.
- [ ] Allergy profile data is not visible in URL.
- [ ] Staff answer and reaction fields validate correctly.
- [ ] Severe/anaphylaxis selection shows non-medical emergency notice.
- [ ] Severe report appears as urgent in admin queue.
- [ ] Severe report creates active feedback-under-review warning on public restaurant/menu item recommendation.
- [ ] Admin can start review, add note, apply/clear flag, and resolve report.
- [ ] Public UI never exposes raw user notes.
- [ ] Offline feedback queues locally and syncs when back online.
- [ ] Duplicate offline sync does not create duplicate reports.
- [ ] copy:check passes.
```

---

## 22. Acceptance Criteria

Phase 03 is done when:

```text
- Public user can submit feedback for restaurant/menu item.
- Feedback works without account.
- Feedback API stores structured report with minimal profile snapshot.
- Severe/anaphylaxis reports are automatically urgent.
- Severe/anaphylaxis reports create active feedback flags.
- Active flags influence restaurant/menu recommendations conservatively.
- Positive reports do not upgrade recommendation status.
- Admin can review and resolve/dismiss reports.
- Admin actions are audited.
- Offline feedback can be queued and synced later.
- Recommendation APIs never expose raw feedback notes.
- User allergy profile is never stored in URL.
- Existing Phase 0/1/2 flows still pass.
- Quality gates pass.
- README is updated with Phase 03 status and manual QA.
```

---

## 23. Implementation Order

Recommended order for Claude:

```text
1. Inspect current Prisma schema, restaurant/menu item models, admin conventions, API patterns.
2. Add domain feedback schemas/enums/types.
3. Add domain feedback signal functions and unit tests.
4. Add Prisma models/migration for FeedbackReport, FeedbackFlag, FeedbackAdminAction.
5. Implement server feedback creation service with idempotency.
6. Implement severe auto-flag service.
7. Add POST /api/v1/feedback.
8. Add admin feedback list/detail/action APIs.
9. Integrate active feedback flags into restaurant recommendation APIs.
10. Add public feedback form route and components.
11. Add feedback entry CTAs on restaurant detail/menu item cards.
12. Add feedback-under-review public badges/banners.
13. Add Dexie offline feedback queue.
14. Add foreground sync hook.
15. Add admin feedback queue/detail UI.
16. Add dev seed:feedback-demo script.
17. Add tests.
18. Update README and manual QA.
19. Run full quality gate.
```

Do not start with admin UI. Start with domain/schema/API. A beautiful table backed by broken trust logic is just a spreadsheet wearing perfume.

---

## 24. Claude Handoff Prompt

Use this prompt when handing to Claude:

```text
You are implementing SafeBite Travel Phase 03: Feedback Loop.

Read these first:
- README.md
- docs/SAFE_BITE_PHASE_0_1_IMPL_SPEC.md
- docs/SAFE_BITE_PHASE_02_IMPL_SPEC.md
- docs/SAFE_BITE_PHASE_03_IMPL_SPEC.md
- apps/web/prisma/schema.prisma
- packages/domain current exports
- existing restaurant recommendation API handlers
- existing admin restaurant/menu item pages/APIs
- existing Dexie/offline storage implementation

Current system after Phase 02:
- Next.js 15 App Router PWA
- React 19
- locale routes /en and /vi
- admin routes /admin with ADMIN_TOKEN httpOnly cookie
- Prisma 6/PostgreSQL/PostGIS
- Zod API validation
- Zustand local profile store
- TanStack Query
- Dexie + Serwist offline support
- @safebite/domain has evaluateDishes, evaluateMenuItem, evaluateRestaurantReadiness, buildQuestionCard
- public restaurant routes and recommendation APIs exist
- admin restaurant/menu item CRUD exists
- question cards support menu-item context
- OSM/OpenMap rows are discovery-only and capped at readiness C

Implement only Phase 03:
- public post-meal feedback flow
- POST /api/v1/feedback
- offline feedback queue and foreground sync
- FeedbackReport / FeedbackFlag / FeedbackAdminAction persistence
- admin feedback queue/detail/actions
- severe reaction auto-flagging
- conservative feedback impact on restaurant/menu recommendations
- tests and README update

Do not implement:
- OCR
- LLM menu parsing
- menu upload
- camera flow
- public restaurant onboarding
- user accounts
- email/SMS/push notifications
- Google Places
- Google scraping
- payment
- analytics containing allergy profile payloads

Hard rules:
- Do not put profile/allergy data in URL.
- Feedback never creates restaurant_verified/admin_verified status.
- Positive feedback never upgrades a recommendation to Suitable.
- Unknown never becomes Suitable.
- Severe/anaphylaxis report must create urgent admin review signal.
- Active severe flag must suppress/downgrade matching recommendations conservatively.
- Public API must never expose raw user notes.
- Use Zod at every API boundary.
- Keep domain logic framework-free.
- Preserve existing quality gates: typecheck, lint, test, copy:check, e2e.
- Do not weaken copy:check.

Implementation order:
1. Inspect existing schema/models and do not duplicate concepts.
2. Add domain feedback schemas/types/functions + unit tests.
3. Add Prisma migration.
4. Add POST /api/v1/feedback with idempotent clientReportId.
5. Add severe auto-flag creation.
6. Add admin feedback APIs.
7. Integrate flags into recommendation APIs.
8. Add public feedback UX.
9. Add offline queue/sync.
10. Add admin feedback UI.
11. Add tests, seed demo, README update.
```

---

## 25. Future Phase Notes

Phase 04 will handle Menu Upload / Scan:

```text
- image upload
- camera capture
- PDF/text fallback
- OCR
- LLM parser
- admin review parsed menus
```

Phase 03 should prepare for Phase 04 by keeping feedback signal and admin review architecture reusable, but must not implement OCR/LLM workflows.

Phase 05 will handle Restaurant Onboarding Web:

```text
- restaurant-submitted data
- menu/allergen editor
- admin approval
- shareable restaurant allergy page
```

Feedback reports can later help restaurant verification workflow, but Phase 03 should not pretend user feedback is restaurant-submitted data.
