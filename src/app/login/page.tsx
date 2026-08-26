import { query } from "@/lib/db";
import LoginForm from "@/components/LoginForm";
import { BrandLogoFull } from "@/components/brand";

async function ensureLoginAttemptsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT,
        locked_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts (lower(email), created_at)`);
  } catch {}
}

export default async function LoginPage() {
  await ensureLoginAttemptsTable();

  return (
    <div className="min-h-screen flex items-center justify-center bg-night-950 p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-300/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(ellipse_at_top,rgba(133,222,133,0.07),transparent_55%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-night-850/90 backdrop-blur shadow-2xl shadow-black/50 p-8 ring-1 ring-white/10">
          <div className="mb-8">
            <BrandLogoFull className="h-16 w-auto" />
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
