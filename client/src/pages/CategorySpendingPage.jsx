import { useState } from "react";
import { PieChart } from "lucide-react";
import {
  CashFlowSidebar,
  CashFlowMobileNav,
} from "../components/cashflow/CashFlowNav";
import SpendingByCategories from "../components/expenses/SpendingByCategories";
import "../styles/cashFlow.css";
import "../styles/expenseCategories.css";

export default function CategorySpendingPage() {
  const [period, setPeriod] = useState("monthly");

  return (
    <div className="cf-page">
      <CashFlowSidebar />

      <div className="cf-workspace">
        <main className="cf-main">
          {/* Page Header */}
          <div className="cf-page-heading">
            <div>
              <div className="cf-heading-kicker">
                <PieChart size={15} />
                Expense Analytics
              </div>

              <h1>Category Spending</h1>

              <p>
                Understand where your money is going, compare your spending by
                category, monitor budgets, and identify your highest spending areas.
              </p>
            </div>

            {/* Monthly / Yearly Toggle */}
            <div className="cf-period-toggle">
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={
                  period === "monthly"
                    ? "cf-period-button cf-period-button-active"
                    : "cf-period-button"
                }
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setPeriod("yearly")}
                className={
                  period === "yearly"
                    ? "cf-period-button cf-period-button-active"
                    : "cf-period-button"
                }
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Category Spending Feature */}
          <SpendingByCategories period={period} />
        </main>

        <CashFlowMobileNav />
      </div>
    </div>
  );
}