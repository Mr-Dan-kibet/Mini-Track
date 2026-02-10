'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { TrendingUp, Settings, Zap, LogOut } from 'lucide-react'

import OverviewSection from './components/overview'
// import AnalyticsSection from './components/analytics'
import BookingsManagement from './components/bookings-management'

import DriverManagement from './components/driver-management'
import RouteManagement from './components/route-management'
import VehicleManagement from './components/bus-management'
import SchoolLocationManagement from './components/school-location-management'
import PickupLocationsManagement from './components/pickup-locations-management' // ✅ ADD

export default function AdminDashboardPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('overview')
  const [username, setUsername] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

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

      await apiFetch("/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // localStorage.removeItem('token')
      localStorage.removeItem('username')

      setLoggingOut(false)
      router.replace('/auth/signin')
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome Admin{username ? `, ${username}` : ''}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage drivers, routes, vehicles, school locations, pickup locations, and bookings
              </p>
            </div>

            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto bg-card border border-border/50">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Management</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewSection />
            {/* <AnalyticsSection /> */}
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <DriverManagement />
            <RouteManagement />

            {/* ✅ School + Pickup side-by-side on Management tab */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SchoolLocationManagement />
              <PickupLocationsManagement />
            </div>

            <VehicleManagement />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <BookingsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
