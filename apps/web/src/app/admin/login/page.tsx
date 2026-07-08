'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminMessages } from '../admin-messages';

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch('/api/v1/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (res.ok) router.replace('/admin');
    else setError(true);
  };

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-sb-lg border border-sb-border bg-sb-surface p-6 shadow-sb-e2">
      <h1 className="mb-4 text-lg font-bold">{adminMessages.login.title}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm font-semibold" htmlFor="admin-token">
          {adminMessages.login.token}
        </label>
        <input
          id="admin-token"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="min-h-11 rounded-sb-sm border border-sb-border-strong bg-sb-surface px-3 text-base focus-visible:shadow-sb-focus focus-visible:outline-none"
        />
        {error ? <p className="text-sm text-sb-status-avoid-fg">{adminMessages.login.error}</p> : null}
        <button
          type="submit"
          disabled={busy || token.length === 0}
          className="min-h-11 rounded-sb-sm bg-sb-primary font-bold text-sb-primary-foreground disabled:opacity-50"
        >
          {adminMessages.login.submit}
        </button>
      </form>
    </div>
  );
}
