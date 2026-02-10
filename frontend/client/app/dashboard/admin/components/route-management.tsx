'use client'
import { apiFetch } from '@/lib/api'
import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit2, Trash2, MapPin, CheckCircle2, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Route = {
  id: number
  name: string
  starting_point: string
  ending_point: string
  status: 'Active' | 'Inactive'
  // ✅ Geofence fields
  starting_point_gps?: string | null
  ending_point_gps?: string | null
  route_radius_km?: number
}


export default function RouteManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [routes, setRoutes] = useState<any[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    starting_point: '',
    ending_point: '',
    // ✅ Geofence fields
    starting_point_gps: '',
    ending_point_gps: '',
    route_radius_km: 5.0,
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    starting_point: '',
    ending_point: '',
    status: 'Active' as Route['status'],
    // ✅ Geofence fields
    starting_point_gps: '',
    ending_point_gps: '',
    route_radius_km: 5.0,
  })

  const fetchRoutes = async () => {
    try {
      const res = await apiFetch("/routes", { credentials: 'include' })
      const data = await res.json()
      setRoutes(data)
    } catch (err) {
      console.error("Failed to fetch routes", err)
    }
  }
  
  useEffect(() => {
    fetchRoutes()
  }, [])

  const filteredRoutes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return routes
    return routes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.starting_point.toLowerCase().includes(q) ||
      r.ending_point.toLowerCase().includes(q)
    )
  }, [routes, searchTerm])

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/routes/${id}`, {
        method: "DELETE",
        credentials: 'include'
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || "Delete failed")
        return
      }

      setRoutes(prev => prev.filter(v => v.id !== id))
    } catch (err) {
      console.error(err)
      alert("Server error")
    }
  }

  const handleAdd = async() => {
    if (!addForm.name || !addForm.starting_point || !addForm.ending_point) {
      alert('Please fill in all required fields (marked with *)')
      return
    }

    // ✅ Validate GPS format if provided
    if (addForm.starting_point_gps) {
      const parts = addForm.starting_point_gps.split(',')
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        alert('Invalid starting point GPS format. Use: latitude,longitude (e.g., -1.2921,36.8219)')
        return
      }
    }

    if (addForm.ending_point_gps) {
      const parts = addForm.ending_point_gps.split(',')
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        alert('Invalid ending point GPS format. Use: latitude,longitude (e.g., -1.0500,37.0833)')
        return
      }
    }

    // ✅ Include geofence data in payload
    const payload = { 
      name: addForm.name,
      starting_point: addForm.starting_point,
      ending_point: addForm.ending_point,
      // Convert empty strings to null for optional fields
      starting_point_gps: addForm.starting_point_gps.trim() || null,
      ending_point_gps: addForm.ending_point_gps.trim() || null,
      route_radius_km: addForm.route_radius_km,
    }

    const res = await apiFetch("/routes", {
      method: "POST",
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      fetchRoutes()
    }

    // Reset form
    setAddForm({ 
      name: '', 
      starting_point: '', 
      ending_point: '',
      starting_point_gps: '',
      ending_point_gps: '',
      route_radius_km: 5.0,
    })
    setAddOpen(false)
  }

  const openEdit = (route: Route) => {
    setEditing(route)
    setEditForm({
      name: route.name,
      starting_point: route.starting_point,
      ending_point: route.ending_point,
      status: route.status,
      // ✅ Include geofence data
      starting_point_gps: route.starting_point_gps || '',
      ending_point_gps: route.ending_point_gps || '',
      route_radius_km: route.route_radius_km || 5.0,
    })
    setEditOpen(true)
  }

  const handleSave = async() => {
    if (!editing) return
    if (!editForm.name || !editForm.starting_point || !editForm.ending_point) {
      alert('Please fill in all required fields')
      return
    }

    // ✅ Validate GPS if provided
    if (editForm.starting_point_gps) {
      const parts = editForm.starting_point_gps.split(',')
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        alert('Invalid starting point GPS format')
        return
      }
    }

    if (editForm.ending_point_gps) {
      const parts = editForm.ending_point_gps.split(',')
      if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
        alert('Invalid ending point GPS format')
        return
      }
    }

    const payload = {
      name: editForm.name,
      starting_point: editForm.starting_point,
      ending_point: editForm.ending_point,
      // ✅ Include geofence data
      starting_point_gps: editForm.starting_point_gps.trim() || null,
      ending_point_gps: editForm.ending_point_gps.trim() || null,
      route_radius_km: editForm.route_radius_km,
    }

    try {
      const res = await apiFetch(`/routes/${editing.id}`, {
        method: "PATCH",
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Update failed")
        return
      }

      setRoutes(prev =>
        prev.map(r =>
          r.id === editing.id ? { ...r, ...editForm } : r
        )
      )
      setEditOpen(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      alert("Server error")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Route Management</CardTitle>
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Route
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Route</DialogTitle>
                  <DialogDescription>Enter route details and geofence boundaries</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Route Name */}
                  <div>
                    <Label>Route Name *</Label>
                    <Input 
                      value={addForm.name} 
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })} 
                      className="mt-1" 
                      placeholder="e.g., Thika Road"
                    />
                  </div>

                  {/* ✅ Starting Point Section */}
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Starting Point
                    </h4>
                    <div>
                      <Label>Location Name *</Label>
                      <Input 
                        value={addForm.starting_point} 
                        onChange={e => setAddForm({ ...addForm, starting_point: e.target.value })} 
                        className="mt-1" 
                        placeholder="e.g., CBD"
                      />
                    </div>
                    <div>
                      <Label>GPS Coordinates (optional)</Label>
                      <Input 
                        value={addForm.starting_point_gps} 
                        onChange={e => setAddForm({ ...addForm, starting_point_gps: e.target.value })} 
                        className="mt-1" 
                        placeholder="-1.2921,36.8219"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: latitude,longitude (e.g., -1.2921,36.8219)
                      </p>
                    </div>
                  </div>

                  {/* ✅ Ending Point Section */}
                  <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Ending Point
                    </h4>
                    <div>
                      <Label>Location Name *</Label>
                      <Input 
                        value={addForm.ending_point} 
                        onChange={e => setAddForm({ ...addForm, ending_point: e.target.value })} 
                        className="mt-1" 
                        placeholder="e.g., Thika"
                      />
                    </div>
                    <div>
                      <Label>GPS Coordinates (optional)</Label>
                      <Input 
                        value={addForm.ending_point_gps} 
                        onChange={e => setAddForm({ ...addForm, ending_point_gps: e.target.value })} 
                        className="mt-1" 
                        placeholder="-1.0500,37.0833"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: latitude,longitude (e.g., -1.0500,37.0833)
                      </p>
                    </div>
                  </div>

                  {/* ✅ Route Corridor Radius */}
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <Label className="font-semibold text-amber-900">Route Corridor Radius (km)</Label>
                    <Input 
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      value={addForm.route_radius_km} 
                      onChange={e => setAddForm({ ...addForm, route_radius_km: parseFloat(e.target.value) || 5.0 })} 
                      className="mt-1" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum distance (in kilometers) that pickup/dropoff locations can be from the route line.
                      Default: 5km
                    </p>
                  </div>

                  {/* ✅ Info Alert */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="ml-2 text-blue-900">
                      <div className="font-semibold mb-1">About Route Geofencing</div>
                      <div className="text-sm">
                        GPS coordinates are optional but recommended. When set, parents can only book custom locations 
                        within the specified radius of the route corridor. This prevents bookings from areas your bus doesn't serve.
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Button className="w-full mt-6" onClick={handleAdd}>
                    Create Route
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredRoutes.map(route => (
          <Card key={route.id} className="border-border/50 hover:border-border transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {route.name}
                </CardTitle>

                <Badge className={route.status === 'Active' ? 'bg-emerald-600' : 'bg-gray-500'}>
                  {route.status ?? "Active"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Starting Point</p>
                <p className="font-semibold text-foreground mt-1">{route.starting_point}</p>
                {/* ✅ Show GPS if exists */}
                {route.starting_point_gps && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    📍 {route.starting_point_gps}
                  </p>
                )}
              </div>

              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Ending Point</p>
                <p className="font-semibold text-foreground mt-1">{route.ending_point}</p>
                {/* ✅ Show GPS if exists */}
                {route.ending_point_gps && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    📍 {route.ending_point_gps}
                  </p>
                )}
              </div>

              {/* ✅ Show Geofence Status */}
              {route.starting_point_gps && route.ending_point_gps && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Geofenced
                    </Badge>
                    <span className="text-xs text-green-700">
                      {route.route_radius_km || 5.0}km radius
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-border/50">
                <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={() => openEdit(route)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={() => handleDelete(route.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRoutes.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center text-muted-foreground">
              No routes found.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
            <DialogDescription>Update route details and geofence settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Route Name *</Label>
              <Input 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                className="mt-1" 
              />
            </div>

            {/* ✅ Starting Point Section */}
            <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Starting Point
              </h4>
              <div>
                <Label>Location Name *</Label>
                <Input 
                  value={editForm.starting_point} 
                  onChange={e => setEditForm({ ...editForm, starting_point: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label>GPS Coordinates (optional)</Label>
                <Input 
                  value={editForm.starting_point_gps} 
                  onChange={e => setEditForm({ ...editForm, starting_point_gps: e.target.value })} 
                  className="mt-1" 
                  placeholder="-1.2921,36.8219"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: latitude,longitude
                </p>
              </div>
            </div>

            {/* ✅ Ending Point Section */}
            <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Ending Point
              </h4>
              <div>
                <Label>Location Name *</Label>
                <Input 
                  value={editForm.ending_point} 
                  onChange={e => setEditForm({ ...editForm, ending_point: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label>GPS Coordinates (optional)</Label>
                <Input 
                  value={editForm.ending_point_gps} 
                  onChange={e => setEditForm({ ...editForm, ending_point_gps: e.target.value })} 
                  className="mt-1" 
                  placeholder="-1.0500,37.0833"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: latitude,longitude
                </p>
              </div>
            </div>

            {/* ✅ Route Corridor Radius */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Label className="font-semibold text-amber-900">Route Corridor Radius (km)</Label>
              <Input 
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={editForm.route_radius_km} 
                onChange={e => setEditForm({ ...editForm, route_radius_km: parseFloat(e.target.value) || 5.0 })} 
                className="mt-1" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum distance from route line. Default: 5km
              </p>
            </div>

            <div>
              <Label>Status</Label>
              <Input 
                value={editForm.status} 
                onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} 
                className="mt-1" 
              />
            </div>

            <Button className="w-full mt-6" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}