import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Legal imprint for LegalOSS.",
};

export default function ImprintPage() {
  return (
    <div className="container">
      <div className="narrow stack-24 prose">
        <div className="section-head">
          <span className="eyebrow">§ 5 DDG</span>
          <h1 className="display-m">Imprint.</h1>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Operator</h3>
          <p className="body">Poensgen Technology UG (haftungsbeschränkt)</p>
          <p className="body">Wiclefstr. 45</p>
          <p className="body">10551 Berlin, Germany</p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Management</h3>
          <p className="body">
            The company is currently managed by one managing director.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Contact</h3>
          <p className="body">
            E-Mail:{" "}
            <a href="mailto:chris@eigenweltlabs.com" className="accent">
              chris@eigenweltlabs.com
            </a>
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Commercial register</h3>
          <p className="body">
            Registry court: Amtsgericht Berlin (Charlottenburg), 14057 Berlin
          </p>
          <p className="body">Commercial register number: HRB 226111 B</p>
          <p className="body">
            Legal form: Unternehmergesellschaft (haftungsbeschränkt)
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Editorial responsibility</h3>
          <p className="body">Poensgen Technology UG (haftungsbeschränkt)</p>
          <p className="body">Wiclefstr. 45</p>
          <p className="body">10551 Berlin, Germany</p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Liability for content</h3>
          <p className="body">
            As a service provider, we are responsible for our own content on
            these pages under the general laws. Under sections 8 to 10 DDG, we
            are not obligated to monitor transmitted or stored third-party
            information or to investigate circumstances that indicate illegal
            activity.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Liability for links</h3>
          <p className="body">
            This website may contain links to external third-party websites,
            the contents of which we have no influence on. The respective
            provider or operator of the linked pages is responsible for their
            content.
          </p>
        </div>
      </div>
    </div>
  );
}
