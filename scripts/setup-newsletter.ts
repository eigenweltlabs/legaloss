/*
 * One-time Brevo setup: creates the "LegalOSS" contact list and prints the id
 * to put into BREVO_LIST_ID. Idempotent: reuses the list if it already exists.
 *
 *   BREVO_API_KEY=xkeysib-… pnpm newsletter:setup
 *
 * Note: Brevo enforces its "authorised IPs" security setting; run this from an
 * allowed network or add yours at https://app.brevo.com/security/authorised_ips
 */
const API = "https://api.brevo.com/v3";
const LIST_NAME = "LegalOSS";

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error("Set BREVO_API_KEY first.");
  process.exit(1);
}

function headers(): HeadersInit {
  return {
    "api-key": apiKey!,
    "content-type": "application/json",
    accept: "application/json",
  };
}

async function fail(res: Response, doing: string): Promise<never> {
  const body = await res.text().catch(() => "");
  console.error(`Brevo ${res.status} while ${doing}: ${body}`);
  process.exit(1);
}

async function main() {
  const listsRes = await fetch(`${API}/contacts/lists?limit=50`, {
    headers: headers(),
  });
  if (!listsRes.ok) await fail(listsRes, "listing contact lists");
  const lists = (await listsRes.json()) as {
    lists?: { id: number; name: string; folderId: number }[];
  };
  const existing = lists.lists?.find((l) => l.name === LIST_NAME);
  if (existing) {
    console.log(`List "${LIST_NAME}" already exists.`);
    console.log(`BREVO_LIST_ID=${existing.id}`);
    return;
  }

  const foldersRes = await fetch(`${API}/contacts/folders?limit=50`, {
    headers: headers(),
  });
  if (!foldersRes.ok) await fail(foldersRes, "listing folders");
  const folders = (await foldersRes.json()) as {
    folders?: { id: number; name: string }[];
  };
  const folderId = folders.folders?.[0]?.id;
  if (!folderId) {
    console.error("No Brevo contact folder found; create one in the dashboard first.");
    process.exit(1);
  }

  const createRes = await fetch(`${API}/contacts/lists`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: LIST_NAME, folderId }),
  });
  if (!createRes.ok) await fail(createRes, "creating the list");
  const created = (await createRes.json()) as { id: number };
  console.log(`Created list "${LIST_NAME}".`);
  console.log(`BREVO_LIST_ID=${created.id}`);
}

main();
