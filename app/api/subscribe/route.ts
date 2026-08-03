import { NextResponse } from "next/server";
import { addContact, brevoConfig } from "@/lib/newsletter";

/**
 * Newsletter signup: adds the address to the LegalOSS list in Brevo. Issues
 * go out when new projects are featured (see scripts/send-newsletter.ts).
 * Requires BREVO_API_KEY and BREVO_LIST_ID; without them the endpoint reports
 * itself unconfigured instead of failing silently. New accounts land on the
 * same list through the Clerk webhook (app/api/clerk/webhook/route.ts).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const config = brevoConfig();
  if (!config) {
    return NextResponse.json(
      { error: "The newsletter is not configured yet." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof payload === "object" && payload !== null && "email" in payload
      ? String((payload as { email: unknown }).email ?? "").trim()
      : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const result = await addContact({ ...config, email });
  if ("error" in result) {
    console.error("[subscribe]", result.error);
    return NextResponse.json(
      { error: "Subscription failed. Try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
