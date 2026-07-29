/**
 * License normalization and grouping.
 *
 * Two problems this solves. First, the same license reaches the index under two
 * spellings: GitHub returns SPDX ids upper-cased ("MIT", "Apache-2.0"), Hugging
 * Face lower-cased ("mit", "apache-2.0"). Left alone the browse filter listed
 * both, and picking one silently hid every project from the other source.
 *
 * Second, twenty-odd raw SPDX ids is not a decision anyone makes. What a firm
 * evaluating a project actually needs to know is what the license obliges them
 * to do, so the filter groups by obligation and the exact id stays on the
 * project page.
 */

export type LicenseGroup =
  | "permissive"
  | "copyleft"
  | "weak-copyleft"
  | "open-data"
  | "restricted"
  | "other";

/**
 * Canonical spellings, grouped. Keys are matched case-insensitively; the value
 * as written here is the spelling stored and displayed. "other" is deliberately
 * absent — it is the fallback for anything unlisted, including no license.
 */
const GROUP_IDS: Record<Exclude<LicenseGroup, "other">, string[]> = {
  // Use freely, including inside proprietary work.
  permissive: [
    "MIT",
    "MIT-0",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "BSD-3-Clause-Clear",
    "ISC",
    "0BSD",
    "Unlicense",
    "Zlib",
    "BSL-1.0",
    "WTFPL",
    "PostgreSQL",
    "NCSA",
    "Artistic-2.0",
    "MS-PL",
    "PSF-2.0",
  ],
  // Derivatives must ship under the same terms; AGPL extends that to network use.
  copyleft: [
    "GPL-2.0",
    "GPL-2.0-only",
    "GPL-2.0-or-later",
    "GPL-3.0",
    "GPL-3.0-only",
    "GPL-3.0-or-later",
    "AGPL-3.0",
    "AGPL-3.0-only",
    "AGPL-3.0-or-later",
  ],
  // Obligations stop at the file or library boundary.
  "weak-copyleft": [
    "LGPL-2.1",
    "LGPL-2.1-only",
    "LGPL-2.1-or-later",
    "LGPL-3.0",
    "LGPL-3.0-only",
    "LGPL-3.0-or-later",
    "MPL-2.0",
    "EUPL-1.1",
    "EUPL-1.2",
    "EPL-1.0",
    "EPL-2.0",
    "CDDL-1.0",
    "OSL-3.0",
  ],
  // Corpora, case-law dumps and datasets rather than software.
  "open-data": [
    "CC0-1.0",
    "CC-BY-3.0",
    "CC-BY-4.0",
    "CC-BY-SA-3.0",
    "CC-BY-SA-4.0",
    "ODbL-1.0",
    "PDDL-1.0",
    "CDLA-Permissive-2.0",
    "OGL-UK-3.0",
  ],
  // Carry a use restriction a firm has to clear before deploying: no commercial
  // use, acceptable-use clauses, or a headcount ceiling.
  restricted: [
    "CC-BY-NC-3.0",
    "CC-BY-NC-4.0",
    "CC-BY-NC-SA-3.0",
    "CC-BY-NC-SA-4.0",
    "CC-BY-NC-ND-4.0",
    "llama2",
    "llama3",
    "llama3.1",
    "llama3.2",
    "gemma",
    "openrail",
    "openrail++",
    "creativeml-openrail-m",
    "bigscience-openrail-m",
    "bigscience-bloom-rail-1.0",
    "bigcode-openrail-m",
    "deepfloyd-if-license",
    "SSPL-1.0",
    "Elastic-2.0",
    "BUSL-1.1",
  ],
};

/** Select options, in the order they should be offered. */
export const LICENSE_GROUPS: { value: LicenseGroup; label: string }[] = [
  { value: "permissive", label: "Permissive (MIT, Apache)" },
  { value: "copyleft", label: "Copyleft (GPL, AGPL)" },
  { value: "weak-copyleft", label: "Weak copyleft (LGPL, MPL)" },
  { value: "open-data", label: "Open data (CC)" },
  { value: "restricted", label: "Restricted use" },
  { value: "other", label: "Other or unspecified" },
];

const BY_LOWER = new Map<string, { canonical: string; group: LicenseGroup }>();
for (const [group, ids] of Object.entries(GROUP_IDS)) {
  for (const id of ids) {
    BY_LOWER.set(id.toLowerCase(), { canonical: id, group: group as LicenseGroup });
  }
}

/** Every id that lands in a real group, lower-cased — the complement is "other". */
export const CLASSIFIED_SPDX_IDS: string[] = [...BY_LOWER.keys()];

export function isLicenseGroup(value: string): value is LicenseGroup {
  return LICENSE_GROUPS.some((g) => g.value === value);
}

/**
 * The spelling to store and display. Recognized ids come back in their canonical
 * SPDX casing whichever source supplied them; anything unrecognized is passed
 * through untouched rather than guessed at.
 */
export function normalizeSpdx(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  // GitHub's placeholder for "a license file we could not identify".
  if (trimmed.toLowerCase() === "noassertion") return null;
  return BY_LOWER.get(trimmed.toLowerCase())?.canonical ?? trimmed;
}

/** Which bucket a raw or canonical id falls into. Unknown and missing are "other". */
export function licenseGroup(raw: string | null | undefined): LicenseGroup {
  const trimmed = raw?.trim();
  if (!trimmed) return "other";
  return BY_LOWER.get(trimmed.toLowerCase())?.group ?? "other";
}

/**
 * Like licenseGroup, but distinguishes "an id we classify" from "anything else".
 * Callers reading a URL need that difference: ?license=MIT is a link minted when
 * the filter took raw ids and should still work, while ?license=nonsense should
 * fall through to no filter rather than quietly meaning "other".
 */
export function knownLicenseGroup(raw: string): LicenseGroup | null {
  return BY_LOWER.get(raw.trim().toLowerCase())?.group ?? null;
}

/** Lower-cased ids belonging to a group; empty for "other", which is a complement. */
export function spdxIdsInGroup(group: LicenseGroup): string[] {
  if (group === "other") return [];
  return [...BY_LOWER.entries()]
    .filter(([, v]) => v.group === group)
    .map(([id]) => id);
}
