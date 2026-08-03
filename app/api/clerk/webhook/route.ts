import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { addContact, brevoConfig } from "@/lib/newsletter";

/**
 * Clerk webhook. On `user.created` the new account's primary email address
 * joins the Brevo contact list (BREVO_LIST_ID), so everyone who signs up gets
 * the featured-projects newsletter from day one.
 *
 * Setup: Clerk Dashboard → Webhooks → add https://legal-oss.com/api/clerk/webhook
 * subscribed to `user.created`, then put its signing secret in
 * CLERK_WEBHOOK_SIGNING_SECRET. Without that secret every delivery fails
 * verification and nobody is subscribed.
 */
export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("[clerk-webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const addresses = event.data.email_addresses ?? [];
  const primary =
    addresses.find((a) => a.id === event.data.primary_email_address_id) ??
    addresses[0];
  const email = primary?.email_address?.trim();
  if (!email) {
    console.warn("[clerk-webhook] user.created with no email", event.data.id);
    return NextResponse.json({ ok: true, subscribed: false });
  }

  const config = brevoConfig();
  if (!config) {
    // Retrying will not conjure the credentials, so acknowledge and log loudly.
    console.error("[clerk-webhook] BREVO_API_KEY / BREVO_LIST_ID not configured");
    return NextResponse.json({ ok: true, subscribed: false });
  }

  const result = await addContact({ ...config, email });
  if ("error" in result) {
    // 5xx so Clerk retries: a Brevo blip should not silently drop a subscriber.
    console.error("[clerk-webhook]", result.error);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, subscribed: true });
}
