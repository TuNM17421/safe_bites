# Phase 13 — /agent chat assistant (scripted first)

## Context Links
- Plan overview: [../plan.md](../plan.md)
- Migration delta: [../migration-delta.md](../migration-delta.md) (§1 "Assistant (Trợ lý)"; §2.4/§2.5 ingredient corrections + `approve_ingredient_correction`; §4.3 `/agent` brain decision — scripted recommended)
- Target mockup: `docs/design/safebite-ui-ux-mockups-v2.html` — "Trợ lý (chat)" device, route `/agent` (lines ~515–534: user/bot bubbles, `.rcard` with % ring, and the Confirm/Edit `Xác nhận/Sửa` data-edit proposal)
- Depends on: **phase-06** (`CompatRing`/`compat-percent` for the bot's restaurant card), **phase-09** (ingredient-correction path: `FeedbackEntityType += 'ingredient'`, `approve_ingredient_correction` action) and phase-01 (bottom-nav `/agent` tab)
- Current files read:
  - `apps/web/src/app/api/v1/feedback/route.ts` (public Zod+rate-limit+persist route pattern to mirror)
  - `apps/web/src/app/api/v1/recommendations/dishes/route.ts` + `.../restaurants/route.ts` (RSC POST + `parseBody`/`apiOk` shape)
  - `packages/domain/src/feedback/schemas.ts` (`FeedbackReportInputSchema`, `FeedbackEntityTypeSchema`, `FeedbackAdminActionInputSchema`)
  - `apps/web/src/features/feedback/offline-feedback-queue.ts`, `use-feedback-sync.ts` (outbox spine to reuse for Confirm)
  - `apps/web/src/components/app-shell/bottom-nav.tsx` (destination tab pattern; `agent` key added by phase-01)
  - `apps/web/messages/en.json` (namespace layout: `common`,`nav`,`home`,`feedback`,…)

## Overview
- **Priority:** Medium (greenfield v2 surface; not on the safety-critical path yet)
- **Current status:** Not started
- **Effort:** L | **Risk:** high | **Depends on:** phase-06, phase-09
- Ship the `/agent` chat UI (user/bot bubbles) backed by a **scripted** `/api/v1/agent` endpoint that returns canned suggestions, a real linked restaurant card (% ring + name + distance), and a **Confirm/Edit data-edit proposal**. Confirm routes the proposal through the Phase-09 ingredient-correction path (human-in-the-loop: writes `needs_review`/`user_contribution`, never auto-verifies). The scripted brain sits behind a stable endpoint so a real LLM provider swaps in later without touching the UI.

## Key Insights
- **What exists to reuse (read today):**
  - Public route pattern is uniform: `parseBody(req, ZodSchema)` → `apiOk/apiError`, `rateLimit(clientKey(req))`, `runtime='nodejs'`, `dynamic='force-dynamic'` (`feedback/route.ts`). Copy this for `/api/v1/agent`.
  - The bot's restaurant card = the same data as `recommendations/restaurants` list items (`% ring + name + distance`); reuse phase-06 `CompatRing` + `compat-percent.ts` and the `restaurantDisplayName`/`counts` DTO — do not invent a new card.
  - **Confirm/Edit is NOT a new pipeline.** It is a pre-filled ingredient correction. Phase-09 extends `FeedbackEntityTypeSchema` (today `['restaurant','menu_item','dish']`, schemas.ts:69) with `'ingredient'` and adds admin action `approve_ingredient_correction`. Phase-13 only *constructs the payload* and posts it via the existing `persistFeedbackReport` route + `offline-feedback-queue.ts` outbox (`clientReportId` idempotency already there).
  - `use-feedback-sync.ts` already drains the Dexie outbox on foreground/online — a queued Confirm syncs for free; no new sync code.
- **What the code looks like TODAY:** no `/agent` route, no `agent` i18n namespace, no `/api/v1/agent`. Bottom nav (`bottom-nav.tsx`) is still the 4-tab v1 (`home/dishes/restaurants/profile`); phase-01 replaces it with the 5 v2 destinations incl. `agent`.
- **Gotchas:**
  - Mockup shows the bot *asserting* it will change a light to "Không hợp" — the UI must frame this as a **proposal awaiting human confirm**, and the confirmed correction lands as `needs_review`, never as a verified fact (HITL invariant).
  - Scripted replies must still be **matched server-side** (deterministic keyword → canned response map), not hardcoded in the client, so the LLM swap is endpoint-local.
  - Do not invent UI copy — add product-approved VI/EN keys under a new `agent.*` namespace.

## Requirements
**Functional**
- `/agent` renders a scrollable chat transcript (user + bot bubbles) and a sticky composer (`input` + send).
- Sending a message POSTs to `/api/v1/agent`; the reply may include: prose text, an optional linked restaurant card (% ring + name + distance → detail route), and an optional `dataEditProposal` (Confirm/Edit).
- A proposal renders Confirm + Edit buttons. **Confirm** builds an ingredient-correction feedback payload and submits it via the existing feedback outbox/route (HITL). **Edit** opens the correction with editable fields before submit.
- After a successful Confirm, the bot acknowledges and the proposal collapses to a "sent for review" state.
- Works offline: queued Confirms sit in the Dexie outbox and drain via `use-feedback-sync.ts`.

**Non-functional**
- All UI strings via `useTranslations('agent')`; zero hardcoded copy (add VI/EN `agent.*` keys; run `copy:check`).
- Navigation via `@/i18n/navigation` `Link`/`router` only; semantic `sb-*` tokens; % ring color-blind safe (reuse phase-06 `CompatRing`).
- RSC-first: `agent/page.tsx` is a thin server shell mounting one client island. Each new file < 200 lines.
- Zod at the `/api/v1/agent` boundary (request + response) and on the correction payload before it hits the feedback route.

## Architecture
- `agent/page.tsx` (RSC shell) → `<AgentChat/>` client island.
- `AgentChat` (client): owns `messages[]` state + composer; posts via `use-agent-chat.ts` hook → `/api/v1/agent`; renders `<ChatBubble/>`, `<BotRestaurantCard/>` (wraps `CompatRing`), `<DataEditProposalCard/>`.
- `/api/v1/agent/route.ts` (RSC route): `parseBody(agentRequestSchema)` → `scriptAgentReply()` (deterministic keyword map) → `apiOk(agentReplySchema)`. `scriptAgentReply` is the single swap-point for a future LLM adapter.
- **Confirm flow:** `DataEditProposalCard` → builds a `FeedbackReportInput`-shaped ingredient correction (`entityType:'ingredient'` from phase-09, `submissionSource`, `clientReportId`) → enqueue via `offline-feedback-queue.ts` → `use-feedback-sync.ts` POSTs to `/api/v1/feedback`. Admin later applies `approve_ingredient_correction`.
- Data flow: user text → agent endpoint → scripted reply (+ real restaurant lookup for the card) → optional proposal → Confirm → feedback outbox → HITL admin review.

## Related Code Files
**Create**
- `apps/web/src/app/[locale]/(app)/agent/page.tsx` — RSC shell mounting `<AgentChat/>`.
- `apps/web/src/features/agent/agent-chat.tsx` — client orchestrator (transcript + composer state).
- `apps/web/src/features/agent/use-agent-chat.ts` — POST hook to `/api/v1/agent` (+ Zod parse of reply).
- `apps/web/src/components/agent/chat-bubble.tsx` — user/bot bubble.
- `apps/web/src/components/agent/bot-restaurant-card.tsx` — % ring + name + distance (wraps phase-06 `CompatRing`).
- `apps/web/src/components/agent/data-edit-proposal-card.tsx` — Confirm/Edit → builds correction payload, enqueues outbox.
- `apps/web/src/app/api/v1/agent/route.ts` — scripted endpoint (Zod in/out, rate-limited).
- `apps/web/src/server/agent/script-agent-reply.ts` — deterministic keyword→reply map (LLM swap-point) + unit tests.
- `packages/domain/src/agent/schemas.ts` — `agentRequestSchema`, `agentReplySchema`, `dataEditProposalSchema`.

**Modify**
- `apps/web/messages/en.json` + `vi.json` — add `agent.*` namespace (product-approved VI/EN keys).
- `packages/domain/src/index.ts` — export the new agent schemas.

**Delete**
- None.

## Implementation Steps
1. Add `packages/domain/src/agent/schemas.ts`: `agentRequestSchema` (`{ message, city, profileSnapshot?, locale }`), `dataEditProposalSchema` (`{ menuItemId, ingredientName, proposedStatus, reason }`), `agentReplySchema` (`{ text, restaurant?, proposal? }`); export from `index.ts`.
2. Write `server/agent/script-agent-reply.ts`: deterministic keyword map → canned reply; when a suggestion references a restaurant, look it up (reuse restaurant serializer + `counts`→`compat-percent`) so the card is real. Unit-test the mapping.
3. Create `/api/v1/agent/route.ts` mirroring `feedback/route.ts` (nodejs, force-dynamic, `rateLimit(clientKey)`, `parseBody`→`apiOk`).
4. Build `chat-bubble.tsx` and `bot-restaurant-card.tsx` (wrap phase-06 `CompatRing`; `Link` to detail route).
5. Build `data-edit-proposal-card.tsx`: Confirm builds an `entityType:'ingredient'` `FeedbackReportInput` (phase-09) with fresh `clientReportId`, enqueues via `offline-feedback-queue.ts`; Edit reveals editable fields first; collapse to "sent for review" on success.
6. Build `use-agent-chat.ts` (POST + Zod-parse reply) and `agent-chat.tsx` (transcript + sticky composer).
7. Add `agent/page.tsx` RSC shell.
8. Add product-approved VI/EN `agent.*` keys; run `copy:check`.
9. Typecheck, unit tests, lint.

## Todo
- [ ] `packages/domain/src/agent/schemas.ts` (request/reply/proposal Zod) + export
- [ ] `script-agent-reply.ts` deterministic map + real restaurant lookup + unit tests
- [ ] `/api/v1/agent/route.ts` (Zod in/out, rate-limited)
- [ ] `chat-bubble.tsx` + `bot-restaurant-card.tsx` (reuse `CompatRing`)
- [ ] `data-edit-proposal-card.tsx` → ingredient-correction payload → outbox (HITL)
- [ ] `use-agent-chat.ts` + `agent-chat.tsx` + `agent/page.tsx`
- [ ] `agent.*` VI/EN keys + `copy:check`
- [ ] typecheck + unit tests + lint

## Success Criteria
- `pnpm --filter @safebite/web typecheck` and `build` pass; domain package builds with new schemas.
- Sending a scripted trigger returns a bot bubble; when applicable, a real restaurant card renders with the correct % ring and links to the detail route.
- Confirm on a proposal enqueues an `entityType:'ingredient'` feedback report; it appears in the admin queue as `needs_review` (never auto-verified) and is actionable via `approve_ingredient_correction`.
- Offline Confirm queues in Dexie and drains on reconnect via `use-feedback-sync.ts`.
- `script-agent-reply` unit tests pass; `copy:check` finds no hardcoded/unapproved copy.

## Risk Assessment
- **Scripted↔LLM contract drift** → freeze `agentReplySchema` now so the future provider conforms to the same shape; keep `script-agent-reply.ts` the only swap-point.
- **HITL bypass** (proposal writing verified data) → route Confirm exclusively through the phase-09 feedback path; assert `needs_review`/`user_contribution` in tests; no direct ingredient mutation from the client.
- **Blocked on phase-09** (`'ingredient'` entity + admin action) → land phase-09 first; until then keep the proposal card behind a feature guard so the chat UI still ships.
- **Blocked on phase-06** (`CompatRing`) → reuse the shared component; do not fork a second ring.
- **Overreach into real LLM** → YAGNI: scripted only this phase; no provider SDK, no secrets.

## Security Considerations
- **Auth:** `/api/v1/agent` is public + anonymous like `/api/v1/feedback`; protect with `rateLimit(clientKey(req))`. No user account is introduced.
- **Zod:** validate request and reply at the endpoint, and the correction payload with `FeedbackReportInputSchema` before it reaches `/api/v1/feedback`.
- **PII / on-device:** profile/allergen context sent to the scripted endpoint stays request-scoped; do not persist chat transcripts server-side; reuse the feedback outbox's existing anonymity boundary (no reporter identity).
- **Provenance / HITL:** confirmed proposals land as `needs_review` with `source=user_contribution`; verification happens only via the admin `approve_ingredient_correction` action — the assistant suggests, a human confirms.

## Next Steps
- Unblocks swapping the scripted brain for a real LLM provider behind `/api/v1/agent` (endpoint-local change).
- Feeds the admin reports/OCR-review queues (phase-10+) with `ingredient` corrections originating from chat.
