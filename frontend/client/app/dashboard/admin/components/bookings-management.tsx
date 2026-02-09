'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiFetch } from '@/lib/api'
import { Search, Calendar, Download, Car, CheckCircle2, XCircle, PauseCircle, Filter, TrendingUp, Users, Activity } from 'lucide-react'

type Id = number | string

type BookingApi = {
  id?: Id
  user_id: Id
  route_id: Id
  pickup_location_id?: Id
  dropoff_location_id?: Id
  pickup_location?: string
  dropoff_location?: string
  start_date: string
  end_date: string
  days_of_week: string
  service_type: string
  seats_booked: number
  status?: string
}

type BookingStatus = 'Active' | 'Inactive' | 'Cancelled'

type Booking = {
  id: string
  rowKey: string
  user_id: string
  route_id: string
  pickup_location_id?: string
  dropoff_location_id?: string
  pickup_location?: string
  dropoff_location?: string
  start_date: string
  end_date: string
  days_of_week: string
  service_type: 'morning' | 'evening' | 'both' | string
  seats_booked: number
  status: BookingStatus
}

type RouteOption = {
  id: Id
  name?: string
  starting_point?: string
  ending_point?: string
}

type PickupLocation = {
  id: Id
  name?: string
  route_id?: Id
  gps_coordinates?: string
}

type SchoolLocation = {
  id: Id
  name?: string
  route_id?: Id
  gps_coordinates?: string
}

const toId = (v: any) => String(v ?? '')
const toArray = (x: any) => {
  if (Array.isArray(x)) return x
  if (Array.isArray(x?.data)) return x.data
  if (Array.isArray(x?.results)) return x.results
  if (Array.isArray(x?.bookings)) return x.bookings
  if (Array.isArray(x?.items)) return x.items
  if (Array.isArray(x?.pickup_locations)) return x.pickup_locations
  if (Array.isArray(x?.school_locations)) return x.school_locations
  return []
}

const normalizeStatus = (s: any): BookingStatus => {
  const v = String(s ?? '').trim().toLowerCase()
  if (v === 'active') return 'Active'
  if (v === 'inactive') return 'Inactive'
  if (v === 'cancelled' || v === 'canceled') return 'Cancelled'
  return 'Active'
}

const normalizeService = (s: any) => {
  const v = String(s ?? '').trim().toLowerCase()
  if (v === 'morning') return 'morning'
  if (v === 'evening') return 'evening'
  if (v === 'both') return 'both'
  return String(s ?? '')
}

const formatDays = (csv: string) => {
  const map: Record<string, string> = {
    '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu',
    '5': 'Fri', '6': 'Sat', '7': 'Sun',
  }
  const parts = String(csv ?? '').split(',').map(s => s.trim()).filter(Boolean)
  return parts.length ? parts.map(p => map[p] ?? p).join(', ') : '—'
}

const routeLabel = (r?: RouteOption) => {
  if (!r) return '—'
  if (r.name) return r.name
  if (r.starting_point && r.ending_point) return `${r.starting_point} → ${r.ending_point}`
  return `Route #${toId(r.id)}`
}

const userLabel = (userId?: string) => userId ? `User #${userId}` : '—'

const normalizeBooking = (raw: BookingApi, index: number): Booking => {
  const user_id = toId(raw.user_id)
  const route_id = toId(raw.route_id)
  const composite = `${user_id}-${route_id}-${raw.start_date}-${raw.end_date}-${raw.pickup_location_id ?? raw.pickup_location ?? ''}`
  
  const id = raw.id !== undefined && raw.id !== null && String(raw.id).trim() !== ''
    ? toId(raw.id)
    : composite

  const rowKey = raw.id !== undefined && raw.id !== null && String(raw.id).trim() !== ''
    ? `booking-${toId(raw.id)}`
    : `booking-${composite}-${index}`

  return {
    id,
    rowKey,
    user_id,
    route_id,
    pickup_location_id: raw.pickup_location_id != null ? toId(raw.pickup_location_id) : undefined,
    dropoff_location_id: raw.dropoff_location_id != null ? toId(raw.dropoff_location_id) : undefined,
    pickup_location: raw.pickup_location ? String(raw.pickup_location) : undefined,
    dropoff_location: raw.dropoff_location ? String(raw.dropoff_location) : undefined,
    start_date: String(raw.start_date ?? ''),
    end_date: String(raw.end_date ?? ''),
    days_of_week: String(raw.days_of_week ?? ''),
    service_type: normalizeService(raw.service_type),
    seats_booked: Number(raw.seats_booked ?? 0),
    status: normalizeStatus(raw.status),
  }
}

export default function BookingsManagement() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'cancelled'>('all')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [schoolLocations, setSchoolLocations] = useState<SchoolLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const getStatusClass = (status: BookingStatus) => {
    if (status === 'Active') return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
    if (status === 'Inactive') return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
    return 'bg-gradient-to-r from-rose-500 to-red-600 text-white'
  }

  const getServiceBadge = (service: Booking['service_type']) => {
    const s = String(service).toLowerCase()
    if (s === 'morning') return { label: 'Morning', className: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' }
    if (s === 'evening') return { label: 'Evening', className: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' }
    if (s === 'both') return { label: 'Both', className: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white' }
    return { label: String(service || '—'), className: 'bg-gray-100 text-gray-800 border-gray-200' }
  }

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [bookingsRes, routesRes, pickupsRes, schoolsRes] = await Promise.all([
        apiFetch('/bookings', { credentials: "include" }),
        apiFetch('/routes', { credentials: "include" }),
        apiFetch('/pickup_locations', { credentials: "include" }).catch(() => null as any),
        apiFetch('/school-locations/all', { credentials: "include" }).catch(() => null as any),
      ])

      const [bookingsJson, routesJson, pickupsJson, schoolsJson] = await Promise.all([
        bookingsRes.json().catch(() => null),
        routesRes.json().catch(() => null),
        pickupsRes?.json?.().catch(() => null),
        schoolsRes?.json?.().catch(() => null),
      ])

      if (!bookingsRes.ok) throw new Error(bookingsJson?.error || bookingsJson?.message || `Bookings fetch failed (${bookingsRes.status})`)
      if (!routesRes.ok) throw new Error(routesJson?.error || routesJson?.message || `Routes fetch failed (${routesRes.status})`)

      const bookingsArr: BookingApi[] = toArray(bookingsJson)
      const routesArr: RouteOption[] = toArray(routesJson)
      const pickupArr: PickupLocation[] = pickupsRes && pickupsRes.ok ? toArray(pickupsJson) : []
      const schoolArr: SchoolLocation[] = schoolsRes && schoolsRes.ok ? toArray(schoolsJson) : []

      setBookings(bookingsArr.map((b, i) => normalizeBooking(b, i)))
      setRoutes(routesArr)
      setPickupLocations(pickupArr)
      setSchoolLocations(schoolArr)
    } catch (e: any) {
      console.error(e)
      setBookings([]); setRoutes([]); setPickupLocations([]); setSchoolLocations([])
      setError(e?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const routeById = useMemo(() => {
    const m = new Map<string, RouteOption>()
    for (const r of routes) m.set(toId(r.id), r)
    return m
  }, [routes])

  const pickupById = useMemo(() => {
    const m = new Map<string, PickupLocation>()
    for (const p of pickupLocations) m.set(toId(p.id), p)
    return m
  }, [pickupLocations])

  const schoolById = useMemo(() => {
    const m = new Map<string, SchoolLocation>()
    for (const s of schoolLocations) m.set(toId(s.id), s)
    return m
  }, [schoolLocations])

  const pickupName = (b: Booking) => {
    if (b.pickup_location && b.pickup_location.trim()) return b.pickup_location
    if (b.pickup_location_id) return pickupById.get(b.pickup_location_id)?.name ?? `Pickup #${b.pickup_location_id}`
    return '—'
  }

  const dropoffName = (b: Booking) => {
    if (b.dropoff_location && b.dropoff_location.trim()) return b.dropoff_location
    if (b.dropoff_location_id) return schoolById.get(b.dropoff_location_id)?.name ?? `School #${b.dropoff_location_id}`
    return '—'
  }

  const filteredBookings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return bookings.filter(b => {
      const r = routeById.get(b.route_id)
      const routeName = routeLabel(r).toLowerCase()
      const name = userLabel(b.user_id).toLowerCase()
      const pickup = pickupName(b).toLowerCase()
      const dropoff = dropoffName(b).toLowerCase()

      const matchesSearch = q.length === 0 ||
        name.includes(q) || routeName.includes(q) || pickup.includes(q) ||
        dropoff.includes(q) || b.start_date.toLowerCase().includes(q) ||
        b.end_date.toLowerCase().includes(q) || String(b.service_type).toLowerCase().includes(q) ||
        String(b.status).toLowerCase().includes(q)

      const matchesTab = activeTab === 'all' ? true :
        activeTab === 'active' ? b.status === 'Active' :
        activeTab === 'inactive' ? b.status === 'Inactive' : b.status === 'Cancelled'

      return matchesSearch && matchesTab
    })
  }, [bookings, searchTerm, activeTab, routeById, pickupById, schoolById])

  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(b => b.status === 'Active').length
    const inactive = bookings.filter(b => b.status === 'Inactive').length
    const cancelled = bookings.filter(b => b.status === 'Cancelled').length
    const seats = bookings.reduce((sum, b) => sum + (Number.isFinite(b.seats_booked) ? b.seats_booked : 0), 0)
    const uniqueUsers = new Set(bookings.map(b => b.user_id)).size
    const uniqueRoutes = new Set(bookings.map(b => b.route_id)).size
    return { total, active, inactive, cancelled, seats, uniqueUsers, uniqueRoutes }
  }, [bookings])

  const exportCsv = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const rows = filteredBookings.map(b => {
        const r = routeById.get(b.route_id)
        return {
          user: userLabel(b.user_id),
          route: routeLabel(r),
          pickup_location: pickupName(b),
          dropoff_location: dropoffName(b),
          start_date: b.start_date,
          end_date: b.end_date,
          days_of_week: formatDays(b.days_of_week),
          service_type: b.service_type,
          seats_booked: b.seats_booked,
          status: b.status,
        }
      })
      const headers = Object.keys(rows[0] ?? { user: '' })
      const escape = (v: any) => `"${String(v ?? '').replaceAll('"', '""')}"`
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bookings_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-700">Total Bookings</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">{loading ? '—' : stats.seats}</span> seats booked
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-emerald-700">Active</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.active}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <PauseCircle className="w-3.5 h-3.5" /> Inactive: <span className="font-medium">{loading ? '—' : stats.inactive}</span>
                </p>
              </div>
              <Activity className="w-8 h-8 text-emerald-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                    <PauseCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-amber-700">Inactive</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.inactive}</p>
                <p className="text-xs text-gray-500 mt-1">Paused or suspended</p>
              </div>
              <PauseCircle className="w-8 h-8 text-amber-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
                    <XCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-rose-700">Cancelled</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.cancelled}</p>
                <p className="text-xs text-gray-500 mt-1">Cancelled bookings</p>
              </div>
              <XCircle className="w-8 h-8 text-rose-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Search bookings by user, route, pickup, school, dates..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300"
                />
                <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              {error && <p className="mt-2 text-sm text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="gap-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300"
                onClick={fetchAll}
                disabled={loading}
              >
                <Calendar className="w-4 h-4" />
                Refresh
              </Button>

              <Button
                variant="outline"
                className="gap-2 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-300"
                onClick={exportCsv}
                disabled={exporting || loading || filteredBookings.length === 0}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bookings Table */}
      <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Bookings Management</CardTitle>
              <p className="text-sm text-gray-500">Manage all transportation bookings and schedules</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
            <TabsList className="w-full rounded-none border-b border-gray-200 bg-gray-50 p-0 h-12">
              <TabsTrigger 
                value="all" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:bg-blue-50 h-full px-6"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="active" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:bg-emerald-50 h-full px-6"
              >
                Active
              </TabsTrigger>
              <TabsTrigger 
                value="inactive" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:text-amber-700 data-[state=active]:bg-amber-50 h-full px-6"
              >
                Inactive
              </TabsTrigger>
              <TabsTrigger 
                value="cancelled" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-rose-600 data-[state=active]:text-rose-700 data-[state=active]:bg-rose-50 h-full px-6"
              >
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="p-0 m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">User</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Route</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Pickup</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Dropoff</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Dates</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Days</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Service</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Seats</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={9} className="py-10 px-6 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            Loading bookings...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && filteredBookings.map(b => {
                      const r = routeById.get(b.route_id)
                      const svc = getServiceBadge(b.service_type)

                      return (
                        <tr
                          key={b.rowKey}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-medium text-gray-900">{userLabel(b.user_id)}</p>
                              <p className="text-xs text-gray-500">User #{b.user_id}</p>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div>
                              <p className="font-medium text-gray-900">{routeLabel(r)}</p>
                              <p className="text-xs text-gray-500">Route #{b.route_id}</p>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <p className="font-medium text-gray-900">{pickupName(b)}</p>
                          </td>

                          <td className="py-4 px-6">
                            <p className="text-gray-900">{dropoffName(b)}</p>
                          </td>

                          <td className="py-4 px-6">
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                              <p className="font-medium text-blue-700">{b.start_date}</p>
                              <p className="text-xs text-blue-500">to {b.end_date}</p>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              {formatDays(b.days_of_week)}
                            </Badge>
                          </td>

                          <td className="py-4 px-6">
                            <Badge className={svc.className + ' border-0 text-white'}>
                              {svc.label}
                            </Badge>
                          </td>

                          <td className="py-4 px-6">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Car className="w-3.5 h-3.5 mr-1" />
                              {b.seats_booked}
                            </Badge>
                          </td>

                          <td className="py-4 px-6">
                            <Badge className={getStatusClass(b.status) + ' border-0'}>
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}

                    {!loading && filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 px-6 text-center">
                          <div className="text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No bookings found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}