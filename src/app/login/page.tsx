import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-ink p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-lg">
              A
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">Advrix CRM</h1>
              <p className="text-sm text-slate-500">Creative Agency Workflow</p>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">
            Sign in to your workspace.
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}