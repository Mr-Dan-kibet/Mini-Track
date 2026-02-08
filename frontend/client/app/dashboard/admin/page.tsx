'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { 
  TrendingUp, 
  Settings, 
  Zap, 
  LogOut, 
  Users, 
  MapPin, 
  Bus, 
  Route,
  School,
  Calendar,
  Shield,
  Bell,
  Activity
} from 'lucide-react'

import OverviewSection from './components/overview'
import BookingsManagement from './components/bookings-management'
import DriverManagement from './components/driver-management'
import RouteManagement from './components/route-management'
import VehicleManagement from './components/bus-management'
import SchoolLocationManagement from './components/school-location-management'
import PickupLocationsManagement from './components/pickup-locations-management'

export default function AdminDashboardPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('overview')
  const [username, setUsername] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeBookings: 0,
    totalVehicles: 0,
    totalRoutes: 0
  })

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
        
        // Fetch dashboard stats
        await fetchDashboardStats();
      } catch (err) {
        router.replace("/auth/signin");
      }
    };

    checkAuth();
  }, [router]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch stats from various endpoints
      const [driversRes, bookingsRes, vehiclesRes, routesRes] = await Promise.all([
        apiFetch("/drivers"),
        apiFetch("/bookings?status=active"),
        apiFetch("/vehicles"),
        apiFetch("/routes")
      ]);

      setStats({
        totalDrivers: Array.isArray(await driversRes.json()) ? (await driversRes.json()).length : 0,
        activeBookings: Array.isArray(await bookingsRes.json()) ? (await bookingsRes.json()).length : 0,
        totalVehicles: Array.isArray(await vehiclesRes.json()) ? (await vehiclesRes.json()).length : 0,
        totalRoutes: Array.isArray(await routesRes.json()) ? (await routesRes.json()).length : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)

    try {
      await apiFetch("/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('username')
      setLoggingOut(false)
      router.replace('/auth/signin')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  {/* <Shield className="w-6 h-6 text-white" /> */}
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
                    Welcome back{username ? `, ${username}` : ''} • Manage your transportation system
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-100">
                <Bell className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">System Active</span>
              </div>
              
              <Button
                variant="outline"
                className="gap-2 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 group"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-medium">
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </span>
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalDrivers}</p>
              <p className="text-sm text-gray-500">Total Drivers</p>
            </div>

            <div className="bg-gradient-to-br from-white to-green-50 rounded-xl border border-green-100 p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-green-100">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activeBookings}</p>
              <p className="text-sm text-gray-500">Active Bookings</p>
            </div>

            <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl border border-orange-100 p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Bus className="w-4 h-4 text-orange-600" />
                </div>
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalVehicles}</p>
              <p className="text-sm text-gray-500">Total Vehicles</p>
            </div>

            <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl border border-purple-100 p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Route className="w-4 h-4 text-purple-600" />
                </div>
                <Activity className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalRoutes}</p>
              <p className="text-sm text-gray-500">Active Routes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-xl"></div>
              <TabsList className="relative bg-white border border-gray-200 rounded-xl p-1 w-full grid grid-cols-3 max-w-md mx-auto">
                <TabsTrigger 
                  value="overview" 
                  className="gap-2 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="management" 
                  className="gap-2 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                >
                  <Settings className="w-4 h-4" />
                  <span>Management</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="bookings" 
                  className="gap-2 py-3 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300"
                >
                  <Zap className="w-4 h-4" />
                  <span>Bookings</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Indicators */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Dashboard Overview</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>System Management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span>Bookings Control</span>
              </div>
            </div>

            {/* Tab Contents with Cards */}
            <div className="mt-8">
              <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <OverviewSection />
                </div>
              </TabsContent>

              <TabsContent value="management" className="space-y-6 animate-in fade-in duration-300">
                <div className="grid gap-6">
                  {/* Management Cards with Icons */}
                  <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Driver Management</h2>
                    </div>
                    <DriverManagement />
                  </div>

                  <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl border border-emerald-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                        <Route className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Route Management</h2>
                    </div>
                    <RouteManagement />
                  </div>

                  {/* School & Pickup Locations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-purple-100 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                          <School className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">School Locations</h2>
                      </div>
                      <SchoolLocationManagement />
                    </div>

                    <div className="bg-gradient-to-br from-white to-pink-50 rounded-2xl border border-pink-100 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Pickup Locations</h2>
                      </div>
                      <PickupLocationsManagement />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl border border-orange-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                        <Bus className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Vehicle Management</h2>
                    </div>
                    <VehicleManagement />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bookings" className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl border border-amber-100 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Bookings Management</h2>
                      <p className="text-sm text-gray-500 mt-1">Manage all transportation bookings and schedules</p>
                    </div>
                  </div>
                  <BookingsManagement />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Stats */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                System Status: <span className="font-medium text-green-600">Operational</span>
              </p>
              <p className="mt-1">Last updated: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>API Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span>Database Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span>Services Running</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}