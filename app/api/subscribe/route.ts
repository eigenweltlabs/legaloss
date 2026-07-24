import { NextResponse } from "next/server";

/**
 * Newsletter signup: adds the address to the LegalOSS list in Brevo. Issues
 * go out when new projects are featured (see scripts/send-newsletter.ts).
 * Requires BREVO_API_KEY and BREVO_LIST_ID; without them the endpoint reports
 * itself unconfigured instead of failing silently.
 */
const BREVO_CONTACTS_ENDPOINT = "https://api.brevo.com/v3/contacts";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
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

  const brevoResponse = await fetch(BREVO_CONTACTS_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
    }),
  });

  if (brevoResponse.ok) {
    return NextResponse.json({ ok: true });
  }

  let detail: { code?: string; message?: string } = {};
  try {
    detail = (await brevoResponse.json()) as typeof detail;
  } catch {
    // ignore
  }
  if (detail.code === "duplicate_parameter") {
    return NextResponse.json({ ok: true });
  }

  console.error("[subscribe] Brevo error", brevoResponse.status, detail);
  return NextResponse.json(
    { error: "Subscription failed. Try again later." },
    { status: 502 },
  );
}
