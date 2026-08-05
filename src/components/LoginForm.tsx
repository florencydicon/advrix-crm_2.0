"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2 border border-rose-100">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@advrix.agency" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required placeholder="••••••••" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}