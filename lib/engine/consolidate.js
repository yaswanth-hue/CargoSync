// Groups approved requests by destination + 2hr time window
export function consolidateRequests(requests) {
  const groups = []

  const sorted = [...requests].sort(
    (a, b) => new Date(a.required_at) - new Date(b.required_at)
  )

  for (const req of sorted) {
    const dest = req.destination.toLowerCase().trim()
    const reqTime = new Date(req.required_at).getTime()

    const match = groups.find((g) => {
      const groupDest = g.destination.toLowerCase().trim()
      const groupTime = new Date(g.required_at).getTime()
      const withinWindow = Math.abs(reqTime - groupTime) <= 2 * 60 * 60 * 1000
      return groupDest === dest && withinWindow
    })

    if (match) {
      match.requests.push(req)
      match.total_weight_kg += req.weight_kg
    } else {
      groups.push({
        destination: req.destination,
        required_at: req.required_at,
        requests: [req],
        total_weight_kg: req.weight_kg,
      })
    }
  }

  return groups
}