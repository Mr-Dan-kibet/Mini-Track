'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  History, 
  Search, 
  MapPin, 
  Navigation, 
  Calendar,
  Users,
  Clock,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BASE_URL = 'http://127.0.0.1:5555'

// Helper function to get current user ID
function getCurrentUserId(): number | null {
  if (typeof window === 'undefined') return null
  
  const userId = localStorage.getItem('user_id')
  return userId ? parseInt(userId, 10) : null
}

type Trip = {
  trip_id: number
  trip_date: string
  service_time: 'morning' | 'evening'
  status: 'scheduled' | 'picked_up' | 'completed' | 'cancelled'
}

export type Booking = {
  booking_id: number
  pickup_location?: string
  pickup_location_name?: string
  dropoff_location?: string
  dropoff_location_name?: string
  start_date: string
  end_date: string
  seats_booked: number
  selected_seats?: number[]
  service_type: string
  days_of_week?: string
  status: 'active' | 'cancelled' | 'completed'
  trips?: Trip[]
}

interface Props {
  onTrack: (bookingId: number) => void
}

export default function BookingHistory({ onTrack }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'cancelled'>('all')
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  // ✅ Check if today's trips are completed
  const checkTodayTripsCompleted = (booking: Booking): boolean => {
    if (!booking.trips || booking.trips.length === 0) return false
    
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's trips for this booking
    const todayTrips = booking.trips.filter(trip => 
      trip.trip_date === today && trip.status !== 'cancelled'
    )
    
    if (todayTrips.length === 0) return false
    
    // For 'both' service type, check if BOTH morning and evening are completed
    if (booking.service_type === 'both') {
      const morningTrip = todayTrips.find(t => t.service_time === 'morning')
      const eveningTrip = todayTrips.find(t => t.service_time === 'evening')
      
      return (
        morningTrip?.status === 'completed' && 
        eveningTrip?.status === 'completed'
      )
    }
    
    // For single service type, check if that trip is completed
    return todayTrips.every(trip => trip.status === 'completed')
  }

  // ✅ NEW: Check if booking is truly active (has upcoming/today's incomplete trips)
  const isBookingActive = (booking: Booking): boolean => {
    // Booking must have status 'active'
    if (booking.status !== 'active') return false
    
    const today = new Date().toISOString().split('T')[0]
    const endDate = booking.end_date.split('T')[0]
    
    // If booking has ended, it's not active
    if (endDate < today) return false
    
    // If no trips data, consider it active if within date range
    if (!booking.trips || booking.trips.length === 0) {
      return true
    }
    
    // Check if today's trips are completed
    const todayCompleted = checkTodayTripsCompleted(booking)
    
    // If today's trips are completed, check if there are future trips
    if (todayCompleted) {
      const futureTrips = booking.trips.filter(trip => 
        trip.trip_date > today && trip.status !== 'cancelled'
      )
      
      // Active only if there are future trips
      return futureTrips.length > 0
    }
    
    // If today's trips are not completed, it's active
    return true
  }

  // ---------------- FETCH BOOKINGS ----------------
  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const userId = getCurrentUserId()
      
      if (!userId) {
        console.error('No user ID found')
        setLoading(false)
        return
      }

      const res = await fetch(`${BASE_URL}/bookings?user_id=${userId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      })

      if (!res.ok) throw new Error('Failed to fetch booking history')

      const data: Booking[] = await res.json()
      
      // Fetch trip details for each booking
      const bookingsWithTrips = await Promise.all(
        data.map(async (booking) => {
          try {
            const tripRes = await fetch(`${BASE_URL}/bookings/${booking.booking_id}`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
              },
            })
            
            if (tripRes.ok) {
              const tripData = await tripRes.json()
              return { ...booking, trips: tripData.trips || [] }
            }
          } catch (err) {
            console.error(`Failed to fetch trips for booking ${booking.booking_id}:`, err)
          }
          
          return booking
        })
      )
      
      setBookings(bookingsWithTrips)
    } catch (err) {
      console.error('Booking history error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ---------------- NORMALIZE LOCATION NAMES ----------------
  const getPickup = (b: Booking) => b.pickup_location ?? b.pickup_location_name ?? 'Unknown'
  const getDropoff = (b: Booking) => b.dropoff_location ?? b.dropoff_location_name ?? 'Unknown'

  // ---------------- CANCEL BOOKING ----------------
  const handleCancelBooking = async (booking: Booking) => {
    const serviceLabel = getServiceTypeLabel(booking.service_type)
    const dateRange = `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`
    
    const confirmed = window.confirm(
      `Are you sure you want to cancel this booking?\n\n` +
      `Booking ID: #${booking.booking_id}\n` +
      `Service: ${serviceLabel}\n` +
      `Seats: ${booking.seats_booked}\n` +
      `Period: ${dateRange}\n\n` +
      `This action cannot be undone.`
    )

    if (!confirmed) return

    setCancellingId(booking.booking_id)
    try {
      const res = await fetch(`${BASE_URL}/bookings/${booking.booking_id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({ status: 'cancelled' })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to cancel booking')
      }

      // Update local state
      setBookings(prev =>
        prev.map(b =>
          b.booking_id === booking.booking_id 
            ? { ...b, status: 'cancelled' as const } 
            : b
        )
      )

      alert('Booking cancelled successfully!')
    } catch (err: any) {
      console.error('Cancel booking error:', err)
      alert(err.message || 'Failed to cancel booking. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  // ✅ UPDATED FILTER - Uses isBookingActive for 'active' tab
  const filteredBookings = bookings.filter(b => {
    const pickup = getPickup(b).toLowerCase()
    const dropoff = getDropoff(b).toLowerCase()

    const matchesSearch =
      pickup.includes(searchTerm.toLowerCase()) ||
      dropoff.includes(searchTerm.toLowerCase()) ||
      b.booking_id.toString().includes(searchTerm)

    if (activeTab === 'active') {
      // ✅ Use the new isBookingActive function
      return isBookingActive(b) && matchesSearch
    }
    if (activeTab === 'cancelled') {
      return b.status === 'cancelled' && matchesSearch
    }
    return matchesSearch // 'all' tab
  })

  // ---------------- STATUS STYLES ----------------
  const getStatusConfig = (status: Booking['status']) => {
    switch (status) {
      case 'active':
        return {
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
        }
      case 'cancelled':
        return {
          badge: 'bg-red-100 text-red-700 border-red-300',
          icon: XCircle,
          iconColor: 'text-red-600',
        }
      case 'completed':
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: CheckCircle2,
          iconColor: 'text-gray-600',
        }
      default:
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: AlertCircle,
          iconColor: 'text-gray-600',
        }
    }
  }

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'morning': return '🌅 Morning'
      case 'evening': return '🌆 Evening'
      case 'both': return '🔄 Both Ways'
      default: return type
    }
  }

  const getDaysOfWeekLabel = (days?: string) => {
    if (!days) return null
    const dayMap: Record<string, string> = {
      '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', 
      '5': 'Fri', '6': 'Sat', '7': 'Sun'
    }
    return days.split(',').map(d => dayMap[d] || d).join(', ')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="h-20" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      </div>
    )
  }

  // ✅ UPDATED STATUS COUNTS - Uses isBookingActive
  const statusCounts = {
    all: bookings.length,
    active: bookings.filter(b => isBookingActive(b)).length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6">
      {/* SEARCH BAR */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by booking ID, pickup or dropoff location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-11 h-12 text-base shadow-sm"
            />
          </div>
        </CardHeader>
      </Card>

      {/* BOOKING HISTORY */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="w-6 h-6 text-primary" />
            </div>
            Booking History
            <Badge variant="outline" className="ml-auto">
              {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
            <TabsList className="w-full rounded-none border-b bg-muted/50 h-14">
              <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-background">
                All
                <Badge variant="secondary" className="ml-2">{statusCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="flex-1 data-[state=active]:bg-background">
                Active
                <Badge variant="secondary" className="ml-2">{statusCounts.active}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex-1 data-[state=active]:bg-background">
                Cancelled
                <Badge variant="secondary" className="ml-2">{statusCounts.cancelled}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="p-6 space-y-4">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">No bookings found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? 'Try adjusting your search' : 
                     activeTab === 'active' ? 'No active bookings at the moment' :
                     activeTab === 'cancelled' ? 'No cancelled bookings' :
                     'Create your first booking to get started'}
                  </p>
                </div>
              ) : (
                filteredBookings.map((booking) => {
                  const statusConfig = getStatusConfig(booking.status)
                  const StatusIcon = statusConfig.icon
                  
                  // Check if today's trips are completed
                  const todayCompleted = checkTodayTripsCompleted(booking)
                  
                  return (
                    <Card
                      key={booking.booking_id}
                      className={cn(
                        'border-2 transition-all duration-300 hover:shadow-lg',
                        booking.status === 'active' && 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white',
                        booking.status === 'cancelled' && 'border-red-200 bg-gradient-to-br from-red-50/50 to-white opacity-75',
                        booking.status === 'completed' && 'border-gray-200 bg-gradient-to-br from-gray-50/50 to-white'
                      )}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                          {/* LEFT SECTION */}
                          <div className="flex-1 space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-bold text-foreground">
                                    Booking #{booking.booking_id}
                                  </h3>
                                  
                                  {/* ✅ Show "Today Completed" badge if today is completed, otherwise show status badge */}
                                  {booking.status === 'active' && todayCompleted ? (
                                    <Badge className="bg-green-500 text-white border-green-600">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Today Completed
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className={statusConfig.badge}>
                                      <StatusIcon className={cn('w-3 h-3 mr-1', statusConfig.iconColor)} />
                                      {booking.status}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {getServiceTypeLabel(booking.service_type)}
                                </p>
                              </div>
                            </div>

                            {/* Dates */}
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">
                                  {new Date(booking.start_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              <span className="text-muted-foreground">→</span>
                              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">
                                  {new Date(booking.end_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Days of Week */}
                            {booking.days_of_week && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {getDaysOfWeekLabel(booking.days_of_week)}
                                </span>
                              </div>
                            )}

                            {/* Locations */}
                            <div className="space-y-2 pl-1">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-full bg-blue-100">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Pickup</p>
                                  <p className="text-sm font-medium text-foreground">{getPickup(booking)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3">
                                <div className="mt-1 p-1.5 rounded-full bg-purple-100">
                                  <MapPin className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Dropoff</p>
                                  <p className="text-sm font-medium text-foreground">{getDropoff(booking)}</p>
                                </div>
                              </div>
                            </div>

                            {/* Seats */}
                            <div className="flex items-center gap-4 pt-2">
                              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {booking.seats_booked} {booking.seats_booked === 1 ? 'seat' : 'seats'}
                                </span>
                              </div>
                              
                              {booking.selected_seats && booking.selected_seats.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {booking.selected_seats.map(seat => (
                                    <Badge key={seat} variant="outline" className="font-mono text-xs">
                                      {seat}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ✅ UPDATED RIGHT SECTION - ACTIONS */}
                          {booking.status === 'active' && (
                            <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                              {/* ✅ Track Bus / Completed button */}
                              <Button
                                variant={todayCompleted ? "outline" : "outline"}
                                className={cn(
                                  "flex-1 lg:flex-none gap-2 transition-colors",
                                  todayCompleted 
                                    ? "bg-green-100 text-green-700 border-green-300 cursor-not-allowed hover:bg-green-100 hover:text-green-700" 
                                    : "hover:bg-primary hover:text-white"
                                )}
                                onClick={() => !todayCompleted && onTrack(booking.booking_id)}
                                disabled={todayCompleted}
                              >
                                {todayCompleted ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Completed
                                  </>
                                ) : (
                                  <>
                                    <Navigation className="w-4 h-4" />
                                    Track Bus
                                  </>
                                )}
                              </Button>

                              {/* Cancel button */}
                              <Button
                                variant="destructive"
                                className="flex-1 lg:flex-none gap-2"
                                onClick={() => handleCancelBooking(booking)}
                                disabled={cancellingId === booking.booking_id}
                              >
                                {cancellingId === booking.booking_id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                          
                          {/* ✅ REMOVED: No action buttons for cancelled/completed bookings */}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}