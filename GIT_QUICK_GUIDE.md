# Git Quick Reference - AIncome Project

## 🚀 Most Common Commands (Copy & Paste!)

### Starting a New Feature
```bash
git checkout develop
git checkout -b feature/my-new-feature
# Work on your feature...
git add .
git commit -m "Description of changes"
git push -u origin feature/my-new-feature
```

### Feature Works! Merge It
```bash
git checkout develop
git merge feature/my-new-feature
git push origin develop

# Clean up
git branch -d feature/my-new-feature
```

### Feature Doesn't Work! Delete It
```bash
git checkout develop
git branch -D feature/my-new-feature
# That's it! Your code is clean again
```

### Save Your Current Work
```bash
git add .
git commit -m "Your message here"
git push
```

### Check What's Happening
```bash
git status              # What changed?
git branch             # Which branch am I on?
git log --oneline -5   # Last 5 commits
```

---

## 📋 Your Project Structure

```
master              ← Always stable, demo-ready
  └─ develop       ← Merge tested features here
      ├─ feature/voice-input
      ├─ feature/notifications
      └─ feature/...
```

---

## 💡 Common Scenarios

### 1. "I want to try adding voice input again"
```bash
git checkout develop
git checkout -b feature/voice-input-v2
# Try implementing...
# If it works: merge to develop
# If not: git checkout develop && git branch -D feature/voice-input-v2
```

### 2. "I want to update master for a demo"
```bash
# Test develop thoroughly first!
git checkout develop
# ... test everything ...

git checkout master
git merge develop
git push origin master
```

### 3. "Oh no, I broke something!"
```bash
# Throw away all changes
git reset --hard HEAD

# Or go back to previous commit
git reset --hard HEAD~1
```

### 4. "I made changes on wrong branch!"
```bash
# Save your changes to a new branch
git stash
git checkout correct-branch
git stash pop
```

---

## 🎯 Your Current Status

| Branch | Status | Use For |
|--------|--------|---------|
| `master` | ✅ Clean | Demos, stable code |
| `develop` | ✅ Ready | Testing new features |

---

## 📝 Commit Message Tips

### Good Examples:
```
"Add AI chatbot with Gemini"
"Fix: Category not showing in transactions"
"Update: Improve transaction parsing"
"Remove: Voice input feature"
```

### Template:
```
git commit -m "Type: What you did

- Why you did it
- What it fixes/adds"
```

---

## 🔗 GitHub Setup (First Time Only)

### 1. Create GitHub Repo
- Go to github.com
- Click "New repository"
- Name: `AIncome`
- Don't initialize with README (we already have code)

### 2. Connect Your Code
```bash
# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/AIncome.git

# Push all branches
git push -u origin master
git push -u origin develop

# Check it worked
git remote -v
```

### 3. Push Future Changes
```bash
git push  # That's it!
```

---

## 🆘 Emergency Commands

### "Undo last commit (keep changes)"
```bash
git reset HEAD~1
```

### "Undo last commit (delete everything)"
```bash
git reset --hard HEAD~1
```

### "Discard all changes"
```bash
git reset --hard HEAD
```

### "Go back to last pushed version"
```bash
git reset --hard origin/master  # or origin/develop
```

### "I want to start completely fresh"
```bash
git fetch origin
git reset --hard origin/develop
```

---

## 📱 Workflow for This Project

### Daily Development:
```bash
# 1. Start your day
git checkout develop
git pull  # Get latest changes

# 2. New feature?
git checkout -b feature/cool-thing

# 3. Make changes
git add .
git commit -m "Add cool thing"

# 4. Push to backup on GitHub
git push -u origin feature/cool-thing

# 5. Feature done?
git checkout develop
git merge feature/cool-thing
git push origin develop
```

### Before Demo:
```bash
# Make sure develop is solid
git checkout develop
# Test everything!

# Update master
git checkout master
git merge develop
git push origin master

# Demo is ready!
```

---

## 🎓 Learn More

Read `GIT_WORKFLOW.md` for detailed explanations!

---

## ✅ Quick Checklist

Before trying a risky feature:
- [ ] Am I on a feature branch? (`git branch` to check)
- [ ] Is master safe? (Don't work directly on master!)
- [ ] Can I delete this branch if needed?

Before a demo:
- [ ] Is develop thoroughly tested?
- [ ] Did I merge develop to master?
- [ ] Is everything pushed to GitHub?

---

**Pro Tip:** When in doubt, create a new branch! Branches are free and easy to delete. 🎉
