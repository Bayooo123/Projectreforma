export type SubscriptionBand = 'A' | 'B' | 'C';
export type SubscriptionTier = 'solo' | 'mid' | 'established';

export const SUBSCRIPTION_PRICES: Record<SubscriptionBand, Record<SubscriptionTier, number>> = {
    A: { solo: 120000, mid: 240000, established: 480000 },
    B: { solo: 102000, mid: 204000, established: 408000 },
    C: { solo: 84000,  mid: 168000, established: 336000 },
};

export const BAND_LABELS: Record<SubscriptionBand, string> = {
    A: 'Band A — Lagos / FCT',
    B: 'Band B — Mid-tier States',
    C: 'Band C — Lower-tier States',
};

export const BAND_STATES: Record<SubscriptionBand, string> = {
    A: 'Federal Capital Territory, Lagos',
    B: 'Akwa Ibom, Bayelsa, Benue, Cross River, Delta, Edo, Ekiti, Kwara, Kogi, Nasarawa, Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers',
    C: 'Abia, Adamawa, Anambra, Bauchi, Borno, Ebonyi, Enugu, Gombe, Imo, Jigawa, Kaduna, Kano, Katsina, Kebbi, Sokoto, Taraba, Yobe, Zamfara',
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
    solo:        'Solo & Small (1–3 users)',
    mid:         'Mid-size (4–12 users)',
    established: 'Established (13–20 users)',
};

export function getPrice(band: SubscriptionBand, tier: SubscriptionTier): number {
    return SUBSCRIPTION_PRICES[band][tier];
}

export function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG')}`;
}
