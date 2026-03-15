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
  { href: '/analytics', label: 'Analytics' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/stake', label: 'Stake' },
  { href: '/help', label: 'Help' },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, openProfile } = useStarkzap();
  const { data: balanceData } = useBalance();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 animate-fade-in-down w-full" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12">
          <div className="h-16 lg:h-20 flex items-center justify-between border-b-[3px] md:border-b-[4px] border-black pb-0 md:pb-0 relative">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 lg:gap-3 group shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center transition-all duration-200 hover:-translate-y-1 hover:translate-x-1 border-[2px] lg:border-[3px] border-black shadow-[2px_2px_0px_#000] lg:shadow-[3px_3px_0px_#000]" style={{
                background: 'var(--accent-primary)',
              }}>
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: '#000' }} />
              </div>
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black font-display tracking-tight" style={{ color: '#000', textShadow: '2px 2px 0px var(--accent-primary)', letterSpacing: '-0.02em' }}>ZAPLEND</span>
            </Link>

            {/* Nav Links — Desktop */}
            <div className="hidden lg:flex flex-1 justify-center items-center gap-0 lg:gap-0.5 xl:gap-1 pl-2 lg:pl-4 xl:pl-8">
              {navItems.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="px-1.5 lg:px-2 xl:px-3 py-1.5 text-xs xl:text-sm font-bold transition-all duration-150 whitespace-nowrap"
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
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 lg:pr-4 xl:pr-6">
            {isConnected && balanceData && (
              <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 text-xs xl:text-sm" style={{
                background: '#7C3AED',
                border: '2px solid #000',
                boxShadow: '2px 2px 0px #000',
              }}>
                <Coins className="w-4 h-4 xl:w-5 xl:h-5" style={{ color: '#fff' }} />
                <span className="font-bold whitespace-nowrap uppercase" style={{ color: '#fff' }}>
                  {balanceData.balance} <span className="hidden xl:inline">STRK</span>
                </span>
              </div>
            )}
            <WalletButton />
            
            {/* Hamburger — Mobile */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 transition-all shrink-0"
              style={{
                background: mobileOpen ? '#000' : 'var(--accent-primary)',
                border: '2px solid #000',
                boxShadow: mobileOpen ? '0px 0px 0px #000' : '2px 2px 0px #000',
                transform: mobileOpen ? 'translate(2px, 2px)' : 'none',
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen
                ? <X className="w-4 h-4 text-white" />
                : <Menu className="w-4 h-4 text-black" />
              }
            </button>
          </div>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile Slide-Down Menu ═══ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] animate-fade-in-up"
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
