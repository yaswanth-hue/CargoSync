'use client'
import { useEffect, useRef } from 'react'

export default function TripMap({ gpsLogs }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!gpsLogs || gpsLogs.length < 2) return
    if (!mapRef.current) return

    const mapNode = mapRef.current
    let cancelled = false

    // Cleanup any existing instance synchronously before (re)creating
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    import('leaflet').then((L) => {
      // Bail out if this effect run was superseded/unmounted before
      // the async import resolved (prevents the double-init race).
      if (cancelled || !mapRef.current) return

      // Clear leaflet's internal state on the DOM node right before
      // creating the map — not earlier, since another (newer) effect
      // run could have already claimed this node in the meantime.
      if (mapRef.current._leaflet_id) {
        mapRef.current._leaflet_id = null
      }

      // If a map instance was created by a run that started after
      // this one but resolved first, don't stomp on it.
      if (mapInstanceRef.current) return

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const coords = gpsLogs.map((log) => [log.lat, log.lng])
      const center = coords[Math.floor(coords.length / 2)]

      const map = L.map(mapRef.current, {
        zoomControl: true,
        preferCanvas: true,
      }).setView(center, 15)

      mapInstanceRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const polyline = L.polyline(coords, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.9,
      }).addTo(map)

      // Start marker — green
      L.circleMarker(coords[0], {
        radius: 8,
        fillColor: '#4ade80',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map).bindPopup('Trip started here')

      // End marker — red
      L.circleMarker(coords[coords.length - 1], {
        radius: 8,
        fillColor: '#f87171',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map).bindPopup('Last known position')

      // Fit bounds after a short delay to ensure container is sized
      setTimeout(() => {
        if (cancelled) return
        map.invalidateSize()
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
      }, 100)
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      // Belt-and-suspenders: some Leaflet versions leave this flag set
      // on the DOM node even after remove(), which trips the "already
      // initialized" check on the very next mount.
      if (mapNode && mapNode._leaflet_id) {
        mapNode._leaflet_id = null
      }
    }
  }, [gpsLogs])

  if (!gpsLogs || gpsLogs.length < 2) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-medium text-white mb-3">GPS trail</h2>
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
          No GPS data yet — map appears once driver starts the trip
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white">GPS trail</h2>
        <span className="text-xs text-gray-500">{gpsLogs.length} data points</span>
      </div>
      <div
        ref={mapRef}
        style={{ height: '300px', width: '100%', borderRadius: '8px', zIndex: 0 }}
      />
    </div>
  )
}