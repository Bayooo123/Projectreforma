# ReformaOS

A comprehensive legal practice management system built for modern law firms.

## Features

- 📋 **Brief Manager** - Manage legal briefs with document tracking
- ⚖️ **Litigation Tracker** - Track court dates and proceedings
- 👥 **Client Manager** - Client management and invoicing
- 📊 **Analytics Hub** - Executive dashboard with insights
- 🔔 **Intelligent Notifications** - Automated alerts for deadlines
- 👔 **Partners Room** - Financial overview and equity management

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL (Supabase) + Prisma ORM
- NextAuth.js v5 for authentication
- CSS Modules for styling

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npx prisma db push
npx prisma generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

See [deployment guide](./docs/deployment.md)

## License

Proprietary - All rights reserved
