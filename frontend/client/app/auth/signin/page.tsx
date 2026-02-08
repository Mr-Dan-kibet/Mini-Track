"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, User, ChevronRight, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState<{ id: number; name: string } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

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
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-70"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute top-10 left-10 w-6 h-6 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-16 w-8 h-8 bg-cyan-400 rounded-full opacity-20 animate-pulse delay-700"></div>
      <div className="absolute top-32 right-32 w-4 h-4 bg-sky-400 rounded-full opacity-20 animate-pulse delay-1000"></div>

      <div className="relative w-full max-w-md">
        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
          {/* Header gradient */}
          <div className="relative p-8 text-center border-b border-white/30 bg-gradient-to-r from-blue-500 to-cyan-500">
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"></div>
            <div className="relative flex flex-col items-center">
              <div className="relative w-24 h-24 mb-4">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md"></div>
                 <Image
                    src="/images/logominitruck.png"
                    alt="Mini Track Logo"
                    width={96}
                    height={96}
                    className="relative rounded-xl object-contain 
                      shadow-[0_4px_20px_rgba(255,255,255,0.8),
                              0_8px_40px_rgba(255,255,255,0.6)]"
                  />
                     
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-blue-100 text-sm">Kid&apos;s Transportation Tracker</p>
              <div className="flex items-center gap-1 mt-2">
              
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type="email"
                      name="email"
                      placeholder="you@email.com"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Select Role
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="w-full flex items-center justify-between px-4 py-4 bg-white/50 border border-gray-200 rounded-xl hover:border-blue-300 transition-all duration-300 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isHovered ? 'bg-blue-100' : 'bg-gray-100'} transition-colors`}>
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-gray-700 font-medium">
                        {selectedRole ? selectedRole.name : "Select Your Role"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        showRoleDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showRoleDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-all duration-200 ${
                            selectedRole?.id === role.id 
                              ? "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600 font-semibold" 
                              : "text-gray-700"
                          }`}
                        >
                          <div className="p-1.5 rounded-md bg-white border">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          {role.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      required
                      className="w-full pl-12 pr-12 py-4 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 z-10 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 text-gray-500">Don't have an account?</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-all duration-300 group hover:gap-3"
              >
                Create New Account
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}