'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { Plus, Search, Trash2, MapPin, Edit2, Filter, Navigation } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Route = { id: number; name: string }
type PickupLocation = { id: number; name: string; route_id: number | string; gps_coordinates: string }

export default function PickupLocationsManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', route_id: '', gps_coordinates: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PickupLocation | null>(null)
  const [editForm, setEditForm] = useState({ name: '', route_id: '', gps_coordinates: '' })
  const [loading, setLoading] = useState(false)

  const normalizeToArray = <T,>(data: any, keys: string[] = []): T[] => {
    if (Array.isArray(data)) return data as T[]
    for (const k of keys) { if (Array.isArray(data?.[k])) return data[k] as T[] }
    if (Array.isArray(data?.data)) return data.data as T[]
    return []
  }

  const fetchRoutes = async () => {
    try {
      const res = await apiFetch('/routes', { credentials: "include" })
      const data = await res.json()
      setRoutes(normalizeToArray<Route>(data, ['routes']))
    } catch (err) { console.error('Failed to fetch routes', err); setRoutes([]) }
  }

  const fetchLocations = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/pickup_locations', { credentials: "include" })
      const data = await res.json()
      setLocations(normalizeToArray<PickupLocation>(data, ['pickup_locations']))
    } catch (err) { console.error('Failed to fetch pickup locations', err); setLocations([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRoutes(); fetchLocations() }, [])

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
      return String(l.name ?? '').toLowerCase().includes(q) || String(routeName).toLowerCase().includes(q) || String(l.gps_coordinates ?? '').toLowerCase().includes(q)
    })
  }, [locations, searchTerm, routeNameById])

  const handleAdd = async () => {
    if (!form.name || !form.route_id || !form.gps_coordinates) return
    try {
      const payload = { name: form.name, route_id: Number(form.route_id), gps_coordinates: form.gps_coordinates }
      const res = await apiFetch('/pickup_locations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || data.message || 'Create failed'); return }
      fetchLocations(); setForm({ name: '', route_id: '', gps_coordinates: '' }); setAddOpen(false)
    } catch (err) { console.error(err); alert('Server error') }
  }

  const openEdit = (p: PickupLocation) => {
    setEditing(p); setEditForm({ name: p.name, route_id: String(p.route_id), gps_coordinates: p.gps_coordinates }); setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editForm.name || !editForm.route_id || !editForm.gps_coordinates) return
    const payload = { name: editForm.name, route_id: Number(editForm.route_id), gps_coordinates: editForm.gps_coordinates }
    try {
      const res = await apiFetch(`/pickup_locations/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || data.message || 'Update failed'); return }
      setLocations(prev => prev.map(p => (p.id === editing.id ? { ...p, ...payload } : p))); setEditOpen(false); setEditing(null)
    } catch (err) { console.error(err); alert('Server error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this pickup location?')) return
    try {
      const res = await apiFetch(`/pickup_locations/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || data.message || 'Delete failed'); return }
      setLocations(prev => prev.filter(p => p.id !== id))
    } catch (err) { console.error(err); alert('Server error') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pickup Locations</h2>
            <p className="text-sm text-gray-500">Manage pickup points for transportation routes</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button className="gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white">
            <Plus className="w-4 h-4" /> Add Pickup
          </Button>

          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-pink-50 border border-pink-100">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Add Pickup Location</DialogTitle>
                  <DialogDescription>Create a new pickup point for a route</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Pickup Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Westlands Mall" className="mt-1" />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Route Assignment</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-pink-500 focus:ring-pink-500"
                  value={form.route_id}
                  onChange={e => setForm({ ...form, route_id: e.target.value })}
                >
                  <option value="">Select a route</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">GPS Coordinates</Label>
                <Input value={form.gps_coordinates} onChange={e => setForm({ ...form, gps_coordinates: e.target.value })} placeholder="-1.2676, 36.8108" className="mt-1" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setAddOpen(false)} className="border-gray-300 hover:border-gray-400">
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!routes.length} className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white">
                  Create Pickup
                </Button>
              </div>

              {!routes.length && <p className="text-xs text-gray-500">No routes available. Please add routes first.</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <Card className="bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by pickup name, route, GPS coordinates..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 bg-white border-gray-300 focus:border-pink-500 focus:ring-pink-500"
              />
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <Badge className="bg-pink-100 text-pink-800 border-pink-200">
              <MapPin className="w-3 h-3 mr-1" /> {locations.length} Locations
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card className="bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-pink-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900">Pickup Locations</CardTitle>
              <p className="text-sm text-gray-500">Manage all pickup points across routes</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-pink-50 border-b border-pink-100">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-pink-900">Pickup Location</th>
                  <th className="text-left py-4 px-6 font-semibold text-pink-900">Route Assignment</th>
                  <th className="text-left py-4 px-6 font-semibold text-pink-900">GPS Coordinates</th>
                  <th className="text-right py-4 px-6 font-semibold text-pink-900">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
                        Loading pickup locations...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center">
                      <div className="text-gray-500">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No pickup locations found</p>
                        <p className="text-sm text-gray-400 mt-1">Add pickup locations to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(l => {
                    const routeName = routeNameById.get(Number(l.route_id)) || `Route #${l.route_id}`
                    return (
                      <tr key={l.id} className="border-b border-gray-100 hover:bg-pink-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-rose-100">
                              <MapPin className="w-4 h-4 text-pink-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{l.name}</p>
                              <p className="text-xs text-gray-500">Pickup ID: {l.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {routeName}
                          </Badge>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Navigation className="w-3.5 h-3.5" />
                            <span className="font-mono text-sm">{l.gps_coordinates}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="border-blue-200 hover:border-blue-300 hover:bg-blue-50" onClick={() => openEdit(l)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="border-rose-200 hover:border-rose-300 hover:bg-rose-50" onClick={() => handleDelete(l.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-emerald-50 border border-emerald-100">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Edit Pickup Location</DialogTitle>
                <DialogDescription>Update pickup point details</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Pickup Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Route Assignment</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                value={editForm.route_id}
                onChange={e => setEditForm({ ...editForm, route_id: e.target.value })}
              >
                <option value="">Select a route</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">GPS Coordinates</Label>
              <Input value={editForm.gps_coordinates} onChange={e => setEditForm({ ...editForm, gps_coordinates: e.target.value })} className="mt-1" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-300 hover:border-gray-400">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}