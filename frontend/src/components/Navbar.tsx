'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from './WalletButton';
import { useBalance } from '@/hooks/useBalance';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { Zap, Coins, User, Menu, X } from 'lucide-react';

const navItems = [
  { href: '/borrow', label: 'Borrow' },
  { href: '/lend', label: 'Lend' },
  { href: '/stake', label: 'Stake' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/help', label: 'Help' },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, openProfile } = useStarkzap();
  const { data: balanceData } = useBalance();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 animate-fade-in-down" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '4px solid #000000',
      }}>
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-14 md:h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 md:gap-2.5 group shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-all duration-200 hover:-translate-y-1 hover:translate-x-1" style={{
              background: 'var(--accent-primary)',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #000',
            }}>
              <Zap className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#000' }} />
            </div>
            <span className="text-sm sm:text-lg md:text-2xl font-black font-display tracking-tight" style={{ color: '#000', textShadow: '2px 2px 0px var(--accent-primary)', letterSpacing: '-0.02em' }}>ZAPLEND</span>
          </Link>

          {/* Nav Links — Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 text-sm font-bold transition-all duration-150"
                  style={{
                    background: active ? '#000' : 'transparent',
                    color: active ? '#fff' : '#000',
                    border: active ? '2px solid #000' : '2px solid transparent',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 md:gap-3">
            {isConnected && balanceData && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5" style={{
                background: '#7C3AED',
                border: '2px solid #000',
                boxShadow: '2px 2px 0px #000',
              }}>
                <Coins className="w-3.5 h-3.5" style={{ color: '#fff' }} />
                <span className="text-sm font-bold" style={{ color: '#fff' }}>
                  {balanceData.balance}
                </span>
                <span className="text-xs font-bold" style={{ color: '#fff' }}>STRK</span>
              </div>
            )}
            {isConnected && (
              <button
                onClick={openProfile}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold transition-all hover:-translate-y-0.5"
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  boxShadow: '2px 2px 0px #000',
                  color: '#000',
                  textTransform: 'uppercase',
                }}
              >
                <User className="w-3.5 h-3.5" />
                Profile
              </button>
            )}
            <WalletButton />
            
            {/* Hamburger — Mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 transition-all"
              style={{
                background: mobileOpen ? '#000' : 'var(--accent-primary)',
                border: '2px solid #000',
                boxShadow: mobileOpen ? '0px 0px 0px #000' : '2px 2px 0px #000',
                transform: mobileOpen ? 'translate(2px, 2px)' : 'none',
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen
                ? <X className="w-3.5 h-3.5 text-white" />
                : <Menu className="w-3.5 h-3.5 text-black" />
              }
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile Slide-Down Menu ═══ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 animate-fade-in-up"
          style={{ top: '68px', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="bg-white border-b-4 border-black"
            style={{ boxShadow: '0 8px 0px #000' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col p-4 gap-2">
              {navItems.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center px-4 py-3 text-base font-black uppercase transition-all"
                    style={{
                      background: active ? '#000' : '#fff',
                      color: active ? '#fff' : '#000',
                      border: '3px solid #000',
                      boxShadow: active ? '0px 0px 0px #000' : '3px 3px 0px #000',
                      transform: active ? 'translate(3px, 3px)' : 'none',
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {isConnected && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => { openProfile(); setMobileOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-black uppercase transition-all"
                  style={{
                    background: '#5A4BFF',
                    color: '#fff',
                    border: '3px solid #000',
                    boxShadow: '3px 3px 0px #000',
                  }}
                >
                  <User className="w-4 h-4" /> Profile
                </button>
              </div>
            )}

            {isConnected && balanceData && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between p-3 border-3 border-black bg-[var(--accent-primary)]"
                  style={{ boxShadow: '3px 3px 0px #000' }}>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-black" />
                    <span className="text-sm font-black text-black">Balance</span>
                  </div>
                  <span className="text-lg font-black text-black">{balanceData.balance} STRK</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
