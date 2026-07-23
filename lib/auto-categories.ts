/**
 * Provisional categorization for community submissions, derived from GitHub
 * topics + description. Maintainers refine categories after claiming — the
 * submit flow itself takes no curation input.
 */
const RULES: [slug: string, pattern: RegExp][] = [
  ["contracts", /\bcontracts?\b|\bclause|\bredlin|\bcuad\b|\bclm\b/i],
  ["court-data", /\bcourts?\b|\bdockets?\b|\bcase.?law\b|\bjudicial|\bopinions?\b|\bpacer\b/i],
  ["citations", /\bcitations?\b|\bcite\b|\bbluebook\b|\blegal.?parsing\b/i],
  ["esignature", /\be-?sign|\bsignatures?\b|\bdocusign\b/i],
  ["document-automation", /\bdocument (assembly|automation|generation)\b|\btemplat|\bdrafting\b|\bguided interview/i],
  ["compliance", /\bcompliance\b|\bprivacy\b|\bgdpr\b|\bregulat|\baml\b|\bkyc\b/i],
  ["legal-ai", /\blegal.?(ai|nlp|llm)\b|\bmachine learning\b|\blanguage model|\bnlp\b|\bllm\b|\brag\b/i],
  ["local-ai", /\blocal.?(ai|llm|first)\b|\bon.?device\b|\boffline\b|\bollama\b|\bllama.?cpp\b|\bself.?host/i],
  ["benchmarks-datasets", /\bbenchmark|\bdatasets?\b|\bcorpus\b|\beval(uation)?s?\b/i],
  ["e-discovery", /\be-?discovery\b|\bforensic|\bevidence\b/i],
  ["legal-research", /\blegal (research|search)\b|\bstatutes?\b|\blegislation\b|\bcase search\b/i],
  ["practice-management", /\bpractice management\b|\bmatter management\b|\blaw (firm|office)\b|\btime.?tracking\b|\bbilling\b/i],
  ["access-to-justice", /\baccess to justice\b|\ba2j\b|\bpro bono\b|\bself.?help\b|\blegal aid\b/i],
];

export function autoCategorize(
  topics: string[],
  description: string | null,
  repoName: string,
): string[] {
  const haystack = `${topics.join(" ")} ${description ?? ""} ${repoName}`;
  return RULES.filter(([, re]) => re.test(haystack))
    .map(([slug]) => slug)
    .slice(0, 3);
}
