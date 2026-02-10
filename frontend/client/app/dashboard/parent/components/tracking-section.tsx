'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useRef } from 'react'
import type * as LeafletTypes from 'leaflet'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Navigation, Phone, MessageSquare, MapPin, Clock as ClockIcon, AlertCircle, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// Helper function to get current user ID
function getCurrentUserId(): number | null {
  if (typeof window === 'undefined') return null
  
  const userId = localStorage.getItem('user_id')
  return userId ? parseInt(userId, 10) : null
}

// ================= MAP IMPORTS =================
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false })

// ================= LEAFLET SETUP =================
let L: typeof LeafletTypes | null = null

if (typeof window !== 'undefined') {
  import('leaflet').then((leaflet) => {
    L = leaflet.default
    
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  })
}

// ================= ICON CREATION FUNCTIONS =================
const createCustomIcon = (color: string) => {
  if (typeof window === 'undefined' || !L) return undefined
  
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

const createBusIcon = () => {
  if (typeof window === 'undefined' || !L) return undefined
  
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48">
        <rect x="8" y="16" width="48" height="32" rx="4" fill="#FFD700" stroke="#333" stroke-width="2"/>
        <rect x="12" y="20" width="18" height="12" rx="2" fill="#87CEEB"/>
        <rect x="34" y="20" width="18" height="12" rx="2" fill="#87CEEB"/>
        <rect x="12" y="36" width="40" height="4" fill="#333"/>
        <circle cx="18" cy="48" r="6" fill="#333" stroke="#666" stroke-width="2"/>
        <circle cx="18" cy="48" r="3" fill="#888"/>
        <circle cx="46" cy="48" r="6" fill="#333" stroke="#666" stroke-width="2"/>
        <circle cx="46" cy="48" r="3" fill="#888"/>
        <circle cx="14" cy="42" r="2" fill="#FFF"/>
        <circle cx="50" cy="42" r="2" fill="#FFF"/>
        <rect x="24" y="10" width="16" height="6" rx="2" fill="#FF6B6B"/>
        <text x="32" y="15" font-size="4" fill="white" text-anchor="middle" font-weight="bold">SCHOOL</text>
      </svg>
    `)}`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  })
}

// ================= MAP BOUNDS UPDATER COMPONENT =================
function MapBoundsUpdater({ route, mapRef, routeKey }: { 
  route: [number, number][], 
  mapRef: React.MutableRefObject<any>,
  routeKey: number 
}) {
  useEffect(() => {
    const getMapInstance = () => {
      const mapElement = document.querySelector('.leaflet-container')
      if (mapElement && (mapElement as any)._leaflet_id) {
        const maps = (window as any).L?._maps || {}
        const mapId = (mapElement as any)._leaflet_id
        return maps[mapId] || (mapElement as any)._map
      }
      return null
    }

    if (!route || route.length === 0 || !L) return

    const timer = setTimeout(() => {
      try {
        const map = getMapInstance()
        if (map && L) {
          mapRef.current = map
          const bounds = L.latLngBounds(route)
          map.fitBounds(bounds, {
            padding: [50, 50],
            animate: true,
            duration: 1.5,
            easeLinearity: 0.25
          })
        }
      } catch (error) {
        console.error('Error fitting bounds:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [routeKey, mapRef])

  return null
}

// ================= TYPES =================
type Booking = {
  booking_id: number
  user_id: number
  user_name: string
  pickup_location_name: string
  pickup_location_gps: string
  dropoff_location_name: string
  dropoff_location_gps: string
  route_name: string
  status: string
  service_type: string
  start_date: string
  end_date: string
}

type Trip = {
  trip_id: number
  booking_id: number
  trip_date: string
  service_time: string
  status: 'scheduled' | 'picked_up' | 'completed' | 'cancelled'
  pickup_location_name?: string
  pickup_location_gps?: string
  dropoff_location_name?: string
  dropoff_location_gps?: string
}

interface Props {
  initialBookingId?: number | null
}

// ================= HELPER FUNCTIONS =================
function parseGPS(gps: string): [number, number] | null {
  if (!gps) return null
  
  const parts = gps.split(',').map(s => parseFloat(s.trim()))
  
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]]
  }
  
  return null
}

function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371
  const dLat = (point2[0] - point1[0]) * Math.PI / 180
  const dLon = (point2[1] - point1[1]) * Math.PI / 180
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function estimateETA(distance: number, speedKmh: number = 30): string {
  const hours = distance / speedKmh
  const minutes = Math.round(hours * 60)
  
  if (minutes < 60) {
    return `${minutes} mins`
  }
  
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hrs}h ${mins}m`
}

function getActualLocations(booking: Booking) {
  const currentHour = new Date().getHours()
  
  const isMorningTime = currentHour >= 6 && currentHour < 12
  const isEveningTime = currentHour >= 12 && currentHour < 20
  
  let shouldSwap = false
  let timeSlot = 'off-hours'
  
  if (booking.service_type === 'morning') {
    shouldSwap = false
    timeSlot = 'morning'
  } else if (booking.service_type === 'evening') {
    shouldSwap = true
    timeSlot = 'evening'
  } else if (booking.service_type === 'both') {
    if (isMorningTime) {
      shouldSwap = false
      timeSlot = 'morning'
    } else if (isEveningTime) {
      shouldSwap = true
      timeSlot = 'evening'
    }
  }
  
  return {
    actualPickup: shouldSwap ? booking.dropoff_location_gps : booking.pickup_location_gps,
    actualPickupName: shouldSwap ? booking.dropoff_location_name : booking.pickup_location_name,
    actualDropoff: shouldSwap ? booking.pickup_location_gps : booking.dropoff_location_gps,
    actualDropoffName: shouldSwap ? booking.pickup_location_name : booking.dropoff_location_name,
    isReversed: shouldSwap,
    currentTimeSlot: timeSlot,
    serviceType: booking.service_type
  }
}

// ================= MAIN COMPONENT =================
export default function TrackingSection({ initialBookingId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null) // ✅ Track current trip status
  const [route, setRoute] = useState<[number, number][]>([])
  const [busPosition, setBusPosition] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [mapKey, setMapKey] = useState(0)
  const mapRef = useRef<any>(null)
  
  const [pickupIcon, setPickupIcon] = useState<any>(undefined)
  const [dropoffIcon, setDropoffIcon] = useState<any>(undefined)
  const [busIcon, setBusIcon] = useState<any>(undefined)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        const L = leaflet.default
        
        setTimeout(() => {
          try {
            setPickupIcon(createCustomIcon('#10b981'))
            setDropoffIcon(createCustomIcon('#ef4444'))
            setBusIcon(createBusIcon())
          } catch (error) {
            console.error('Error creating icons:', error)
          }
        }, 100)
      })
    }
  }, [])

  // ✅ Fetch today's trip status for selected booking
  const fetchTripStatus = async (bookingId: number) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      console.log('🔍 Fetching trip status for booking:', bookingId, 'on date:', today)
      
      // Get trips for this booking
      const res = await apiFetch(`/bookings/${bookingId}`)
      const data = await res.json()
      
      console.log('📦 Backend response:', data)
      
      if (data.trips && Array.isArray(data.trips)) {
        console.log('✅ Found trips array:', data.trips.length, 'trips')
        
        // Find today's trip
        const todayTrip = data.trips.find((trip: Trip) => {
          console.log('🔎 Checking trip:', trip.trip_id, 'date:', trip.trip_date, 'status:', trip.status)
          return trip.trip_date === today && trip.status !== 'cancelled'
        })
        
        if (todayTrip) {
          console.log('✅ Found today\'s trip! Status:', todayTrip.status)
        } else {
          console.log('⚠️ No trip found for today')
        }
        
        setCurrentTrip(todayTrip || null)
        return todayTrip
      }
      
      console.log('❌ No trips array in response')
      return null
    } catch (err) {
      console.error('❌ Failed to fetch trip status:', err)
      return null
    }
  }

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true)
        setError('')
        
        const userId = getCurrentUserId()
        
        if (!userId) {
          setError('User not authenticated. Please log in.')
          setLoading(false)
          return
        }
        
        const res = await apiFetch(`/bookings?user_id=${userId}`)
        
        if (!res.ok) {
          throw new Error(`Failed to fetch bookings: ${res.status}`)
        }
        
        const data = await res.json()
        
        let bookingsList: Booking[] = []
        
        if (Array.isArray(data)) {
          bookingsList = data
        } else if (data.bookings && Array.isArray(data.bookings)) {
          bookingsList = data.bookings
        } else if (data.data && Array.isArray(data.data)) {
          bookingsList = data.data
        }
        
        const activeBookings = bookingsList.filter((b: Booking) => 
          b.status === 'active' && 
          b.pickup_location_gps && 
          b.dropoff_location_gps
        )
        
        if (activeBookings.length === 0) {
          setError('No active bookings found with valid GPS coordinates')
        }
        
        setBookings(activeBookings)
        
        // Handle initial booking ID from props
        let selectedB: Booking | null = null
        if (initialBookingId && activeBookings.length > 0) {
          const matchingBooking = activeBookings.find(b => b.booking_id === initialBookingId)
          selectedB = matchingBooking || activeBookings[0]
        } else if (activeBookings.length > 0) {
          selectedB = activeBookings[0]
        }
        
        if (selectedB) {
          setSelectedBooking(selectedB)
          // ✅ Fetch trip status for selected booking
          await fetchTripStatus(selectedB.booking_id)
        }
      } catch (err) {
        console.error('Error fetching bookings:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings')
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
    
    // ✅ Poll trip status every 10 seconds
    const interval = setInterval(async () => {
      if (selectedBooking) {
        await fetchTripStatus(selectedBooking.booking_id)
      }
    }, 10000) // 10 seconds
    
    return () => clearInterval(interval)
  }, [initialBookingId])

  // ✅ Re-fetch trip status when booking changes
  useEffect(() => {
    if (selectedBooking) {
      fetchTripStatus(selectedBooking.booking_id)
    }
  }, [selectedBooking])

  useEffect(() => {
    if (!selectedBooking) return

    const { actualPickup, actualDropoff, isReversed, currentTimeSlot } = getActualLocations(selectedBooking)

    const pickup = parseGPS(actualPickup)
    const dropoff = parseGPS(actualDropoff)

    if (!pickup || !dropoff) {
      console.error('Invalid GPS coordinates')
      setError('Invalid GPS coordinates in booking')
      return
    }

    async function fetchRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup![1]},${pickup![0]};${dropoff![1]},${dropoff![0]}?overview=full&geometries=geojson`
        
        const res = await fetch(url)
        const data = await res.json()

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          )

          setRoute(coords)
          setBusPosition(coords[0])
          setMapKey(prev => prev + 1)
          setError('')
        } else {
          setError('Could not find route between locations')
        }
      } catch (err) {
        console.error('Failed to fetch route:', err)
        setError('Failed to fetch route from OSRM')
      }
    }

    fetchRoute()
  }, [selectedBooking])

  // ✅ Only animate bus when trip is actually in progress
  useEffect(() => {
    console.log('🚌 Bus animation effect triggered')
    console.log('📍 Route length:', route.length)
    console.log('📊 Current trip status:', currentTrip?.status)
    
    if (!route.length) {
      console.log('⚠️ No route, skipping animation')
      return
    }

    // Only animate if trip status is 'picked_up'
    if (currentTrip?.status !== 'picked_up') {
      console.log('🛑 Trip not in progress, bus staying at start position')
      // If not in progress, keep bus at starting position
      setBusPosition(route[0])
      return
    }

    console.log('✅ Trip is picked_up, starting bus animation!')

    let i = 0
    const interval = setInterval(() => {
      i++
      if (i < route.length) {
        setBusPosition(route[i])
      } else {
        i = 0
        setBusPosition(route[0])
      }
    }, 2000)

    return () => {
      console.log('🧹 Cleaning up bus animation interval')
      clearInterval(interval)
    }
  }, [route, currentTrip?.status]) // ✅ Added currentTrip?.status dependency

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tracking data...</p>
        </div>
      </div>
    )
  }

  if (error && bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Bookings</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Active Bookings</h3>
          <p className="text-muted-foreground mb-4">
            You don't have any active bookings to track. Create a booking to see live tracking.
          </p>
        </CardContent>
      </Card>
    )
  }

  // ✅ Check if trip is trackable (driver started trip)
  const isTripInProgress = currentTrip?.status === 'picked_up'
  const isTripCompleted = currentTrip?.status === 'completed'
  const isTripScheduled = currentTrip?.status === 'scheduled' || !currentTrip

  // Get actual locations for display
  const { 
    actualPickup, 
    actualPickupName, 
    actualDropoff, 
    actualDropoffName,
    isReversed,
    currentTimeSlot,
    serviceType
  } = selectedBooking ? getActualLocations(selectedBooking) : {
    actualPickup: null,
    actualPickupName: '',
    actualDropoff: null,
    actualDropoffName: '',
    isReversed: false,
    currentTimeSlot: 'off-hours',
    serviceType: ''
  }

  const pickup = actualPickup ? parseGPS(actualPickup) : null
  const dropoff = actualDropoff ? parseGPS(actualDropoff) : null
  const distance = pickup && dropoff ? calculateDistance(pickup, dropoff) : 0
  const eta = distance > 0 ? estimateETA(distance) : 'Calculating...'

  const getRouteLabel = () => {
    if (serviceType === 'morning') return '🌅 Morning Route'
    if (serviceType === 'evening') return '🌆 Evening Route'
    if (serviceType === 'both') {
      return currentTimeSlot === 'evening' ? '🌆 Evening Trip' : '🌅 Morning Trip'
    }
    return 'Active Route'
  }

  const getDirectionLabel = () => {
    return isReversed ? 'School → Home' : 'Home → School'
  }

  const initialCenter: [number, number] = pickup && dropoff 
    ? [(pickup[0] + dropoff[0]) / 2, (pickup[1] + dropoff[1]) / 2]
    : [-1.286389, 36.817223]

  return (
    <div className="space-y-6">
      {/* Booking Selector */}
      {bookings.length > 1 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Select Booking to Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {bookings.map((booking) => (
                <Button
                  key={booking.booking_id}
                  variant={selectedBooking?.booking_id === booking.booking_id ? 'default' : 'outline'}
                  onClick={() => setSelectedBooking(booking)}
                  className="text-sm"
                >
                  {booking.route_name} - {booking.service_type}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Trip Status Alert */}
      {isTripScheduled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Trip Not Started Yet</h3>
                <p className="text-sm text-amber-800">
                  The driver hasn't started the trip yet. Live tracking will appear once the driver clicks "Start Trip".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isTripCompleted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Trip Completed</h3>
                <p className="text-sm text-green-800">
                  Your child has been safely dropped off at the destination. Tracking is no longer available for this trip.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Only show map when trip is in progress */}
      {isTripInProgress && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAP */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex gap-2 items-center">
                    <Navigation className="w-5 h-5 text-blue-500" />
                    Live Trip Tracking - {selectedBooking?.route_name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
                      🚌 Live - Driver En Route
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {getRouteLabel()}
                    </Badge>
                    {isReversed && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        ↩️ Reversed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="h-[500px] w-full">
                  <MapContainer
                    center={initialCenter}
                    zoom={13}
                    className="h-full w-full"
                    key={mapKey}
                    zoomControl={true}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {route.length > 0 && <MapBoundsUpdater route={route} mapRef={mapRef} routeKey={mapKey} />}

                    {route.length > 0 && (
                      <Polyline 
                        positions={route} 
                        pathOptions={{ 
                          color: isReversed ? 'rgb(136, 158, 35)' : '#3b82f6', 
                          weight: 6,
                          opacity: 0.8
                        }} 
                      />
                    )}

                    {pickup && pickupIcon && typeof pickupIcon !== 'undefined' && (
                      <Marker position={pickup} icon={pickupIcon}>
                        <Popup>
                          <div className="font-semibold">🏁 Pickup Location</div>
                          <div className="text-sm">{actualPickupName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {isReversed ? '(School - Starting Point)' : '(Home - Starting Point)'}
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {dropoff && dropoffIcon && typeof dropoffIcon !== 'undefined' && (
                      <Marker position={dropoff} icon={dropoffIcon}>
                        <Popup>
                          <div className="font-semibold">🎯 Drop-off Location</div>
                          <div className="text-sm">{actualDropoffName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {isReversed ? '(Home - Destination)' : '(School - Destination)'}
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {busPosition && busIcon && typeof busIcon !== 'undefined' && (
                      <Marker position={busPosition} icon={busIcon}>
                        <Popup>
                          <div className="font-semibold">🚌 School Bus</div>
                          <div className="text-sm">En route to {actualDropoffName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {getDirectionLabel()}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDE INFO */}
          <div className="space-y-4">
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Trip Status</CardTitle>
                  <Badge className="bg-green-600 animate-pulse">
                    🚌 Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Direction Indicator */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Direction</p>
                  <p className="font-bold text-lg">{getDirectionLabel()}</p>
                  {serviceType === 'both' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Changes based on time of day
                    </p>
                  )}
                </div>

                {/* Route Info */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Route</p>
                  <p className="font-semibold">{selectedBooking?.route_name}</p>
                </div>

                {/* Current Pickup */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <p className="text-xs font-medium text-green-700">
                      Current Pickup {isReversed && '(School)'}
                    </p>
                  </div>
                  <p className="font-medium text-sm text-foreground">{actualPickupName}</p>
                </div>

                {/* Current Dropoff */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    <p className="text-xs font-medium text-red-700">
                      Current Drop-off {isReversed && '(Home)'}
                    </p>
                  </div>
                  <p className="font-medium text-sm text-foreground">{actualDropoffName}</p>
                </div>

                {/* Distance & ETA */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Distance</p>
                    <p className="font-bold text-lg">{distance.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Est. Time</p>
                    <p className="font-bold text-lg">{eta}</p>
                  </div>
                </div>

                {/* Info Box */}
                {isReversed && (
                  <div className="pt-3 border-t">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <ClockIcon className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-900 mb-1">Evening Route Active</p>
                          <p className="text-xs text-amber-700">
                            Bus is returning students from school to their homes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button variant="outline" className="w-full gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors">
                  <Phone className="w-4 h-4" />
                  Call Driver
                </Button>
                
                <Button variant="outline" className="w-full gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}