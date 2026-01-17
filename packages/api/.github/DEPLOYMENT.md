# Deployment Setup Guide - Namecheap Hosting

This repository is configured to automatically deploy to your Namecheap Node.js hosting when changes are pushed to the `main` branch.

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### FTP Configuration (for Namecheap)

- `FTP_SERVER` - Your Namecheap FTP server hostname (e.g., `server123.web-hosting.com`)
  - Find this in: cPanel → Files → FTP Accounts
- `FTP_USERNAME` - Your cPanel username or FTP account username
- `FTP_PASSWORD` - Your cPanel password or FTP account password

### SSH Configuration (for Namecheap)

- `SSH_HOST` - Same as FTP_SERVER (e.g., `server123.web-hosting.com`)
- `SSH_USERNAME` - Same as FTP_USERNAME (your cPanel username)
- `SSH_PASSWORD` - Same as FTP_PASSWORD (your cPanel password)
- `APP_DIRECTORY` - Application folder name (e.g., `bt_api` - defaults to `bt_api` if not set)

### Database Configuration (Optional - if using remote DB)

- `DATABASE_URL` - Full database connection string
- Or individual values:
  - `DB_HOST` - Database host (usually `localhost` on Namecheap)
  - `DB_PORT` - Database port (usually `5432` for PostgreSQL)
  - `DB_NAME` - Database name (created in cPanel → Databases)
  - `DB_USER` - Database username
  - `DB_PASSWORD` - Database password

## Namecheap-Specific Setup

### 1. Setup Node.js Application in cPanel

Before deploying, configure your Node.js app in Namecheap cPanel:

1. Log into cPanel
2. Go to **Software → Setup Node.js App**
3. Click **Create Application**
4. Configure:
   - **Node.js version**: Select latest available (14.x or higher)
   - **Application mode**: Production
   - **Application root**: `bt_api` (or your preferred folder name)
   - **Application URL**: Your domain or subdomain (e.g., `api.yourdomain.com`)
   - **Application startup file**: `dist/server.js`
   - **Environment variables**: Add your `.env` variables here

5. Click **Create**

### 2. Set Environment Variables in cPanel

In the Node.js App setup, add your environment variables:
- `PORT` - The port assigned by Namecheap (usually shown in the app setup)
- `DB_HOST` - Usually `localhost`
- `DB_PORT` - `5432`
- `DB_NAME` - Your database name
- `DB_USER` - Your database username
- `DB_PASSWORD` - Your database password
- `JWT_SECRET` - Your JWT secret
- Any other environment variables your app needs

### 3. Database Migrations (Optional)

If you have database migrations, edit [.github/workflows/deploy.yml](.github/workflows/deploy.yml) line 70:

Uncomment and update:
```yaml
# npm run migrate
```

To your actual migration command:
- `npm run migrate`
- `npx knex migrate:latest`
- `npx prisma migrate deploy`

## Workflow Triggers

The deployment workflow runs:
- Automatically when code is pushed to the `main` branch
- Manually via the GitHub Actions UI (workflow_dispatch)

## What Gets Deployed

1. TypeScript code is compiled to JavaScript (`npm run build`)
2. The `dist` folder with compiled code
3. `package.json` and `package-lock.json`
4. Production dependencies installed on server via SSH

## Deployment Process

1. **Build** - Code is compiled on GitHub servers
2. **Deploy** - Files uploaded via FTP to your Namecheap hosting
3. **Install** - Production dependencies installed via SSH
4. **Auto-restart** - Namecheap automatically restarts your Node.js app when files change

## Testing the Deployment

1. **Setup cPanel first** (see Namecheap-Specific Setup above)
2. **Configure GitHub Secrets** (Settings → Secrets and variables → Actions)
3. **Push to main** or manually trigger workflow
4. **Monitor** in GitHub Actions tab
5. **Verify** your app at the configured Application URL

## Quick Start Checklist

- [ ] Create Node.js app in cPanel (Software → Setup Node.js App)
- [ ] Set environment variables in cPanel Node.js app settings
- [ ] Add GitHub Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
- [ ] Add GitHub Secrets: `SSH_HOST`, `SSH_USERNAME`, `SSH_PASSWORD`
- [ ] (Optional) Set `APP_DIRECTORY` secret if not using `bt_api`
- [ ] Push to main branch to trigger first deployment
- [ ] Check GitHub Actions for deployment status
- [ ] Visit your Application URL to verify

## Troubleshooting

**FTP Connection Issues:**
- Verify FTP credentials in cPanel → FTP Accounts
- Ensure FTPS (port 21) is enabled
- Check that your IP isn't blocked in cPanel → IP Blocker

**SSH Connection Issues:**
- Namecheap SSH uses port `21098` (already configured in workflow)
- Verify SSH access is enabled in your hosting plan
- Test SSH manually: `ssh -p 21098 username@server.web-hosting.com`

**Application Not Starting:**
- Check Node.js app status in cPanel → Setup Node.js App
- Click "Restart" button in cPanel
- Verify `Application startup file` is set to `dist/server.js`
- Check environment variables are properly set in cPanel
- Review application logs in cPanel

**Database Connection Issues:**
- Use `localhost` as DB_HOST for Namecheap databases
- Ensure database and user are created in cPanel → Databases
- Verify database credentials in environment variables
