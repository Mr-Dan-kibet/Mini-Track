'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { Plus, Search, Trash2, MapPin, Edit2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Route = {
  id: number
  name: string // 🔧 if backend uses a different field, change here
}

type PickupLocation = {
  id: number
  name: string
  route_id: number | string
  gps_coordinates: string
}

export default function PickupLocationsManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [routes, setRoutes] = useState<Route[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    route_id: '',
    gps_coordinates: '',
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PickupLocation | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    route_id: '',
    gps_coordinates: '',
  })

  const normalizeToArray = <T,>(data: any, keys: string[] = []): T[] => {
    if (Array.isArray(data)) return data as T[]
    for (const k of keys) {
      if (Array.isArray(data?.[k])) return data[k] as T[]
    }
    if (Array.isArray(data?.data)) return data.data as T[]
    return []
  }

  const fetchRoutes = async () => {
    try {
      const res = await apiFetch('/routes',{ credentials: 'include' })
      const data = await res.json()
      const arr = normalizeToArray<Route>(data, ['routes'])
      setRoutes(arr)
    } catch (err) {
      console.error('Failed to fetch routes', err)
      setRoutes([])
    }
  }

  const fetchLocations = async () => {
    try {
      const res = await apiFetch('/pickup_locations',{ credentials: 'include' })
      const data = await res.json()
      const arr = normalizeToArray<PickupLocation>(data, ['pickup_locations'])
      setLocations(arr)
    } catch (err) {
      console.error('Failed to fetch pickup locations', err)
      setLocations([])
    }
  }

  useEffect(() => {
    fetchRoutes()
    fetchLocations()
  }, [])

  const routeNameById = useMemo(() => {
    const map = new Map<number, string>()
    routes.forEach(r => map.set(r.id, r.name))
    return map
  }, [routes])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return locations

    return locations.filter(l => {
      const rid = Number(l.route_id)
      const routeName = routeNameById.get(rid) || ''
      return (
        String(l.name ?? '').toLowerCase().includes(q) ||
        String(routeName).toLowerCase().includes(q) ||
        String(l.gps_coordinates ?? '').toLowerCase().includes(q)
      )
    })
  }, [locations, searchTerm, routeNameById])

  const handleAdd = async () => {
    if (!form.name || !form.route_id || !form.gps_coordinates) return

    try {
      const payload = {
        name: form.name,
        route_id: Number(form.route_id),
        gps_coordinates: form.gps_coordinates,
      }

      const res = await apiFetch('/pickup_locations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || data.message || 'Create failed')
        return
      }

      fetchLocations()
      setForm({ name: '', route_id: '', gps_coordinates: '' })
      setAddOpen(false)
    } catch (err) {
      console.error(err)
      alert('Server error')
    }
  }

  const openEdit = (p: PickupLocation) => {
    setEditing(p)
    setEditForm({
      name: p.name,
      route_id: String(p.route_id),
      gps_coordinates: p.gps_coordinates,
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editForm.name || !editForm.route_id || !editForm.gps_coordinates) return

    const payload = {
      name: editForm.name,
      route_id: Number(editForm.route_id),
      gps_coordinates: editForm.gps_coordinates,
    }

    try {
      const res = await apiFetch(`/pickup_locations/${editing.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || data.message || 'Update failed')
        return
      }

      setLocations(prev => prev.map(p => (p.id === editing.id ? { ...p, ...payload } : p)))
      setEditOpen(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      alert('Server error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/pickup_locations/${id}`,
        { method: 'DELETE', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || data.message || 'Delete failed')
        return
      }
      setLocations(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
      alert('Server error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Pickup Locations</CardTitle>
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Pickup
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Pickup Location</DialogTitle>
                  <DialogDescription>Enter pickup location details</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="mt-1"
                      placeholder="Westlands Mall"
                    />
                  </div>

                  <div>
                    <Label>Route</Label>
                    <select
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={form.route_id}
                      onChange={e => setForm({ ...form, route_id: e.target.value })}
                    >
                      <option value="">Select a route</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>GPS Coordinates</Label>
                    <Input
                      value={form.gps_coordinates}
                      onChange={e => setForm({ ...form, gps_coordinates: e.target.value })}
                      className="mt-1"
                      placeholder="-1.2676,36.8108"
                    />
                  </div>

                  <Button className="w-full mt-6" onClick={handleAdd} disabled={!routes.length}>
                    Create Pickup
                  </Button>

                  {!routes.length && (
                    <p className="text-xs text-muted-foreground">
                      No routes loaded yet — add routes first.
                    </p>
                  )}
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
              placeholder="Search by pickup name, route, GPS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Pickup</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Route</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">GPS</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(l => {
                  const routeName = routeNameById.get(Number(l.route_id)) || `Route #${l.route_id}`
                  return (
                    <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-semibold text-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {l.name}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <Badge variant="outline">{routeName}</Badge>
                      </td>

                      <td className="py-4 px-6 text-muted-foreground">{l.gps_coordinates}</td>

                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(l.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center text-muted-foreground">
                      No pickup locations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pickup Location</DialogTitle>
            <DialogDescription>Update details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Pickup Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>

            <div>
              <Label>Route</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={editForm.route_id}
                onChange={e => setEditForm({ ...editForm, route_id: e.target.value })}
              >
                <option value="">Select a route</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>GPS Coordinates</Label>
              <Input
                value={editForm.gps_coordinates}
                onChange={e => setEditForm({ ...editForm, gps_coordinates: e.target.value })}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={!routes.length}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
