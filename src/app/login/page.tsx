import LoginForm from "@/components/LoginForm";
import { BrandIcon, BrandWordmark } from "@/components/brand";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-night-950 p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-300/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(ellipse_at_top,rgba(133,222,133,0.07),transparent_55%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-night-850/90 backdrop-blur shadow-2xl shadow-black/50 p-8 ring-1 ring-white/10">
          <div className="flex items-center gap-4 mb-8">
            <BrandIcon className="h-14 w-14 drop-shadow-[0_0_18px_rgba(133,222,133,0.3)]" />
            <BrandWordmark size="lg" />
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-6">Sign in to your workspace.</p>

          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} Advrix Media PVT LTD. Internal use only.
        </p>
      </div>
    </div>
  );
}
