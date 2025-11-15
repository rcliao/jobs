# Job Search Automation

AI-powered job search tool that automatically finds, scores, and ranks job postings based on your preferences.

## Features

- 🤖 **AI-Powered Search** - Uses Gemini AI to generate optimized search queries
- 🔍 **Google Custom Search** - Searches job boards (Greenhouse, Lever, Ashby, etc.)
- ⭐ **Smart Scoring** - AI ranks each job 1-10 with detailed reasoning
- 📊 **Job Tracking** - Manage jobs through statuses: New → Saved → Applied → Dismissed
- ⚙️ **Customizable** - Configure your profile and AI agent prompts

## How It Works

1. **Configure Your Profile** - Set your target role, skills, company preferences, location, etc.
2. **Run Search** - AI generates 5-7 optimized queries, searches Google, and scores results
3. **Review Jobs** - See ranked job listings with AI explanations
4. **Track Progress** - Save interesting jobs, mark applications, dismiss irrelevant ones

### Search Process

```
You Click "Run Search"
    ↓
AI generates queries based on your profile
    ↓
Searches multiple job boards in parallel
    ↓
Deduplicates and scores each job (1-10)
    ↓
Displays results sorted by relevance
```

## Tech Stack

- **Frontend/Backend**: Next.js 14 (Server Components, Server Actions)
- **Database**: SQLite with better-sqlite3
- **AI**: Google Gemini API
- **Search**: Google Custom Search API
- **Styling**: Tailwind CSS
- **Deployment**: Railway

## Local Development

### Prerequisites

- Node.js 18+
- Google API key (for Gemini AI)
- Google Custom Search Engine ID

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and add your API keys:
   ```bash
   cp .env.example .env.local
   ```

4. Initialize the database:
   ```bash
   npm run db:init
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Railway deployment instructions.

### Quick Deploy to Railway

1. Push your code to GitHub
2. Create new Railway project from GitHub repo
3. Add environment variables (see DEPLOYMENT.md)
4. Add a persistent volume for SQLite
5. Deploy!

## Project Structure

```
/app                 # Next.js pages and API routes
  /api              # API endpoints
  /config           # Configuration page
  /jobs/[id]        # Job detail pages
/components         # Reusable UI components
/lib
  /agent           # Gemini AI integration
  /db              # Database layer
  /search          # Google Custom Search
/config            # Default profile and agent config
/docs              # Technical design documents
/types             # TypeScript type definitions
```

## API Keys Setup

### Google API Key (Gemini AI)

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to `.env.local` as `GOOGLE_API_KEY`

### Google Custom Search Engine ID

1. Go to https://programmablesearchengine.google.com/
2. Create a new search engine
3. Configure it to search the entire web
4. Get your Search Engine ID
5. Add to `.env.local` as `GOOGLE_SEARCH_ENGINE_ID`

## Usage

1. **Configure** - Visit `/config` to set your job search preferences
2. **Search** - Click "🔍 Run Search" on the dashboard
3. **Review** - Browse scored jobs, read AI reasoning
4. **Manage** - Save promising jobs, mark when you apply
5. **Repeat** - Run searches daily to find new opportunities

## Cost Estimates

### Free Tier
- **Gemini AI**: Generous free tier (60 requests/minute)
- **Google Custom Search**: 100 queries/day free
- **Railway**: $5 credit/month (enough for personal use)

### Typical Usage
- Each search uses ~7 API calls (1 for queries + 6 for scoring batches)
- With free tiers, you can run 10-15 searches per day at no cost

## Future Enhancements

- Scheduled daily searches
- Email notifications
- LinkedIn integration
- Resume customization per job
- Multi-user support

## License

MIT

## Contributing

This is a personal project, but feel free to fork and customize for your own job search!
