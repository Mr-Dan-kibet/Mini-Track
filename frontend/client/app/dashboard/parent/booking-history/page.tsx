import AuthGuard from "@/app/components/AuthGuard"
import BookingHistory from "../booking-history"

export default function BookingHistoryPage() {
  return (
    <AuthGuard allow={["parent"]}>
      <BookingHistory />
    </AuthGuard>
  )
}
