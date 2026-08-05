import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ink via-brand-900 to-brand-700 p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white/95 backdrop-blur shadow-2xl shadow-ink/40 p-8 ring-1 ring-white/20">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-600/40">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink tracking-tight">Advrix Media</h1>
              <p className="text-sm text-slate-500">Creative Agency Workflow</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">
            Sign in to your workspace.
          </p>

          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400/70 mt-6">
          © {new Date().getFullYear()} Advrix Media. Internal use only.
        </p>
      </div>
    </div>
  );
}