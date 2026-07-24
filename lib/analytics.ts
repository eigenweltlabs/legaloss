import posthog from "posthog-js";

/**
 * Safe PostHog capture for custom business events (submits, claims,
 * newsletter signups). No-ops until PostHog is initialized, so it stays
 * silent when no project key is configured or the device is flagged internal.
 */
export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ph = posthog as typeof posthog & { __loaded?: boolean };
  if (!ph.__loaded) return;
  posthog.capture(event, properties);
}
