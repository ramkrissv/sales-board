# Galent SalesPilot

AI-native revenue intelligence platform with Agent Harness architecture.

## Quick Start

```bash
# Install
npm install

# Dev
npm run dev

# Build
npm run build

# Docker
docker compose up -d --build
```

## Stack

- Next.js 15 (App Router) · TypeScript
- MongoDB · Mongoose ODM · tRPC
- Anthropic Claude API (AI features)
- NextAuth.js (Auth)
- Tailwind CSS · Radix UI

## Environment

Copy `.env.example` to `.env.local`:

```
MONGODB_URI=mongodb://localhost:27017/galent
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
ANTHROPIC_API_KEY=your-key
```

## Features

- 31 routes, 15+ data models
- Agent Harness with 17 tools
- 10 real Claude AI integrations
- Presales OS, Pricing Engine, Deal Room
- GenUI (AI generates interactive components)
- Omni-channel intake (voice, Teams, Outlook)

## Deployment

```bash
docker compose up -d --build
```

See REQUIREMENTS.md for full documentation.
