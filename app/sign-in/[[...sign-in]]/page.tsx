import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="container">
      <div className="section-head" style={{ textAlign: "center", alignItems: "center" }}>
        <span className="eyebrow">Account</span>
        <h1 className="display-s">Welcome back.</h1>
        <p className="body">
          Sign in to star, review, comment — and claim the projects you maintain.
        </p>
      </div>
      <div className="auth-shell">
        <SignIn routing="hash" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
