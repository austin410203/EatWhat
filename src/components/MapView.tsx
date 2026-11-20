import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Restaurant } from '../data/restaurants'
import { home } from '../lib/location'
import { useStore } from '../lib/store'
import { icon as iconUrl } from '../lib/assets'
import { lowConfidence, trustScore } from '../lib/logic'

// 測試版地圖用 OpenStreetMap 圖磚；正式版接 Google 資料時要改用 Google 地圖（條款規定）。

function pinColor(r: Restaurant) {
  if (lowConfidence(r)) return '#f2a516'
  const s = trustScore(r)
  return s >= 4.3 ? '#1fa463' : s >= 3.9 ? '#3d7bff' : '#9a958c'
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
  const me = useRef<L.CircleMarker | null>(null)
  const loc = useStore(s => s.location)
  const region = useStore(s => s.region)

  useEffect(() => {
    if (!el.current || map.current) return
    const h = home()
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([h.lat, h.lng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(m)
    me.current = L.circleMarker([h.lat, h.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#3d7bff', fillOpacity: 1 }).addTo(m)
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
        html: `<div class="pin ${sel ? 'sel' : ''}" style="--c:${pinColor(r)}"><img src="${iconUrl(r.cuisine)}" alt="" /></div>`,
        iconSize: [40, 48], iconAnchor: [20, 46],
      })
      const mk = L.marker([r.lat, r.lng], { icon, zIndexOffset: sel ? 1000 : 0 }).addTo(g)
      if (onSelect) mk.on('click', () => onSelect(r.id))
    })
    if (single && list[0]) m.setView([list[0].lat, list[0].lng], 16)
  }, [list, selected, onSelect, single])

  useEffect(() => {
    const m = map.current
    if (!m) return
    const h = home()
    me.current?.setLatLng([h.lat, h.lng])
    circle.current?.remove()
    if (region?.area && !single && list.length) {
      // 選了區域：直接框住該區的店
      m.fitBounds(L.latLngBounds(list.map(r => [r.lat, r.lng] as [number, number])), { padding: [24, 24], maxZoom: 16 })
    } else if (radiusKm && radiusKm < 99) {
      circle.current = L.circle([h.lat, h.lng], { radius: radiusKm * 1000, color: '#ff5a2c', weight: 1.5, fillOpacity: 0.04, dashArray: '6 6' }).addTo(m)
      m.fitBounds(circle.current.getBounds(), { padding: [10, 10] })
    } else if (radiusKm) {
      m.setView([h.lat, h.lng], 12)
    } else if (!single) {
      m.setView([h.lat, h.lng], 15)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm, loc, single, region])

  useEffect(() => {
    const r = list.find(x => x.id === selected)
    if (r && map.current && !single) map.current.panTo([r.lat, r.lng])
  }, [selected, list, single])

  return <div ref={el} className="map" style={{ height }} />
}
