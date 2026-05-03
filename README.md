# meayar — Frontend

> AI-powered medical credentials verification platform. Verify a doctor in under 90 seconds.

***

## What is meayar?

meayar is a **SaaS dashboard** for compliance teams at hospitals, insurers, and digital health platforms. It wraps a multi-agent AI backend that runs an 8-step pipeline — OCR, authenticity forensics, CNAS (Algeria's national health insurance registry) cross-check, and more — and surfaces the results through a rich real-time UI.

**Key capabilities for operators:**
- Trigger and monitor credential verifications in real time (SSE streaming)
- Review AI-flagged cases with a human approve / reject / resubmit workflow
- Manage document extraction templates per document type
- Register webhook endpoints for downstream system notifications
- Issue and revoke API keys for tenant integrations

**Key capability for doctors:**
- Upload credential documents via a guided, token-authenticated public flow (`/verify/:token`)

***

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR-capable React, built on Vite) |
| Router | [TanStack Router](https://tanstack.com/router) (file-based, type-safe) |
| UI | React 19 + shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v4 with a custom design-token system |
| Animation | Framer Motion |
| Charts | Recharts |
| Forms | react-hook-form + Zod |
| Deployment | Cloudflare Workers (via `wrangler.jsonc`) |
| Runtime | Bun (preferred) |

***

## Application Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Edge                           │
│                                                                 │
│  ┌──────────┐    ┌──────────────────────────────────────────┐  │
│  │  Landing  │    │            Authenticated App             │  │
│  │   /       │    │                                          │  │
│  └──────────┘    │  ┌──────────┐  ┌────────────────────┐   │  │
│                  │  │AppSidebar│  │      AppTopbar      │   │  │
│  ┌──────────┐    │  └──────────┘  └────────────────────┘   │  │
│  │  Doctor   │    │                                          │  │
│  │  Upload   │    │  ┌──────────────────────────────────┐   │  │
│  │ /verify/  │    │  │            <main>                 │   │  │
│  │  :token   │    │  │   Route-level page component      │   │  │
│  └──────────┘    │  └──────────────────────────────────┘   │  │
│                  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │  REST + SSE
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      meayar Backend API                         │
│              (https://mediverify.up.railway.app)                │
│                                                                 │
│  /api/verifications   /api/reports   /api/templates             │
│  /api/webhooks        /api/api-keys  /api/dashboard             │
│  /api/doctors         /api/documents                            │
└─────────────────────────────────────────────────────────────────┘
```

***

## Route Map

```text
/                       Public landing page (marketing + pipeline explainer)
│
├── /dashboard          Command center: KPI cards, charts, recent verifications,
│                       API key management
│
├── /verifications      Paginated list with status filters and search
│   └── /:id            Verification detail view
│                         ├── Pipeline step trace (SSE live update)
│                         ├── Uploaded documents (presigned URL viewer)
│                         ├── AI report content + comment thread
│                         └── Human review actions (approve / reject / resubmit)
│
├── /review             Human review queue (reports awaiting decision)
│
├── /templates          Document extraction template management
│   └── /:id            Template detail + field editor + sample image upload
│
├── /api-keys           API key CRUD
│
├── /webhooks           Webhook endpoint management + delivery history
│
└── /verify/:token      Doctor-facing credential upload flow (public, no sidebar)
```

***

## API Layer

```text
src/lib/api/
│
├── http.ts          Raw fetch wrapper
│                    - 10 s timeout via AbortController
│                    - Injects Authorization: Bearer <VITE_API_TOKEN>
│                    - Throws HttpError(status, data) on non-2xx
│
├── apiClient.ts     Optional Zod validation + response mapping on top of http()
│
├── verifications.ts Verifications + Reports + SSE streaming
├── dashboard.ts     KPI stats, chart data, audit log
├── templates.ts     Template CRUD + field management + sample image upload
├── webhooks.ts      Endpoint CRUD + secret reveal/rotate + delivery history
├── apiKeys.ts       API key CRUD
├── doctors.ts       Doctor records
└── documents.ts     Document listing + presigned URL generation
```

Every module exports its own TypeScript interfaces for request/response types. All modules derive `BASE_URL` from `import.meta.env.VITE_BACKEND_URL`.

***

## Verification Pipeline (Backend — surfaced in UI)

```text
  Doctor submits documents
           │
           ▼
  ┌────────────────┐
  │ 01 · KYC       │  Liveness check, ID match
  └───────┬────────┘
          │
  ┌───────▼────────┐
  │ 02 · Classify  │  Identifies document types
  └───────┬────────┘
          │
  ┌───────▼────────┐
  │ 03 · OCR       │  PaddleOCR → GPT-4o fallback
  └───────┬────────┘
          │
  ┌───────▼────────┐
  │ 04 · Authentic │  Seal, font, forensic analysis
  └───────┬────────┘
          │
  ┌───────▼────────┐
  │ 05 · CNAS      │  Live registry cross-check
  └───────┬────────┘
          │
  ┌───────▼────────┐
  │ 06 · Consistent│  Cross-document field matching
  └───────┬────────┘
          │
  ┌───────▼────────┐
  │ 07 · Score     │  Weighted 0–100 score
  └───────┬────────┘
          │
  ┌───────▼──────────────────────────────────────────┐
  │ 08 · Decision                                     │
  │   score ≥ 80 → auto approved                      │
  │   score 50–79 → manual_review (enters /review)   │
  │   score < 50 → auto rejected                      │
  └──────────────────────────────────────────────────┘
```

The frontend subscribes to `GET /api/verifications/:id/stream` (SSE) on the detail page while `status === "pending"`, and re-fetches the full record on `completed` or `failed` events.

***

## Data Model (Key Types)

```typescript
Verification {
  id, doctorId, tenantId
  status:   "pending" | "completed" | "failed"
  score:    number | null  // 0.0–1.0; display as Math.round(score * 100)
  decision: "approved" | "manual_review" | "rejected"
           | "human_approved" | "human_rejected"
           | "resubmit_requested" | null
  startedAt, completedAt
  steps:     VerificationStep[]
  documents: VerificationDocument[]
}

Report {
  id, verificationId
  status:    "pending_review" | "reviewed"
  decision:  "approved" | "rejected" | "resubmit" | null
  contentRaw: string | null   // AI-generated summary text
  comments:   ReportComment[]
  reviewer:   ReportAuthor | null
}

Template {
  id, name, slug
  docType: "national_id" | "diploma" | "affiliation"
          | "agreement" | "chifa" | "ordonnance" | "custom"
  fields:  TemplateField[]
  fieldPositions: Record<fieldId, { x, y, width, height }>  // 0.0–1.0 relative
}
```

***

## Design System

Tailwind v4 with a custom token layer defined in `src/styles.css`. **Always use tokens; never raw hex.**

| Token | Purpose |
|---|---|
| `bg-background` | Page background |
| `bg-surface` | Panel / card background |
| `bg-surface-elevated` | Input fields, hover states |
| `text-primary-glow` | Interactive / accent text |
| `text-success` / `bg-success` | Approved states |
| `text-warning` / `bg-warning` | Flagged / review states |
| `text-destructive` | Rejected / error states |
| `border-border` / `border-border-strong` | Default / emphasized borders |
| `font-display` | IBM Plex Serif — headings |
| `font-sans` | IBM Plex Sans — body |
| `font-mono` | IBM Plex Mono — IDs, labels, badges |

Theme (`light` / `dark`) is toggled via the `dark` class on `<html>` and persisted to `localStorage["theme"]`. A blocking inline script in `__root.tsx` sets the class before first paint to avoid flash.

***

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.x
- Node 20+ (fallback)

### Setup

```bash
# Install dependencies
bun install

# Copy and fill in environment variables
cp .env.example .env   # set VITE_BACKEND_URL and VITE_API_TOKEN

# Start the dev server
bun dev
```

### Build

```bash
bun run build          # Production build (outputs to dist/)
bun run build:dev      # Development build (unminified)
bun run preview        # Preview production build locally
```

### Lint & Format

```bash
bun run lint           # ESLint
bun run format         # Prettier (writes in-place)
```

***

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Base URL of the meayar backend API |
| `VITE_API_TOKEN` | Bearer JWT sent on all API requests |

***

## Project Structure

```text
src/
├── routes/             File-based pages (TanStack Router)
├── components/
│   ├── ui/             shadcn/ui primitives (auto-generated, rarely edited)
│   └── *.tsx           App-specific components (AppShell, StatusBadge, modals…)
├── lib/
│   ├── api/            API client modules
│   ├── utils.ts        cn() helper (clsx + tailwind-merge)
│   └── mock-data.ts    Fallback data for development
├── hooks/
│   └── use-mobile.tsx  Breakpoint hook
├── router.tsx          Router factory + error boundary
├── routeTree.gen.ts    Auto-generated route tree (do not edit)
└── styles.css          Global Tailwind v4 + design token definitions
```

***

## Deployment

The app targets **Cloudflare Workers** via the `@cloudflare/vite-plugin`. `wrangler.jsonc` contains the Workers configuration. `vite.config.ts` uses `@lovable.dev/vite-tanstack-config` which bundles all necessary plugins — do not add `tailwindcss`, `viteReact`, or `tanstackStart` manually or the build will fail with duplicate plugin errors.

***

*meayar · Hackathon prototype · Aligned with Algerian Law 18-07*
