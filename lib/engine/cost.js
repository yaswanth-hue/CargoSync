/**
 * Calculate total distance traveled from a GPS trail using Haversine formula.
 * Sums distance between consecutive points.
 */
export function calculateDistanceFromTrail(gpsLogs) {
  if (!gpsLogs || gpsLogs.length < 2) return 0

  let totalKm = 0
  for (let i = 1; i < gpsLogs.length; i++) {
    totalKm += haversineDistance(
      gpsLogs[i - 1].lat,
      gpsLogs[i - 1].lng,
      gpsLogs[i].lat,
      gpsLogs[i].lng
    )
  }
  return +totalKm.toFixed(2)
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Calculate trip cost based on actual distance and vehicle rate.
 */
export function calculateTripCost(distanceKm, ratePerKm = 10) {
  return +(distanceKm * ratePerKm).toFixed(2)
}

/**
 * Validate a vendor's claimed distance/cost against actual GPS-derived distance.
 * Returns whether the claim is within acceptable tolerance.
 */
export function validateDistanceClaim(claimedKm, actualKm, tolerancePercent = 10) {
  const allowedKm = actualKm * (1 + tolerancePercent / 100)
  const valid = claimedKm <= allowedKm
  return {
    valid,
    actualKm: +actualKm.toFixed(2),
    claimedKm: +claimedKm.toFixed(2),
    excessKm: valid ? 0 : +(claimedKm - allowedKm).toFixed(2),
  }
}