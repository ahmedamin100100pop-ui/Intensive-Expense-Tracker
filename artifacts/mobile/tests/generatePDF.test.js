const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");

const mobileDir = path.resolve(__dirname, "..");
const buildDir = mkdtempSync(path.join(tmpdir(), "rasheed-pdf-"));

execFileSync("pnpm", [
  "exec",
  "tsc",
  "utils/generatePDF.ts",
  "--target",
  "ES2022",
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--esModuleInterop",
  "--skipLibCheck",
  "--jsx",
  "react",
  "--outDir",
  buildDir,
], { cwd: mobileDir, stdio: "pipe" });

const platform = { OS: "ios" };
const printCalls = [];
const shareCalls = [];
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "react-native") return { Platform: platform };
  if (request === "expo-print") {
    return {
      printToFileAsync: async (options) => {
        printCalls.push(options);
        return { uri: "file:///tmp/rasheed-report.pdf" };
      },
    };
  }
  if (request === "expo-sharing") {
    return {
      isAvailableAsync: async () => true,
      shareAsync: async (...args) => {
        shareCalls.push(args);
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { generateAndSharePDF, renderPDFHTML } = require(path.join(buildDir, "utils", "generatePDF.js"));

function countBodyRows(html) {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
  return (body.match(/<tr\b/g) || []).length;
}

function getCssRule(html, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`${escapedSelector}\\{([^}]*)\\}`))?.[1] || "";
}

test.after(() => {
  Module._load = originalLoad;
  rmSync(buildDir, { recursive: true, force: true });
});

const englishProfile = {
  name: "Amina",
  monthlyIncome: 5000,
  monthlyBudget: 1000,
  savingsGoal: 500,
  selectedGoal: "save",
  onboardingComplete: true,
  countryCode: "us",
};

const arabicProfile = {
  name: "أمينة",
  monthlyIncome: 8000,
  monthlyBudget: 1200,
  savingsGoal: 600,
  selectedGoal: "track-budget",
  onboardingComplete: true,
  countryCode: "sa",
};

const englishExpenses = [
  { id: "en-1", amount: 42.5, category: "food", date: "2026-08-04", note: "Grocery run", paymentMethod: "card", createdAt: "2026-08-04T09:00:00Z" },
  { id: "en-2", amount: 18, category: "transport", date: "2026-08-02", note: "Train ticket", paymentMethod: "cash", createdAt: "2026-08-02T09:00:00Z" },
  { id: "en-3", amount: 75, category: "shopping", date: "2026-08-09", note: "Household supplies", paymentMethod: "bank", createdAt: "2026-08-09T09:00:00Z" },
  { id: "en-4", amount: 12, category: "food", date: "2026-08-04", note: "Lunch", paymentMethod: "wallet", createdAt: "2026-08-04T13:00:00Z" },
];

const arabicExpenses = [
  { id: "ar-1", amount: 320, category: "rent", date: "2026-08-01", note: "إيجار المنزل", paymentMethod: "bank", createdAt: "2026-08-01T09:00:00Z" },
  { id: "ar-2", amount: 85.5, category: "food", date: "2026-08-03", note: "مشتريات البقالة", paymentMethod: "card", createdAt: "2026-08-03T10:00:00Z" },
  { id: "ar-3", amount: 45, category: "transport", date: "2026-08-05", note: "رحلة", paymentMethod: "cash", createdAt: "2026-08-05T10:00:00Z" },
];

const largeReportExpenses = Array.from({ length: 144 }, (_, index) => {
  const month = String((index % 9) + 1).padStart(2, "0");
  const day = String((index % 27) + 1).padStart(2, "0");
  const categories = ["food", "transport", "shopping", "rent", "bills", "health", "entertainment", "education", "travel", "family", "other"];
  const category = categories[index % categories.length];

  return {
    id: `long-${index + 1}`,
    amount: 10 + index * 3.25,
    category,
    date: `2026-${month}-${day}`,
    note: `Long report transaction ${String(index + 1).padStart(3, "0")} with a deliberately extended note`,
    paymentMethod: ["cash", "card", "bank", "wallet"][index % 4],
    createdAt: `2026-${month}-${day}T09:00:00Z`,
  };
});

test("English fixture renders the complete LTR report contract", () => {
  const html = renderPDFHTML({
    expenses: englishExpenses,
    userProfile: englishProfile,
    language: "en",
    periodLabel: "August 2026",
    periodType: "month",
    monthlyData: [
      { label: "Jun", amount: 380 },
      { label: "Jul", amount: 520 },
      { label: "Aug", amount: 147.5 },
    ],
  });

  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en" dir="ltr">/);
  for (const section of ["Summary", "Analysis", "Spending over time", "Spending by category", "All transactions (4)"]) {
    assert.ok(html.includes(section), `missing English section: ${section}`);
  }
  for (const label of ["Date", "Category", "Note", "Method", "Amount", "Food", "Transport", "Shopping", "Bank Transfer", "Grocery run", "Household supplies"]) {
    assert.ok(html.includes(label), `missing English label or row value: ${label}`);
  }
  for (const expense of englishExpenses) {
    assert.ok(html.includes(expense.note), `missing English transaction row: ${expense.note}`);
  }
  for (const point of [{ label: "Jun" }, { label: "Jul" }, { label: "Aug" }]) {
    assert.ok(html.includes(point.label), `missing English chart label: ${point.label}`);
  }
  assert.equal((html.match(/<tbody>/g) || []).length, 1);
  assert.equal(countBodyRows(html), englishExpenses.length);
  assert.ok(html.indexOf("Household supplies") < html.indexOf("Grocery run"), "rows should be sorted newest first");
});

test("Arabic fixture renders localized RTL sections, labels, and rows", () => {
  const html = renderPDFHTML({
    expenses: arabicExpenses,
    userProfile: arabicProfile,
    language: "ar",
    periodLabel: "أغسطس ٢٠٢٦",
    periodType: "month",
    monthlyData: [
      { label: "يونيو", amount: 900 },
      { label: "يوليو", amount: 1100 },
      { label: "أغسطس", amount: 450.5 },
    ],
  });

  assert.match(html, /<html lang="ar" dir="rtl">/);
  for (const section of ["الملخص", "التحليل", "الإنفاق عبر الوقت", "الإنفاق حسب الفئة", "كل العمليات (3)"]) {
    assert.ok(html.includes(section), `missing Arabic section: ${section}`);
  }
  for (const label of ["التاريخ", "الفئة", "الملاحظة", "طريقة الدفع", "المبلغ", "إيجار", "طعام", "مواصلات", "تحويل بنكي", "إيجار المنزل", "مشتريات البقالة"]) {
    assert.ok(html.includes(label), `missing Arabic label or row value: ${label}`);
  }
  for (const expense of arabicExpenses) {
    assert.ok(html.includes(expense.note), `missing Arabic transaction row: ${expense.note}`);
  }
  for (const point of [{ label: "يونيو" }, { label: "يوليو" }, { label: "أغسطس" }]) {
    assert.ok(html.includes(point.label), `missing Arabic chart label: ${point.label}`);
  }
  assert.match(html, /<th style="text-align:left">المبلغ<\/th>/);
  assert.ok(!html.includes("Spending over time"), "Arabic chart should not fall back to English");
  assert.ok(!html.includes("Bank Transfer"), "Arabic payment labels should be translated");
  assert.equal(countBodyRows(html), arabicExpenses.length);
});

test("print CSS protects report sections and table rows from bad page breaks", () => {
  const html = renderPDFHTML({
    expenses: englishExpenses,
    userProfile: englishProfile,
    language: "en",
    periodLabel: "August 2026",
    periodType: "month",
  });

  assert.match(html, /\.summary-section,.analysis-section,.time-series-section,.categories-section\{\s*break-inside:avoid;page-break-inside:avoid\s*\}/);
  assert.match(html, /\.analysis-item,.cat-row,tr\{\s*break-inside:avoid;page-break-inside:avoid\s*\}/);
  assert.match(html, /\.transactions-section\{\s*break-inside:auto;page-break-inside:auto\s*\}/);
});

test("large reports keep pagination-safe containers without clipping the table", () => {
  const html = renderPDFHTML({
    expenses: largeReportExpenses,
    userProfile: englishProfile,
    language: "en",
    periodLabel: "January–September 2026",
    periodType: "year",
    monthlyData: [
      { label: "Jan", amount: 1400 },
      { label: "Feb", amount: 1800 },
      { label: "Mar", amount: 2100 },
      { label: "Apr", amount: 2500 },
      { label: "May", amount: 2900 },
      { label: "Jun", amount: 3100 },
      { label: "Jul", amount: 3600 },
      { label: "Aug", amount: 3900 },
      { label: "Sep", amount: 4200 },
    ],
  });

  assert.equal(countBodyRows(html), largeReportExpenses.length);
  assert.match(html, /All transactions \(144\)/);
  assert.ok(html.includes("Long report transaction 144"), "last long-report row should be present");
  assert.equal(
    (html.match(/class="cat-row"/g) || []).length,
    11,
    "all categories should remain represented in the large report",
  );

  const pageRule = getCssRule(html, ".page");
  const contentRule = getCssRule(html, ".content");
  const tableWrapRule = getCssRule(html, ".table-wrap");

  assert.match(pageRule, /min-height:100vh/);
  assert.doesNotMatch(pageRule, /(?:^|;)height:/);
  assert.doesNotMatch(pageRule, /overflow:hidden/);
  assert.doesNotMatch(contentRule, /(?:^|;)height:/);
  assert.doesNotMatch(contentRule, /overflow:hidden/);
  assert.doesNotMatch(tableWrapRule, /(?:^|;)(?:height|max-height):/);
  assert.doesNotMatch(tableWrapRule, /overflow:hidden/);
});

test("native export passes the rendered report through without mutating transactions", async () => {
  printCalls.length = 0;
  shareCalls.length = 0;
  const sourceExpenses = structuredClone(arabicExpenses);
  const before = structuredClone(sourceExpenses);

  await generateAndSharePDF({
    expenses: sourceExpenses,
    userProfile: arabicProfile,
    language: "ar",
    periodLabel: "أغسطس ٢٠٢٦",
    periodType: "month",
  });

  assert.deepEqual(sourceExpenses, before);
  assert.equal(printCalls.length, 1);
  assert.match(printCalls[0].html, /<html lang="ar" dir="rtl">/);
  assert.equal(printCalls[0].base64, false);
  assert.equal(shareCalls.length, 1);
  assert.equal(shareCalls[0][0], "file:///tmp/rasheed-report.pdf");
  assert.equal(shareCalls[0][1].mimeType, "application/pdf");
});