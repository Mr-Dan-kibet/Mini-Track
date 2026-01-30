import AuthGuard from "@/app/components/AuthGuard"
import Link from "next/link"

export default function ParentDashboard() {
  return (
    <AuthGuard allow={["parent"]}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold animate-fade-up">Parent Dashboard</h1>
        <p className="mt-2 text-slate-600">Book seats, track minibuses, and view your booking history.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/routes" className="glass hover-lift rounded-2xl p-5">
            <div className="text-blue-600">🚌</div>
            <div className="mt-2 font-semibold">Book a Seat</div>
            <div className="mt-1 text-sm text-slate-600">Choose a route and pickup point.</div>
          </Link>

          <Link href="/dashboard/parent/track-child" className="glass hover-lift rounded-2xl p-5">
            <div className="text-emerald-600">📍</div>
            <div className="mt-2 font-semibold">Track Child</div>
            <div className="mt-1 text-sm text-slate-600">View live bus location & status.</div>
          </Link>

          <Link href="/dashboard/parent/booking-history" className="glass hover-lift rounded-2xl p-5">
            <div className="text-indigo-600">🧾</div>
            <div className="mt-2 font-semibold">Booking History</div>
            <div className="mt-1 text-sm text-slate-600">See confirmed/pending bookings.</div>
          </Link>

          <Link href="/dashboard/parent/safety-guidlines" className="glass hover-lift rounded-2xl p-5">
            <div className="text-orange-500">🛡️</div>
            <div className="mt-2 font-semibold">Safety Guidelines</div>
            <div className="mt-1 text-sm text-slate-600">Policies and safety best practices.</div>
          </Link>
        </div>
      </div>
    </AuthGuard>
  )
}
