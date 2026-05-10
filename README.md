# Ledger

> Know what's coming, control what goes out, track what happened

A family budget application for UK households to track expenses, manage budgets, and achieve savings goals.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Email + Google OAuth)
- **Monorepo**: pnpm workspaces + Turborepo

## Project Structure

```
/ledger
├── apps/
│   └── web/                    # Next.js application
├── packages/
│   ├── ui/                     # Shared UI components (shadcn/ui)
│   ├── database/               # Supabase client & types
│   └── config/                 # Shared ESLint & TypeScript configs
├── supabase/                   # Supabase migrations & functions
└── scripts/                    # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase CLI (for local development)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ledger

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase credentials

# Start Supabase locally
supabase start

# Start the development server
pnpm dev
```

### Development Commands

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm typecheck    # Type-check all apps
pnpm clean        # Clean all build artifacts
```

## Troubleshooting

### Next.js cache issues

If you encounter webpack errors or stale builds after switching branches or making significant changes, clear the Next.js cache:

```bash
cd apps/web
rm -rf .next
pnpm dev
```

### Common issues

- **"**webpack_modules**[moduleId] is not a function"** - Clear `.next` cache (see above)
- **"Loading..." stuck forever** - Check browser console for RLS/Supabase errors
- **Auth errors after schema changes** - Run `supabase db reset` to apply migrations

### when update new node do

```bash
rm -rf node_modules
pnpm install
pnpm store prune  # Optional: clean pnpm cache
```

## Documentation

- [Product Specification](./PRODUCT_SPEC.md) - Full product requirements and epic breakdown
- [Epic Progress](./docs/EPIC_PROGRESS.md) - Current status of all epics
- [Supabase Rules](./docs/SUPABASE_RULES.md) - Required patterns for Supabase integration

## License

Private - All rights reserved
