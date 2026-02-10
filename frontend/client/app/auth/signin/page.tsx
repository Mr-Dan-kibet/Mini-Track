"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, User, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await apiFetch("/user_roles");
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch roles:", e);
        setRoles([]);
      }
    };

    fetchRoles();
  }, []);

  // Try to resolve driver's vehicle id WITHOUT backend changes (best effort).
  async function resolveVehicleIdForDriver(userId: number): Promise<number | null> {
    // 1) If backend supports filtering: /vehicles?user_id=3
    try {
      const res = await apiFetch(`/vehicles?user_id=${userId}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(json) ? json : Array.isArray(json?.vehicles) ? json.vehicles : [];
        const v = list.find((x: any) => Number(x?.user_id) === Number(userId));
        if (v?.id) return Number(v.id);
      }
    } catch (_) {}

    // 2) If backend supports listing all vehicles: /vehicles
    try {
      const res = await apiFetch("/vehicles");
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(json) ? json : Array.isArray(json?.vehicles) ? json.vehicles : [];
        const v = list.find((x: any) => Number(x?.user_id) === Number(userId));
        if (v?.id) return Number(v.id);
      }
    } catch (_) {}

    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const password = formData.get("password");
    const email = formData.get("email");

    if (!selectedRole?.id) {
      alert("Please select a role");
      setIsLoading(false);
      return;
    }

    const payload = {
      email,
      password,
      role_id: selectedRole.id,
    };

    try {
      const res = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      console.log("login:", data);

      if (!res.ok) {
        alert(data?.error || data?.message || "Login failed");
        return;
      }

      // Save auth
      // if (data?.access_token) localStorage.setItem("token", data.access_token);
      if (data?.user?.name) localStorage.setItem("username", data.user.name);

      // Save user id if present (helps resolve vehicle_id)
      const userId =
        Number(data?.user?.id ?? data?.user_id ?? data?.id ?? NaN);

      if (Number.isFinite(userId)) {
        localStorage.setItem("user_id", String(userId));
      } else {
        localStorage.removeItem("user_id");
      }

      // Resolve vehicle_id for driver (best effort)
      const roleName = String(data?.user?.role ?? "").toLowerCase();

      if (roleName === "driver") {
        localStorage.removeItem("vehicle_id"); // clear old values

        // if backend already returns vehicle_id somewhere, use it first
        const directVehicleId =
          Number(data?.vehicle_id ?? data?.user?.vehicle_id ?? NaN);

        if (Number.isFinite(directVehicleId)) {
          localStorage.setItem("vehicle_id", String(directVehicleId));
        } else if (Number.isFinite(userId)) {
          const resolved = await resolveVehicleIdForDriver(userId);
          if (resolved) localStorage.setItem("vehicle_id", String(resolved));
        }
      }

      // redirect
      if (roleName === "admin") {
        window.location.href = "/dashboard/admin";
      } else if (roleName === "parent") {
        window.location.href = "/dashboard/parent";
      } else {
        window.location.href = "/dashboard/driver";
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 px-4 bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-6 text-center border-b border-gray-100">
          <div className="flex justify-center mb-2">
            <div className="relative w-[100px] h-[100px]">
              <Image
                src="/images/logominitruck.png"
                alt="Mini Track Logo"
                width={100}
                height={100}
                className="object-contain"
              />
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-1">Kid&apos;s Transportation Tracker</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-3">Sign In</h2>
          <p className="text-gray-600 text-sm mt-2">
            Enter your email and password below to sign into your account
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="you@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {selectedRole ? selectedRole.name : "Select Role"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showRoleDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showRoleDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          setSelectedRole(role);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors ${
                          selectedRole?.id === role.id ? "bg-blue-50 text-blue-600" : "text-gray-700"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              New to Mini-track?{" "}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors inline-flex items-center gap-1 group"
              >
                Sign Up Here
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
