// Assigns smallest vehicle that fits total weight
export function allocateVehicle(vehicles, weightKg) {
  const available = vehicles
    .filter((v) => v.status === 'AVAILABLE' && v.capacity_kg >= weightKg)
    .sort((a, b) => a.capacity_kg - b.capacity_kg)

  return available[0] ?? null
}