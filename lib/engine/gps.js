// Simulated GPS coordinates for demo (bounding box around Hyderabad)
export function simulateGps(destination) {
  const seed = destination.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const lat = 17.3 + (seed % 100) / 1000
  const lng = 78.4 + (seed % 80) / 1000
  return { lat, lng, destination }
}