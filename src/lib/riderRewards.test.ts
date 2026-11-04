import { expect, it } from "vitest";
import { deliveryEarnings } from "./riderRewards";
it("uses the admin's commission and real distance rate, including zero", () => {
  expect(deliveryEarnings({ total: 1000, distance_km: 3 }, { commission_percent: 5, per_km_rate: 20, points_per_order: 4 })).toBe(110);
  expect(deliveryEarnings({ total: 1000, distance_km: 3 }, { commission_percent: 0, per_km_rate: 0, points_per_order: 0 })).toBe(0);
  expect(deliveryEarnings({ total: 1000 })).toBe(0);
});