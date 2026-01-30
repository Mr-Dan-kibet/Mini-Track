import AuthGuard from "@/app/components/AuthGuard"
import SafetyGuidelines from "../safety-guidlines"

export default function SafetyGuidelinesPage() {
  return (
    <AuthGuard allow={["parent"]}>
      <SafetyGuidelines />
    </AuthGuard>
  )
}
