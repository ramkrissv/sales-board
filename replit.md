# Galent Sales Pipeline Tracker

## Overview

A comprehensive sales opportunity management application for tracking deals through various pipeline stages. The application provides multiple views for visualizing opportunities including Kanban board, timeline, schedule board, table view, and analytics dashboard. It features drag-and-drop functionality, detailed opportunity modals with stakeholder/task management, and real-time filtering capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context API via `OpportunityProvider` in `client/src/lib/store.tsx`
- **Data Fetching**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Drag & Drop**: @dnd-kit for Kanban board interactions
- **Charts**: Recharts for dashboard analytics
- **Date Handling**: date-fns
- **Theming**: next-themes for dark/light mode support

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` - defines tables for opportunities, stakeholders, tasks, and resource links
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

### Key Data Models
1. **Opportunities**: Main entity with fields for customer info, deal values, status, dates, owners, and metadata
2. **Stakeholders**: Customer contacts linked to opportunities with decision-maker flags
3. **Tasks**: Action items with priority, status, and due dates
4. **Resource Links**: External document/folder references

### Build System
- **Frontend**: Vite for development and production builds
- **Backend**: esbuild for server bundling with selective dependency bundling for cold start optimization
- **Output**: `dist/public` for static files, `dist/index.cjs` for server

### API Endpoints Pattern
- `GET /api/opportunities` - List all with nested resources
- `POST /api/opportunities` - Create new
- `PATCH /api/opportunities/:id` - Update existing
- `DELETE /api/opportunities/:id` - Remove
- Similar CRUD patterns for stakeholders, tasks, and resource links

## External Dependencies

### Database
- PostgreSQL database (connection via `DATABASE_URL` environment variable)
- Drizzle ORM for type-safe database operations
- connect-pg-simple for session storage capability

### UI Component Libraries
- Radix UI primitives (dialogs, dropdowns, popovers, tabs, etc.)
- shadcn/ui pre-built components
- Lucide React for icons

### Development Tools
- Vite with React plugin
- Tailwind CSS v4 via @tailwindcss/vite
- TypeScript with strict mode
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)