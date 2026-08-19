import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import ClientProject from "../models/ClientProject.js";
import { convertCurrency, roundMoney } from "../utils/expenseUtils.js";

// server/src/services/profitabilityService.js

export const getProfitabilityReport = async ({ userId, baseCurrency = "BDT" }) => {
  const [incomes, expenses, clients] = await Promise.all([
    Income.find({ user: userId }).lean(),
    Expense.find({ user: userId }).lean(),
    ClientProject.find({ user: userId }).lean(),
  ]);

  // Build a map from clientProject id -> full client object
  const clientMap = new Map();
  clients.forEach((client) => clientMap.set(String(client._id), client));

  // Resolve a client: returns { id: ObjectId|'general', name: string }
  const resolveClient = (incomeOrExpense) => {
    const projectId = incomeOrExpense.clientProject;
    if (projectId) {
      const client = clientMap.get(String(projectId));
      if (client) {
        return { id: client._id, name: client.name };
      }
    }
    // fallback to the string clientName
    const name = incomeOrExpense.clientName?.trim() || "General";
    // For "General", we use a special key that is not a valid ObjectId
    return { id: "general", name };
  };

  // perClient will use the id as the key (or "general")
  const perClient = new Map();

  const addToClient = (clientInfo, bucket, amount, currency) => {
    const { id, name } = clientInfo;
    const key = id; // could be ObjectId string or "general"

    if (!perClient.has(key)) {
      perClient.set(key, {
        id: id === "general" ? null : id, // store null for general
        name,
        revenue: 0,
        costs: 0,
        count: { income: 0, expense: 0 },
      });
    }

    const entry = perClient.get(key);
    const converted = convertCurrency({
      amount,
      fromCurrency: currency,
      toCurrency: baseCurrency,
    });

    if (bucket === "revenue") {
      entry.revenue += converted;
      entry.count.income += 1;
    } else {
      entry.costs += converted;
      entry.count.expense += 1;
    }
  };

  incomes.forEach((income) => {
    addToClient(resolveClient(income), "revenue", income.amount, income.currency);
  });

  expenses.forEach((expense) => {
    addToClient(resolveClient(expense), "costs", expense.amount, expense.currency);
  });

  let totalRevenue = 0;
  let totalCosts = 0;

  const clientsReport = [...perClient.values()]
    .map((entry) => {
      const revenue = roundMoney(entry.revenue);
      const costs = roundMoney(entry.costs);
      const profit = roundMoney(revenue - costs);
      const margin = revenue > 0 ? (profit / revenue) * 100 : costs > 0 ? -100 : 0;
      totalRevenue += revenue;
      totalCosts += costs;

      return {
        _id: entry.id,          // now we include the ObjectId (or null for General)
        name: entry.name,
        revenue,
        costs,
        profit,
        margin: roundMoney(margin),
        incomeCount: entry.count.income,
        expenseCount: entry.count.expense,
      };
    })
    .filter((item) => item._id !== null)   // exclude "General" if you don't want it in the list
    .sort((a, b) => b.profit - a.profit);

  return {
    currency: baseCurrency,
    summary: {
      totalRevenue: roundMoney(totalRevenue),
      totalCosts: roundMoney(totalCosts),
      netProfit: roundMoney(totalRevenue - totalCosts),
      clientCount: clientsReport.length,
    },
    clients: clientsReport,
  };
};

export const getClientProfitabilityReport = async ({ userId, baseCurrency = "BDT", clientId }) => {
  // Resolve the ClientProject document — clientId may be an ObjectId string OR a name from the URL
  let clientDoc = null;

  // Try ObjectId first
  const mongoose = (await import("mongoose")).default;
  if (mongoose.Types.ObjectId.isValid(clientId)) {
    clientDoc = await ClientProject.findOne({ _id: clientId, user: userId }).lean();
  }

  // Fallback: look up by name (case-insensitive)
  if (!clientDoc) {
    clientDoc = await ClientProject.findOne({
      user: userId,
      name: { $regex: new RegExp(`^${clientId}$`, "i") },
    }).lean();
  }

  // Still not found — return empty report gracefully
  if (!clientDoc) {
    return {
      currency: baseCurrency,
      summary: { totalRevenue: 0, totalCosts: 0, netProfit: 0, clientCount: 0 },
      clients: [],
      categoryBreakdown: [],
    };
  }

  const resolvedId = clientDoc._id;

  const [incomes, expenses] = await Promise.all([
    Income.find({ user: userId, clientProject: resolvedId }).lean(),
    Expense.find({ user: userId, clientProject: resolvedId }).lean(),
  ]);

  const perClient = new Map();

  const addToClient = (clientName, bucket, amount, currency) => {
    const key = clientName || clientDoc.name;
    const converted = convertCurrency({
      amount,
      fromCurrency: currency,
      toCurrency: baseCurrency,
    });

    if (!perClient.has(key)) {
      perClient.set(key, {
        name: key,
        revenue: 0,
        costs: 0,
        count: { income: 0, expense: 0 },
      });
    }

    const entry = perClient.get(key);
    if (bucket === "revenue") {
      entry.revenue += converted;
      entry.count.income += 1;
    } else {
      entry.costs += converted;
      entry.count.expense += 1;
    }
  };

  incomes.forEach((income) => {
    addToClient(income.clientName || clientDoc.name, "revenue", income.amount, income.currency);
  });

  expenses.forEach((expense) => {
    addToClient(expense.clientName || clientDoc.name, "costs", expense.amount, expense.currency);
  });

  let totalRevenue = 0;
  let totalCosts = 0;

  const clientsReport = [...perClient.entries()]
    .map(([name, entry]) => {
      const revenue = roundMoney(entry.revenue);
      const costs = roundMoney(entry.costs);
      const profit = roundMoney(revenue - costs);
      const margin = revenue > 0 ? (profit / revenue) * 100 : costs > 0 ? -100 : 0;
      totalRevenue += revenue;
      totalCosts += costs;

      return {
        name,
        revenue,
        costs,
        profit,
        margin: roundMoney(margin),
        incomeCount: entry.count.income,
        expenseCount: entry.count.expense,
      };
    })
    .sort((a, b) => b.profit - a.profit);

  // Build expense category breakdown
  const categoryMap = new Map();
  expenses.forEach((expense) => {
    const cat = expense.category;
    if (!cat) return; // skip if no category
    const slug = cat.slug || "uncategorized";
    const label = cat.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const converted = convertCurrency({
      amount: expense.amount,
      fromCurrency: expense.currency,
      toCurrency: baseCurrency,
    });

    if (!categoryMap.has(slug)) {
      categoryMap.set(slug, { category: label, slug, total: 0, count: 0 });
    }
    const entry = categoryMap.get(slug);
    entry.total += converted;
    entry.count += 1;
  });

  const categoryBreakdown = [...categoryMap.values()]
    .map((cat) => ({ ...cat, total: roundMoney(cat.total) }))
    .sort((a, b) => b.total - a.total);

  return {
    currency: baseCurrency,
    summary: {
      totalRevenue: roundMoney(totalRevenue),
      totalCosts: roundMoney(totalCosts),
      netProfit: roundMoney(totalRevenue - totalCosts),
      clientCount: clientsReport.length,
    },
    clients: clientsReport,
    categoryBreakdown,
  };
};

