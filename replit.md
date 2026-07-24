# Glow AI

Le dermatologue et styliste de poche pour les peaux riches en mélanine en Afrique. Users upload a selfie, get an AI skin diagnostic + score, color/fashion recommendations, virtual try-on, scan history tracking, and a TikTok glow-up clip generator. Payments via Mobile Money (M-Pesa / Airtel Money / Orange Money) through pay.akollad.com.

## Run & Operate

- `pnpm --filter @workspace/glow-ai run dev` — run the frontend (port auto-assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (runtime-managed)
- Required secrets: `YOUCAM_API_KEY`, `AKOLLAD_PRODUCT_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4, mobile-first
- Auth: Clerk (Replit-managed, via proxy at `/api/__clerk`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (Replit built-in)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend: `artifacts/glow-ai/src/` — pages, components, App.tsx with Clerk+Wouter routing
- API server: `artifacts/api-server/src/routes/` — users, scans, payments, youcam, tiktok, stats
- DB schema: `lib/db/src/schema/` — users.ts, scans.ts, payments.ts
- YouCam proxy: `artifacts/api-server/src/lib/youcam.ts` — Skin AI + Apparel VTO + color recs
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- Generated client hooks: `lib/api-client-react/src/generated/api.ts`
- Generated Zod schemas: `lib/api-zod/src/generated/api.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/requireAuth.ts` — JIT-provisions users in DB

## Architecture decisions

- **YouCam integration**: Server-side proxy in `lib/youcam.ts` keeps API key off the client. Falls back to deterministic simulation when YouCam endpoint is unreachable (dev-friendly).
- **Color recommendations**: Derived server-side from YouCam undertone + pigmentation score — no extra API call.
- **Payment flow**: `POST /api/payments/initiate` → stores referenceHub → client polls `GET /api/payments/{referenceHub}/status` every 3s until final status. Webhook at `/api/payments/callback` for server-push updates.
- **Scan credits**: New users get 1 free credit. Per-scan $1 adds 1 credit. Monthly $5 activates subscription (no credit counting while active). Both paths go through pay.akollad.com.
- **Clerk auth**: Cookie-based on web. JIT user provisioning in `requireAuth` middleware — Clerk user auto-created in local DB on first authenticated request.

## Product

- **Landing page** `/` — Shows value prop to signed-out users; signed-in users redirect to /dashboard
- **Dashboard** `/dashboard` — Skin score, streak, subscription status, quick scan CTA
- **New Scan** `/scan` — Selfie upload (camera or file) → POST to API → poll until complete → auto-redirect to results
- **Scan Results** `/scan/:scanId` — Full metrics breakdown, AI skin advice, color palette swatches, VTO
- **History** `/history` — Timeline of all scans with score evolution
- **Payment** `/payment` — Per-scan ($1) or monthly ($5), phone + telecom selector, Mobile Money flow
- **TikTok** `/tiktok/:scanId` — Generates "Mon score peau : X/100" caption + hashtags + share link

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After OpenAPI spec changes, always run `pnpm --filter @workspace/api-spec run codegen` then `pnpm run typecheck:libs` before leaf typechecks.
- YouCam API endpoint URL may differ from the placeholder in `lib/youcam.ts` — update `YOUCAM_BASE_URL` when the real endpoint is confirmed.
- `pay.akollad.com` product name is `glowai` — must match what was registered in the Akollad dashboard.
- Clerk proxy path is hardcoded to `/api/__clerk` — do not change without updating both frontend and server.
- Express 5: wildcard routes use `/{*splat}`, optional params use `{/:id}` syntax.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `clerk-auth` skill for Clerk troubleshooting and customization
