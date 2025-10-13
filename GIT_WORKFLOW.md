# Git Workflow & Branching Strategy

## 🎯 Goal
Avoid messy situations where features are added then need to be removed. Keep the main codebase clean and stable for demos while safely experimenting with new features.

---

## 📊 Branching Strategy

```
master (main)          ← Always stable, demo-ready
  ↓
develop               ← Integration branch
  ↓
feature/voice-input   ← Experimental features
feature/notifications
feature/...
```

### Branch Purposes:

| Branch | Purpose | Status |
|--------|---------|--------|
| `master` | **Production-ready code**. Always works. QR demo ready. | 🟢 Stable |
| `develop` | **Development branch**. Tested features before merging to master. | 🟡 Testing |
| `feature/*` | **New features**. Experiment freely. Can delete if not suitable. | 🔵 Experimental |

---

## 🚀 Common Workflows

### 1. Starting a New Feature

```bash
# Make sure you're on develop
git checkout develop

# Create a new feature branch
git checkout -b feature/voice-input

# Work on your feature...
# (Make commits as you go)

# When done, push to GitHub
git push -u origin feature/voice-input
```

### 2. Feature Works! Merge to Develop

```bash
# Switch to develop
git checkout develop

# Merge the feature
git merge feature/voice-input

# Test everything works

# Push to GitHub
git push origin develop
```

### 3. Feature Doesn't Work! Delete It

```bash
# Just switch back to develop
git checkout develop

# Delete the feature branch
git branch -D feature/voice-input

# Delete from GitHub too (if pushed)
git push origin --delete feature/voice-input

# Done! Your develop branch is clean
```

### 4. Ready for Demo? Merge to Master

```bash
# Make sure develop is stable
git checkout develop
# Test thoroughly

# Switch to master
git checkout master

# Merge develop
git merge develop

# Push to GitHub
git push origin master

# Now master is updated and demo-ready!
```

---

## 💡 Daily Workflow Examples

### Scenario 1: Adding Voice Input Feature

```bash
# Day 1: Start voice feature
git checkout develop
git checkout -b feature/voice-input

# Install package, write code...
git add .
git commit -m "Add voice input package"

# Day 2: Continue work
# ... more coding ...
git commit -m "Implement voice recording UI"

# Day 3: Test on phone
git push -u origin feature/voice-input
# Build and test...

# Result: Doesn't work well with Expo Go!
# Solution: Just delete the branch

git checkout develop
git branch -D feature/voice-input
# Done! No mess in main code
```

### Scenario 2: Adding Push Notifications (Success!)

```bash
# Start feature
git checkout develop
git checkout -b feature/push-notifications

# Implement
git add .
git commit -m "Add push notification setup"
git commit -m "Implement notification handlers"
git commit -m "Test notifications"

# Works great! Merge to develop
git checkout develop
git merge feature/push-notifications

# Test more in develop...
# Still good!

# Merge to master for demo
git checkout master
git merge develop
git push origin master

# Delete the feature branch (no longer needed)
git branch -d feature/push-notifications
```

---

## 📝 Commit Message Best Practices

### Good Commit Messages:
```
✅ "Add AI chatbot with Gemini integration"
✅ "Fix category display bug in transactions"
✅ "Remove voice input feature (incompatible with Expo Go)"
✅ "Update: Improve transaction parsing accuracy"
```

### Bad Commit Messages:
```
❌ "update"
❌ "fix bug"
❌ "changes"
❌ "test"
```

### Format:
```
Type: Short description

- Detail 1
- Detail 2

Optional: Why this change was made
```

---

## 🔄 Keeping Branches Updated

### Update Your Feature Branch with Latest Changes

```bash
# You're on feature/voice-input
# But develop has new changes you need

git checkout develop
git pull origin develop

git checkout feature/voice-input
git merge develop

# or use rebase for cleaner history
git rebase develop
```

---

## 🗺️ Current Branch Structure

### Setup (Run these once):

```bash
# Create develop branch
git checkout -b develop
git push -u origin develop

# Go back to master
git checkout master
```

Now you have:
- `master` - Your clean baseline (current code)
- `develop` - For integrating features

---

## 🎓 Learn Git: Quick Commands

### Check Where You Are:
```bash
git branch          # List branches (* shows current)
git status          # What changed?
git log --oneline   # Recent commits
```

### Switch Branches:
```bash
git checkout master     # Go to master
git checkout develop    # Go to develop
git checkout -b feature/new  # Create & switch to new branch
```

### Make Changes:
```bash
git add .              # Stage all changes
git add file.tsx       # Stage specific file
git commit -m "msg"    # Commit with message
git push               # Upload to GitHub
```

### Undo Mistakes:
```bash
git restore file.tsx          # Discard changes in file
git reset HEAD~1              # Undo last commit (keep changes)
git reset --hard HEAD~1       # Undo last commit (delete changes)
git checkout develop          # Abandon current branch
git branch -D feature/bad     # Delete unwanted branch
```

---

## 🚨 Emergency: "I Messed Up!"

### Scenario: "I made changes on master by accident!"
```bash
# Save your changes to a new branch
git checkout -b feature/accidental-changes

# Go back to master
git checkout master

# Reset master to last commit
git reset --hard origin/master

# Now your changes are safely in feature/accidental-changes
```

### Scenario: "I want to start over from last commit!"
```bash
# Discard ALL changes
git reset --hard HEAD

# Or start fresh from remote
git fetch origin
git reset --hard origin/master
```

---

## 📁 Recommended Branch Names

### Features:
- `feature/voice-input`
- `feature/push-notifications`
- `feature/dark-mode`
- `feature/export-csv`

### Fixes:
- `fix/category-bug`
- `fix/login-crash`
- `fix/memory-leak`

### Improvements:
- `improve/ui-design`
- `improve/performance`
- `improve/error-messages`

### Experiments:
- `experiment/new-ai-model`
- `experiment/offline-mode`
- `test/large-transactions`

---

## 🎯 Your Current Situation

### What You Have Now:
```
master (697a2ee)
  ↓
  Clean working version
  - All core features
  - AI chatbot
  - QR demo ready
```

### What to Do Next:

```bash
# 1. Create develop branch
git checkout -b develop
git push -u origin develop

# 2. For new features, branch from develop
git checkout develop
git checkout -b feature/voice-input

# 3. Work safely without affecting master!
```

---

## 📚 Useful Resources

- **Git Cheat Sheet**: https://training.github.com/downloads/github-git-cheat-sheet.pdf
- **Learn Git Branching**: https://learngitbranching.js.org/
- **Visualize Git**: https://git-school.github.io/visualizing-git/

---

## ✅ Checklist for This Project

- [x] Initialize Git
- [x] Make first commit (clean baseline)
- [ ] Create develop branch
- [ ] Push to GitHub
- [ ] Create feature branch for experiments
- [ ] Practice workflow!

---

**Remember:** The beauty of Git is you can experiment freely. If something doesn't work, just delete the branch and your main code is untouched! 🎉
