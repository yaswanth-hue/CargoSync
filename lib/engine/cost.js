// Haversine formula — distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Calculate total distance from an ordered array of GPS log points
export function calcDistanceKm(gpsLogs) {
  if (!gpsLogs || gpsLogs.length < 2) return 0
  let total = 0
  for (let i = 1; i < gpsLogs.length; i++) {
    total += haversineKm(
      gpsLogs[i - 1].lat,
      gpsLogs[i - 1].lng,
      gpsLogs[i].lat,
      gpsLogs[i].lng
    )
  }
  return Math.round(total * 100) / 100
}

// Calculate trip cost: distance × vehicle rate per km
export function calcTripCost(distanceKm, ratePerKm) {
  return Math.round(distanceKm * ratePerKm * 100) / 100
}