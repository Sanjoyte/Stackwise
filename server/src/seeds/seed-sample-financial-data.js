import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Subscription from "../models/Subscription.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/471_project";

export const seedSampleFinancialData = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
      console.log("Connected to MongoDB for sample financial data seeding");
    }

    const users = await User.find();
    if (users.length === 0) {
      console.log("No users found in database. Create or log in a user first.");
      return;
    }

    console.log(`Seeding income and expense records across 2026 for ${users.length} user(s)...`);

    for (const user of users) {
      const userId = user._id;

      // Sample Income Data spread across 2026 (Q1 - Q4)
      const sampleIncomes = [
        {
          user: userId,
          amount: 1500,
          currency: "USD",
          source: "freelance",
          clientName: "Acme Corp",
          date: new Date("2026-01-15"),
          notes: "Q1 Freelance Retainer - UI Design",
        },
        {
          user: userId,
          amount: 120000,
          currency: "BDT",
          source: "client",
          clientName: "Dhaka Tech Solutions",
          date: new Date("2026-02-10"),
          notes: "Custom Web Portal Development Milestone 1",
        },
        {
          user: userId,
          amount: 2200,
          currency: "USD",
          source: "freelance",
          clientName: "Global Digital Inc",
          date: new Date("2026-03-20"),
          notes: "System Architecture & API Integration",
        },
        {
          user: userId,
          amount: 1800,
          currency: "USD",
          source: "client",
          clientName: "Venture Labs",
          date: new Date("2026-04-12"),
          notes: "Q2 Mobile App Consultancy",
        },
        {
          user: userId,
          amount: 150000,
          currency: "BDT",
          source: "client",
          clientName: "Chittagong Logistics",
          date: new Date("2026-05-18"),
          notes: "Enterprise Resource Software Development",
        },
        {
          user: userId,
          amount: 2500,
          currency: "USD",
          source: "royalties",
          clientName: "Envato / Marketplace",
          date: new Date("2026-06-25"),
          notes: "Software License Royalties",
        },
        {
          user: userId,
          amount: 3000,
          currency: "USD",
          source: "freelance",
          clientName: "Apex Innovations",
          date: new Date("2026-07-14"),
          notes: "Q3 Cloud Migration & Advisory",
        },
        {
          user: userId,
          amount: 2000,
          currency: "USD",
          source: "client",
          clientName: "NextGen Software",
          date: new Date("2026-08-05"),
          notes: "DevOps & Pipeline Automation",
        },
        {
          user: userId,
          amount: 3500,
          currency: "USD",
          source: "freelance",
          clientName: "Horizon Media",
          date: new Date("2026-09-18"),
          notes: "Q3 Full-Stack App Delivery",
        },
        {
          user: userId,
          amount: 2800,
          currency: "USD",
          source: "client",
          clientName: "Starlight SaaS",
          date: new Date("2026-10-22"),
          notes: "Q4 Integration Contract",
        },
        {
          user: userId,
          amount: 200000,
          currency: "BDT",
          source: "client",
          clientName: "Bengal Fintech",
          date: new Date("2026-11-15"),
          notes: "Fintech Compliance Dashboard",
        },
        {
          user: userId,
          amount: 4000,
          currency: "USD",
          source: "freelance",
          clientName: "Acme Corp",
          date: new Date("2026-12-20"),
          notes: "Year-End Maintenance & Support Retainer",
        },
      ];

      // Insert incomes (clearing previous sample test records if needed)
      await Income.deleteMany({ user: userId, notes: { $regex: /Q[1-4]|Retainer|Milestone|Royalty|Contract/i } });
      await Income.insertMany(sampleIncomes);
      console.log(`  ✓ Inserted ${sampleIncomes.length} income entries across 2026 for user ${user.email || userId}`);

      // Sample Business Expenses
      const sampleExpenses = [
        {
          user: userId,
          description: "Co-working Dedicated Office Space",
          amount: 45000,
          currency: "BDT",
          date: new Date("2026-01-10"),
          category: { name: "Office Rent", slug: "office-rent" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "Fiber Broadband Internet",
          amount: 3500,
          currency: "BDT",
          date: new Date("2026-01-28"),
          category: { name: "Internet", slug: "internet" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "Developer Workstation Laptop",
          amount: 180000,
          currency: "BDT",
          date: new Date("2026-02-15"),
          category: { name: "Equipment", slug: "equipment" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "AWS Cloud Infrastructure",
          amount: 250,
          currency: "USD",
          date: new Date("2026-03-01"),
          category: { name: "Software", slug: "software" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "Co-working Dedicated Office Space",
          amount: 45000,
          currency: "BDT",
          date: new Date("2026-04-10"),
          category: { name: "Office Rent", slug: "office-rent" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "Cloud Architecture Masterclass Certification",
          amount: 400,
          currency: "USD",
          date: new Date("2026-05-12"),
          category: { name: "Professional Development", slug: "professional-development" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "Co-working Dedicated Office Space",
          amount: 45000,
          currency: "BDT",
          date: new Date("2026-07-10"),
          category: { name: "Office Rent", slug: "office-rent" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "High-Speed Fiber Broadband",
          amount: 3500,
          currency: "BDT",
          date: new Date("2026-08-01"),
          category: { name: "Internet", slug: "internet" },
          expenseType: "business",
        },
        {
          user: userId,
          description: "Co-working Dedicated Office Space",
          amount: 45000,
          currency: "BDT",
          date: new Date("2026-10-10"),
          category: { name: "Office Rent", slug: "office-rent" },
          expenseType: "business",
        },
      ];

      await Expense.deleteMany({ user: userId, description: { $regex: /Co-working|Fiber Broadband|Developer Workstation|AWS Cloud|Architecture Masterclass/i } });
      await Expense.insertMany(sampleExpenses);
      console.log(`  ✓ Inserted ${sampleExpenses.length} business expense entries across 2026`);

      // Sample Work Subscriptions
      const sampleSubscriptions = [
        {
          user: userId,
          name: "GitHub Copilot Enterprise",
          planName: "Pro Tier",
          amount: 19,
          currency: "USD",
          billingCycle: "monthly",
          renewalDate: new Date("2026-12-31"),
          category: "AI Tools",
          status: "active",
          usagePercentage: 95,
        },
        {
          user: userId,
          name: "JetBrains All Products Pack",
          planName: "Developer License",
          amount: 25,
          currency: "USD",
          billingCycle: "monthly",
          renewalDate: new Date("2026-12-31"),
          category: "IDE / Code",
          status: "active",
          usagePercentage: 88,
        },
      ];

      for (const sub of sampleSubscriptions) {
        await Subscription.findOneAndUpdate(
          { user: userId, name: sub.name },
          sub,
          { upsert: true, new: true }
        );
      }
      console.log(`  ✓ Seeded active subscriptions for user`);
    }

    console.log("Sample financial data seeding complete!");
  } catch (error) {
    console.error("Error seeding sample financial data:", error);
  }
};

// If run directly via node CLI
if (process.argv[1] && process.argv[1].endsWith("seed-sample-financial-data.js")) {
  seedSampleFinancialData().then(() => {
    process.exit(0);
  });
}
