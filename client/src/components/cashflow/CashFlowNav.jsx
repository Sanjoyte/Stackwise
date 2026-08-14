import {
  ChartNoAxesCombined,
  LayoutDashboard,
  ReceiptText,
  Repeat2,
  WalletCards,
  Sparkles,
  AlertTriangle,
  Activity,
  ChartPie,
  CircleDollarSign,
} from "lucide-react";

import {
  NavLink,
} from "react-router";

const navigationItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    enabled: true,
  },

  {
    label: "Subscriptions",
    shortLabel: "Subs",
    icon: Repeat2,
    path: "/subscription",
    enabled: true,
  },

  {
     label: "Income",
  icon: WalletCards,
  path: "/income",
  enabled: true,
  },

  {
    label: "Usage Analytics",
    shortLabel: "Usage",
    icon: Activity,
    path: "/usage-analytics",
    enabled: true,
  },

  {
    label: "Alternatives",
    shortLabel: "Saves",
    icon: Sparkles,
    path: "/recommendations",
    enabled: true,
  },

  {
    label: "Overlap Alerts",
    shortLabel: "Overlap",
    icon: AlertTriangle,
    path: "/overlap",
    enabled: true,
  },

  {
    label: "Expenses",
    icon: ReceiptText,
    path: "/expenses",
    enabled: true,
  },

  {
    label: "Cash Flow",
    icon: ChartNoAxesCombined,
    path: "/cash-flow",
    enabled: true,
  },
  {
  label: "Category Spending",
  shortLabel: "Categories",
  icon: ChartPie,
  path: "/category-spending",
  enabled: true,
},
  {
    label: "Profitability",
    shortLabel: "Profit",
    icon: CircleDollarSign,
    path: "/profitability",
    enabled: true,
  },
];

function NavigationItem({
  item,
  mobile = false,
}) {
  const Icon =
    item.icon;

  if (!item.enabled) {
    return (
      <button
        type="button"
        className={
          mobile
            ? "cf-mobile-nav-item cf-nav-disabled"
            : "cf-side-nav-item cf-nav-disabled"
        }
        title="This module will be connected when your teammate's feature is merged."
        disabled
      >
        <Icon size={19} />

        <span>
          {mobile
            ? item.shortLabel ||
              item.label
            : item.label}
        </span>
      </button>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={({
        isActive,
      }) =>
        `${
          mobile
            ? "cf-mobile-nav-item"
            : "cf-side-nav-item"
        } ${
          isActive
            ? "cf-nav-active"
            : ""
        }`
      }
    >
      <Icon size={19} />

      <span>
        {mobile
          ? item.shortLabel ||
            item.label
          : item.label}
      </span>
    </NavLink>
  );
}

export function CashFlowSidebar() {
  return (
    <aside className="cf-sidebar">
      <div className="cf-brand">
        <div className="cf-brand-mark">
          <span>S</span>
        </div>

        <div>
          <p className="cf-brand-name">
            Stackwise
          </p>

          <p className="cf-brand-subtitle">
            Financial clarity
          </p>
        </div>
      </div>

      <nav className="cf-side-nav">
        {navigationItems.map(
          (item) => (
            <NavigationItem
              key={item.label}
              item={item}
            />
          )
        )}
      </nav>

      <div className="cf-sidebar-footer">
        <p>
          Smarter subscriptions.
        </p>

        <p>
          Clearer finances.
        </p>
      </div>
    </aside>
  );
}

export function CashFlowMobileNav() {
  return (
    <nav className="cf-mobile-nav">
      {navigationItems.map(
        (item) => (
          <NavigationItem
            key={item.label}
            item={item}
            mobile
          />
        )
      )}
    </nav>
  );
}
