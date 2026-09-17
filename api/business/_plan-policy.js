/*
 * LINK BUSINESS PLAN POLICY V1
 *
 * SINGLE SOURCE OF TRUTH
 *
 * FREE:
 * - private LINK participation
 * - resource posting
 * - nonprofit requests
 * - nonprofit / local-need matching
 * - no public business visibility
 * - no impact analytics/reporting
 *
 * PAID TIER 2+:
 * - public visibility eligibility
 * - impact analytics/reporting
 * - expanded marketing / recognition according to plan
 *
 * PUBLIC BUSINESS LAUNCH:
 * October 10, 2026 — Lake Norman / Eastern Time
 *
 * EARLY PARTNER OFFER:
 * 10% off first year for Tier 2+ upgrades before launch.
 */

export const BUSINESS_PUBLIC_LAUNCH_ISO =
  "2026-10-10T00:00:00-04:00";

export const EARLY_PARTNER_CUTOFF_ISO =
  BUSINESS_PUBLIC_LAUNCH_ISO;

export const EARLY_PARTNER_DISCOUNT_PERCENT =
  10;

/*
 * PUBLIC BUSINESS PARTICIPATION POLICY
 *
 * Base business participation: $150/year
 * Includes: initial setup + basic annual maintenance
 * Premium / partner services remain separate
 *
 * IMPORTANT:
 * Existing internal plan keys are preserved for compatibility.
 * Payment enforcement is not activated by this policy update.
 */
export const BUSINESS_BASE_ANNUAL_PRICE = 150;
export const BUSINESS_BASE_PRICE_LABEL = "$150/year";
export const BUSINESS_PAYMENT_ENFORCEMENT_ACTIVE = false;

export const BUSINESS_COMPLIMENTARY_ACCESS_END_ISO =
  "2026-10-16T00:00:00-04:00";

export const BUSINESS_COMPLIMENTARY_THROUGH_LABEL =
  "October 15, 2026";

export const BUSINESS_PAID_PARTICIPATION_START_LABEL =
  "October 16, 2026";



export function normalizePlanTier(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isFreeBusinessPlan(planTier) {
  const tier = normalizePlanTier(planTier);

  return (
    !tier ||
    tier === "community_free"
  );
}

export function isPaidBusinessPlan(planTier) {
  return !isFreeBusinessPlan(planTier);
}

export function publicBusinessLaunchOpen(now = new Date()) {
  return (
    now.getTime() >=
    new Date(BUSINESS_PUBLIC_LAUNCH_ISO).getTime()
  );
}

export function earlyPartnerOfferOpen(now = new Date()) {
  return (
    now.getTime() <
    new Date(EARLY_PARTNER_CUTOFF_ISO).getTime()
  );
}

export function businessComplimentaryAccessOpen(now = new Date()) {
  return (
    now.getTime() <
    new Date(BUSINESS_COMPLIMENTARY_ACCESS_END_ISO).getTime()
  );
}

export function canUseImpactReporting(planTier) {
  return isPaidBusinessPlan(planTier);
}

export function canBePublicBusiness(planTier, now = new Date()) {
  return (
    isPaidBusinessPlan(planTier) &&
    publicBusinessLaunchOpen(now)
  );
}

export function businessPlanPolicy(planTier, now = new Date()) {
  const free =
    isFreeBusinessPlan(planTier);

  const paid =
    !free;

  const launchOpen =
    publicBusinessLaunchOpen(now);

  const earlyOffer =
    earlyPartnerOfferOpen(now);

  return {
    planTier:
      normalizePlanTier(planTier) ||
      "community_free",

    free,
    paid,

    publicLaunchAt:
      BUSINESS_PUBLIC_LAUNCH_ISO,

    publicLaunchOpen:
      launchOpen,

    earlyPartnerOfferOpen:
      earlyOffer,

    earlyPartnerDiscountPercent:
      EARLY_PARTNER_DISCOUNT_PERCENT,
    baseAnnualPrice:
      BUSINESS_BASE_ANNUAL_PRICE,
    basePriceLabel:
      BUSINESS_BASE_PRICE_LABEL,
    paymentEnforcementActive:
      BUSINESS_PAYMENT_ENFORCEMENT_ACTIVE,
    complimentaryAccessThrough:
      BUSINESS_COMPLIMENTARY_THROUGH_LABEL,
    paidParticipationStarts:
      BUSINESS_PAID_PARTICIPATION_START_LABEL,
    complimentaryAccessOpen:
      businessComplimentaryAccessOpen(now),

    entitlements: {
      privatePortal: true,
      postResources: true,
      receiveNonprofitRequests: true,
      nonprofitMatching: true,

      impactReporting:
        paid,

      publicBusinessVisibility:
        paid && launchOpen,

      publicBusinessProfile:
        paid && launchOpen,

      publicLogoRecognition:
        paid && launchOpen,

      publicPromotion:
        paid && launchOpen
    }
  };
}
