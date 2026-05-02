import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { Category, Expense, UserProfile } from "@/context/AppContext";

const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food", transport: "Transport", shopping: "Shopping",
  rent: "Rent", bills: "Bills", health: "Health",
  entertainment: "Entertainment", education: "Education",
  travel: "Travel", family: "Family", other: "Other",
};

const CATEGORY_COLORS: Record<Category, string> = {
  food: "#F97316", transport: "#3B82F6", shopping: "#EC4899",
  rent: "#6366F1", bills: "#EAB308", health: "#EF4444",
  entertainment: "#8B5CF6", education: "#14B8A6", travel: "#06B6D4",
  family: "#10B981", other: "#6B7280",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", card: "Card", bank: "Bank Transfer", wallet: "Wallet",
};

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface PDFOptions {
  expenses: Expense[];
  userProfile: UserProfile | null;
  periodLabel: string;
  periodType: "day" | "month" | "year";
  monthlyData?: { label: string; amount: number }[];
}

export async function generateAndSharePDF(opts: PDFOptions): Promise<void> {
  const { expenses, userProfile, periodLabel, periodType, monthlyData } = opts;
  const userName = userProfile?.name?.trim() || "Intensive User";
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Category totals
  const catTotals: Partial<Record<Category, number>> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount;
  });
  const sortedCats = (Object.entries(catTotals) as [Category, number][])
    .sort((a, b) => b[1] - a[1]);

  const avgDaily = (() => {
    if (expenses.length === 0) return 0;
    const dates = new Set(expenses.map((e) => e.date));
    return total / dates.size;
  })();

  const topCat = sortedCats[0]?.[0];
  const generatedAt = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  // Build category rows HTML
  const categoryRowsHTML = sortedCats.map(([cat, amount]) => {
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const color = CATEGORY_COLORS[cat];
    return `
      <div class="cat-row">
        <div class="cat-header">
          <div class="cat-name">
            <span class="cat-dot" style="background:${color}"></span>
            ${CATEGORY_LABELS[cat]}
          </div>
          <div class="cat-right">
            <span class="cat-amount">${formatCurrency(amount)}</span>
            <span class="cat-pct">${pct.toFixed(1)}%</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join("");

  // Build expense table rows
  const expenseRowsHTML = expenses
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e, i) => {
      const color = CATEGORY_COLORS[e.category];
      const rowClass = i % 2 === 1 ? 'class="row-alt"' : "";
      return `
        <tr ${rowClass}>
          <td>${formatDate(e.date)}</td>
          <td>
            <span class="badge" style="background:${color}22;color:${color}">
              ${CATEGORY_LABELS[e.category]}
            </span>
          </td>
          <td>${e.note || "—"}</td>
          <td>${PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod}</td>
          <td class="td-amount">${formatCurrency(e.amount)}</td>
        </tr>`;
    }).join("");

  // Monthly bar chart HTML (for month/year views)
  let barChartHTML = "";
  if (monthlyData && monthlyData.length > 0) {
    const maxVal = Math.max(...monthlyData.map((d) => d.amount), 1);
    const bars = monthlyData.map((d) => {
      const heightPct = Math.max((d.amount / maxVal) * 100, 3);
      return `
        <div class="bar-col">
          <div class="bar-val">${d.amount >= 1000 ? `$${(d.amount / 1000).toFixed(1)}k` : `$${d.amount.toFixed(0)}`}</div>
          <div class="bar-fill" style="height:${heightPct}%;background:#4F46E5;opacity:${d.amount === maxVal ? 1 : 0.55}"></div>
          <div class="bar-label">${d.label}</div>
        </div>`;
    }).join("");
    barChartHTML = `
      <div class="section">
        <div class="section-title">Spending over time</div>
        <div class="bar-chart">${bars}</div>
      </div>`;
  }

  // Stats
  const statsHTML = `
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${formatCurrency(total)}</div>
        <div class="stat-label">Total Spent</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${expenses.length}</div>
        <div class="stat-label">Transactions</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${formatCurrency(avgDaily)}</div>
        <div class="stat-label">Avg per Day</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${topCat ? CATEGORY_LABELS[topCat] : "—"}</div>
        <div class="stat-label">Top Category</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${sortedCats.length}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${topCat ? formatCurrency(catTotals[topCat] ?? 0) : "—"}</div>
        <div class="stat-label">Top Spent</div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;background:#F0F0F8;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{background:#fff;max-width:720px;margin:0 auto;min-height:100vh}

  /* HEADER */
  .header{background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:48px 40px 40px;position:relative;overflow:hidden}
  .header::after{content:'';position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,0.07)}
  .header::before{content:'';position:absolute;right:40px;bottom:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.05)}
  .header-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.15);padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.9);margin-bottom:20px}
  .header-dot{width:6px;height:6px;border-radius:50%;background:#A5F3FC}
  .header-name{color:#fff;font-size:30px;font-weight:800;letter-spacing:-0.5px;margin-bottom:2px}
  .header-period{color:rgba(255,255,255,0.7);font-size:14px;margin-bottom:28px}
  .header-amount{color:#fff;font-size:56px;font-weight:900;letter-spacing:-2px;line-height:1;margin-bottom:6px}
  .header-sublabel{color:rgba(255,255,255,0.65);font-size:13px}

  /* CONTENT */
  .content{padding:36px 40px}

  /* SECTION */
  .section{margin-bottom:32px}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9CA3AF;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #F3F4F6}

  /* STATS */
  .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:0}
  .stat-box{background:#F6F6FB;border-radius:12px;padding:18px 16px;text-align:center}
  .stat-value{font-size:18px;font-weight:800;color:#4F46E5;margin-bottom:4px;line-height:1.2}
  .stat-label{font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px}

  /* CATEGORIES */
  .cat-row{margin-bottom:14px}
  .cat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .cat-name{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#111827}
  .cat-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .cat-right{display:flex;align-items:center;gap:8px}
  .cat-amount{font-size:13px;font-weight:700;color:#111827}
  .cat-pct{font-size:11px;color:#9CA3AF;font-weight:500}
  .progress-track{height:7px;background:#F3F4F6;border-radius:4px;overflow:hidden}
  .progress-fill{height:100%;border-radius:4px}

  /* BAR CHART */
  .bar-chart{display:flex;align-items:flex-end;gap:6px;height:120px;padding-bottom:4px}
  .bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}
  .bar-val{font-size:8px;color:#6B7280;font-weight:600;text-align:center;flex-shrink:0}
  .bar-fill{width:100%;border-radius:4px 4px 0 0;flex-shrink:0}
  .bar-label{font-size:8px;color:#9CA3AF;text-align:center;flex-shrink:0;font-weight:500}

  /* TABLE */
  .table-wrap{overflow:hidden;border-radius:12px;border:1px solid #F3F4F6}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9CA3AF;padding:12px 14px;text-align:left;background:#FAFAFA;border-bottom:1px solid #F3F4F6}
  td{padding:11px 14px;border-bottom:1px solid #F9FAFB;color:#374151;vertical-align:middle}
  .row-alt td{background:#FAFAFA}
  tr:last-child td{border-bottom:none}
  .td-amount{font-weight:700;text-align:right;color:#111827;font-size:13px}
  .badge{display:inline-block;padding:3px 9px;border-radius:10px;font-size:10px;font-weight:700}

  /* FOOTER */
  .footer{background:#F6F6FB;padding:24px 40px;text-align:center;border-top:1px solid #EBEBF8}
  .footer-text{font-size:11px;color:#9CA3AF}
  .footer-brand{font-weight:700;color:#4F46E5}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-eyebrow">
      <span class="header-dot"></span>
      Intensive · Spending Report
    </div>
    <div class="header-name">${userName}</div>
    <div class="header-period">${periodLabel}</div>
    <div class="header-amount">${formatCurrency(total)}</div>
    <div class="header-sublabel">Total spent in this period</div>
  </div>

  <div class="content">

    <div class="section">
      <div class="section-title">Summary</div>
      ${statsHTML}
    </div>

    ${barChartHTML}

    ${sortedCats.length > 0 ? `
    <div class="section">
      <div class="section-title">Spending by category</div>
      ${categoryRowsHTML}
    </div>` : ""}

    ${expenses.length > 0 ? `
    <div class="section">
      <div class="section-title">All transactions (${expenses.length})</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Note</th>
              <th>Method</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHTML}
          </tbody>
        </table>
      </div>
    </div>` : ""}

  </div>

  <div class="footer">
    <div class="footer-text">Generated by <span class="footer-brand">Intensive</span> · ${generatedAt}</div>
  </div>

</div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Intensive Report – ${periodLabel}`,
      UTI: "com.adobe.pdf",
    });
  }
}
