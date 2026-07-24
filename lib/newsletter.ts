/**
 * Newsletter issue composition + Brevo campaign sending, shared by the CLI
 * script (scripts/send-newsletter.ts) and the admin API route. Pure functions
 * plus fetch calls — no server-only import so tsx can run the script.
 */

const BREVO_API = "https://api.brevo.com/v3";

export const NEWSLETTER_SENDER = {
  name: "LegalOSS · Eigenwelt Labs",
  email: "hello@eigenweltlabs.com",
};

export type IssueProject = {
  owner: string;
  repo: string;
  name: string;
  tagline: string | null;
  description: string | null;
  stars: number;
  language: string | null;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function projectBlock(p: IssueProject, siteUrl: string): string {
  const url = `${siteUrl}/projects/${p.owner}/${p.repo}`;
  const desc = p.tagline ?? p.description ?? "";
  const meta = [`★ ${p.stars.toLocaleString("en-US")}`, p.language]
    .filter(Boolean)
    .join(" · ");
  return `
    <tr><td style="padding:0 0 28px 0;">
      <a href="${url}" style="font-family:Georgia,serif;font-size:20px;color:#241811;text-decoration:none;font-weight:bold;">${esc(p.name)}</a>
      <div style="font-family:monospace;font-size:12px;color:#78685A;padding:2px 0 6px 0;">${esc(`${p.owner}/${p.repo}`)} · ${esc(meta)}</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#4A3A2B;">${esc(desc)}</div>
      <div style="padding-top:8px;"><a href="${url}" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#C2371F;">View on LegalOSS →</a></div>
    </td></tr>`;
}

export function buildIssue(
  projects: IssueProject[],
  siteUrl: string,
): { subject: string; html: string } {
  const names = projects.map((p) => p.name);
  const subject =
    projects.length === 1
      ? `Featured on LegalOSS: ${names[0]}`
      : `Featured on LegalOSS: ${names.slice(0, 2).join(", ")}${projects.length > 2 ? ` + ${projects.length - 2} more` : ""}`;

  const html = `<!doctype html><html><body style="margin:0;background:#F8F6F0;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <tr><td style="padding:0 0 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C2371F;">LegalOSS</td></tr>
    <tr><td style="padding:0 0 24px 0;font-family:Georgia,serif;font-size:26px;color:#171008;">Newly featured open-source legal software</td></tr>
    <tr><td style="padding:0 0 28px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#4A3A2B;">Hand-picked from the index. Every entry is a real repository with live GitHub stats, and each page can be claimed by its maintainer.</td></tr>
    ${projects.map((p) => projectBlock(p, siteUrl)).join("\n")}
    <tr><td style="border-top:1px solid rgba(36,24,17,0.14);padding:20px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#78685A;">
      You subscribed at <a href="${siteUrl}" style="color:#78685A;">legal-oss.com</a> · Built in Berlin by <a href="https://eigenweltlabs.com" style="color:#78685A;">Eigenwelt Labs</a> · <a href="{{ unsubscribe }}" style="color:#78685A;">Unsubscribe</a>
    </td></tr>
  </table>
  </td></tr></table></body></html>`;

  return { subject, html };
}

/** Creates and immediately sends a Brevo classic campaign to the list. */
export async function sendCampaign(opts: {
  apiKey: string;
  listId: number;
  subject: string;
  html: string;
}): Promise<{ campaignId: number } | { error: string }> {
  const headers = {
    "api-key": opts.apiKey,
    "content-type": "application/json",
    accept: "application/json",
  };
  const createRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `LegalOSS featured · ${new Date().toISOString().slice(0, 10)}`,
      subject: opts.subject,
      sender: NEWSLETTER_SENDER,
      type: "classic",
      htmlContent: opts.html,
      recipients: { listIds: [opts.listId] },
    }),
  });
  if (!createRes.ok) {
    return { error: `Brevo ${createRes.status} creating campaign: ${await createRes.text()}` };
  }
  const campaign = (await createRes.json()) as { id: number };

  const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${campaign.id}/sendNow`, {
    method: "POST",
    headers,
  });
  if (!sendRes.ok) {
    return {
      error: `Brevo ${sendRes.status} sending campaign ${campaign.id} (created but NOT sent; review it in the Brevo dashboard): ${await sendRes.text()}`,
    };
  }
  return { campaignId: campaign.id };
}
