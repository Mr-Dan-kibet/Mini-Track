'use client'
import { apiFetch } from '@/lib/api'
import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit2, Trash2, MapPin, Route as RouteIcon, Navigation, Activity } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Route = {
  id: number
  name: string
  starting_point: string
  ending_point: string
  status: 'Active' | 'Inactive'
}

export default function RouteManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [routes, setRoutes] = useState<Route[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', starting_point: '', ending_point: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [editForm, setEditForm] = useState({ name: '', starting_point: '', ending_point: '', status: 'Active' as Route['status'] })
  const [loading, setLoading] = useState(false)

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      const res = await apiFetch("/routes", { credentials: "include" })
      const data = await res.json()
      setRoutes(data)
    } catch (err) {
      console.error("Failed to fetch routes", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoutes() }, [])

  const filteredRoutes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return routes
    return routes.filter(r =>
      r.name.toLowerCase().includes(q) || r.starting_point.toLowerCase().includes(q) || r.ending_point.toLowerCase().includes(q)
    )
  }, [routes, searchTerm])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this route?')) return
    try {
      const res = await apiFetch(`/routes/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { alert(data.message || "Delete failed"); return }
      setRoutes(prev => prev.filter(v => v.id !== id))
    } catch (err) { console.error(err); alert("Server error") }
  }

  const handleAdd = async () => {
    if (!addForm.name || !addForm.starting_point || !addForm.ending_point) return
    const payload = { ...addForm }
    try {
      const res = await apiFetch("/routes", {
        method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if (res.ok) { fetchRoutes() }
      setAddForm({ name: '', starting_point: '', ending_point: '' })
      setAddOpen(false)
    } catch (err) { console.error(err); alert("Server error") }
  }

  const openEdit = (route: Route) => {
    setEditing(route)
    setEditForm({ name: route.name, starting_point: route.starting_point, ending_point: route.ending_point, status: route.status })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editForm.name || !editForm.starting_point || !editForm.ending_point) return
    const payload = { name: editForm.name, starting_point: editForm.starting_point, ending_point: editForm.ending_point }
    try {
      const res = await apiFetch(`/routes/${editing.id}`, {
        method: "PATCH", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Update failed"); return }
      setRoutes(prev => prev.map(r => r.id === editing.id ? { ...r, ...editForm } : r))
      setEditOpen(false)
      setEditing(null)
    } catch (err) { console.error(err); alert("Server error") }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <RouteIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Route Management</h2>
            <p className="text-sm text-gray-500">Configure and manage transportation routes</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
            <Plus className="w-4 h-4" /> Add Route
          </Button>

          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-emerald-50 border border-emerald-100">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <RouteIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Create New Route</DialogTitle>
                  <DialogDescription>Define a new transportation route</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Route Name</Label>
                <Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="mt-1" placeholder="Main School Route" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Starting Point</Label>
                <Input value={addForm.starting_point} onChange={e => setAddForm({ ...addForm, starting_point: e.target.value })} className="mt-1" placeholder="Central Station" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Ending Point</Label>
                <Input value={addForm.ending_point} onChange={e => setAddForm({ ...addForm, ending_point: e.target.value })} className="mt-1" placeholder="Downtown School" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setAddOpen(false)} className="border-gray-300 hover:border-gray-400">
                  Cancel
                </Button>
                <Button onClick={handleAdd} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                  Create Route
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <Card className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search routes by name, start, or end point..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <Activity className="w-3 h-3 mr-1" /> {routes.filter(r => r.status === 'Active').length} Active
              </Badge>
              <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                {routes.filter(r => r.status !== 'Active').length} Inactive
              </Badge>
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                {routes.length} Total
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-10 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
              Loading routes...
            </div>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="col-span-2">
            <Card className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm">
              <CardContent className="pt-6 text-center py-10">
                <div className="text-gray-500">
                  <RouteIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No routes found</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first route to get started</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredRoutes.map(route => (
            <Card key={route.id} className="bg-gradient-to-br from-white to-emerald-50 border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300 hover:border-emerald-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <RouteIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-gray-900">{route.name}</CardTitle>
                      <CardDescription className="text-xs text-gray-500">Route ID: {route.id}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`${route.status === 'Active' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                    : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'}`}>
                    {route.status ?? "Active"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs font-medium text-blue-700">Starting Point</p>
                  </div>
                  <p className="font-semibold text-gray-900">{route.starting_point}</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="w-3.5 h-3.5 text-amber-500" />
                    <p className="text-xs font-medium text-amber-700">Ending Point</p>
                  </div>
                  <p className="font-semibold text-gray-900">{route.ending_point}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button size="sm" variant="outline" className="flex-1 border-blue-200 hover:border-blue-300 hover:bg-blue-50" onClick={() => openEdit(route)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-rose-200 hover:border-rose-300 hover:bg-rose-50" onClick={() => handleDelete(route.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-blue-50 border border-blue-100">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <RouteIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Edit Route</DialogTitle>
                <DialogDescription>Update route details and status</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Route Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Starting Point</Label>
              <Input value={editForm.starting_point} onChange={e => setEditForm({ ...editForm, starting_point: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Ending Point</Label>
              <Input value={editForm.ending_point} onChange={e => setEditForm({ ...editForm, ending_point: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-300 hover:border-gray-400">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}