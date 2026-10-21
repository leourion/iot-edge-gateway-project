'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
export interface AuthIdentity { username: string; role: 'admin' | 'user' }
const AuthContext = createContext<AuthIdentity | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'allowed' | 'unavailable'>('checking');
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoginPage) {
      setState('allowed');
      return;
    }

    let active = true;
    fetch(`${API_BASE_URL}/auth/session`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) {
          setState('unavailable');
          return;
        }
        const session = await response.json() as AuthIdentity;
        if (active) {
          setIdentity(session);
          setState('allowed');
        }
      })
      .catch(() => {
        if (active) setState('unavailable');
      });

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) return children;
  if (state === 'allowed') return <AuthContext.Provider value={identity}>{children}</AuthContext.Provider>;

  return (
    <main className="grid min-h-screen place-items-center bg-[#08090a] px-5 text-[#d0d6e0]">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-lg font-semibold text-emerald-300">IoT</div>
        <h1 className="text-lg font-semibold text-white">Paper Warehouse</h1>
        <p className="mt-2 text-sm text-[#8a8f98]">
          {state === 'unavailable' ? 'Không xác minh được phiên đăng nhập. Hãy kiểm tra API rồi thử lại.' : 'Đang xác minh đăng nhập…'}
        </p>
        {state === 'unavailable' && (
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
            Thử lại
          </button>
        )}
      </div>
    </main>
  );
}
