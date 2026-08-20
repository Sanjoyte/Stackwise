import dotenv from "dotenv";
import mongoose from "mongoose";

import TaxJurisdiction from "../models/tax/TaxJurisdiction.js";
import TaxBracketSet from "../models/tax/TaxBracketSet.js";
import DeductibleCategoryRule from "../models/tax/DeductibleCategoryRule.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/471_project";

export const seedTaxRules = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
      console.log("Connected to MongoDB for tax rules seeding");
    }

    // 1. Seed Jurisdiction
    const jurisdictionData = {
      code: "BD",
      name: "Bangladesh",
      currency: "BDT",
      supportedTaxYears: ["2026-27", "2025-26", "2024-25"],
    };

    await TaxJurisdiction.findOneAndUpdate(
      { code: "BD" },
      jurisdictionData,
      { upsert: true, new: true }
    );
    console.log("✓ Seeded TaxJurisdiction: BD");

    // 2. Seed TaxBracketSets for multiple supported fiscal years
    const generalSlabs = [
      { min: 0, max: 375000, rate: 0.0 },
      { min: 375001, max: 475000, rate: 0.10 },
      { min: 475001, max: 575000, rate: 0.15 },
      { min: 575001, max: 875000, rate: 0.20 },
      { min: 875001, max: 1075000, rate: 0.25 },
      { min: 1075001, max: null, rate: 0.30 },
    ];

    const womanSeniorSlabs = [
      { min: 0, max: 400000, rate: 0.0 },
      { min: 400001, max: 500000, rate: 0.10 },
      { min: 500001, max: 600000, rate: 0.15 },
      { min: 600001, max: 900000, rate: 0.20 },
      { min: 900001, max: 1100000, rate: 0.25 },
      { min: 1100001, max: null, rate: 0.30 },
    ];

    const disabledSlabs = [
      { min: 0, max: 475000, rate: 0.0 },
      { min: 475001, max: 575000, rate: 0.10 },
      { min: 575001, max: 675000, rate: 0.15 },
      { min: 675001, max: 975000, rate: 0.20 },
      { min: 975001, max: 1175000, rate: 0.25 },
      { min: 1175001, max: null, rate: 0.30 },
    ];

    const supportedYears = ["2025-26", "2026-27"];

    for (const taxYear of supportedYears) {
      const bracketSetsToSeed = [
        {
          jurisdictionCode: "BD",
          taxYear,
          taxpayerCategory: "general",
          slabs: generalSlabs,
          basicExemption: 0,
          minimumTax: 5000,
          dataSource: "manual-seed",
          sourceUrl: "https://nbr.gov.bd",
          lastVerifiedAt: new Date(),
          isActive: true,
          version: 1,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          taxpayerCategory: "woman-senior",
          slabs: womanSeniorSlabs,
          basicExemption: 0,
          minimumTax: 5000,
          dataSource: "manual-seed",
          sourceUrl: "https://nbr.gov.bd",
          lastVerifiedAt: new Date(),
          isActive: true,
          version: 1,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          taxpayerCategory: "disabled",
          slabs: disabledSlabs,
          basicExemption: 0,
          minimumTax: 5000,
          dataSource: "manual-seed",
          sourceUrl: "https://nbr.gov.bd",
          lastVerifiedAt: new Date(),
          isActive: true,
          version: 1,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          taxpayerCategory: "freelancer",
          slabs: generalSlabs,
          basicExemption: 0,
          minimumTax: 5000,
          dataSource: "manual-seed",
          sourceUrl: "https://nbr.gov.bd",
          lastVerifiedAt: new Date(),
          isActive: true,
          version: 1,
        },
      ];

      for (const bs of bracketSetsToSeed) {
        await TaxBracketSet.findOneAndUpdate(
          {
            jurisdictionCode: bs.jurisdictionCode,
            taxYear: bs.taxYear,
            taxpayerCategory: bs.taxpayerCategory,
            version: bs.version,
          },
          bs,
          { upsert: true, new: true }
        );
      }

      // Seed DeductibleCategoryRules
      const rulesToSeed = [
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "office-rent",
          description: "Office rent expense deduction capped at ৳300,000",
          capType: "flat",
          capValue: 300000,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "internet",
          description: "Internet expenses capped at 5% of gross income",
          capType: "percent-of-income",
          capValue: 0.05,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "software",
          description: "Software subscriptions and SaaS tools fully deductible",
          capType: "none",
          capValue: 0,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "equipment",
          description: "Hardware and tech equipment capped at ৳500,000",
          capType: "flat",
          capValue: 500000,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "professional-development",
          description: "Courses, books, and certifications capped at ৳100,000",
          capType: "flat",
          capValue: 100000,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "subscription",
          description: "Work-related active software subscriptions",
          capType: "none",
          capValue: 0,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
        {
          jurisdictionCode: "BD",
          taxYear,
          categoryTag: "utilities",
          description: "Utility bills capped at ৳150,000",
          capType: "flat",
          capValue: 150000,
          appliesToRole: ["freelancer", "professional", "small-business"],
          isActive: true,
        },
      ];

      for (const rule of rulesToSeed) {
        await DeductibleCategoryRule.findOneAndUpdate(
          {
            jurisdictionCode: rule.jurisdictionCode,
            taxYear: rule.taxYear,
            categoryTag: rule.categoryTag,
          },
          rule,
          { upsert: true, new: true }
        );
      }
    }
    console.log("✓ Seeded TaxBracketSets and DeductibleCategoryRules for FY 2025-26 & 2026-27");

  } catch (error) {
    console.error("Error seeding tax rules:", error);
  }
};

// If run directly via node CLI
if (process.argv[1] && process.argv[1].endsWith("seed-bd-tax-rules.js")) {
  seedTaxRules().then(() => {
    console.log("Tax rules seeding complete.");
    process.exit(0);
  });
}
