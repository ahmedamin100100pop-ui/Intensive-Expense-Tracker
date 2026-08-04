# Intensive — Personal Finance Tracker

A bilingual (English / Arabic) mobile expense-tracking app built with **Expo / React Native**.  
Track spending, set budgets, gain AI-powered insights, and export your data — all with a clean, RTL-aware UI.

---

## Features

| Area | Details |
|---|---|
| **Dashboard** | Daily spending summary, recent transactions, quick-add FAB |
| **Expenses & Income** | Add entries with category, amount, note, and date |
| **All Transactions** | Searchable, filterable list — by type, date range, category, and sort order |
| **Budget** | Monthly budget card with per-category breakdown and progress bars |
| **Analytics** | Donut chart, category breakdown, and line chart; switch between Expense and Income view |
| **Smart Insights** | Rule-based insights (weekend splurges, late-night spending, category spikes, etc.) |
| **PDF Reports** | Tap any insight to generate a shareable PDF summary |
| **Auto Backup** | Configurable silent export (Off / Daily / Weekly / Monthly) to local device storage |
| **Manual Export / Import** | JSON backup and restore via the device file picker |
| **Security** | PIN lock + biometric (Face ID / fingerprint) with security-question recovery |
| **Localisation** | Full English and Arabic (RTL layout, Arabic-positioned currency symbols) |
| **Notifications** | Daily spending reminders and budget-threshold alerts |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) ~54, React Native 0.81 |
| Navigation | Expo Router v6 (file-based) |
| State | React Context + AsyncStorage |
| Styling | StyleSheet (no Tailwind), expo-linear-gradient |
| Charts | Custom SVG (`react-native-svg`) |
| PDF | `expo-print` + `expo-sharing` |
| Auth | `expo-local-authentication` (biometrics), `expo-secure-store` (PIN) |
| Notifications | `expo-notifications` |
| File I/O | `expo-file-system`, `expo-document-picker` |
| Fonts | Inter (Latin) + Cairo (Arabic) via `@expo-google-fonts` |
| Language | TypeScript 5.9 |

---

## Project Structure

```
artifacts/mobile/
├── app/                   # Expo Router screens
│   ├── (tabs)/            # Bottom-tab screens (Home, Analytics, Budget, Insights)
│   ├── _layout.tsx        # Root layout, security gate, managers
│   ├── onboarding.tsx     # First-run setup (name, currency, country)
│   ├── settings.tsx       # App settings + auto-backup config
│   ├── transactions.tsx   # Full transaction history with filters
│   └── report.tsx         # PDF report viewer
├── components/            # Shared UI components
├── constants/
│   ├── translations.ts    # All EN + AR strings
│   └── colors.ts
├── context/               # AppContext (expenses, profile, language)
├── hooks/                 # Custom hooks
└── utils/
    ├── autoExport.ts      # Silent scheduled backup logic
    ├── dataBackup.ts      # Manual export / import helpers
    ├── generatePDF.ts     # PDF generation
    ├── notifications.ts   # Notification scheduling
    └── smartBudgetEngine.ts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Expo Go app on your device **or** an iOS/Android simulator

### Install

```bash
pnpm install
```

### Run (development)

```bash
pnpm --filter @workspace/mobile run dev
```

Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS).

### Build for production (EAS)

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

> Requires an [Expo account](https://expo.dev) and EAS CLI (`npm i -g eas-cli`).  
> Update `owner` and `projectId` in `artifacts/mobile/app.json` with your own EAS project.

---

## Localisation

The app ships with two locales:

| Code | Language | Direction |
|---|---|---|
| `en` | English | LTR |
| `ar` | Arabic | RTL |

All strings live in `constants/translations.ts`.  
Currency symbols are positioned based on locale: `$150` (EN) vs `150ر.س` (AR).

---

## Data & Privacy

All data is stored **locally on the device** using AsyncStorage and SecureStore.  
No backend, no analytics SDK, no telemetry.

---

## License

MIT
