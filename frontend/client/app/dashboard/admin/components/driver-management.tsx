'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { Plus, Search, Edit2, Trash2, Phone, Mail, Users, Activity, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Driver = {
  id: number
  name: string
  email: string
  phone_number: string
  status: 'Active' | 'Inactive' | string
}

export default function DriverManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone_number: '', password: '' })
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone_number: '', password: '', status: 'Active' as Driver['status'] })
  const [loading, setLoading] = useState(false)

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/drivers', { credentials: "include" })
      const data = await res.json()
      setDrivers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch drivers', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrivers() }, [])

  const filteredDrivers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter((d: any) => {
      const name = String(d.name ?? '').toLowerCase()
      const email = String(d.email ?? '').toLowerCase()
      const phone = String(d.phone_number ?? '')
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [drivers, searchTerm])

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email || !addForm.phone_number || !addForm.password) return

    const payload = { name: addForm.name, email: addForm.email, password: addForm.password, phone_number: addForm.phone_number }

    try {
      const res = await apiFetch('/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) { alert(data?.error || data?.message || 'Create driver failed'); return }

      await fetchDrivers()
      setAddForm({ name: '', email: '', phone_number: '', password: '' })
      setAddOpen(false)
    } catch (err) { console.error(err); alert('Server error') }
  }

  const openEdit = (driver: Driver) => {
    setEditing(driver)
    setEditForm({ name: driver.name, email: driver.email, phone_number: driver.phone_number, password: '', status: driver.status })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (!editForm.name || !editForm.email || !editForm.phone_number) return

    const payload: any = { id: editing.id, name: editForm.name, email: editForm.email, phone_number: editForm.phone_number, status: editForm.status }
    if (editForm.password?.trim()) payload.password = editForm.password.trim()

    try {
      const res = await apiFetch(`/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) { alert(data?.error || data?.message || 'Update failed'); return }
      await fetchDrivers()
      setEditOpen(false); setEditing(null)
    } catch (err) { console.error(err); alert('Server error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this driver?')) return
    try {
      const res = await apiFetch(`/users/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data?.error || data?.message || 'Delete failed'); return }
      setDrivers(prev => prev.filter(d => d.id !== id))
    } catch (err) { console.error(err); alert('Server error') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Driver Management</h2>
            <p className="text-sm text-gray-500">Manage driver accounts and assignments</p>
          </div>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
            <Plus className="w-4 h-4" /> Add Driver
          </Button>

          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-blue-50 border border-blue-100">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">Add New Driver</DialogTitle>
                  <DialogDescription>Fill in details to create a driver account</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                <Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                <Input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
                <Input value={addForm.phone_number} onChange={e => setAddForm({ ...addForm, phone_number: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Password</Label>
                <Input type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} className="mt-1" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setAddOpen(false)} className="border-gray-300 hover:border-gray-400">
                  Cancel
                </Button>
                <Button onClick={handleAdd} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
                  Create Driver
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <Activity className="w-3 h-3 mr-1" /> {drivers.filter(d => d.status === 'Active').length} Active
              </Badge>
              <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                {drivers.filter(d => d.status !== 'Active').length} Inactive
              </Badge>
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                {drivers.length} Total
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900">Driver Accounts</CardTitle>
              <CardDescription>Manage all driver accounts in the system</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-blue-900">Driver Information</th>
                  <th className="text-left py-4 px-6 font-semibold text-blue-900">Contact Details</th>
                  <th className="text-left py-4 px-6 font-semibold text-blue-900">Status</th>
                  <th className="text-right py-4 px-6 font-semibold text-blue-900">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Loading drivers...
                      </div>
                    </td>
                  </tr>
                ) : filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center">
                      <div className="text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No drivers found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adding a driver or adjusting your search</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map(driver => (
                    <tr key={driver.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{driver.name}</p>
                            <p className="text-xs text-gray-500">{driver.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <a href={`tel:${driver.phone_number}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                            <Phone className="w-4 h-4" />
                            {driver.phone_number}
                          </a>
                          <a href={`mailto:${driver.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors">
                            <Mail className="w-4 h-4" />
                            {driver.email}
                          </a>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <Badge className={driver.status === 'Active' 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0' 
                          : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0'}>
                          {driver.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="border-blue-200 hover:border-blue-300 hover:bg-blue-50" onClick={() => openEdit(driver)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-rose-200 hover:border-rose-300 hover:bg-rose-50" onClick={() => handleDelete(driver.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
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
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Edit Driver</DialogTitle>
                <DialogDescription>Update driver details and status</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Full Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Email Address</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
              <Input value={editForm.phone_number} onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">New Password (optional)</Label>
              <Input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="mt-1" />
              <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-emerald-500 focus:ring-emerald-500"
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
              <Button onClick={handleSaveEdit} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}