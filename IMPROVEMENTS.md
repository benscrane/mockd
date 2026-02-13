# mockd — Top 5 High-Impact Improvements

Prioritized improvements for user activation, retention, and conversion.
Each is scoped to a single PR, implementable in under a day.

---

## 1. One-Click Instant Demo from Landing Page [IMPLEMENTED]

**Problem:** The hero CTA ("Start Mocking — Free") creates a bare anonymous project
with zero endpoints. Users must then: create an endpoint, configure it, copy a URL,
open a terminal, send a curl — 5+ steps before any "aha" moment.

**Solution:** Clicking the CTA now:
1. Creates an anonymous project with a pre-configured webhook receiver endpoint
   (using dynamic template variables like `{{$uuid}}` and `{{$timestamp}}`)
2. Navigates directly to the endpoint detail page with `?demo=true`
3. Auto-fires a realistic demo webhook POST request once the WebSocket connects
4. User sees a live request appear in the stream within seconds — zero effort

**Files changed:**
- `packages/web/src/pages/Home.tsx` — `handleQuickStart` creates project + endpoint + navigates to endpoint detail
- `packages/web/src/components/landing/Hero.tsx` — Loading state shows "Creating your mock..."
- `packages/web/src/pages/EndpointDetail.tsx` — Demo mode: auto-fires request, shows welcome banner

**Impact:** HIGH — Reduces time-to-value from minutes to seconds. The single biggest activation lever.

---

## 2. Persistent cURL Snippets per Endpoint [IMPLEMENTED]

**Problem:** After creating an endpoint, the only curl example appears in a dismissible
"Getting Started" banner (only for template-created projects). Once dismissed, or for
manually created endpoints, there's no easy usage reference.

**Solution:** Added a persistent "Usage" collapsible section on every endpoint detail page with:
- Pre-built curl snippets for GET, POST, PUT, DELETE
- Full endpoint URL with one-click copy
- Language tabs (cURL, JavaScript fetch, Python requests)
- Auto-populated with the endpoint's configured content type and sample body

**Files changed:**
- `packages/web/src/components/endpoint/UsageSnippets.tsx` — New component with method selector, language tabs, and generated code snippets
- `packages/web/src/pages/EndpointDetail.tsx` — Integrated UsageSnippets below the endpoint URL card

**Impact:** HIGH — Bridges "I created a mock" to "I'm actively using it."

---

## 3. Request Replay from Logs

**Problem:** For webhook testing, developers capture a webhook payload, inspect it, then
need to replay it while iterating on their handler. There's no way to re-send a captured
request — users must manually reconstruct it each time.

**Solution:** Add to each request log entry:
- "Replay" button — re-sends the exact request (method, path, headers, body) to the mock endpoint
- "Copy as cURL" button — generates a curl command from the captured request
- Show the replay response inline (status, body, duration)

**Files to change:**
- `packages/web/src/components/request/RequestItem.tsx` — Add replay + copy-as-curl buttons
- `packages/web/src/components/request/RequestList.tsx` — Handle replay state
- `packages/web/src/hooks/useRequestReplay.ts` (new hook) — Handles replay fetch logic

**Impact:** HIGH — Transforms the product from "capture and inspect" to "capture, inspect, and iterate."

---

## 4. Live Response Preview with Template Rendering

**Problem:** The template engine supports powerful variables (`{{$uuid}}`, `{{$timestamp}}`,
`{{request.body.field}}`, etc.) but users can't see what the response will look like
until they save and send a request. Configuring dynamic responses feels like guesswork.

**Solution:** Add a live preview panel alongside the response body editor:
- Renders template variables in real-time with example values
- Shows a collapsible reference card of all available template variables with descriptions
- Visual diff highlighting showing which parts are dynamic vs static

**Files to change:**
- `packages/web/src/components/endpoint/ResponsePreview.tsx` (new component)
- `packages/web/src/components/endpoint/TemplateReference.tsx` (new component)
- `packages/web/src/components/endpoint/EndpointForm.tsx` — Integrate preview panel

**Impact:** MEDIUM — Improves confidence and discoverability of a powerful but hidden feature.

---

## 5. Limit Enforcement UX + Upgrade Path

**Problem:** When users hit free tier limits (3 projects, 3 endpoints/project), the API
returns a generic error with no in-UI explanation. The pricing page shows different
numbers than actual tier limits (e.g., "10 endpoints/project" for Free, but code enforces 3).

**Solution:**
- Show inline limit indicators: "2/3 endpoints used" with a progress bar
- When limits are reached, display a friendly upgrade prompt (not just an error)
- Fix the pricing page to match actual limits from `packages/shared/src/constants/limits.ts`
- Add "Upgrade" CTAs that are contextually relevant

**Files to change:**
- `packages/web/src/pages/ProjectDetail.tsx` — Add endpoint count indicator
- `packages/web/src/pages/Home.tsx` — Add project count indicator
- `packages/web/src/pages/Pricing.tsx` — Fix tier numbers to match constants
- `packages/web/src/components/common/LimitIndicator.tsx` (new component)

**Impact:** MEDIUM — Prevents confused churn at limits and creates natural upgrade path.
