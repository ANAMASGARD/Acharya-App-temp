/** Support and legal links — replace with production URLs when available. */
export const legalLinks = {
  supportEmail: "support@acharya.app",
  privacyPolicyUrl: "https://acharya.app/privacy",
  termsUrl: "https://acharya.app/terms",
} as const;

/** Optional Clerk Account Portal URL (Dashboard → User & authentication → Account Portal). */
export const clerkAccountPortalUrl =
  process.env.EXPO_PUBLIC_CLERK_ACCOUNT_PORTAL_URL ?? "";
