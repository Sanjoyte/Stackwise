import { GoogleGenerativeAI } from "@google/generative-ai";
import AiDeductionScan from "../../models/tax/AiDeductionScan.js";
import { buildScanContext } from "./scanContextBuilder.js";
import { buildGeminiPrompt } from "./geminiPromptBuilder.js";
import { parseRawAiJson, processAiScanResponse } from "./geminiResponseParser.js";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_REST_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Attempt 1: @google/generative-ai SDK.
 */
async function callGeminiSdk(apiKey, promptText) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(promptText);
  const response = await result.response;
  return response.text();
}

/**
 * Attempt 2: Google AI Studio REST API (direct fetch fallback).
 * Used when the SDK package fails (network error, package issue, etc.).
 */
async function callGeminiRestApi(apiKey, promptText) {
  const url = `${GEMINI_REST_URL}?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // 30-second timeout
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini REST API ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  // Extract text from the REST response structure
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini REST API returned empty response");
  return text;
}

/**
 * Main orchestrator for AI-Assisted Deduction Scan.
 * Tier 1: @google/generative-ai SDK
 * Tier 2: Google AI Studio REST API (fetch fallback)
 * Tier 3: Intelligent keyword pattern scanner
 */
export const runDeductionScan = async (userId, options = {}) => {
  const trigger = options.trigger || "manual";
  const periodStart = options.periodStart || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const periodEnd = options.periodEnd || new Date();

  // 1. Build Context
  const context = await buildScanContext(userId, periodStart, periodEnd);

  const scanDoc = new AiDeductionScan({
    userId,
    trigger,
    periodStart,
    periodEnd,
    jurisdictionCode: context.user.jurisdictionCode,
    taxpayerCategory: context.user.taxpayerCategory,
    context: {
      expenseCount: context.expenses.length,
      subscriptionCount: context.subscriptions.length,
      incomeCount: context.income.length,
      ruleFlagCount: context.existingFlags.length,
    },
    status: "success",
  });

  const promptText = buildGeminiPrompt(context);
  scanDoc.rawPrompt = promptText.length > 10000
    ? promptText.substring(0, 10000) + "... [truncated]"
    : promptText;

  let rawResponseText = "";
  const startTime = Date.now();

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const hasValidKey = apiKey && apiKey !== "your-gemini-api-key-here" && !apiKey.includes("placeholder");

  if (hasValidKey) {
    // ── Tier 1: SDK ─────────────────────────────────────────────────────────
    try {
      console.log("[AI Scan] Attempting Gemini SDK...");
      rawResponseText = await callGeminiSdk(apiKey, promptText);
      scanDoc.geminiRequest.model = `${GEMINI_MODEL} (SDK)`;
      console.log("[AI Scan] Gemini SDK succeeded.");
    } catch (sdkErr) {
      console.warn(`[AI Scan] Gemini SDK failed (${sdkErr.message}), trying REST API fallback...`);

      // ── Tier 2: REST API ───────────────────────────────────────────────────
      try {
        rawResponseText = await callGeminiRestApi(apiKey, promptText);
        scanDoc.geminiRequest.model = `${GEMINI_MODEL} (REST)`;
        console.log("[AI Scan] Gemini REST API fallback succeeded.");
      } catch (restErr) {
        console.warn(`[AI Scan] Gemini REST API also failed (${restErr.message}), falling back to pattern scanner.`);

        // ── Tier 3: Pattern scanner ────────────────────────────────────────
        rawResponseText = generatePatternFallbackJson(context);
        scanDoc.status = "partial";
        scanDoc.errorMessage = `SDK: ${sdkErr.message} | REST: ${restErr.message}`;
        scanDoc.geminiRequest.model = "pattern-fallback";
      }
    }

    scanDoc.geminiRequest.latencyMs = Date.now() - startTime;
    scanDoc.rawResponse = rawResponseText.length > 10000
      ? rawResponseText.substring(0, 10000) + "... [truncated]"
      : rawResponseText;
  } else {
    // ── No API key configured — pattern scanner ────────────────────────────
    console.log("[AI Scan] No GEMINI_API_KEY set — running pattern scanner. Set GEMINI_API_KEY in server/.env to enable Gemini.");
    rawResponseText = generatePatternFallbackJson(context);
    scanDoc.geminiRequest.latencyMs = Date.now() - startTime;
    scanDoc.geminiRequest.model = "pattern-fallback (no key)";
    scanDoc.rawResponse = rawResponseText;
  }

  const parsedJson = parseRawAiJson(rawResponseText);
  const scanResults = await processAiScanResponse({
    context,
    parsedResponse: parsedJson,
    scanId: scanDoc._id,
  });

  scanDoc.results = scanResults;
  await scanDoc.save();

  return {
    success: true,
    scanId: scanDoc._id,
    newFlags: scanResults.newDeductionFlags,
    newMissedSuggestions: scanResults.newMissedSuggestions,
    status: scanDoc.status,
    engine: scanDoc.geminiRequest.model,
    createdAt: scanDoc.createdAt,
  };
};

/**
 * Tier 3 — Intelligent keyword pattern scanner.
 * Runs when Gemini is unavailable or no API key is configured.
 */
function generatePatternFallbackJson(context) {
  const expenseFlags = [];
  const missedDeductions = [];
  const subscriptionFlags = [];

  // Flag unflagged expenses by keyword
  context.expenses.forEach((e) => {
    const desc = (e.description || "").toLowerCase();
    if (/software|cloud|aws|github|saas|hosting|figma|tableau|claude|cladue|ec2|digital ocean/.test(desc)) {
      expenseFlags.push({
        sourceId: e._id.toString(),
        suggestedCategory: "software",
        rationale: "Cloud hosting and developer tooling qualify as deductible SaaS software.",
        confidence: "medium",
      });
    } else if (/laptop|hardware|workstation|monitor|printer|cartridge|scanner/.test(desc)) {
      expenseFlags.push({
        sourceId: e._id.toString(),
        suggestedCategory: "equipment",
        rationale: "Hardware and equipment qualifies for the tech equipment deduction.",
        confidence: "medium",
      });
    } else if (/broadband|fiber|internet|telecom|isp/.test(desc)) {
      expenseFlags.push({
        sourceId: e._id.toString(),
        suggestedCategory: "internet",
        rationale: "Business broadband qualifies for the NBR internet deduction (up to 5% of gross income).",
        confidence: "medium",
      });
    } else if (/rent|co-working|coworking|office space/.test(desc)) {
      expenseFlags.push({
        sourceId: e._id.toString(),
        suggestedCategory: "office-rent",
        rationale: "Workspace and co-working rental qualifies for the office rent deduction (up to ৳300,000).",
        confidence: "medium",
      });
    }
  });

  // Flag work subscriptions (exclude personal entertainment)
  context.subscriptions.forEach((s) => {
    const sName = (s.name || "").toLowerCase();
    const sCat = (s.category || "").toLowerCase();
    const isPersonal = /netflix|spotify|hulu|disney|hbo|apple tv|playstation|xbox|nintendo|entertainment|streaming|gaming/.test(sName + " " + sCat);
    if (!isPersonal) {
      subscriptionFlags.push({
        sourceId: s._id.toString(),
        suggestedCategory: "subscription",
        rationale: `${s.name} is a professional tool eligible for 100% SaaS subscription deduction.`,
        confidence: "medium",
      });
    }
  });

  // Infer missed internet deduction
  const hasInternetExpense = context.expenses.some((e) =>
    /internet|broadband|fiber|isp/.test((e.description || "").toLowerCase()) || e.category === "internet"
  );
  if (!hasInternetExpense && context.income.length > 0) {
    missedDeductions.push({
      suggestedCategory: "internet",
      categoryTag: "internet",
      rationale: "Digital income detected without a logged internet bill. NBR rules allow up to 5% of gross income as broadband deduction.",
      estimatedAmount: 18000,
      confidence: "medium",
      supportingEntryIds: context.income.slice(0, 2).map((i) => i._id.toString()),
    });
  }

  // Infer missed professional development deduction
  const hasTrainingExpense = context.expenses.some((e) =>
    /course|certification|training|udemy|coursera/.test((e.description || "").toLowerCase())
  );
  if (!hasTrainingExpense && context.income.length > 0) {
    missedDeductions.push({
      suggestedCategory: "professional-development",
      categoryTag: "professional-development",
      rationale: "Professional certifications and skill development courses are deductible up to ৳100,000.",
      estimatedAmount: 25000,
      confidence: "low",
      supportingEntryIds: context.income.slice(0, 1).map((i) => i._id.toString()),
    });
  }

  return JSON.stringify({ expenseFlags, missedDeductions, subscriptionFlags });
}
