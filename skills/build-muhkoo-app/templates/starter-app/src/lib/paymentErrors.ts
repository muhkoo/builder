/**
 * One place that turns a failed write into something to show the user.
 *
 * An app's owner can switch on "Paid Muhkoo accounts only" in the portal, and an
 * app whose owner's payment is past due stores nothing new for anyone. Either
 * way the platform refuses writes that add data with a 402, which
 * `@muhkoo/connect` throws as `PaymentRequiredError` (`err.code`,
 * `err.upgradeUrl`). Reads, sign-in and deletes keep working.
 *
 * `client.app.access()` answers the same question up front with the same
 * codes, so the banner in the app shell uses `paymentNotice()` too.
 *
 * Not covered: a message sent over a channel's live socket. A refusal there is
 * not surfaced as `PaymentRequiredError` (connect 0.15.0-alpha.5), so the chat
 * composer can't tell a payment refusal from any other send failure.
 */
import { PaymentRequiredError, type PaymentRequiredCode } from "@muhkoo/connect";

export interface Notice {
  message: string;
  /** Where the action button goes. Only ever an absolute http(s) URL. */
  actionUrl?: string;
  actionLabel?: string;
}

function httpUrl(url: string | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

/** What to tell the user for a payment refusal (from an error or from `client.app.access()`). */
export function paymentNotice(code: PaymentRequiredCode | undefined, upgradeUrl?: string): Notice {
  const url = httpUrl(upgradeUrl);
  switch (code) {
    case "user_payment_past_due":
      return {
        message: "Your Muhkoo payment is past due — update your payment method.",
        ...(url ? { actionUrl: url, actionLabel: "Update payment" } : {}),
      };
    case "owner_payment_past_due":
      // Nothing the user can do: it's the app owner's account.
      return { message: "This app can't save changes right now." };
    case "user_plan_required":
    default:
      return {
        message: "This app needs a paid Muhkoo plan.",
        ...(url ? { actionUrl: url, actionLabel: "Upgrade" } : {}),
      };
  }
}

/** Any thrown value → a notice. Payment refusals get the mapping above; anything else shows its message. */
export function describeError(err: unknown): Notice {
  if (err instanceof PaymentRequiredError) return paymentNotice(err.code, err.upgradeUrl);
  return { message: err instanceof Error ? err.message : String(err) };
}
