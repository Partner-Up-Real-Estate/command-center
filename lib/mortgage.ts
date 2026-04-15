/**
 * Canadian mortgage calculator.
 *
 * Rules (current as of 2024-2026):
 * - Interest compounds semi-annually, not in advance.
 * - Minimum down payment:
 *     < $500,000            → 5%
 *     $500,000–$1,499,999   → 5% of first $500k + 10% of remainder
 *     >= $1,500,000         → 20%
 * - CMHC insurance premium on the loan (required if LTV > 80%):
 *     down 5.00%–9.99%      → 4.00%
 *     down 10.00%–14.99%    → 3.10%
 *     down 15.00%–19.99%    → 2.80%
 *     down >= 20%           → 0% (uninsured)
 *   Plus a 0.20% surcharge on the premium rate when amortization > 25 years
 *   (insured only).
 */

export const AMORTIZATION_YEARS = 30
export const AMORTIZATION_MONTHS = AMORTIZATION_YEARS * 12

export interface ScenarioInput {
  price: number
  /** down payment as a fraction (0.05, 0.10, 0.15, 0.20, 0.25) */
  downPct: number
  /** annual nominal rate as a fraction (e.g. 0.0479 for 4.79%) */
  annualRate: number
}

export interface Scenario {
  downPct: number
  downAmount: number
  baseLoan: number
  cmhcPremiumPct: number
  cmhcPremiumAmount: number
  totalLoan: number
  monthlyPayment: number
  biweeklyPayment: number
  insured: boolean
  /** True if this down-payment scenario fails the Canadian minimum rules. */
  belowMinimum: boolean
  minRequired: number
}

/**
 * Calculate the minimum allowed down payment amount in dollars for a given
 * purchase price under Canadian rules.
 */
export function minDownPayment(price: number): number {
  if (price >= 1_500_000) return price * 0.20
  if (price <= 500_000) return price * 0.05
  return 500_000 * 0.05 + (price - 500_000) * 0.10
}

/**
 * Return the CMHC premium rate (as a fraction of the base loan).
 * Adds the 0.20% surcharge when amort > 25 years and insured.
 */
export function cmhcPremiumRate(downPct: number, amortYears: number): number {
  if (downPct >= 0.20) return 0
  let base: number
  if (downPct >= 0.15) base = 0.028
  else if (downPct >= 0.10) base = 0.031
  else base = 0.040
  if (amortYears > 25) base += 0.002
  return base
}

/**
 * Monthly payment using Canadian semi-annual compounding convention.
 */
export function monthlyPayment(loan: number, annualRate: number, months: number): number {
  if (loan <= 0) return 0
  if (annualRate <= 0) return loan / months
  // Semi-annual effective rate
  const semi = Math.pow(1 + annualRate / 2, 2) - 1
  // Equivalent monthly rate
  const m = Math.pow(1 + semi, 1 / 12) - 1
  return (loan * m) / (1 - Math.pow(1 + m, -months))
}

export function buildScenario(input: ScenarioInput): Scenario {
  const { price, downPct, annualRate } = input
  const downAmount = price * downPct
  const baseLoan = price - downAmount
  const minReq = minDownPayment(price)
  const belowMinimum = downAmount < minReq - 0.01

  const premiumRate = cmhcPremiumRate(downPct, AMORTIZATION_YEARS)
  const premiumAmount = baseLoan * premiumRate
  const totalLoan = baseLoan + premiumAmount

  const monthly = monthlyPayment(totalLoan, annualRate, AMORTIZATION_MONTHS)
  // Accelerated bi-weekly = monthly / 2
  const biweekly = monthly / 2

  return {
    downPct,
    downAmount,
    baseLoan,
    cmhcPremiumPct: premiumRate,
    cmhcPremiumAmount: premiumAmount,
    totalLoan,
    monthlyPayment: monthly,
    biweeklyPayment: biweekly,
    insured: premiumRate > 0,
    belowMinimum,
    minRequired: minReq,
  }
}

export const DEFAULT_DOWN_TIERS = [0.05, 0.10, 0.15, 0.20, 0.25]

export function buildScenarioTable(
  price: number,
  annualRate: number,
  tiers: number[] = DEFAULT_DOWN_TIERS
): Scenario[] {
  return tiers.map(downPct => buildScenario({ price, downPct, annualRate }))
}

// Formatting helpers used by UI + PDF
export function fmtMoney(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n)
}

export function fmtPct(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`
}
