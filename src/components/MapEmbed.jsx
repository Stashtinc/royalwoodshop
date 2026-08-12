import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const COORDS = [44.0888, -79.4111]

const pinIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path d="M15 0C6.716 0 0 6.716 0 15c0 9.941 13.5 24.75 14.1 25.425a1.2 1.2 0 0 0 1.8 0C16.5 39.75 30 24.941 30 15 30 6.716 23.284 0 15 0z" fill="#0065ab"/>
    <circle cx="15" cy="15" r="6" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -44],
})

function AutoOpenPopup() {
  const map = useMap()
  const markerRef = useRef(null)

  useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.openPopup()
      }
    })
  }, [map])

  return null
}

export default function MapEmbed() {
  return (
    <MapContainer
      center={COORDS}
      zoom={15}
      style={{ height: '420px', width: '100%', display: 'block' }}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={COORDS} icon={pinIcon}>
        <Popup className="royal-popup" closeButton={false} minWidth={200}>
          <div style={{ fontFamily: 'sans-serif' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#0065ab', margin: '0 0 8px' }}>
              The Royal Wood Shop
            </p>
            <p style={{ fontSize: '13px', color: '#444', margin: '0 0 4px' }}>
              18237 Woodbine Ave<br />Sharon, ON L0G 1V0
            </p>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>
              Mon – Fri, 8:00am – 5:00pm
            </p>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=18237+Woodbine+Ave+Sharon+ON+L0G+1V0"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'white',
                background: '#0065ab',
                borderRadius: '6px',
                padding: '6px 14px',
                textDecoration: 'none',
              }}
            >
              Get Directions
            </a>
          </div>
        </Popup>
      </Marker>
      <AutoOpenPopup />
    </MapContainer>
  )
}
