'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Clock, Truck, AlertCircle, MapPin, TrendingUp, Activity, BarChart3, Zap } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type Driver = {
  id: number
  name: string
  email: string
  phone_number: string
  status?: string
}

type Route = {
  id: number
  name: string
  starting_point: string
  ending_point: string
  status?: string
}

type Vehicle = {
  id: number
  route_id: number | string
  user_id: number | string
  license_plate: string
  model: string
  capacity: number
  status?: string
}

type Booking = {
  id: string
  parent: string
  route: string
  seats: number
  amount: number
  status: string
  time: string
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

const s = (v: any) => String(v ?? '')

export default function AnalyticsSection() {
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
        const [driversRes, routesRes, vehiclesRes] = await Promise.all([
          apiFetch('/drivers', { credentials: "include" }),
          apiFetch('/routes', { credentials: "include" }),
          apiFetch('/vehicles', { credentials: "include" }),
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

        try {
          const bookingsRes = await apiFetch('/bookings/recent', { credentials: "include" })
          if (bookingsRes.ok) {
            const bookingsJson = await bookingsRes.json()
            setRecentBookings(toArray(bookingsJson))
          } else {
            setRecentBookings([])
          }
        } catch {
          setRecentBookings([])
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load analytics data')
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

  const totalTrips = useMemo(() => {
    if (recentBookings.length > 0) return recentBookings.length
    return vehicles.length
  }, [recentBookings, vehicles])

  const activeUsers = useMemo(() => drivers.length, [drivers])

  const onTimeRate = useMemo(() => {
    const total = vehicles.length
    if (!total) return 0
    const assigned = vehicles.filter(v => s(v.user_id).trim() !== '' && s(v.user_id) !== '0').length
    return Math.round((assigned / total) * 1000) / 10
  }, [vehicles])

  const routesWithVehicles = useMemo(() => {
    const set = new Set(vehicles.map(v => s(v.route_id)).filter(x => x.trim() !== '' && x !== '0'))
    return set.size
  }, [vehicles])

  const unassignedVehicles = useMemo(() => {
    return vehicles.filter(v => s(v.user_id).trim() === '' || s(v.user_id) === '0').length
  }, [vehicles])

  const totalFleetCapacity = useMemo(() => {
    return vehicles.reduce((sum, v) => sum + (Number(v.capacity) || 0), 0)
  }, [vehicles])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Analytics Dashboard</CardTitle>
                <CardDescription>Loading data...</CardDescription>
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
      <Card className="bg-gradient-to-br from-white to-red-50 border border-red-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Analytics Error</CardTitle>
              <CardDescription className="text-red-600">{error}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 p-4 bg-red-50 rounded-lg border border-red-100">
            Check Network tab for <b>/drivers</b>, <b>/routes</b>, <b>/vehicles</b>.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Performance Analytics</h2>
            <p className="text-sm text-gray-500">Real-time insights and metrics</p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <Activity className="w-3 h-3 mr-1" /> Live Data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-700">Total Trips</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalTrips}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {recentBookings.length > 0 ? 'Recent bookings' : 'Total fleet vehicles'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-purple-700">Active Users</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeUsers}</p>
                <p className="text-xs text-gray-500 mt-2">Driver accounts in system</p>
              </div>
              <Users className="w-8 h-8 text-purple-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-cyan-50 border border-cyan-100 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-600">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-cyan-700">On-Time Rate</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{onTimeRate}%</p>
                <p className="text-xs text-gray-500 mt-2">Vehicles with assigned drivers</p>
              </div>
              <Clock className="w-8 h-8 text-cyan-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-base font-semibold">Operations Summary</CardTitle>
            </div>
            <CardDescription>System performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-emerald-100">
              <span className="text-sm font-medium text-gray-700">Fleet Capacity</span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{totalFleetCapacity}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-emerald-100">
              <span className="text-sm font-medium text-gray-700">Routes with Vehicles</span>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">{routesWithVehicles}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-emerald-100">
              <span className="text-sm font-medium text-gray-700">Unassigned Vehicles</span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">{unassignedVehicles}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-emerald-100">
              <span className="text-sm font-medium text-gray-700">Total Routes</span>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">{routes.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-orange-50 border border-orange-100 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-semibold">Latest Vehicles</CardTitle>
                <CardDescription>Recently added fleet vehicles</CardDescription>
              </div>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                {vehicles.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No vehicles found</p>
                </div>
              ) : (
                vehicles.slice(0, 6).map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-4 bg-white/70 rounded-xl border border-gray-100 hover:border-orange-200 transition-all duration-300 group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{v.license_plate}</p>
                        <p className="text-xs text-gray-500">
                          {v.model} • {v.capacity} seats • Route {s(v.route_id)}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      className={`${s(v.user_id).trim() ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}
                    >
                      {s(v.user_id).trim() ? 'Assigned' : 'Unassigned'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers & Routes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-white to-indigo-50 border border-indigo-100">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-semibold">Latest Drivers</CardTitle>
                <CardDescription>Recently added driver accounts</CardDescription>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                {drivers.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drivers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No drivers found</p>
                </div>
              ) : (
                drivers.slice(0, 6).map(d => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl bg-white/70 border border-gray-100 hover:border-indigo-200 transition-all duration-300 group hover:shadow-sm"
                  >
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {d.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {d.phone_number}
                      </span>
                    </div>
                    <Badge className="mt-2 bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 border-indigo-200">
                      {s(d.status) || 'Active'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-rose-50 border border-rose-100">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-semibold">Latest Routes</CardTitle>
                <CardDescription>Recently configured routes</CardDescription>
              </div>
              <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                {routes.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No routes found</p>
                </div>
              ) : (
                routes.slice(0, 5).map(r => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-white/70 border border-gray-100 hover:border-rose-200 transition-all duration-300 group hover:shadow-sm"
                  >
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium">From:</span> {r.starting_point}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium">To:</span> {r.ending_point}
                      </div>
                    </div>
                    <Badge className="mt-2 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 border-rose-200">
                      {s(r.status) || 'Active'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}