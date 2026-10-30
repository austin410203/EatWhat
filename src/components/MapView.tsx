import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CUISINE_MAP, HOME, type Restaurant } from '../data/restaurants'
import { lowConfidence, trustScore } from '../lib/logic'

// 測試版地圖用 OpenStreetMap 圖磚；正式版接 Google 資料時要改用 Google 地圖（條款規定）。

function pinColor(r: Restaurant) {
  if (lowConfidence(r)) return '#f0a020'
  const s = trustScore(r)
  return s >= 4.3 ? '#22b14c' : s >= 3.9 ? '#4f8df5' : '#8a8f98'
}

export function MapView({ list, selected, onSelect, radiusKm, height = '100%', single }: {
  list: Restaurant[]
  selected?: string | null
  onSelect?: (id: string) => void
  radiusKm?: number
  height?: number | string
  single?: boolean
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const circle = useRef<L.Circle | null>(null)

  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([HOME.lat, HOME.lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(m)
    L.circleMarker([HOME.lat, HOME.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7bff', fillOpacity: 1 }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  useEffect(() => {
    const m = map.current, g = layer.current
    if (!m || !g) return
    g.clearLayers()
    list.forEach(r => {
      const sel = r.id === selected
      const icon = L.divIcon({
        className: 'pin-wrap',
        html: `<div class="pin ${sel ? 'sel' : ''}" style="--c:${pinColor(r)}"><span>${CUISINE_MAP[r.cuisine].emoji}</span></div>`,
        iconSize: [34, 40], iconAnchor: [17, 38],
      })
      const mk = L.marker([r.lat, r.lng], { icon, zIndexOffset: sel ? 1000 : 0 }).addTo(g)
      if (onSelect) mk.on('click', () => onSelect(r.id))
    })
    if (single && list[0]) m.setView([list[0].lat, list[0].lng], 16)
  }, [list, selected, onSelect, single])

  useEffect(() => {
    const m = map.current
    if (!m) return
    circle.current?.remove()
    if (radiusKm) {
      circle.current = L.circle([HOME.lat, HOME.lng], { radius: radiusKm * 1000, color: '#3ccf2e', weight: 1.5, fillOpacity: 0.05, dashArray: '6 6' }).addTo(m)
      m.fitBounds(circle.current.getBounds(), { padding: [10, 10] })
    }
  }, [radiusKm])

  useEffect(() => {
    const r = list.find(x => x.id === selected)
    if (r && map.current && !single) map.current.panTo([r.lat, r.lng])
  }, [selected, list, single])

  return <div ref={el} className="map" style={{ height }} />
}
