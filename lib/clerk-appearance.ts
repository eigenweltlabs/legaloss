import type { Appearance } from "@clerk/types";

// Theme Clerk's prebuilt components (SignIn, UserProfile, ...) to
// "Deep Current": paper surfaces, ultramarine primary, Geist, 14px radius.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#18498b",
    colorText: "#0e0a07",
    colorTextSecondary: "rgba(14, 10, 7, 0.45)",
    colorBackground: "#fefefe",
    colorInputBackground: "#ffffff",
    colorDanger: "#b3362b",
    colorSuccess: "#4ba884",
    borderRadius: "0.875rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: { boxShadow: "none", border: "1px solid rgba(14, 10, 7, 0.1)" },
    formButtonPrimary: {
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), var(--shadow-blue)",
      border: "1px solid rgba(255,255,255,0.3)",
    },
  },
};
