export const STATUS_LABELS = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  modification_requested: "Modification requested",
};

export const HISTORY_LABELS = {
  created: "Request submitted",
  modification_requested: "Modification requested",
  resubmitted: "Request resubmitted",
  approved: "Request approved & paid",
  rejected: "Request rejected",
  payment_failed: "Payment attempt failed",
};

export const statusBadgeClass = (status) =>
  `team-status-badge team-status-${status}`;
