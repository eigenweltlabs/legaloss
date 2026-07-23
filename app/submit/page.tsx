import type { Metadata } from "next";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { SubmitForm } from "@/components/submit-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submit a project" };

export default async function SubmitPage() {
  const cats = await db.select().from(categories).orderBy(categories.sort);

  return (
    <div className="container">
      <div className="narrow">
        <div className="section-head">
          <span className="eyebrow">Submit</span>
          <h1 className="display-m">Add a project to the index.</h1>
          <p className="body-l">
            Paste the GitHub repository. We pull the stats straight from the
            source — each repository can be indexed exactly once.
          </p>
        </div>
        <SubmitForm
          categories={cats.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </div>
    </div>
  );
}
