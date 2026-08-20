import { runScheduledNotifications } from "../services/notificationService.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const startNotificationScheduler = () => {
  const configuredInterval = Number(process.env.NOTIFICATION_CHECK_INTERVAL_MS);
  const intervalMs = Number.isFinite(configuredInterval) && configuredInterval >= 60_000
    ? configuredInterval
    : DEFAULT_INTERVAL_MS;

  const execute = async () => {
    try {
      const result = await runScheduledNotifications();
      if (!result.skipped) {
        console.log(`Notification check completed: ${result.sent} email(s) sent`);
      }
    } catch (error) {
      console.error("Notification check failed:", error.message);
    }
  };

  execute();
  return setInterval(execute, intervalMs);
};
