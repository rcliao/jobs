# Deploying to Railway

This guide will help you deploy your Job Search Automation app to Railway.

## Prerequisites

1. A Railway account - Sign up at https://railway.app
2. Your Google API key and Search Engine ID

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your code is in a Git repository:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### 2. Create New Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `jobs` repository
5. Railway will automatically detect it's a Next.js app

### 3. Add Environment Variables

In your Railway project dashboard:

1. Go to **Variables** tab
2. Add the following variables:

```
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
DATABASE_URL=file:./jobs.db
NEXT_PUBLIC_BASE_URL=https://your-app.railway.app
```

**Important:** Replace `your-app.railway.app` with your actual Railway domain (you'll see this after deployment)

### 4. Configure Persistent Storage for SQLite

Railway's filesystem is ephemeral by default, so we need to add a volume:

1. In your Railway project, go to **Settings**
2. Scroll to **Volumes**
3. Click "Add Volume"
4. Set:
   - Mount Path: `/app/data`
   - Size: `1 GB` (should be plenty for job data)

5. Update `DATABASE_URL` environment variable to:
   ```
   DATABASE_URL=file:/app/data/jobs.db
   ```

### 5. Deploy!

Railway will automatically deploy your app. You can watch the build logs in real-time.

The deployment process will:
1. Install dependencies
2. Run `npm run db:init` (creates database and seeds default data)
3. Build the Next.js app
4. Start the production server

### 6. Update Base URL

After deployment completes:

1. Copy your Railway app URL (e.g., `https://jobs-production-abc123.up.railway.app`)
2. Update the `NEXT_PUBLIC_BASE_URL` environment variable to this URL
3. Railway will automatically redeploy

### 7. Access Your App

Visit your Railway URL and you should see your job search dashboard!

## Troubleshooting

### Build Fails

Check the build logs in Railway. Common issues:
- Missing environment variables
- TypeScript errors (run `npm run build` locally first)

### Database Not Persisting

Make sure:
- Volume is mounted to `/app/data`
- `DATABASE_URL` points to `/app/data/jobs.db`

### Search Not Working

Check environment variables:
- `GOOGLE_API_KEY` is set correctly
- `GOOGLE_SEARCH_ENGINE_ID` is set correctly
- `NEXT_PUBLIC_BASE_URL` matches your Railway domain

## Updating Your Deployment

When you make changes:

```bash
git add .
git commit -m "Your changes"
git push
```

Railway will automatically redeploy with your changes.

## Cost

Railway offers:
- **Free tier**: $5 credit/month (good for testing)
- **Hobby tier**: $5/month for more resources

Your app should comfortably run on the free tier for personal use.

## Alternative: Quick Deploy Button

You can also add a "Deploy on Railway" button to your README:

```markdown
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/XXXXX)
```

This allows one-click deployment for others!
