'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  Calendar,
  Navigation,
  Bell,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Car,
  MapPin,
} from 'lucide-react'

import ScheduleView from './components/ScheduleView'
import RouteMap from './components/RouteMap'
// import TripManagement from './components/TripManagement'
import VehicleStatus from './components/VehicleStatus'
import DriverPassengers from './components/DriverPassengers'

type TripStatus = 'scheduled' | 'picked_up' | 'completed' | 'cancelled'
type ServiceType = 'morning' | 'evening'
type TabKey = 'dashboard' | 'passengers' | 'schedule'

interface DriverTrip {
  id: number
  vehicle_id: number
  pickup_location: string
  dropoff_location: string
  start_date: string
  service_type: ServiceType
  seats_booked: number
  status: TripStatus
  trip_time?: string
  child_name?: string
  booking_id?: number
}

interface VehicleInfo {
  id: number
  license_plate: string
  model: string
  capacity: number
  status?: string
  route_id?: number
  route_name?: string
  driver_name?: string
}

interface AlertMessage {
  type: 'success' | 'error' | 'info'
  message: string
  id: number
}

function safeString(v: any, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

function normalizeTripStatus(raw: any): TripStatus {
  const s = safeString(raw, 'scheduled').toLowerCase().trim()
  if (s === 'picked_up' || s === 'picked-up' || s === 'in-progress' || s === 'in_progress') return 'picked_up'
  if (s === 'completed' || s === 'complete' || s === 'done') return 'completed'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  return 'scheduled'
}

function normalizeServiceTime(raw: any): ServiceType {
  const s = safeString(raw, 'morning').toLowerCase().trim()
  return s === 'evening' ? 'evening' : 'morning'
}

function pickLocationName(v: any): string {
  if (!v) return '—'
  if (typeof v === 'string') return v
  return String(v.name ?? v.location_name ?? v.address ?? v.id ?? '—')
}

function shortPlace(v: string) {
  const s = safeString(v, '—').trim()
  return s ? s.split(',')[0] : '—'
}

// ✅ Display helper: evening shows School -> Home (swap)
function displayLeg(trip: { pickup_location: string; dropoff_location: string; service_type: ServiceType }) {
  const pickup = safeString(trip.pickup_location, '—')
  const dropoff = safeString(trip.dropoff_location, '—')
  if (trip.service_type === 'evening') return { from: dropoff, to: pickup }
  return { from: pickup, to: dropoff }
}

// function authHeaders(token: string | null) {
//   return token ? { Authorization: `Bearer ${token}` } : {}
// }

export default function DriverDashboardPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [trips, setTrips] = useState<DriverTrip[]>([])
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null)

  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<AlertMessage[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [username, setUsername] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // ✅ ensures Start Trip button is consistent in dashboard + passengers + schedule cards
  const [startingTripId, setStartingTripId] = useState<number | null>(null)

  const tripsRef = useRef<DriverTrip[]>([])
  useEffect(() => {
    tripsRef.current = trips
  }, [trips])

  const addAlert = (type: AlertMessage['type'], message: string) => {
    const id = Date.now()
    setAlerts(prev => [...prev, { type, message, id }])
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 4000)
  }

  useEffect(() => {
      const checkAuth = async () => {
        try {
          const res = await apiFetch("/me", {
            credentials: "include",
          });
  
          if (!res.ok) {
            router.replace("/auth/signin");
            return;
          }
  
          const data = await res.json();
          setUsername(data.name);
        } catch (err) {
          router.replace("/auth/signin");
        }
      };
  
      checkAuth();
    }, [router]);

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      // const token = localStorage.getItem('token')
      await apiFetch('/logout', {
        method: 'POST',
        credentials: "include"
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('vehicle_id')
      localStorage.removeItem('user_id')
      setLoggingOut(false)
      router.replace('/auth/signin')
    }
  }

  const fetchVehicle = async (vehicleId: number) => {
    const res = await apiFetch(`/vehicles/${vehicleId}`, {
      method: 'GET', credentials: 'include'
    })
    const data = await res.json().catch(() => ({}))

    const v: VehicleInfo = {
      id: Number(data.id ?? vehicleId),
      license_plate: safeString(data.license_plate, '—'),
      model: safeString(data.model, '—'),
      capacity: Number(data.capacity ?? 0),
      status: data.status,
      route_id: data.route_id,
      route_name: data.route_name,
      driver_name: data.driver_name,
    }

    return v
  }

  const sanitizeTrip = (t: any, vehicleId: number): DriverTrip => {
    const service_type = normalizeServiceTime(t.service_time ?? t.service_type)

    return {
      id: Number(t.trip_id ?? t.id),
      booking_id: t.booking_id ? Number(t.booking_id) : undefined,
      vehicle_id: Number(t.vehicle_id ?? vehicleId),

      start_date: safeString(t.trip_date ?? t.start_date ?? t.date ?? '', ''),
      service_type,

      status: normalizeTripStatus(t.status),
      seats_booked: Number(t.seats_booked ?? 0),

      pickup_location: pickLocationName(t.pickup_location),
      dropoff_location: pickLocationName(t.dropoff_location),

      child_name: t.child_name ? safeString(t.child_name) : undefined,
      trip_time: t.pickup_time ? safeString(t.pickup_time) : undefined,
    }
  }

  const extractTripsArray = (json: any): any[] => {
    if (Array.isArray(json)) return json
    if (Array.isArray(json?.trips)) return json.trips
    return []
  }

  const fetchTripsForToday = async (vehicleId: number) => {
    const [morningRes, eveningRes] = await Promise.all([
      apiFetch(`/trips/today?vehicle_id=${vehicleId}&service_time=morning`, {
        method: 'GET',credentials: 'include'
      }),
      apiFetch(`/trips/today?vehicle_id=${vehicleId}&service_time=evening`, {
        method: 'GET',credentials: 'include'
      }),
    ])

    const morningJson = await morningRes.json().catch(() => ({}))
    const eveningJson = await eveningRes.json().catch(() => ({}))

    const morningTripsRaw = extractTripsArray(morningJson)
    const eveningTripsRaw = extractTripsArray(eveningJson)

    const morning = morningTripsRaw.map((t: any) => sanitizeTrip(t, vehicleId))
    const evening = eveningTripsRaw.map((t: any) => sanitizeTrip(t, vehicleId))

    const uniq = new Map<number, DriverTrip>()
    ;[...morning, ...evening].forEach(t => {
      if (Number.isFinite(t.id)) uniq.set(t.id, t)
    })

    return Array.from(uniq.values())
  }

  const reloadAll = async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/me", {
        credentials: "include",
      });
      if (!res.ok) {
        addAlert("error", "Session expired. Please sign in again.");
        setTrips([]);
        setVehicle(null);
        router.replace("/auth/signin");
        return;
      }

      const data = await res.json();
      setUsername(data.name);
      // // setUsername(localStorage.getItem('username'))
      const vehicleIdRaw = data.vehicles?.id ?? localStorage.getItem('vehicle_id') ?? undefined
      localStorage.setItem('vehicle_id', String(vehicleIdRaw ?? ''))
      console.log(vehicleIdRaw)

      if (!vehicleIdRaw) {
        addAlert(
          "error",
          "No vehicle assigned for this driver. Please sign in again.",
        );
        setTrips([]);
        setVehicle(null);
        return;
      }

      const vehicleId = Number(vehicleIdRaw);
      if (!Number.isFinite(vehicleId)) {
        addAlert("error", "Invalid vehicle assignment. Please sign in again.");
        setTrips([]);
        setVehicle(null);
        return;
      }

      const [v, t] = await Promise.all([
        fetchVehicle(vehicleId),
        fetchTripsForToday(vehicleId),
      ]);
      setVehicle(v);
      setTrips(t);

      addAlert("info", `Loaded ${t.length} trip(s) for today.`);
    } catch (err: any) {
      console.error(err)
      addAlert('error', err?.message || 'Failed to load driver data')
      setTrips([])
      setVehicle(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const todayTrips = useMemo(() => trips, [trips])

  const currentTrip = useMemo(() => todayTrips.find(t => t.status === 'picked_up') || null, [todayTrips])
  const morningTrips = useMemo(() => todayTrips.filter(t => t.service_type === 'morning'), [todayTrips])
  const eveningTrips = useMemo(() => todayTrips.filter(t => t.service_type === 'evening'), [todayTrips])
  const completedTrips = useMemo(() => todayTrips.filter(t => t.status === 'completed'), [todayTrips])

  const upcomingTrip = useMemo(() => {
    if (currentTrip) return null
    return todayTrips.find(t => t.status === 'scheduled') || null
  }, [todayTrips, currentTrip])

  const onboardCount = useMemo(() => {
    return todayTrips
      .filter(t => t.status === 'picked_up')
      .reduce((sum, t) => sum + (Number.isFinite(t.seats_booked) ? t.seats_booked : 0), 0)
  }, [todayTrips])

  const startTrip = async (tripId: number) => {
    if (startingTripId) return

    const snapshot = tripsRef.current
    setStartingTripId(tripId)

    setTrips(prev => prev.map(t => (t.id === tripId ? { ...t, status: 'picked_up' } : t)))

    try {
      // const token = localStorage.getItem('token')
      await apiFetch(`/trips/${tripId}/pickup`, {
        method: 'PATCH',
        headers: {
          credentials: 'include',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      addAlert('success', 'Trip started')
    } catch (e: any) {
      console.error(e)
      setTrips(snapshot)
      addAlert('error', e?.message || 'Server error starting trip')
    } finally {
      setStartingTripId(null)
    }
  }

  const completeTrip = async (tripId: number) => {
    const snapshot = tripsRef.current
    setTrips(prev => prev.map(t => (t.id === tripId ? { ...t, status: 'completed' } : t)))

    try {
      // const token = localStorage.getItem('token')
      await apiFetch(`/trips/${tripId}/dropoff`, {
        method: 'PATCH',
        headers: {
          credentials: 'include',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      addAlert('success', 'Trip completed')
    } catch (e: any) {
      console.error(e)
      setTrips(snapshot)
      addAlert('error', e?.message || 'Server error completing trip')
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {alerts.length > 0 && (
        <div className="sticky top-0 z-50 px-4 py-2 space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 animate-in slide-in-from-top duration-300 ${
                alert.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : alert.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {alert.type === 'success' && <CheckCircle className="w-4 h-4" />}
                {alert.type === 'error' && <AlertCircle className="w-4 h-4" />}
                {alert.type === 'info' && <Bell className="w-4 h-4" />}
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(v => !v)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              <div className="relative">
                <div className="absolute -left-3 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-blue-300 rounded-full" />
                <div className="pl-2">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    Driver Dashboard
                  </h1>
                  <p className="text-sm text-blue-700/70 mt-0.5">
                    Welcome back, <span className="font-medium text-blue-800">{username || 'Driver'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2 bg-transparent border-slate-200 hover:bg-blue-50"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-16 h-full w-64 bg-card border-l shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setActiveTab('dashboard')
                  setMobileMenuOpen(false)
                }}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Dashboard
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setActiveTab('passengers')
                  setMobileMenuOpen(false)
                }}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Passengers
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  setActiveTab('schedule')
                  setMobileMenuOpen(false)
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                disabled={loggingOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {loggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
              <p className="text-slate-600">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview */}
            <div className="mb-8">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Today's Overview</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center bg-amber-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-amber-700">{morningTrips.length}</div>
                        <div className="text-sm text-amber-600">Morning</div>
                      </div>
                      <div className="text-center bg-indigo-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-700">{eveningTrips.length}</div>
                        <div className="text-sm text-indigo-600">Evening</div>
                      </div>
                      <div className="text-center bg-emerald-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-700">{completedTrips.length}</div>
                        <div className="text-sm text-emerald-600">Completed</div>
                      </div>
                      <div className="text-center bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">{onboardCount}</div>
                        <div className="text-sm text-blue-600">On Board</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <div className="mb-8">
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)} className="w-full">
                <TabsList className="w-full grid grid-cols-3 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <TabsTrigger value="dashboard" className="rounded-lg">
                    <Navigation className="w-4 h-4 mr-2" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="passengers" className="rounded-lg">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Passengers
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="rounded-lg">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                  <div className="space-y-8">
                    {/* ✅ Removed TripManagement. Simple Current Trip card instead */}
                    {currentTrip ? (
                      <Card className="border-slate-200 bg-white shadow-sm">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-4 rounded-full ${currentTrip.service_type === 'morning' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {currentTrip.service_type === 'morning' ? <Sun className="w-8 h-8" /> : <Moon className="w-8 h-8" />}
                              </div>

                              <div>
                                <h3 className="font-semibold text-lg text-slate-900">Trip In Progress</h3>
                                <p className="text-slate-600">
                                  {(() => {
                                    const leg = displayLeg(currentTrip)
                                    return (
                                      <>
                                        {shortPlace(leg.from)} → {shortPlace(leg.to)}
                                      </>
                                    )
                                  })()}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">{currentTrip.seats_booked} seat(s)</p>
                              </div>
                            </div>

                            <Button
                              onClick={() => completeTrip(currentTrip.id)}
                              className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Complete Trip
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : upcomingTrip ? (
                      <Card className="border-slate-200 bg-white shadow-sm">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-4 rounded-full ${upcomingTrip.service_type === 'morning' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {upcomingTrip.service_type === 'morning' ? <Sun className="w-8 h-8" /> : <Moon className="w-8 h-8" />}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg text-slate-900">Next {upcomingTrip.service_type} Trip</h3>
                                <p className="text-slate-600">
                                  {(() => {
                                    const leg = displayLeg(upcomingTrip)
                                    return (
                                      <>
                                        {shortPlace(leg.from)} → {shortPlace(leg.to)}
                                      </>
                                    )
                                  })()}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">{upcomingTrip.seats_booked} seat(s)</p>
                              </div>
                            </div>

                            <Button
                              onClick={() => startTrip(upcomingTrip.id)}
                              disabled={startingTripId === upcomingTrip.id}
                              className={`px-6 ${
                                upcomingTrip.service_type === 'morning'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {startingTripId === upcomingTrip.id ? 'Starting...' : 'Start Trip'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-slate-200 bg-white shadow-sm">
                        <CardContent className="pt-6">
                          <div className="text-center py-6">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-slate-900 mb-2">No Trip In Progress</h3>
                            <Button className="mt-4" variant="outline" onClick={reloadAll}>
                              Refresh
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Sun className="w-5 h-5 text-amber-600" />
                            </div>
                            Morning Trips
                            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                              {morningTrips.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScheduleView schedule={morningTrips as any} onStartTrip={startTrip} onCompleteTrip={completeTrip} startingTripId={startingTripId} />
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-slate-900">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <Moon className="w-5 h-5 text-indigo-600" />
                            </div>
                            Evening Trips
                            <Badge variant="outline" className="ml-2 bg-indigo-50 text-indigo-700 border-indigo-200">
                              {eveningTrips.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScheduleView schedule={eveningTrips as any} onStartTrip={startTrip} onCompleteTrip={completeTrip} startingTripId={startingTripId} />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {vehicle ? (
                        <VehicleStatus vehicle={vehicle as any} />
                      ) : (
                        <Card className="border-slate-200 bg-white shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Car className="w-5 h-5" />
                              Vehicle Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Button variant="outline" onClick={reloadAll}>
                              Refresh
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      <Card className="border-slate-200 bg-white shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-slate-900">
                            <MapPin className="w-5 h-5" />
                            Today's Routes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <RouteMap schedule={todayTrips as any} />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="passengers" className="mt-6">
                  <DriverPassengers trips={todayTrips} onRefresh={reloadAll} onStartTrip={startTrip} startingTripId={startingTripId} />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                  <Card className="border-slate-200 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-900">My Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScheduleView schedule={todayTrips as any} onStartTrip={startTrip} onCompleteTrip={completeTrip} showAll startingTripId={startingTripId} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
