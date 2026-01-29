"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { UserRole } from "@/lib/types"

export default function AuthGuard({
  children,
  allow,
}: {
  children: React.ReactNode
  allow?: UserRole[]
}) {
  const { status, data } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/authentication/login")
    if (status === "authenticated" && allow?.length) {
      const role = data?.user?.role
      if (!role || !allow.includes(role as UserRole)) router.replace("/dashboard")
    }
  }, [status, data, allow, router])

  if (status !== "authenticated") return <div className="mx-auto max-w-6xl px-4 py-12">Loading...</div>

  return <>{children}</>
}
