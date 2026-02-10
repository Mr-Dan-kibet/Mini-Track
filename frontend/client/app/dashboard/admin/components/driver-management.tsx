'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { Plus, Search, Edit2, Trash2, Phone, Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '',
  })

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    password: '', 
    status: 'Active' as Driver['status'],
  })

  const fetchDrivers = async () => {
    // const token = localStorage.getItem('token')

    try {
      const res = await apiFetch('/drivers', { credentials: 'include' })

      const data = await res.json()
      setDrivers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch drivers', err)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

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

    // const token = localStorage.getItem('token')

    const payload = {
      name: addForm.name,
      email: addForm.email,
      password: addForm.password,
      phone_number: addForm.phone_number,
    }

    try {
      const res = await apiFetch('/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials:"include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data?.error || data?.message || 'Create driver failed')
        return
      }

      await fetchDrivers()
      setAddForm({ name: '', email: '', phone_number: '', password: '' })
      setAddOpen(false)
    } catch (err) {
      console.error(err)
      alert('Server error')
    }
  }

  const openEdit = (driver: Driver) => {
    setEditing(driver)
    setEditForm({
      name: driver.name,
      email: driver.email,
      phone_number: driver.phone_number,
      password: '',
      status: driver.status,
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (!editForm.name || !editForm.email || !editForm.phone_number) return

    // const token = localStorage.getItem('token')

    const payload: any = {
      id: editing.id, // many backends ignore this; harmless if allowed
      name: editForm.name,
      email: editForm.email,
      phone_number: editForm.phone_number,
      status: editForm.status,
    }
    if (editForm.password?.trim()) payload.password = editForm.password.trim()

    try {
      const res = await apiFetch(`/users/${editing.id}`, {
        method: 'PUT',
        headers: {
          credentials: 'include',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data?.error || data?.message || 'Update failed')
        return
      }

      // Refresh from backend (source of truth)
      await fetchDrivers()

      setEditOpen(false)
      setEditing(null)
    } catch (err) {
      console.error(err)
      alert('Server error')
    }
  }

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token')

    try {
      const res = await apiFetch(`/users/${id}`, {
        method: 'DELETE',
        headers: {
          credentials: 'include',
        },
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data?.error || data?.message || 'Delete failed')
        return
      }

      setDrivers(prev => prev.filter(d => d.id !== id))
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
              <CardTitle>Driver Management</CardTitle>
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Driver
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Driver</DialogTitle>
                  <DialogDescription>Fill in details to create a driver</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={addForm.email}
                      onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={addForm.phone_number}
                      onChange={e => setAddForm({ ...addForm, phone_number: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={addForm.password}
                      onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <Button className="w-full mt-6" onClick={handleAdd}>
                    Create Driver
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
              placeholder="Search by name, email, or phone..."
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
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Name</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Contact</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDrivers.map(driver => (
                  <tr
                    key={driver.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <p className="font-semibold text-foreground">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">{driver.email}</p>
                    </td>

                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <a
                          href={`tel:${driver.phone_number}`}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {driver.phone_number}
                        </a>
                        <a
                          href={`mailto:${driver.email}`}
                          className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                        >
                          <Mail className="w-4 h-4" />
                          {driver.email}
                        </a>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <Badge className={String(driver.status) === 'Active' ? 'bg-emerald-600' : 'bg-gray-500'}>
                        {driver.status}
                      </Badge>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(driver)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(driver.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 px-6 text-center text-muted-foreground">
                      No drivers found.
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
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Password is optional (only if changing).</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={editForm.phone_number}
                onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Password (optional)</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Input
                value={String(editForm.status)}
                onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                className="mt-1"
              />
            </div>

            <Button className="w-full mt-6" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
