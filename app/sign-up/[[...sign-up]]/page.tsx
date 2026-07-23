import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="container">
      <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
        <span className="eyebrow">Account</span>
        <h1 className="display-s">Join the index.</h1>
        <p className="body">
          An account is optional for browsing. It unlocks stars, reviews,
          comments, and maintainer claims.
        </p>
      </div>
      <div className="auth-shell">
        <SignUp routing="hash" signInUrl="/sign-in" />
      </div>
    </div>
  );
}
