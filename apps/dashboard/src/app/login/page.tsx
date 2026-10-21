'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { message?: string; authenticated?: boolean };
      if (!response.ok || !result.authenticated) {
        setError(result.message ?? 'Không đăng nhập được. Kiểm tra tài khoản và cấu hình API.');
        return;
      }
      router.replace('/dashboard');
    } catch {
      setError('Không kết nối được API. Hãy kiểm tra backend đang chạy.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-[#d0d6e0]">
      <section className="w-full max-w-[390px] rounded-2xl border border-white/[.08] bg-[#111214] p-8 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/10 font-semibold text-emerald-300">IoT</div>
          <div>
            <h1 className="text-lg font-semibold text-white">Paper Warehouse</h1>
            <p className="mt-0.5 text-sm text-[#8a8f98]">Đăng nhập vào hệ thống giám sát</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-[#b7bbc2]">
            Tên đăng nhập
            <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-emerald-400/60" />
          </label>
          <label className="block text-sm text-[#b7bbc2]">
            Mật khẩu
            <input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-white outline-none focus:border-emerald-400/60" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[.06] px-3 py-2 text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="h-11 w-full rounded-lg bg-emerald-500 font-medium text-[#06110a] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-[#62666d]">Tài khoản được quản lý bởi cấu hình máy chủ.</p>
      </section>
    </main>
  );
}
