import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-pitch">
            <h3>
              Open source for
              <br />
              the law.
            </h3>
            <div className="site-footer-ctas">
              <Link href="/submit" className="btn btn-primary">
                Submit a project
              </Link>
              <Link href="/projects" className="btn btn-glass">
                Browse the index
              </Link>
            </div>
          </div>
          <div className="site-footer-columns">
            <div>
              <h6>Index</h6>
              <Link href="/projects">Directory</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/submit">Submit a project</Link>
            </div>
            <div>
              <h6>Eigenwelt Labs</h6>
              <a href="https://eigenweltlabs.com" target="_blank" rel="noreferrer">
                eigenweltlabs.com
              </a>
              <a
                href="https://eigenweltlabs.com/research"
                target="_blank"
                rel="noreferrer"
              >
                Research
              </a>
              <Link href="/about">About this index</Link>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span className="site-footer-loc">
            <span className="dot" />
            Berlin, Germany
          </span>
          <span>
            © {new Date().getFullYear()} Eigenwelt Labs. An open index of legal
            open source.
          </span>
        </div>
      </div>
    </footer>
  );
}
