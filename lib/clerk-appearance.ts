import type { Appearance } from "@clerk/types";

// Theme Clerk's prebuilt components (SignIn, UserProfile, ...) to "Solar":
// warm cream paper, vermilion primary, JetBrains Mono, square-ish panels.
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#C2371F",
    colorText: "#1f1208",
    colorTextSecondary: "#87694C",
    colorBackground: "#FBF7E8",
    colorInputBackground: "#FFFFFF",
    colorDanger: "#C2371F",
    colorSuccess: "#1F4D3F",
    borderRadius: "0.25rem",
    fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
  },
  elements: {
    card: { boxShadow: "none", border: "1px solid rgba(58, 40, 24, 0.15)" },
  },
};
