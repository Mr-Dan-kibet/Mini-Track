'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit2, Trash2, Car, Route as RouteIcon, User, Filter, Activity } from 'lucide-react'

type Id = number | string
type VehicleApi = { id: Id; route_id: Id; user_id: Id; license_plate: string; model: string; capacity: number; status?: string }
type Vehicle = { id: string; route_id: string; user_id: string; license_plate: string; model: string; capacity: number; status?: string }
type RouteOption = { id: Id; name?: string; starting_point?: string; ending_point?: string }
type DriverOption = { id: Id; name?: string; email?: string; phone_number?: string }

const toId = (v: any) => String(v ?? '')
const toArray = (x: any) => {
  if (Array.isArray(x)) return x
  if (Array.isArray(x?.data)) return x.data
  if (Array.isArray(x?.results)) return x.results
  if (Array.isArray(x?.items)) return x.items
  if (Array.isArray(x?.vehicles)) return x.vehicles
  if (Array.isArray(x?.routes)) return x.routes
  if (Array.isArray(x?.drivers)) return x.drivers
  return []
}

const routeLabel = (r?: RouteOption) => {
  if (!r) return '—'
  if (r.name) return r.name
  if (r.starting_point && r.ending_point) return `${r.starting_point} → ${r.ending_point}`
  return `Route #${toId(r.id)}`
}

const driverLabel = (d?: DriverOption, fallbackId?: string) => {
  if (!d) return fallbackId ? `Driver #${fallbackId}` : '—'
  return d.name ?? d.email ?? (fallbackId ? `Driver #${fallbackId}` : `Driver #${toId(d.id)}`)
}

const normalizeVehicle = (raw: VehicleApi): Vehicle => ({
  id: toId(raw.id),
  route_id: toId(raw.route_id),
  user_id: toId(raw.user_id),
  license_plate: String(raw.license_plate ?? ''),
  model: String(raw.model ?? ''),
  capacity: Number(raw.capacity ?? 0),
  status: raw.status ? String(raw.status) : undefined,
})

export default function VehicleManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const [newLicensePlate, setNewLicensePlate] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newCapacity, setNewCapacity] = useState<number>(14)
  const [newRouteId, setNewRouteId] = useState<string>('')
  const [newDriverId, setNewDriverId] = useState<string>('')

  const [editId, setEditId] = useState<string>('')
  const [editLicensePlate, setEditLicensePlate] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editCapacity, setEditCapacity] = useState<number>(14)
  const [editRouteId, setEditRouteId] = useState<string>('')
  const [editDriverId, setEditDriverId] = useState<string>('')

  const fetchAll = async () => {
    setLoading(true); setError(null)
    try {
      const [vehRes, routesRes, driversRes] = await Promise.all([
        apiFetch('/vehicles', { credentials: "include" }),
        apiFetch('/routes', { credentials: "include" }),
        apiFetch('/drivers', { credentials: "include" }),
      ])

      const [vehJson, routesJson, driversJson] = await Promise.all([
        vehRes.json().catch(() => null),
        routesRes.json().catch(() => null),
        driversRes.json().catch(() => null),
      ])

      if (!vehRes.ok) throw new Error(vehJson?.error || vehJson?.message || `Vehicles fetch failed (${vehRes.status})`)
      if (!routesRes.ok) throw new Error(routesJson?.error || routesJson?.message || `Routes fetch failed (${routesRes.status})`)
      if (!driversRes.ok) throw new Error(driversJson?.error || driversJson?.message || `Drivers fetch failed (${driversRes.status})`)

      setVehicles(toArray(vehJson).map(normalizeVehicle))
      setRoutes(toArray(routesJson))
      setDrivers(toArray(driversJson))
    } catch (e: any) {
      console.error(e); setVehicles([]); setRoutes([]); setDrivers([]); setError(e?.message || 'Failed to load vehicles')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const routeById = useMemo(() => { const m = new Map<string, RouteOption>(); routes.forEach(r => m.set(toId(r.id), r)); return m }, [routes])
  const driverById = useMemo(() => { const m = new Map<string, DriverOption>(); drivers.forEach(d => m.set(toId(d.id), d)); return m }, [drivers])

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(v => {
      const r = routeById.get(v.route_id); const d = driverById.get(v.user_id)
      return v.license_plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) ||
        routeLabel(r).toLowerCase().includes(q) || driverLabel(d, v.user_id).toLowerCase().includes(q) ||
        String(v.capacity).includes(q)
    })
  }, [vehicles, searchTerm, routeById, driverById])

  const resetAddForm = () => {
    setNewLicensePlate(''); setNewModel(''); setNewCapacity(14); setNewRouteId(''); setNewDriverId('')
  }

  const openEdit = (v: Vehicle) => {
    setEditId(v.id); setEditLicensePlate(v.license_plate); setEditModel(v.model)
    setEditCapacity(v.capacity); setEditRouteId(v.route_id); setEditDriverId(v.user_id); setEditOpen(true)
  }

  const createVehicle = async () => {
    setError(null)
    if (!newRouteId) return setError('Please select a route')
    if (!newDriverId) return setError('Please select a driver')
    if (!newLicensePlate.trim()) return setError('License plate is required')
    if (!newModel.trim()) return setError('Model is required')
    if (!Number.isFinite(newCapacity) || newCapacity <= 0) return setError('Capacity must be positive')

    try {
      const res = await apiFetch('/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: Number.isFinite(Number(newRouteId)) ? Number(newRouteId) : newRouteId,
          user_id: Number.isFinite(Number(newDriverId)) ? Number(newDriverId) : newDriverId,
          license_plate: newLicensePlate.trim(),
          model: newModel.trim(),
          capacity: Number(newCapacity),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || `Create failed (${res.status})`)

      setAddOpen(false); resetAddForm(); await fetchAll()
    } catch (e: any) {
      console.error(e); setError(e?.message || 'Failed to create vehicle')
    }
  }

  const updateVehicle = async () => {
    setError(null)
    if (!editId) return
    if (!editRouteId) return setError('Please select a route')
    if (!editDriverId) return setError('Please select a driver')
    if (!editLicensePlate.trim()) return setError('License plate is required')
    if (!editModel.trim()) return setError('Model is required')
    if (!Number.isFinite(editCapacity) || editCapacity <= 0) return setError('Capacity must be positive')

    try {
      const res = await apiFetch(`/vehicles/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: Number.isFinite(Number(editRouteId)) ? Number(editRouteId) : editRouteId,
          user_id: Number.isFinite(Number(editDriverId)) ? Number(editDriverId) : editDriverId,
          license_plate: editLicensePlate.trim(),
          model: editModel.trim(),
          capacity: Number(editCapacity),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || `Update failed (${res.status})`)

      setEditOpen(false); await fetchAll()
    } catch (e: any) {
      console.error(e); setError(e?.message || 'Failed to update vehicle')
    }
  }

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return
    setError(null)
    try {
      const res = await apiFetch(`/vehicles/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || `Delete failed (${res.status})`)
      await fetchAll()
    } catch (e: any) {
      console.error(e); setError(e?.message || 'Failed to delete vehicle')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vehicle Management</h2>
            <p className="text-sm text-gray-500">Assign vehicles to routes and drivers</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={open => (setAddOpen(open), !open && resetAddForm())}>
          <Button className="gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white">
            <Plus className="w-4 h-4" /> Add Vehicle
          </Button>
          
          <DialogContent className="sm:max-w-[520px] bg-gradient-to-br from-white to-orange-50 border border-orange-100">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Add New Vehicle</DialogTitle>
                  <DialogDescription>Select route and driver, then fill vehicle details</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Route Assignment</Label>
                <Select value={newRouteId} onValueChange={setNewRouteId}>
                  <SelectTrigger className="mt-1 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {routes.map(r => (
                      <SelectItem key={toId(r.id)} value={toId(r.id)} className="hover:bg-orange-50">
                        {routeLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Driver Assignment</Label>
                <Select value={newDriverId} onValueChange={setNewDriverId}>
                  <SelectTrigger className="mt-1 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500">
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {drivers.map(d => (
                      <SelectItem key={toId(d.id)} value={toId(d.id)} className="hover:bg-orange-50">
                        {driverLabel(d, toId(d.id))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">License Plate</Label>
                  <Input value={newLicensePlate} onChange={e => setNewLicensePlate(e.target.value)} placeholder="KDC 123X" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Model</Label>
                  <Input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Toyota Hiace" className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Passenger Capacity</Label>
                <Input type="number" value={String(newCapacity)} onChange={e => setNewCapacity(Number(e.target.value))} min={1} className="mt-1" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setAddOpen(false)} className="border-gray-300 hover:border-gray-400">
                  Cancel
                </Button>
                <Button onClick={createVehicle} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white">
                  Create Vehicle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <Card className="bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-12 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Search by plate, model, route, driver..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Assigned: {vehicles.filter(v => v.user_id.trim() !== '' && v.user_id !== '0').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span>Unassigned: {vehicles.filter(v => v.user_id.trim() === '' || v.user_id === '0').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Total: {vehicles.length}</span>
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-orange-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900">Fleet Vehicles</CardTitle>
              <p className="text-sm text-gray-500">Manage your transportation fleet</p>
            </div>
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              <Activity className="w-3 h-3 mr-1" /> {filteredVehicles.length} Vehicles
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-orange-50 border-b border-orange-100">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-orange-900">Vehicle Details</th>
                  <th className="text-left py-4 px-6 font-semibold text-orange-900">Route</th>
                  <th className="text-left py-4 px-6 font-semibold text-orange-900">Driver</th>
                  <th className="text-left py-4 px-6 font-semibold text-orange-900">Capacity</th>
                  <th className="text-left py-4 px-6 font-semibold text-orange-900">Status</th>
                  <th className="text-right py-4 px-6 font-semibold text-orange-900">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                        Loading vehicles...
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && filteredVehicles.map(v => {
                  const r = routeById.get(v.route_id)
                  const d = driverById.get(v.user_id)

                  return (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                            <Car className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{v.license_plate}</p>
                            <p className="text-xs text-gray-500">{v.model}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <RouteIcon className="w-4 h-4 text-orange-500" />
                          <span className="text-gray-700">{routeLabel(r)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-700">{driverLabel(d, v.user_id)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <Badge className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200">
                          {v.capacity} seats
                        </Badge>
                      </td>

                      <td className="py-4 px-6">
                        <Badge className={`${v.user_id.trim() ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                          {v.user_id.trim() ? 'Assigned' : 'Unassigned'}
                        </Badge>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="border-blue-200 hover:border-blue-300 hover:bg-blue-50" onClick={() => openEdit(v)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-rose-200 hover:border-rose-300 hover:bg-rose-50" onClick={() => deleteVehicle(v.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!loading && filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center">
                      <div className="text-gray-500">
                        <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No vehicles found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adding a vehicle or adjusting your search</p>
                      </div>
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
        <DialogContent className="sm:max-w-[520px] bg-gradient-to-br from-white to-blue-50 border border-blue-100">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Edit Vehicle</DialogTitle>
                <DialogDescription>Update vehicle details and assignments</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Route Assignment</Label>
              <Select value={editRouteId} onValueChange={setEditRouteId}>
                <SelectTrigger className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {routes.map(r => (
                    <SelectItem key={toId(r.id)} value={toId(r.id)} className="hover:bg-blue-50">
                      {routeLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Driver Assignment</Label>
              <Select value={editDriverId} onValueChange={setEditDriverId}>
                <SelectTrigger className="mt-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {drivers.map(d => (
                    <SelectItem key={toId(d.id)} value={toId(d.id)} className="hover:bg-blue-50">
                      {driverLabel(d, toId(d.id))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">License Plate</Label>
                <Input value={editLicensePlate} onChange={e => setEditLicensePlate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Model</Label>
                <Input value={editModel} onChange={e => setEditModel(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Passenger Capacity</Label>
              <Input type="number" value={String(editCapacity)} onChange={e => setEditCapacity(Number(e.target.value))} min={1} className="mt-1" />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="border-gray-300 hover:border-gray-400">
                Cancel
              </Button>
              <Button onClick={updateVehicle} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}