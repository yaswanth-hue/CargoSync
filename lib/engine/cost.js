/**
 * Calculate total distance traveled from a GPS trail using Haversine formula.
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

/**
 * Calculate trip cost based on actual distance and vehicle rate.
 */
export function calculateTripCost(distanceKm, ratePerKm = 10) {
  return +(distanceKm * ratePerKm).toFixed(2)
}

/**
 * Validate a vendor's claimed distance/cost against actual GPS-derived distance.
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

/**
 * Detect stationary periods in a GPS trail.
 * A stationary period is where the vehicle didn't move more than thresholdKm
 * for at least minDurationMs milliseconds.
 */
export function detectStationaryPeriods(gpsLogs, thresholdKm = 0.05, minDurationMs = 60000) {
  if (!gpsLogs || gpsLogs.length < 2) return []

  const periods = []
  let periodStart = null
  let periodStartIdx = 0

  for (let i = 1; i < gpsLogs.length; i++) {
    const dist = haversineDistance(
      gpsLogs[i - 1].lat,
      gpsLogs[i - 1].lng,
      gpsLogs[i].lat,
      gpsLogs[i].lng
    )

    if (dist < thresholdKm) {
      // Vehicle is stationary
      if (!periodStart) {
        periodStart = new Date(gpsLogs[i - 1].timestamp)
        periodStartIdx = i - 1
      }
    } else {
      // Vehicle moved — close any open stationary period
      if (periodStart) {
        const endTime = new Date(gpsLogs[i - 1].timestamp)
        const durationMs = endTime - periodStart
        if (durationMs >= minDurationMs) {
          periods.push({
            startTime: periodStart.toISOString(),
            endTime: endTime.toISOString(),
            durationMinutes: Math.round(durationMs / 60000),
            lat: gpsLogs[periodStartIdx].lat,
            lng: gpsLogs[periodStartIdx].lng,
          })
        }
        periodStart = null
      }
    }
  }

  // Close any still-open period at end of trail
  if (periodStart) {
    const endTime = new Date(gpsLogs[gpsLogs.length - 1].timestamp)
    const durationMs = endTime - periodStart
    if (durationMs >= minDurationMs) {
      periods.push({
        startTime: periodStart.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: Math.round(durationMs / 60000),
        lat: gpsLogs[periodStartIdx].lat,
        lng: gpsLogs[periodStartIdx].lng,
      })
    }
  }

  return periods
}