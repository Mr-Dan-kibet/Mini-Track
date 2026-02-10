'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react'

const BASE_URL = 'http://127.0.0.1:5555'

// Helper function to get current user ID
function getCurrentUserId(): number | null {
  if (typeof window === 'undefined') return null
  
  const userId = localStorage.getItem('user_id')
  return userId ? parseInt(userId, 10) : null
}

type BookingStatus = 'active' | 'cancelled' | 'completed'

// ✅ ADDED: Trip type
type Trip = {
  trip_id: number
  trip_date: string
  service_time: 'morning' | 'evening'
  status: 'scheduled' | 'picked_up' | 'completed' | 'cancelled'
}

interface Booking {
  booking_id: number
  route_name: string
  pickup_location: string
  dropoff_location: string
  seats_booked: number
  service_type: string
  status: BookingStatus
  start_date: string
  end_date: string
  booking_date: string
  trips?: Trip[]  // ✅ ADDED
}

// Helper function to check if a date is today
const isToday = (dateString: string): boolean => {
  const today = new Date()
  const date = new Date(dateString)
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Helper function to check if a date is tomorrow
const isTomorrow = (dateString: string): boolean => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const date = new Date(dateString)
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  )
}

// Helper function to get relative date label
const getDateLabel = (dateString: string): string => {
  if (isToday(dateString)) return 'Today'
  if (isTomorrow(dateString)) return 'Tomorrow'
  
  const date = new Date(dateString)
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0 && diffDays <= 7) {
    return `In ${diffDays} days`
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ✅ ADDED: Check if today's trips are completed
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

// ---------------- COMPONENT ----------------
export default function RecentBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentBookings = async () => {
      try {
        const userId = getCurrentUserId()
        
        // If no user ID found, don't fetch
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
        if (!res.ok) throw new Error('Failed to fetch bookings')

        const data: Booking[] = await res.json()
        
        // Get current date (start of day for comparison)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Filter active bookings with start_date >= today
        const upcomingBookings = data.filter(b => {
          if (b.status !== 'active') return false
          
          const startDate = new Date(b.start_date)
          startDate.setHours(0, 0, 0, 0)
          
          // Include bookings that start today or in the future
          return startDate >= today
        })
        
        // Sort by start_date (earliest/closest date first)
        const sortedBookings = upcomingBookings.sort((a, b) => {
          const dateA = new Date(a.start_date).getTime()
          const dateB = new Date(b.start_date).getTime()
          
          // Sort ascending (earliest first)
          return dateA - dateB
        })
        
        // Take first 5 upcoming bookings
        const recent = sortedBookings.slice(0, 5)
        
        // ✅ ADDED: Fetch trip details for each booking
        const bookingsWithTrips = await Promise.all(
          recent.map(async (booking) => {
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
        
        console.log('Upcoming bookings sorted by start_date:', bookingsWithTrips)
      } catch (err) {
        console.error('Recent bookings error:', err)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecentBookings()
  }, [])

  const getStatusColor = (status: BookingStatus, todayCompleted: boolean) => {
    // ✅ UPDATED: Show completed color if today's trips are done
    if (status === 'active' && todayCompleted) {
      return 'bg-green-500/20 text-green-700 border-green-500/50'
    }
    
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/50'
      case 'cancelled':
        return 'bg-red-500/20 text-red-700 border-red-500/50'
      case 'completed':
        return 'bg-gray-500/20 text-gray-700 border-gray-500/50'
      default:
        return ''
    }
  }

  const getCardColor = (index: number) => {
    const colors = ['bg-blue-50', 'bg-purple-50', 'bg-pink-50', 'bg-green-50', 'bg-yellow-50']
    return colors[index % colors.length]
  }

  // Get priority badge for today/tomorrow bookings
  const getPriorityBadge = (startDate: string) => {
    if (isToday(startDate)) {
      return (
        <Badge className="bg-red-500 text-white border-red-600 font-semibold">
          🔥 TODAY
        </Badge>
      )
    }
    if (isTomorrow(startDate)) {
      return (
        <Badge className="bg-orange-500 text-white border-orange-600 font-semibold">
          ⚡ TOMORROW
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="w-5 h-5 text-primary" />
              Recent Bookings
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Your next scheduled trips, sorted by date
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" className="hover:text-primary transition-colors">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading upcoming bookings…</p>
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              No upcoming bookings
            </p>
            <p className="text-xs text-muted-foreground">
              Create a new booking to see it here
            </p>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="space-y-3">
            {bookings.map((b, i) => {
              // ✅ ADDED: Check if today's trips are completed
              const todayCompleted = checkTodayTripsCompleted(b)
              
              return (
                <div
                  key={b.booking_id}
                  className={`relative flex flex-col md:flex-row items-start md:items-center justify-between p-5 border border-border/50 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 ${getCardColor(i)}`}
                >
                  {/* Priority Badge (Today/Tomorrow) */}
                  {getPriorityBadge(b.start_date) && (
                    <div className="absolute -top-2 -right-2">
                      {getPriorityBadge(b.start_date)}
                    </div>
                  )}
                  
                  {/* ✅ ADDED: Completion badge for today's completed trips */}
                  {todayCompleted && isToday(b.start_date) && (
                    <div className="absolute -top-2 -left-2">
                      <Badge className="bg-green-500 text-white border-green-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  )}

                  {/* Left: Booking info */}
                  <div className="flex-1 space-y-2">
                    {/* Route Name */}
                    <p className="font-semibold text-base text-gray-800 dark:text-gray-900">
                      {b.route_name}
                    </p>

                    {/* Date Range with relative label */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Start Date Badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold shadow-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {getDateLabel(b.start_date)}
                      </div>
                      
                      {/* Date Range */}
                      <p className="text-xs text-muted-foreground font-medium">
                        {new Date(b.start_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                        {' → '}
                        {new Date(b.end_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>

                    {/* Pickup and Dropoff */}
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">From:</span> {b.pickup_location}
                      {' → '}
                      <span className="font-semibold">To:</span> {b.dropoff_location}
                    </p>

                    {/* Service Type */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {b.service_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Right: Seats & status */}
                  <div className="flex flex-col items-end gap-2 mt-3 md:mt-0">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-900">
                      {b.seats_booked} {b.seats_booked === 1 ? 'seat' : 'seats'}
                    </p>
                    {/* ✅ UPDATED: Status badge changes based on completion */}
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(b.status, todayCompleted)}
                    >
                      {todayCompleted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          completed today
                        </>
                      ) : (
                        b.status
                      )}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && bookings.length > 0 && (
          <div className="pt-3 border-t border-border/50 mt-4">
            <p className="text-xs text-muted-foreground text-center">
              Showing {bookings.length} upcoming {bookings.length === 1 ? 'booking' : 'bookings'}
              {bookings.some(b => isToday(b.start_date)) && (
                <span className="text-red-600 font-semibold ml-1">
                  • Trip starting today!
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}