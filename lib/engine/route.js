const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }

// Orders waypoints by priority (HIGH first) then required_at time
export function orderWaypoints(requests) {
  return [...requests].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1
    const pb = PRIORITY_ORDER[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    return new Date(a.required_at) - new Date(b.required_at)
  })
}