# Ledger - Simple Finance Tracker

A minimal, mobile-first finance tracking app for managing loans, interest, and payments. Built for Indian businesses and individuals.

![Ledger App](https://img.shields.io/badge/Version-1.0-black) ![No Backend](https://img.shields.io/badge/Backend-None-green) ![Mobile First](https://img.shields.io/badge/Design-Mobile%20First-blue)

## ✨ Features

### Core Functionality
- ✅ **One-time entry** - Create loan once, everything auto-calculates
- ✅ **Smart Interest** - Correct monthly/daily calculation (5% monthly = 5% per month, not per day)
- ✅ **Payment Types** - Principal only, Interest only, or Both (auto-split)
- ✅ **Real-time updates** - Balance, interest, dues update instantly
- ✅ **Custom dates** - Set any start date and due date

### Interest Calculation (FIXED)
- **Monthly 5%**: On ₹50,000 = ₹2,500/month = ₹83.33/day
- **Daily 0.1%**: On ₹50,000 = ₹50/day
- Shows daily accrual, total interest, days elapsed
- Correct reducing balance method

### Reminders
- Set daily/weekly/monthly reminders
- Choose time (e.g., 9:00 AM)
- Set alert days before due date
- Works via browser notifications
- **Note**: For GitHub Pages, reminders work only when app is open. For SMS/WhatsApp, need backend API.

### Mobile-First Design
- Clean, minimal interface (no shiny gradients)
- Bright white theme + dark mode
- Bottom navigation for thumb access
- Fast, lightweight (< 200KB)
- Works offline

### Data Management
- ✅ Add/Edit/Delete customers
- ✅ Excel export with all calculations
- ✅ Local storage (no account needed)
- ✅ Clear all data option
- ✅ Search and filters

## 🚀 Deploy to GitHub Pages (Free, 24/7)

### Method 1: Quick Deploy
1. **Build the app:**
   ```bash
   npm install
   npm run build
   ```

2. **Create GitHub repo:**
   - Go to github.com/new
   - Name it `ledger` (or anything)
   - Make it public

3. **Upload:**
   ```bash
   git init
   git add dist/index.html
   git commit -m "Initial"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ledger.git
   git push -u origin main
   ```

4. **Enable Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from branch
   - Branch: main, Folder: / (root)
   - Save

5. **Wait 2 minutes**, then visit:
   ```
   https://YOUR_USERNAME.github.io/ledger/
   ```

Your app is now live 24/7, free forever!

### Method 2: Using gh-pages (Automatic)
```bash
npm install -g gh-pages
npm run build
gh-pages -d dist
```

## 📱 How to Use

### Adding a Customer
1. Tap **+** button
2. Enter name, phone, principal amount
3. Choose interest type:
   - **Monthly**: Enter 5 for 5% per month
   - **Daily**: Enter 0.1 for 0.1% per day
4. Set start date and due date
5. Save

### Recording Payment
1. Open customer
2. Tap "Record Payment"
3. Enter amount and date
4. Choose type:
   - **Both**: Auto-splits (70% principal, 30% interest)
   - **Principal**: Reduces loan amount only
   - **Interest**: Pays interest only
5. Save - everything recalculates automatically

### Reminders
1. Open customer → scroll to Reminders
2. Toggle ON
3. Set frequency (daily/weekly/monthly)
4. Set time (e.g., 09:00)
5. Set "alert before" days

**Important**: On GitHub Pages, reminders only work when:
- App is open in browser
- You granted notification permission
- For background reminders, you need a backend server

## 🔧 For Advanced Reminders (SMS/WhatsApp)

Current app uses browser notifications only. For real SMS reminders:

1. **Add a backend** (Node.js + Express)
2. **Use Twilio** for SMS or WhatsApp API
3. **Set up cron jobs** to check due dates daily
4. **Store reminders** in database

Example backend endpoint:
```javascript
// Check daily at 9 AM
cron.schedule('0 9 * * *', () => {
  customers.forEach(c => {
    if (shouldRemind(c)) {
      twilio.sendSMS(c.phone, `Reminder: Payment due for ${c.name}`);
    }
  });
});
```

## 📊 Excel Export

Exports include:
- Customer name & phone
- Principal, rate, type
- Start date, due date
- Total paid, principal paid, interest paid
- Remaining principal & interest
- Total payable
- Days elapsed
- Status (Active/Overdue/Paid)

## 🎨 Design

- **Colors**: Pure black/white, minimal grays
- **No gradients**: Clean, professional
- **Mobile-first**: 390px optimized
- **Fast**: No heavy animations
- **Accessible**: High contrast, large touch targets

## 🛠 Tech Stack

- React 19 + TypeScript
- Tailwind CSS v4
- Vite (single-file build)
- SheetJS (Excel export)
- date-fns
- LocalStorage (no backend)

## 📝 License

Free to use, modify, and deploy. No attribution required.

## 🤝 Contributing

1. Fork the repo
2. Make changes
3. Test on mobile
4. Submit PR

---

**Made for Indian businesses** 🇮🇳 | Works offline | No tracking | 100% private