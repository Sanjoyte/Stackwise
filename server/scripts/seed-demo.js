/**
 * Demo Seed Script
 * ─────────────────
 * Seeds realistic demo data for the current user in MongoDB.
 *
 * Usage (from the /server directory):
 *   node scripts/seed-demo.js <userEmail>
 *
 * Example:
 *   node scripts/seed-demo.js demo@example.com
 *
 * Creates:
 *   - 4 client/projects
 *   - 7 expense categories
 *   - 9 income records
 *   - 17 expense records (across categories)
 *
 * Safe to re-run: existing demo clients with the same names are skipped.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

import User from "../src/models/User.js";
import ClientProject from "../src/models/ClientProject.js";
import ExpenseCategory from "../src/models/ExpenseCategory.js";
import Income from "../src/models/Income.js";
import Expense from "../src/models/Expense.js";

// ─── Arg check ────────────────────────────────────────────────────────────────
const EMAIL = process.argv[2];
if (!EMAIL) {
  console.error("Usage: node scripts/seed-demo.js <userEmail>");
  process.exit(1);
}

// ─── Connect ──────────────────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGODB_URI);
console.log("MongoDB connected");

const user = await User.findOne({ email: EMAIL.toLowerCase().trim() }).lean();
if (!user) {
  console.error(`No user found with email: ${EMAIL}`);
  await mongoose.disconnect();
  process.exit(1);
}

const uid = user._id;
const currency = user.baseCurrency || "BDT";
console.log(`Seeding for: ${user.name}  [currency: ${currency}]`);

// ─── Helper ───────────────────────────────────────────────────────────────────
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ─── 1. Clients ───────────────────────────────────────────────────────────────
const clientDefs = [
  "Apex Digital Solutions",
  "NovaBridge Consulting",
  "Pixel & Prose Studio",
  "GreenLeaf Analytics",
];

const clients = {};
for (const name of clientDefs) {
  let doc = await ClientProject.findOne({ user: uid, name });
  if (!doc) {
    doc = await ClientProject.create({ user: uid, name });
    console.log(`  + Created client: ${name}`);
  } else {
    console.log(`  ~ Skipping existing: ${name}`);
  }
  clients[name] = doc;
}

// ─── 2. Expense Categories ────────────────────────────────────────────────────
const categoryDefs = [
  { name: "Software & Tools",       slug: "software-tools",     icon: "laptop",     theme: "indigo"  },
  { name: "Travel & Transport",     slug: "travel-transport",   icon: "plane",      theme: "sky"     },
  { name: "Marketing",              slug: "marketing",          icon: "megaphone",  theme: "violet"  },
  { name: "Office Supplies",        slug: "office-supplies",    icon: "briefcase",  theme: "amber"   },
  { name: "Meals & Entertainment",  slug: "meals-entertainment",icon: "utensils",   theme: "rose"    },
  { name: "Freelancer Fees",        slug: "freelancer-fees",    icon: "user-check", theme: "emerald" },
  { name: "Cloud & Hosting",        slug: "cloud-hosting",      icon: "cloud",      theme: "cyan"    },
];

const cats = {};
for (const def of categoryDefs) {
  let doc = await ExpenseCategory.findOne({ user: uid, slug: def.slug });
  if (!doc) {
    doc = await ExpenseCategory.create({ user: uid, ...def });
    console.log(`  + Created category: ${def.name}`);
  }
  cats[def.slug] = doc;
}

// Helper: build embedded category object
const cat = (slug) => ({
  id:   cats[slug]._id,
  name: cats[slug].name,
  slug: cats[slug].slug,
});

// ─── 3. Incomes ───────────────────────────────────────────────────────────────
const incomeData = [
  { client: "Apex Digital Solutions", amount: 850000,  source: "client",    date: daysAgo(5)  },
  { client: "Apex Digital Solutions", amount: 650000,  source: "client",    date: daysAgo(35) },
  { client: "Apex Digital Solutions", amount: 500000,  source: "client",    date: daysAgo(65) },
  { client: "NovaBridge Consulting",  amount: 1200000, source: "client",    date: daysAgo(10) },
  { client: "NovaBridge Consulting",  amount: 900000,  source: "client",    date: daysAgo(45) },
  { client: "Pixel & Prose Studio",   amount: 380000,  source: "freelance", date: daysAgo(8)  },
  { client: "Pixel & Prose Studio",   amount: 280000,  source: "freelance", date: daysAgo(38) },
  { client: "GreenLeaf Analytics",    amount: 520000,  source: "client",    date: daysAgo(15) },
  { client: "GreenLeaf Analytics",    amount: 420000,  source: "client",    date: daysAgo(50) },
];

for (const d of incomeData) {
  await Income.create({
    user: uid,
    amount: d.amount,
    currency,
    source: d.source,
    clientName: d.client,
    clientProject: clients[d.client]._id,
    date: d.date,
    notes: `Demo income – ${d.client}`,
  });
}
console.log(`  + Created ${incomeData.length} incomes`);

// ─── 4. Expenses ──────────────────────────────────────────────────────────────
const expenseData = [
  // Apex Digital Solutions
  { client: "Apex Digital Solutions", amount: 45000,  catSlug: "software-tools",      desc: "Figma annual license",      date: daysAgo(4),  payment: "Card" },
  { client: "Apex Digital Solutions", amount: 28000,  catSlug: "cloud-hosting",        desc: "AWS EC2 monthly bill",       date: daysAgo(12), payment: "Card" },
  { client: "Apex Digital Solutions", amount: 18500,  catSlug: "travel-transport",     desc: "Client site visit",          date: daysAgo(20), payment: "Cash" },
  { client: "Apex Digital Solutions", amount: 12000,  catSlug: "meals-entertainment",  desc: "Client dinner",              date: daysAgo(22), payment: "Card" },
  { client: "Apex Digital Solutions", amount: 55000,  catSlug: "freelancer-fees",      desc: "UI designer contract",       date: daysAgo(30), payment: "Bank" },
  // NovaBridge Consulting
  { client: "NovaBridge Consulting",  amount: 80000,  catSlug: "freelancer-fees",      desc: "Backend dev sprint 1",       date: daysAgo(9),  payment: "Bank" },
  { client: "NovaBridge Consulting",  amount: 35000,  catSlug: "software-tools",       desc: "Jira & Confluence seats",    date: daysAgo(18), payment: "Card" },
  { client: "NovaBridge Consulting",  amount: 22000,  catSlug: "marketing",            desc: "LinkedIn sponsored posts",   date: daysAgo(25), payment: "Card" },
  { client: "NovaBridge Consulting",  amount: 15000,  catSlug: "travel-transport",     desc: "Flights to Chittagong",      date: daysAgo(40), payment: "Cash" },
  { client: "NovaBridge Consulting",  amount: 9500,   catSlug: "office-supplies",      desc: "Notebooks and stationery",   date: daysAgo(55), payment: "Cash" },
  // Pixel & Prose Studio
  { client: "Pixel & Prose Studio",   amount: 25000,  catSlug: "software-tools",       desc: "Adobe CC subscription",      date: daysAgo(7),  payment: "Card" },
  { client: "Pixel & Prose Studio",   amount: 18000,  catSlug: "marketing",            desc: "Instagram ads campaign",     date: daysAgo(16), payment: "Card" },
  { client: "Pixel & Prose Studio",   amount: 8500,   catSlug: "office-supplies",      desc: "Printer cartridges",         date: daysAgo(28), payment: "Cash" },
  // GreenLeaf Analytics
  { client: "GreenLeaf Analytics",    amount: 60000,  catSlug: "freelancer-fees",      desc: "Data analyst part-time",     date: daysAgo(13), payment: "Bank" },
  { client: "GreenLeaf Analytics",    amount: 32000,  catSlug: "cloud-hosting",        desc: "GCP BigQuery costs",         date: daysAgo(21), payment: "Card" },
  { client: "GreenLeaf Analytics",    amount: 14000,  catSlug: "software-tools",       desc: "Tableau license",            date: daysAgo(33), payment: "Card" },
  { client: "GreenLeaf Analytics",    amount: 7500,   catSlug: "meals-entertainment",  desc: "Team lunch",                 date: daysAgo(42), payment: "Card" },
];

for (const d of expenseData) {
  await Expense.create({
    user: uid,
    description: d.desc,
    amount: d.amount,
    currency,
    date: d.date,
    category: cat(d.catSlug),
    expenseType: "business",
    clientName: d.client,
    clientProject: clients[d.client]._id,
    merchant: d.desc.split(" ")[0],
    paymentMethod: d.payment,
    notes: `Demo expense – ${d.client}`,
    source: "manual",
  });
}
console.log(`  + Created ${expenseData.length} expenses`);

// ─── Done ─────────────────────────────────────────────────────────────────────
console.log("\nDemo data seeded successfully!");
console.log("Clients :", clientDefs.join(", "));
console.log("Incomes :", incomeData.length);
console.log("Expenses:", expenseData.length);

await mongoose.disconnect();
process.exit(0);
