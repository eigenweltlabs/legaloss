import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submit a project" };

export default function SubmitPage() {
  return (
    <div className="container">
      <div className="narrow">
        <div className="section-head">
          <span className="eyebrow">Submit</span>
          <h1 className="display-m">Add a project to the index.</h1>
          <p className="body-l">
            Paste the GitHub repository. Stats come straight from the source and
            each repository can be indexed exactly once. Tagline and categories
            belong to the maintainer who claims it.
          </p>
        </div>
        <SubmitForm />
      </div>
    </div>
  );
}
