'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiFetch } from '@/lib/api'
import { Search, Calendar, Download, Car, CheckCircle2, XCircle, PauseCircle } from 'lucide-react'

type Id = number | string

type BookingApi = {
  id?: Id
  user_id: Id
  user_name?: string  // ✅ Added - backend sends this
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
  // may not be unique if generated from composite fallback
  id: string

  // ✅ ALWAYS UNIQUE — use this for React keys
  rowKey: string

  user_id: string
  user_name: string  // ✅ Added - display name
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
    '1': 'Mon',
    '2': 'Tue',
    '3': 'Wed',
    '4': 'Thu',
    '5': 'Fri',
    '6': 'Sat',
    '7': 'Sun',
  }
  const parts = String(csv ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  return parts.length ? parts.map(p => map[p] ?? p).join(', ') : '—'
}

const routeLabel = (r?: RouteOption) => {
  if (!r) return '—'
  if (r.name) return r.name
  if (r.starting_point && r.ending_point) return `${r.starting_point} → ${r.ending_point}`
  return `Route #${toId(r.id)}`
}

const normalizeBooking = (raw: BookingApi, index: number): Booking => {
  const user_id = toId(raw.user_id)
  const route_id = toId(raw.route_id)

  const composite =
    `${user_id}-${route_id}-${raw.start_date}-${raw.end_date}-${raw.pickup_location_id ?? raw.pickup_location ?? ''}`

  // "id" is what you show, prefer backend id if present
  const id =
    raw.id !== undefined && raw.id !== null && String(raw.id).trim() !== ''
      ? toId(raw.id)
      : composite

  // ✅ rowKey must NEVER collide; add index as tie-breaker
  const rowKey = raw.id !== undefined && raw.id !== null && String(raw.id).trim() !== ''
    ? `booking-${toId(raw.id)}`
    : `booking-${composite}-${index}`

  // ✅ Get user name from backend or fallback
  const user_name = raw.user_name && String(raw.user_name).trim() 
    ? String(raw.user_name).trim()
    : `User #${user_id}`

  return {
    id,
    rowKey,
    user_id,
    user_name,  // ✅ Store the actual name
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
    if (status === 'Active') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
    if (status === 'Inactive') return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30'
    return 'bg-red-500/10 text-red-700 border-red-500/30'
  }

  const getServiceBadge = (service: Booking['service_type']) => {
    const s = String(service).toLowerCase()
    if (s === 'morning') return { label: 'Morning', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30' }
    if (s === 'evening') return { label: 'Evening', className: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30' }
    if (s === 'both') return { label: 'Both', className: 'bg-blue-600/10 text-blue-700 border-blue-600/30' }
    return { label: String(service || '—'), className: '' }
  }

  const fetchAll = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.replace('/auth/signin')
        return
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }

      const [bookingsRes, routesRes, pickupsRes, schoolsRes] = await Promise.all([
        apiFetch('/bookings', { headers }),
        apiFetch('/routes', { headers }),
        apiFetch('/pickup_locations', { headers }).catch(() => null as any),
        apiFetch('/school-locations/all', { headers }).catch(() => null as any),
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
      setBookings([])
      setRoutes([])
      setPickupLocations([])
      setSchoolLocations([])
      setError(e?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      const userName = b.user_name.toLowerCase()  // ✅ Search by actual name

      const pickup = pickupName(b).toLowerCase()
      const dropoff = dropoffName(b).toLowerCase()

      const matchesSearch =
        q.length === 0 ||
        userName.includes(q) ||  // ✅ Search by name
        routeName.includes(q) ||
        pickup.includes(q) ||
        dropoff.includes(q) ||
        b.start_date.toLowerCase().includes(q) ||
        b.end_date.toLowerCase().includes(q) ||
        String(b.service_type).toLowerCase().includes(q) ||
        String(b.status).toLowerCase().includes(q)

      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'active'
          ? b.status === 'Active'
          : activeTab === 'inactive'
          ? b.status === 'Inactive'
          : b.status === 'Cancelled'

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
          user: b.user_name,  // ✅ Export actual name
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{loading ? '—' : stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Seats booked: <span className="font-medium text-foreground">{loading ? '—' : stats.seats}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{loading ? '—' : stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5" /> Inactive:{' '}
              <span className="font-medium text-foreground">{loading ? '—' : stats.inactive}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{loading ? '—' : stats.cancelled}</div>
            <p className="text-xs text-muted-foreground mt-1">Status</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, route, pickup, school, dates, service, status…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="bg-transparent" onClick={fetchAll} disabled={loading}>
                Refresh
              </Button>

              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={exportCsv}
                disabled={exporting || loading || filteredBookings.length === 0}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting…' : 'Export'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Bookings
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
            <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent p-0">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                All
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Active
              </TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Inactive
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="p-0 m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">User</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Route</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Pickup Location</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Dropoff Location</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Dates</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Days</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Service</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Seats</th>
                      <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={9} className="py-10 px-6 text-center text-muted-foreground">
                          Loading bookings…
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      filteredBookings.map(b => {
                        const r = routeById.get(b.route_id)
                        const svc = getServiceBadge(b.service_type)

                        return (
                          <tr
                            key={b.rowKey}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <div>
                                
                                <p className="font-medium text-foreground">{b.user_name}</p>
{/*                                 <p className="text-xs text-muted-foreground">ID: {b.user_id}</p>
 */}                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <div>
                                <p className="font-medium text-foreground">{routeLabel(r)}</p>
                                <p className="text-xs text-muted-foreground">Route #{b.route_id}</p>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <p className="font-medium text-foreground">{pickupName(b)}</p>
                            </td>

                            <td className="py-4 px-6">
                              <p className="text-foreground">{dropoffName(b)}</p>
                            </td>

                            <td className="py-4 px-6">
                              <p className="text-foreground">{b.start_date}</p>
                              <p className="text-xs text-muted-foreground">to {b.end_date}</p>
                            </td>

                            <td className="py-4 px-6">
                              <Badge variant="outline" className="bg-transparent">
                                {formatDays(b.days_of_week)}
                              </Badge>
                            </td>

                            <td className="py-4 px-6">
                              <Badge variant="outline" className={svc.className}>
                                {svc.label}
                              </Badge>
                            </td>

                            <td className="py-4 px-6">
                              <Badge variant="outline" className="bg-transparent">
                                <Car className="w-3.5 h-3.5 mr-1" />
                                {b.seats_booked}
                              </Badge>
                            </td>

                            <td className="py-4 px-6">
                              <Badge variant="outline" className={getStatusClass(b.status)}>
                                {b.status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}

                    {!loading && filteredBookings.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 px-6 text-center text-muted-foreground">
                          No bookings found.
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