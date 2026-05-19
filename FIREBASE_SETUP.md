# 🔥 Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [firebase.google.com](https://firebase.google.com)
2. Click **"Go to Console"** → **"Add Project"**
3. Name: `ledger-app` (or anything)
4. Enable Google Analytics (optional)
5. Click **Create Project**

## Step 2: Enable Authentication

1. In Firebase Console, click **Build** → **Authentication**
2. Click **Get Started**
3. Click **Email/Password** → Enable it → **Save**

## Step 3: Create Firestore Database

1. Click **Build** → **Firestore Database**
2. Click **Create Database**
3. Choose **Start in Test Mode** (for now)
4. Select location: `asia-south1` (Mumbai) for India
5. Click **Enable**

## Step 4: Get Config

1. Click **Project Settings** (gear icon)
2. Scroll to **"Your apps"** → Click **Web** (`</>`)
3. Register app: `Ledger Web App`
4. Copy the `firebaseConfig` object

## Step 5: Update Config in App

Open `src/firebase.ts` and replace:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

With your actual config from Firebase.

## Step 6: Set Firestore Rules (Important!)

Go to **Firestore Database** → **Rules** → Replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{customerId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

This ensures users can ONLY see their own data.

## Step 7: Build & Deploy

```bash
npm run build
```

Upload `dist/index.html` to GitHub Pages.

---

## ✅ Features Now Available:

- ✅ **Username/Password Login**
- ✅ **Cloud Sync** - Data saved on Firebase
- ✅ **Multi-Device** - Login from any phone, same data
- ✅ **Secure** - Each user sees only their data
- ✅ **Free** - 5GB storage, 50K users/month free
- ✅ **24/7** - GitHub Pages hosts app, Firebase stores data

---

## 📱 How Users Access:

1. Open `yourname.github.io/ledger`
2. **New user?** → Click "Create Account" → Enter email/password
3. **Existing user?** → Enter email/password → Sign In
4. Data syncs automatically across all devices!

---

## 🔐 Security:

- Passwords encrypted by Firebase
- Data private to each user
- HTTPS enabled automatically
- No data visible to you (app owner)

---

## 💰 Cost:

**FREE TIER:**
- 5GB storage (≈ 50,000 customers)
- 50,000 monthly active users
- Unlimited reads/writes (within limits)

**Paid:** Only if you exceed free limits (very unlikely for small business)