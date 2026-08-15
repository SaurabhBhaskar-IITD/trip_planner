import { ROOM_TYPE_CAPACITY, type RoomType } from "@/domain/shared/enums";

/**
 * Deterministic capacity mathematics (§8, §10).
 *
 * Rooms and vehicles are always WHOLE numbers, rounded UP when the group does not
 * divide evenly. No floating-point counts, no invented combinations — a single
 * room type / a single vehicle type at a time. Combined room configurations
 * (e.g. 3 doubles + 1 single) are deliberately NOT invented here; only what the
 * chosen occupancy supports.
 */

/** Rooms required for `travellers` at the given occupancy (ceil division). */
export function allocateRooms(travellers: number, occupancy: RoomType): number {
  if (travellers <= 0) return 0;
  const capacity = ROOM_TYPE_CAPACITY[occupancy];
  if (!capacity || capacity <= 0) return 0;
  return Math.ceil(travellers / capacity);
}

/** Vehicles required for `travellers` given a vehicle capacity (ceil division). */
export function allocateVehicles(travellers: number, vehicleCapacity: number): number {
  if (travellers <= 0) return 0;
  if (!vehicleCapacity || vehicleCapacity <= 0) return 0; // caller treats 0 as invalid
  return Math.ceil(travellers / vehicleCapacity);
}
