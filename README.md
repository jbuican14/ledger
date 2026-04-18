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

## Documentation

- [Product Specification](./PRODUCT_SPEC.md) - Full product requirements and epic breakdown

## License

Private - All rights reserved
