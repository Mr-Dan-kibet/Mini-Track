'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Truck,
  MapPin,
  TrendingUp,
  Clock,
  AlertCircle,
  Route as RouteIcon,
  UserCheck,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

type Driver = {
  id: number
  name: string
  email: string
  phone_number: string
  status?: 'Active' | 'Inactive' | string
}

type Route = {
  id: number
  name: string
  starting_point: string
  ending_point: string
  status?: 'Active' | 'Inactive' | string
}

type Vehicle = {
  id: number
  route_id: number | string
  user_id: number | string
  license_plate: string
  model: string
  capacity: number
  status?: 'Active' | 'Inactive' | string
}

// ✅ Backend-safe booking + stable key
type Booking = {
  // backend may send id OR booking_id OR something else
  id?: string | number
  booking_id?: string | number

  parent?: string
  route?: string
  seats?: number
  amount?: number
  status?: string
  time?: string

  // ✅ guaranteed unique key used for React list rendering
  key: string
}

// If status is missing, assume "Active" so cards don’t show 0
const isActiveOrMissing = (status: any) => {
  if (status === undefined || status === null || status === '') return true
  return String(status).toLowerCase() === 'active'
}

const toArray = (x: any) => {
  if (Array.isArray(x)) return x
  if (Array.isArray(x?.data)) return x.data
  if (Array.isArray(x?.results)) return x.results
  if (Array.isArray(x?.drivers)) return x.drivers
  if (Array.isArray(x?.routes)) return x.routes
  if (Array.isArray(x?.vehicles)) return x.vehicles
  if (Array.isArray(x?.items)) return x.items
  return []
}

const safeStr = (v: any) => String(v ?? '')

// ✅ Normalize bookings so keys never break
const normalizeBookings = (raw: any[]): Booking[] => {
  return raw.map((b: any, index: number) => {
    const rawId = b?.id ?? b?.booking_id ?? b?.bookingId ?? b?.uuid
    const stableKey =
      rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
        ? `booking-${String(rawId)}`
        : `booking-fallback-${index}-${Date.now()}`

    return {
      id: b?.id,
      booking_id: b?.booking_id,
      parent: b?.parent ?? b?.parent_name ?? b?.user_name ?? b?.user ?? '',
      route: b?.route ?? b?.route_name ?? '',
      seats: Number(b?.seats ?? b?.seats_booked ?? 0) || 0,
      amount: Number(b?.amount ?? b?.price ?? 0) || 0,
      status: b?.status ?? '',
      time: b?.time ?? b?.created_at ?? b?.createdAt ?? '',
      key: stableKey,
    }
  })
}

export default function OverviewSection() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        // const token = localStorage.getItem('token')

     const res = await apiFetch("/me", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Missing token. Please sign in again.");
        }


        const [driversRes, routesRes, vehiclesRes] = await Promise.all([
          apiFetch('/drivers', { credentials: 'include' }),
          apiFetch('/routes', { credentials: 'include' }),
          apiFetch('/vehicles', { credentials: 'include' }),
        ])

        if (!driversRes.ok) throw new Error(`Drivers fetch failed (${driversRes.status})`)
        if (!routesRes.ok) throw new Error(`Routes fetch failed (${routesRes.status})`)
        if (!vehiclesRes.ok) throw new Error(`Vehicles fetch failed (${vehiclesRes.status})`)

        const [driversJson, routesJson, vehiclesJson] = await Promise.all([
          driversRes.json(),
          routesRes.json(),
          vehiclesRes.json(),
        ])

        setDrivers(toArray(driversJson))
        setRoutes(toArray(routesJson))
        setVehicles(toArray(vehiclesJson))

        // Optional bookings: if endpoint exists use it; otherwise keep empty list.
        try {
          const bookingsRes = await apiFetch('/bookings', { credentials: 'include' })
          if (bookingsRes.ok) {
            const bookingsJson = await bookingsRes.json()
            const rawBookings = toArray(bookingsJson)
            setRecentBookings(normalizeBookings(rawBookings))
          } else {
            setRecentBookings([])
          }
        } catch {
          setRecentBookings([])
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load overview data')
        setDrivers([])
        setRoutes([])
        setVehicles([])
        setRecentBookings([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const activeDrivers = useMemo(
    () => drivers.filter(d => isActiveOrMissing((d as any).status)).length,
    [drivers]
  )
  const activeRoutes = useMemo(
    () => routes.filter(r => isActiveOrMissing((r as any).status)).length,
    [routes]
  )
  const activeVehicles = useMemo(
    () => vehicles.filter(v => isActiveOrMissing((v as any).status)).length,
    [vehicles]
  )

  // Creative backend-derived KPIs (no revenue/occupancy/satisfaction)
  const totalFleetCapacity = useMemo(
    () => vehicles.reduce((sum, v) => sum + (Number((v as any).capacity) || 0), 0),
    [vehicles]
  )

  const routesWithVehicles = useMemo(() => {
    const routeIds = new Set(vehicles.map(v => safeStr((v as any).route_id)))
    return routeIds.size
  }, [vehicles])

  const assignedDrivers = useMemo(() => {
    const driverIds = new Set(vehicles.map(v => safeStr((v as any).user_id)))
    return driverIds.size
  }, [vehicles])

  const fleetUtilization = useMemo(() => {
    const total = vehicles.length || 0
    if (!total) return 0
    // drivers assigned to vehicles / total vehicles
    const assigned = vehicles.filter(v => safeStr((v as any).user_id).trim() !== '').length
    return Math.round((assigned / total) * 100)
  }, [vehicles])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Loading dashboard data…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Please wait.</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Failed to load overview
            </CardTitle>
            <CardDescription>Check your API server, token, and endpoints.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics (4 cards only - no revenue/occupancy/satisfaction) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vehicles</p>
                <p className="text-3xl font-bold text-foreground mt-2">{activeVehicles}</p>
                <p className="text-xs text-muted-foreground mt-1">Fleet online</p>
              </div>
              <Truck className="w-10 h-10 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Drivers</p>
                <p className="text-3xl font-bold text-foreground mt-2">{activeDrivers}</p>
                <p className="text-xs text-muted-foreground mt-1">Available</p>
              </div>
              <Users className="w-10 h-10 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Routes Operational</p>
                <p className="text-3xl font-bold text-foreground mt-2">{activeRoutes}</p>
                <p className="text-xs text-muted-foreground mt-1">Configured</p>
              </div>
              <MapPin className="w-10 h-10 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today’s Bookings</p>
                <p className="text-3xl font-bold text-foreground mt-2">{recentBookings.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </div>
              <TrendingUp className="w-10 h-10 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Replaced bottom section: backend-derived Operational Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RouteIcon className="w-5 h-5" />
                Operational Snapshot
              </CardTitle>
              <CardDescription>Live figures computed from your database records</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total Fleet Capacity</p>
                  <Truck className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2">{totalFleetCapacity}</p>
                <p className="text-xs text-muted-foreground mt-1">Sum of all vehicle capacity</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Routes With Vehicles</p>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2">{routesWithVehicles}</p>
                <p className="text-xs text-muted-foreground mt-1">Unique route_id currently assigned</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Assigned Drivers</p>
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2">{assignedDrivers}</p>
                <p className="text-xs text-muted-foreground mt-1">Unique user_id on vehicles</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Fleet Utilization</p>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold mt-2">{fleetUtilization}%</p>
                <p className="text-xs text-muted-foreground mt-1">Vehicles with driver assigned</p>
              </div>
            </CardContent>
          </Card>

          {/* Latest Vehicles (from DB) */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Latest Vehicles
              </CardTitle>
              <CardDescription>Most recent entries from your fleet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No vehicles found.</div>
              ) : (
                vehicles.slice(0, 6).map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{v.license_plate}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {v.model} • capacity {v.capacity} • route_id {safeStr(v.route_id)} • driver {safeStr(v.user_id)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        isActiveOrMissing((v as any).status)
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : 'bg-gray-500/10 text-gray-600 border-gray-500/30'
                      }
                    >
                      {safeStr((v as any).status) || 'Active'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Latest Drivers (from DB) */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Latest Drivers
              </CardTitle>
              <CardDescription>Recently created driver accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drivers.length === 0 ? (
                <div className="text-sm text-muted-foreground">No drivers found.</div>
              ) : (
                drivers.slice(0, 6).map(d => (
                  <div key={d.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <p className="font-semibold text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{d.email}</p>
                    <p className="text-xs text-muted-foreground">{d.phone_number}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Optional: recent bookings if endpoint exists */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Bookings
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {recentBookings.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent bookings.</div>
              ) : (
                recentBookings.slice(0, 5).map(b => (
                  <div
                    key={b.key} // ✅ FIXED: always unique
                    className="p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground text-sm">
                        {b.id ?? b.booking_id ?? '—'}
                      </p>
                      <Badge variant="outline">{b.status || '—'}</Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {b.parent || '—'} • {b.route || '—'} • {b.time || '—'}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Seats: {b.seats ?? 0} • KES {b.amount ?? 0}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
