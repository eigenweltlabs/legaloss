import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Account</span>
        <h1 className="display-s">Your account.</h1>
        <p className="body">
          Connect GitHub under <em>Connected accounts</em> to claim projects you
          maintain.
        </p>
      </div>
      <div className="auth-shell">
        <UserProfile routing="path" path="/account" />
      </div>
    </div>
  );
}
