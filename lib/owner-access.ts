export const OWNER_EMAILS = [
  'markparsonsjrmusic@gmail.com',
  'mpjrecords90@gmail.com',
  'workinwithai@gmail.com',
] as const;

const OWNER_EMAIL_SET = new Set<string>(OWNER_EMAILS);

export type AccessProfile = {
  is_admin?: boolean | null;
  email?: string | null;
  subscription_status?: string | null;
  monthly_quota_remaining?: number | null;
  credits?: number | null;
};

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAIL_SET.has(email.trim().toLowerCase());
}

/** True when the signed-in user is an admin or a local owner-email allowlist match. */
export function hasUnlimitedAccess(
  profile: AccessProfile | null | undefined,
  signedInEmail?: string | null
): boolean {
  if (profile?.is_admin === true) return true;
  return isOwnerEmail(signedInEmail) || isOwnerEmail(profile?.email);
}

/**
 * Songs the user can spend. `null` means unlimited (admin or owner email).
 * Regular users get active-subscription quota plus one-time credits.
 */
export function remainingCredits(
  profile: AccessProfile | null | undefined,
  signedInEmail?: string | null
): number | null {
  if (hasUnlimitedAccess(profile, signedInEmail)) return null;

  const quota =
    profile?.subscription_status === 'active'
      ? (profile?.monthly_quota_remaining ?? 0)
      : 0;

  return quota + (profile?.credits ?? 0);
}
