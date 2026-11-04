export interface RiderRewardSettings { commission_percent: number; per_km_rate: number; points_per_order: number }
export const deliveryEarnings = (order: { total: number; distance_km?: number | null }, settings?: RiderRewardSettings | null) =>
  settings ? Number(order.total) * Number(settings.commission_percent) / 100 + Number(order.distance_km || 0) * Number(settings.per_km_rate) : 0;