# AI Operations Playbook

## Update Covenant

- This is the canonical instruction sheet for every AI working inside `projectfe`. Re-read it before each task.
- Any structural, behavioral, or dependency change (new routes, env vars, middleware rules, schema edits, shared package APIs, etc.) **must** be reflected here in the same PR so later AIs inherit the truth.
- When you touch a surface described below, mention in your PR description that the instructions were reviewed, and explicitly restate here what changed. Future AIs rely on that audit trail to stay safe.

## Repo Topology & Tooling

- Toolchain: `pnpm@10.19.0`, Node `^22.21.0`, Turborepo orchestrates all workspace scripts via `turbo.json`. Run repo-level commands with `pnpm run <script>` to benefit from caching.
- Workspaces:
  - `apps/example-web`: Next.js 15 App Router client with next-intl, Clerk, React Query, tRPC, MUI, Tailwind, cache components.
  - `packages/core-api`: Shared tRPC context + routers.
  - `packages/core-db`: Drizzle ORM client and schemas (generic + project-specific under `src/schemas/projectfedbchat`).
  - `packages/ui`: Tailwind/Radix-powered primitives (`Button`, `Input`, `ThemeProvider`, `Toast`, etc.) plus `cn` helper.
  - `packages/validators`: Placeholder zod validators for shared logic.
  - `tooling/*`: Shared ESLint, TS, Tailwind, Prettier configs; extend these instead of ad-hoc setups.
- Root `package.json` exposes scripts for dev (`dev`, `dev:example-web`), QA (`lint`, `format`, `typecheck`, combo pipelines), and DB (`db:*`). Prefer `pnpm run lint:format:ws:fix:typecheck` before committing multi-layer work.

## apps/example-web (Next.js) Deep Dive

- **Environment typing** (`src/env.ts`): Uses `@t3-oss/env-nextjs` with the Vercel preset. Server vars: `POSTGRES_URL`, `CLERK_SECRET_KEY`. Client vars require `NEXT_PUBLIC_` prefix (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PROJECT_HOME_URL`, `NEXT_PUBLIC_PROJECT_NAME`). Whenever you add/remove env vars, declare them here, sync deployment secrets, and update these instructions.
- **Middleware proxy** (`src/proxy.ts`): Wraps requests with Clerk (`clerkMiddleware`) and next-intl. `isProtectedRoute` currently guards `/:locale?/chat(.*)`. The matcher skips assets via regex; update both lists if you add rewrites or static asset types. Middleware enforces `x-lang` header, seeds `x-currency` cookie (defaults to EUR), and strips `x-default` link refs. Mention here if you change protected routes, cookies, or header semantics.
- **Routing & i18n**:
  - `src/app/[locale]` is the entry point; `generateStaticParams` enumerates `routing.locales`.
  - `src/i18n/routing.ts` defines locales (`en`, `fr`) and pathnames; `src/i18n/navigation.ts` exposes locale-aware `usePathname`, etc.; `src/i18n/request.ts` loads locale-specific message modules under `apps/example-web/messages/<locale>.ts`.
  - `messages/en.ts` defines the canonical `TranslationShape` enforced via `SameShape`/`NoEmptyObject`. Populate `en` before copying keys to other locales or the build will flag missing values.
- **Layout stack** (`src/app/[locale]/layout.tsx`): Provider order is critical—`TRPCReactProvider` → `ClerkProvider` → `NextIntlClientProvider` → `@projectfe/ui/ThemeProvider` → `AppRouterCacheProvider` → `MuiThemeProvider` → `RootLayoutProviders`. Do not reorder unless you investigate downstream hooks first. Fonts (Roboto, Roboto Mono, Oswald) register CSS variables consumed by `@projectfe/ui`.
- **RootLayoutProviders** (`layout-providers.tsx`): Client-only. Reads `x-currency` cookie, hydrates the global `SIGNAL_CURRENCY`, disables dev tools via `disable-devtool` in production, and can wrap children with `_components/_navbar.tsx` when re-enabled. Keep side effects guarded for SSR (`typeof document`). Document any new signals/effects here.
- **Data & tRPC usage**:
  - Client: `src/trpc/react.tsx` creates a singleton QueryClient (`createQueryClient`) with SuperJSON de/serialization and exposes `TRPCReactProvider` plus `useTRPC` hooks. HTTP link attaches `x-trpc-source: nextjs-react`; `window.toggleDevtools()` toggles devtools at runtime.
  - Server/RSC: `src/trpc/server.tsx` caches `createContext` (adds headers, cookies, Clerk client) and exports `trpc`, `prefetch`, `HydrateClient`. Use `prefetch(trpc.<router>.<proc>.queryOptions())` in Server Components for cache-friendly data and hydrate with `<HydrateClient>` on the client when necessary.
- **UI & styling**: Global CSS lives in `src/app/[locale]/styles.css`. Prefer primitives from `@projectfe/ui` (Button, Input, dropdown, toast, ThemeProvider/ThemeToggle) to keep styling centralized. MUI theme definitions live in `src/theme/mui-theme.ts` and currently only set `fontFamily`; extend there if you need palette/typography overrides.
- **Pages/components**: `_components/_page.tsx` and `_components/_navbar.tsx` are thin placeholders. `profile/page.tsx` exists but returns nothing—fill it with authenticated UI once the backend is ready. Always align new routes with locale segmenting and update `routing.pathnames` + translations + middleware rules simultaneously.
- **Reminder**: Whenever you introduce a new provider, middleware behavior, locale, message file, or tRPC helper under `apps/example-web`, update this section immediately per the user request.

## Shared Packages

- **`packages/core-api`**:
  - `src/trpc.ts` exposes `createTRPCContext`, `createTRPCRouter`, `publicProcedure`, `protectedProcedure`, and the `timingMiddleware`. Context injects `lang`, `currency`, `clerkAuth`, `clerkClient`, `db`, and `project` metadata, plus `functions.getUserId` (optionally pulls the Clerk user or DB row). Protected procedures enforce Clerk authentication and inherit the timing middleware; they currently log duration and add an artificial delay in dev (100–1000 ms) to surface waterfalls.
  - Routers live under `src/router/*`. Only `authRouter` is wired today (`appRouter` in `src/root.ts`); `postRouter` exists but is not registered. When you add/modify routers, register them in `src/root.ts`, re-export types via `src/index.ts`, and describe the change here.
  - `src/index.ts` re-exports `appRouter`, `AppRouter`, and `RouterInputs/Outputs`. Apps must import from this barrel; never deep-import router files.
- **`packages/core-dbdb`**:
  - `src/client.ts` instantiates Drizzle using `POSTGRES_URL`. Calls to `db` expect schema imports from `./schema`.
  - `src/schema.ts` declares the `Post` table + `CreatePostSchema` (drizzle-zod), and re-exports `auth-schema.ts` (user/session/account/verification tables) and project-specific schemas via `src/schemas/_index.ts`. `_constants.ts` exposes `DB_SCHEMA_NAME = "_projectfe_"`; keep prefixes consistent.
  - Any DDL change requires `pnpm db:generate` (SQL snapshots) and `pnpm db:migrate`. Commit SQL artifacts plus schema TS changes and expand this doc with the new tables/columns.
- **`packages/ui`**:
  - `src/index.ts` exports `cn` (cva + tailwind-merge), plus every primitive component.
  - `button.tsx`, `input.tsx`, `dropdown-menu.tsx`, `field.tsx`, `label.tsx`, `separator.tsx`, `toast.tsx`, `theme.tsx`, etc., are Tailwind/Radix-based. `ThemeProvider` + `ThemeToggle` manage `theme-mode` localStorage and `prefers-color-scheme` events, injecting the `themeDetectorScript` at runtime.
  - Add new primitives here to keep apps thin; document the addition in this section so future AIs know the available building blocks.
- **`packages/validators`**: Currently exposes a single `unused` zod string as guidance. Use this package for cross-cutting validation schemas that do not belong in Drizzle or UI; update this doc when it actually exports something meaningful.

## Operational Playbooks

1. **Add/extend a page**
   - Create/modify files under `apps/example-web/src/app/[locale]/...`. Remember: server components by default, mark client-only components with `"use client"` at the top.
   - Update `routing.pathnames` and translations (`messages/en.ts` + other locales) for any new slug. Ensure middleware protects/permits the route as needed.
   - Wire data through `trpc` helpers (`prefetch` + `HydrateClient` or `useTRPC`).

1. **Add a tRPC procedure**
   - Define the procedure inside a router under `packages/core-api/src/router`. Use `publicProcedure` or `protectedProcedure`. Import `z` from `zod/v4` for input validation and `ctx.db` (Drizzle) for persistence.
   - Register the router in `src/root.ts`, re-export types, then consume it through `@projectfe/core-api` inside the app. Update React Query caches with `useQuery(trpc.<router>.<proc>.queryOptions())` or manual query client logic.

1. **Evolve the data model**
   - Edit schemas in `packages/core-dbdb/src/schema.ts` or `src/schemas/projectfedbchat`. Run `pnpm db:generate` + `pnpm db:migrate` and commit outputs. Update API + UI layers accordingly.

1. **Introduce a locale**
   - Extend `ROUTING_LOCALES` and `ROUTING_DEFAULT_LOCALE` if needed, add a `messages/<locale>.ts` mirror that satisfies `TranslationShape`, and verify middleware/resolvers (headers/cookies) cover the new code. Refresh this doc with the locale list and any fallback logic.

1. **Tighten auth coverage**
   - Update `isProtectedRoute` in `proxy.ts`, confirm Clerk protects the route, and ensure unauthenticated flows degrade gracefully. Document new protected patterns here.

1. **Create shared UI**
   - Build primitives in `packages/ui`, export them via `src/index.ts`, and import from `@projectfe/ui` in apps. Keep Tailwind tokens under `tooling/tailwind/theme.css`.

1. **Manage env/config changes**
   - Declare new vars in `src/env.ts`, set runtime equivalents, and adjust Next config/middleware if they influence build/runtime choices. Note the change here so others know which envs exist.

## QA, Tooling & Performance

- Dev server: `pnpm run dev:example-web` (wraps `pnpm with-env next dev`). Clean caches with `pnpm -F @projectfe/example-web clean:cache` if you bump dependencies.
- Quality gates: `pnpm run lint`, `pnpm run format`, `pnpm run typecheck`, or the combo script. ESLint configs live in `tooling/eslint/*`; extend those if you adjust linting rules.
- Tailwind + Prettier + TS use shared configs (`@projectfe/tailwind-config`, `@projectfe/prettier-config`, `@projectfe/tsconfig`). Update the tooling packages rather than local copies so apps stay in sync.
- React Query already sets a 30s `staleTime` and avoids redacting Next server errors. When altering caching, document why and how here.
- MUI uses CSS variables via `@mui/material-nextjs/v15-appRouter`. If you introduce SSR customizations (e.g., emotion cache), outline the integration steps in this section.

## When Something Changes

- After any change described above, re-read this file and update the relevant paragraph immediately—this was explicitly requested by the user and is non-negotiable.
- Call out removed systems too (e.g., deleting `postRouter`, adding Redis, swapping auth providers). Silence causes future AIs to act on stale assumptions.
- If you are unsure whether a change is “architectural,” err on the side of updating this doc and mention the uncertainty so the next AI can verify.

Keep this playbook living, specific, and synchronized with the codebase so every AI can safely analyze, optimize, and extend the system.
