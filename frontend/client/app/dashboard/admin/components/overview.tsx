'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Truck, MapPin, TrendingUp, Clock, AlertCircle, Route as RouteIcon, UserCheck, BarChart3, Activity, Zap } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type Driver = { id: number; name: string; email: string; phone_number: string; status?: 'Active' | 'Inactive' | string }
type Route = { id: number; name: string; starting_point: string; ending_point: string; status?: 'Active' | 'Inactive' | string }
type Vehicle = { id: number; route_id: number | string; user_id: number | string; license_plate: string; model: string; capacity: number; status?: 'Active' | 'Inactive' | string }
type Booking = { id?: string | number; booking_id?: string | number; parent?: string; route?: string; seats?: number; amount?: number; status?: string; time?: string; key: string }

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

const normalizeBookings = (raw: any[]): Booking[] => {
  return raw.map((b: any, index: number) => {
    const rawId = b?.id ?? b?.booking_id ?? b?.bookingId ?? b?.uuid
    const stableKey = rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
      ? `booking-${String(rawId)}`
      : `booking-fallback-${index}-${Date.now()}`
    return {
      id: b?.id, booking_id: b?.booking_id, parent: b?.parent ?? b?.parent_name ?? b?.user_name ?? b?.user ?? '',
      route: b?.route ?? b?.route_name ?? '', seats: Number(b?.seats ?? b?.seats_booked ?? 0) || 0,
      amount: Number(b?.amount ?? b?.price ?? 0) || 0, status: b?.status ?? '', time: b?.time ?? b?.created_at ?? b?.createdAt ?? '', key: stableKey,
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
      setLoading(true); setError(null)
      try {
        const [driversRes, routesRes, vehiclesRes] = await Promise.all([
          apiFetch('/drivers', { credentials: "include" }),
          apiFetch('/routes', { credentials: "include" }),
          apiFetch('/vehicles', { credentials: "include" }),
        ])

        if (!driversRes.ok) throw new Error(`Drivers fetch failed (${driversRes.status})`)
        if (!routesRes.ok) throw new Error(`Routes fetch failed (${routesRes.status})`)
        if (!vehiclesRes.ok) throw new Error(`Vehicles fetch failed (${vehiclesRes.status})`)

        const [driversJson, routesJson, vehiclesJson] = await Promise.all([driversRes.json(), routesRes.json(), vehiclesRes.json()])
        setDrivers(toArray(driversJson)); setRoutes(toArray(routesJson)); setVehicles(toArray(vehiclesJson))

        try {
          const bookingsRes = await apiFetch('/bookings', { credentials: "include" })
          if (bookingsRes.ok) {
            const bookingsJson = await bookingsRes.json()
            const rawBookings = toArray(bookingsJson)
            setRecentBookings(normalizeBookings(rawBookings))
          } else { setRecentBookings([]) }
        } catch { setRecentBookings([]) }
      } catch (e: any) {
        console.error(e); setError(e?.message || 'Failed to load overview data')
        setDrivers([]); setRoutes([]); setVehicles([]); setRecentBookings([])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const activeDrivers = useMemo(() => drivers.filter(d => isActiveOrMissing((d as any).status)).length, [drivers])
  const activeRoutes = useMemo(() => routes.filter(r => isActiveOrMissing((r as any).status)).length, [routes])
  const activeVehicles = useMemo(() => vehicles.filter(v => isActiveOrMissing((v as any).status)).length, [vehicles])
  const totalFleetCapacity = useMemo(() => vehicles.reduce((sum, v) => sum + (Number((v as any).capacity) || 0), 0), [vehicles])
  const routesWithVehicles = useMemo(() => { const routeIds = new Set(vehicles.map(v => safeStr((v as any).route_id))); return routeIds.size }, [vehicles])
  const assignedDrivers = useMemo(() => { const driverIds = new Set(vehicles.map(v => safeStr((v as any).user_id))); return driverIds.size }, [vehicles])
  const fleetUtilization = useMemo(() => {
    const total = vehicles.length || 0; if (!total) return 0
    const assigned = vehicles.filter(v => safeStr((v as any).user_id).trim() !== '').length
    return Math.round((assigned / total) * 100)
  }, [vehicles])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Dashboard Overview</CardTitle>
                <CardDescription>Loading system data...</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-white to-red-50 border border-red-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Dashboard Error</CardTitle>
                <CardDescription className="text-red-600">Failed to load system data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
            <p className="text-sm text-gray-500">Real-time operational insights</p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <Activity className="w-3 h-3 mr-1" /> Live Dashboard
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-700">Active Vehicles</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeVehicles}</p>
                <p className="text-xs text-gray-500 mt-1">{vehicles.length} total in fleet</p>
              </div>
              <Zap className="w-8 h-8 text-blue-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-emerald-700">Active Drivers</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeDrivers}</p>
                <p className="text-xs text-gray-500 mt-1">{drivers.length} total accounts</p>
              </div>
              <UserCheck className="w-8 h-8 text-emerald-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-orange-700">Active Routes</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeRoutes}</p>
                <p className="text-xs text-gray-500 mt-1">{routes.length} total configured</p>
              </div>
              <RouteIcon className="w-8 h-8 text-orange-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-purple-700">Today's Bookings</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{recentBookings.length}</p>
                <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
              </div>
              <Clock className="w-8 h-8 text-purple-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700">
                  <RouteIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Operational Snapshot</CardTitle>
                  <CardDescription>Live system metrics and performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Total Fleet Capacity</p>
                    <Truck className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{totalFleetCapacity}</p>
                  <p className="text-xs text-gray-500 mt-1">Combined seating capacity</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Routes With Vehicles</p>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{routesWithVehicles}</p>
                  <p className="text-xs text-gray-500 mt-1">Active route assignments</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Assigned Drivers</p>
                    <UserCheck className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{assignedDrivers}</p>
                  <p className="text-xs text-gray-500 mt-1">Drivers with vehicle assignments</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Fleet Utilization</p>
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{fleetUtilization}%</p>
                  <p className="text-xs text-gray-500 mt-1">Vehicles with driver assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Vehicles */}
          <Card className="bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">Latest Vehicles</CardTitle>
                  <CardDescription>Recent additions to the fleet</CardDescription>
                </div>
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  {vehicles.length} Total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehicles.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No vehicles in fleet</p>
                  </div>
                ) : (
                  vehicles.slice(0, 6).map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                          <Truck className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{v.license_plate}</p>
                          <p className="text-xs text-gray-500">{v.model} • {v.capacity} seats</p>
                        </div>
                      </div>
                      <Badge className={safeStr(v.user_id).trim() ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                        {safeStr(v.user_id).trim() ? 'Assigned' : 'Unassigned'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Drivers & Bookings */}
        <div className="space-y-6">
          {/* Latest Drivers */}
          <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">Latest Drivers</CardTitle>
                  <CardDescription>Recently added accounts</CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {drivers.length} Total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drivers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No drivers found</p>
                  </div>
                ) : (
                  drivers.slice(0, 6).map(d => (
                    <div key={d.id} className="p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-sm">
                      <p className="font-semibold text-gray-900">{d.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="truncate">{d.email}</span>
                        <span>•</span>
                        <span>{d.phone_number}</span>
                      </div>
                      <Badge className="mt-2 bg-blue-100 text-blue-800 border-blue-200">
                        {safeStr(d.status) || 'Active'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
                  <CardDescription>Latest transportation bookings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentBookings.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent bookings</p>
                  </div>
                ) : (
                  recentBookings.slice(0, 5).map(b => (
                    <div key={b.key} className="p-4 rounded-xl bg-white border border-gray-100 hover:border-purple-200 transition-all duration-300 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {b.parent || '—'} • {b.route || '—'}
                        </p>
                        <Badge className={b.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
                          {b.status || '—'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>Seats: {b.seats ?? 0}</span>
                        <span>KES {b.amount ?? 0}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{b.time || '—'}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}