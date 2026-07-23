/** Fixed taxonomy for the index. Seeded idempotently; safe to re-run. */
export const CATEGORY_SEED: { slug: string; name: string; blurb: string }[] = [
  { slug: "practice-management", name: "Practice & Matter Management", blurb: "Run a firm or legal team: matters, time, billing, clients." },
  { slug: "document-automation", name: "Document Automation", blurb: "Assembly, templating, and guided drafting of legal documents." },
  { slug: "contracts", name: "Contracts & Analysis", blurb: "Contract lifecycle, review, redlining, and clause analysis." },
  { slug: "legal-research", name: "Legal Research & Search", blurb: "Finding and reading statutes, case law, and commentary." },
  { slug: "e-discovery", name: "E-Discovery & Forensics", blurb: "Collection, processing, and review of evidence at scale." },
  { slug: "court-data", name: "Court & Case-Law Data", blurb: "Scrapers, APIs, and corpora of judicial decisions and dockets." },
  { slug: "citations", name: "Citations & Parsing", blurb: "Citation extraction, normalization, and legal-text parsing." },
  { slug: "access-to-justice", name: "Access to Justice", blurb: "Tools that help people navigate the law without a lawyer." },
  { slug: "compliance", name: "Compliance & Privacy", blurb: "Regulatory compliance, data protection, and policy tooling." },
  { slug: "legal-ai", name: "Legal AI & NLP", blurb: "Models, pipelines, and applications for legal language." },
  { slug: "local-ai", name: "Local AI", blurb: "AI that runs on your own machine. No cloud, no data leaving the building." },
  { slug: "esignature", name: "E-Signature & Workflow", blurb: "Signing, approvals, and legally binding process automation." },
  { slug: "benchmarks-datasets", name: "Benchmarks & Datasets", blurb: "Evaluation suites and datasets for legal-domain systems." },
];
