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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit2, Trash2, Car, Route as RouteIcon, User } from 'lucide-react'

type Id = number | string

type VehicleApi = {
  id: Id
  route_id: Id
  user_id: Id // driver id
  license_plate: string
  model: string
  capacity: number
  status?: string
}

type Vehicle = {
  id: string
  route_id: string
  user_id: string
  license_plate: string
  model: string
  capacity: number
  status?: string
}

type RouteOption = {
  id: Id
  name?: string
  starting_point?: string
  ending_point?: string
  status?: string
}

type DriverOption = {
  id: Id
  name?: string
  email?: string
  phone_number?: string
}

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

  // dialogs
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // add form
  const [newLicensePlate, setNewLicensePlate] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newCapacity, setNewCapacity] = useState<number>(14)
  const [newRouteId, setNewRouteId] = useState<string>('')
  const [newDriverId, setNewDriverId] = useState<string>('')

  // edit form
  const [editId, setEditId] = useState<string>('')
  const [editLicensePlate, setEditLicensePlate] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editCapacity, setEditCapacity] = useState<number>(14)
  const [editRouteId, setEditRouteId] = useState<string>('')
  const [editDriverId, setEditDriverId] = useState<string>('')

  // const authHeaders = useMemo(() => {
  //   // const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
  //   const headers: HeadersInit = { 'Content-Type': 'application/json', credentials: 'include' }
  //   return headers
  // }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)

    try {
      const [vehRes, routesRes, driversRes] = await Promise.all([
        apiFetch('/vehicles', { credentials: 'include' }),
        apiFetch('/routes', { credentials: 'include' }),
        apiFetch('/drivers', { credentials: 'include' }),
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
      console.error(e)
      setVehicles([])
      setRoutes([])
      setDrivers([])
      setError(e?.message || 'Failed to load vehicles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const routeById = useMemo(() => {
    const m = new Map<string, RouteOption>()
    routes.forEach(r => m.set(toId(r.id), r))
    return m
  }, [routes])

  const driverById = useMemo(() => {
    const m = new Map<string, DriverOption>()
    drivers.forEach(d => m.set(toId(d.id), d))
    return m
  }, [drivers])

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return vehicles

    return vehicles.filter(v => {
      const r = routeById.get(v.route_id)
      const d = driverById.get(v.user_id)
      return (
        v.license_plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        routeLabel(r).toLowerCase().includes(q) ||
        driverLabel(d, v.user_id).toLowerCase().includes(q) ||
        String(v.capacity).includes(q)
      )
    })
  }, [vehicles, searchTerm, routeById, driverById])

  const resetAddForm = () => {
    setNewLicensePlate('')
    setNewModel('')
    setNewCapacity(14)
    setNewRouteId('')
    setNewDriverId('')
  }

  const openEdit = (v: Vehicle) => {
    setEditId(v.id)
    setEditLicensePlate(v.license_plate)
    setEditModel(v.model)
    setEditCapacity(v.capacity)
    setEditRouteId(v.route_id)
    setEditDriverId(v.user_id)
    setEditOpen(true)
  }

  const createVehicle = async () => {
    setError(null)

    if (!newRouteId) return setError('Please select a route')
    if (!newDriverId) return setError('Please select a driver')
    if (!newLicensePlate.trim()) return setError('License plate is required')
    if (!newModel.trim()) return setError('Model is required')
    if (!Number.isFinite(newCapacity) || newCapacity <= 0) return setError('Capacity must be a positive number')

    try {
      const res = await apiFetch('/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', credentials: 'include' },
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

      setAddOpen(false)
      resetAddForm()
      await fetchAll()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to create vehicle')
    }
  }

  const updateVehicle = async () => {
    setError(null)

    if (!editId) return
    if (!editRouteId) return setError('Please select a route')
    if (!editDriverId) return setError('Please select a driver')
    if (!editLicensePlate.trim()) return setError('License plate is required')
    if (!editModel.trim()) return setError('Model is required')
    if (!Number.isFinite(editCapacity) || editCapacity <= 0) return setError('Capacity must be a positive number')

    try {
      const res = await apiFetch(`/vehicles/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', credentials: 'include' },
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

      setEditOpen(false)
      await fetchAll()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to update vehicle')
    }
  }

  const deleteVehicle = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return
    setError(null)

    try {
      const res = await apiFetch(`/vehicles/${id}`, {
        method: 'DELETE',
        headers: { credentials: 'include' },
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || json?.message || `Delete failed (${res.status})`)

      await fetchAll()
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to delete vehicle')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Vehicle Management</h2>
          <p className="text-sm text-muted-foreground">Assign vehicles to routes and drivers.</p>
        </div>

        <Dialog open={addOpen} onOpenChange={open => (setAddOpen(open), !open && resetAddForm())}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
              <DialogDescription>Select a route and driver, then fill vehicle details.</DialogDescription>
            </DialogHeader>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Route</Label>
                <Select value={newRouteId} onValueChange={setNewRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map(r => (
                      <SelectItem key={toId(r.id)} value={toId(r.id)}>
                        {routeLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Driver</Label>
                <Select value={newDriverId} onValueChange={setNewDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={toId(d.id)} value={toId(d.id)}>
                        {driverLabel(d, toId(d.id))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>License Plate</Label>
                <Input value={newLicensePlate} onChange={e => setNewLicensePlate(e.target.value)} placeholder="KDC 123X" />
              </div>

              <div className="grid gap-2">
                <Label>Model</Label>
                <Input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Toyota Hiace" />
              </div>

              <div className="grid gap-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={String(newCapacity)}
                  onChange={e => setNewCapacity(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="bg-transparent" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createVehicle}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicles
            </CardTitle>

            <div className="relative w-full sm:w-[360px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search plate, model, route, driver…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">Vehicle</th>
                  <th className="text-left py-4 px-6 font-semibold">Route</th>
                  <th className="text-left py-4 px-6 font-semibold">Driver</th>
                  <th className="text-left py-4 px-6 font-semibold">Capacity</th>
                  <th className="text-left py-4 px-6 font-semibold">Status</th>
                  <th className="text-right py-4 px-6 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-muted-foreground">
                      Loading vehicles…
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredVehicles.map(v => {
                    const r = routeById.get(v.route_id)
                    const d = driverById.get(v.user_id)

                    return (
                      <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium">{v.license_plate}</p>
                            <p className="text-xs text-muted-foreground">{v.model}</p>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <RouteIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{routeLabel(r)}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{driverLabel(d, v.user_id)}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <Badge variant="outline" className="bg-transparent">
                            {v.capacity}
                          </Badge>
                        </td>

                        <td className="py-4 px-6">
                          <Badge variant="outline" className="bg-transparent">
                            {v.status ?? '—'}
                          </Badge>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" className="bg-transparent" onClick={() => openEdit(v)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="bg-transparent"
                              onClick={() => deleteVehicle(v.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                {!loading && filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-muted-foreground">
                      No vehicles found.
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
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>Update route/driver assignment and vehicle details.</DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Route</Label>
              <Select value={editRouteId} onValueChange={setEditRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map(r => (
                    <SelectItem key={toId(r.id)} value={toId(r.id)}>
                      {routeLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Driver</Label>
              <Select value={editDriverId} onValueChange={setEditDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={toId(d.id)} value={toId(d.id)}>
                      {driverLabel(d, toId(d.id))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>License Plate</Label>
              <Input value={editLicensePlate} onChange={e => setEditLicensePlate(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Model</Label>
              <Input value={editModel} onChange={e => setEditModel(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Capacity</Label>
              <Input type="number" value={String(editCapacity)} onChange={e => setEditCapacity(Number(e.target.value))} min={1} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="bg-transparent" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateVehicle}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
