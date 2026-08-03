"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "./actions";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginUser(null, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success && result.redirectUrl) {
      // Successful login -> Redirect to role-based dashboard
      router.push(result.redirectUrl);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col justify-center items-center p-4">
      
      {/* Branding Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary/30">
          A
        </div>
        <h1 className="text-3xl font-extrabold text-sidebar-bg tracking-tight">Advrix Media CRM</h1>
        <p className="text-sm text-sidebar-text mt-2 font-medium">Automated Agency Workflow v3.0</p>
      </div>

      {/* Login Card */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md relative overflow-hidden">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Secure Login</h2>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-xl text-sm font-medium mb-6 flex items-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                required
                defaultValue="admin@advrix.com"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="admin@advrix.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                name="password"
                required
                defaultValue="admin123"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center group disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Authenticating...
              </>
            ) : (
              <>
                Secure Login
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Protected by Advrix Internal Security Systems.
      </p>
    </div>
  );
}