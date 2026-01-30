import AuthGuard from "@/app/components/AuthGuard"
import TrackChild from "../track-child"

export default function TrackChildPage() {
  return (
    <AuthGuard allow={["parent"]}>
      <TrackChild />
    </AuthGuard>
  )
}
