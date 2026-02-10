'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Bus, Clock, TrendingUp } from 'lucide-react'

interface QuickActionsProps {
  summary: {
    totalBookings: number
    activeRoutes: number  // ✅ Now correctly excludes today's completed trips
    upcomingTrips: number
  }
}

export default function QuickActions({ summary }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1 - Total Bookings (Purple) */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 opacity-70" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium opacity-90">Total Bookings</p>
            <p className="text-4xl font-bold">{summary.totalBookings}</p>
            <p className="text-xs opacity-75">All bookings made</p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - Active Now (White with green accent) */}
      {/* ✅ FIXED: Correctly shows only active trips (excludes today's completed) */}
      <Card className="border-0 shadow-lg bg-white dark:bg-card">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-xl">
              <Bus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Active Now</p>
            <p className="text-4xl font-bold text-foreground">{summary.activeRoutes}</p>
            <div className="h-2 bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                style={{ width: summary.activeRoutes > 0 ? '75%' : '0%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.activeRoutes === 0 ? 'No active trips' : 'Currently running'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 - Scheduled Trips (Orange-red gradient) */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white/30 backdrop-blur-md rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
              Upcoming
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium opacity-90">Scheduled Trips</p>
            <p className="text-5xl font-black">{summary.upcomingTrips}</p>
            <div className="flex items-center gap-2 text-xs opacity-75 mt-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Ready to go
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}