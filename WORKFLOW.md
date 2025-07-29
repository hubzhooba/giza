# Development Workflow with GitHub + Vercel + Railway

## 🔄 Your New Workflow

### 1. **Always Work in Feature Branches**
```bash
# Create a new branch for your feature/fix
git checkout -b feature/add-email-notifications
# or
git checkout -b fix/login-persistence
```

### 2. **Develop and Test Locally**
```bash
# Start development servers
npm run dev

# Make your changes
# Test thoroughly at:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001
```

### 3. **Commit Changes Frequently**
```bash
# Stage and commit your changes
git add .
git commit -m "Add email notification service"

# Push to your feature branch
git push origin feature/add-email-notifications
```

### 4. **Create a Pull Request**
- Go to https://github.com/hubzhooba/giza
- Click "Pull requests" → "New pull request"
- Select your feature branch
- Review changes
- Create PR

### 5. **Preview Deployments**
- **Vercel**: Automatically creates preview URLs for each PR
- **Railway**: Can set up preview environments
- Test your changes in production-like environment

### 6. **Merge to Main**
- Once tested and working, merge the PR
- This triggers automatic deployment to:
  - Vercel (frontend)
  - Railway (backend)

## 🎯 Best Practices

### Daily Workflow Example:
```bash
# Start your day
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/contract-templates

# Work on your feature
npm run dev
# ... make changes ...

# Test everything locally
# - Create contracts
# - Test login/logout
# - Check responsive design

# Commit your work
git add .
git commit -m "Add contract template selection"
git push origin feature/contract-templates

# Create PR on GitHub
# Wait for preview deployments
# Test in preview environment
# Merge when ready
```

### Environment Variables Management:
```bash
# Local development
# Edit client/.env.local for frontend
# Edit server/.env for backend

# Production (set in Vercel/Railway dashboards)
# Never commit .env files!
```

### Quick Commands:
```bash
# Check current branch
git branch

# See what's changed
git status

# View commit history
git log --oneline

# Switch branches
git checkout branch-name

# Update from main
git checkout main
git pull
git checkout your-branch
git merge main
```

## 🚨 Emergency Rollback

If something breaks in production:

### Option 1: Quick Revert
```bash
# On GitHub, find the bad commit
# Click "Revert" button
# Merge the revert PR
```

### Option 2: Manual Rollback
```bash
git checkout main
git pull
git log --oneline
# Find the last good commit hash
git revert HEAD
git push origin main
```

### Option 3: Vercel/Railway Dashboard
- Both services keep deployment history
- Can instantly rollback to previous deployment

## 🔍 Debugging Production Issues

1. **Check Logs**:
   - Vercel: Functions tab → View logs
   - Railway: Service → View logs

2. **Environment Variables**:
   - Verify all env vars are set in production
   - Common issue: Missing DATABASE_URL or API keys

3. **Test in Preview First**:
   - Always test in PR preview before merging

## 📋 Checklist Before Merging

- [ ] Tested locally
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Loading states work
- [ ] Error handling works
- [ ] Tested in preview deployment
- [ ] Updated documentation if needed

## 🎉 Your Simplified Workflow

1. **Branch** → 2. **Code** → 3. **Test Local** → 4. **Push** → 5. **Test Preview** → 6. **Merge** → 7. **Auto Deploy**

No more manual deployments! 🚀