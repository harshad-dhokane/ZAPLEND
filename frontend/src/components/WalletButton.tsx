'use client';

import { useStarkzap } from '@/providers/StarkzapProvider';
import { Wallet, LogOut, ExternalLink, User } from 'lucide-react';

export function WalletButton() {
  const { isConnected, isConnecting, address, connect, disconnect, openProfile } = useStarkzap();

  if (isConnecting) {
    return (
      <button className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold" style={{
        background: '#ffffff',
        border: '2px solid #000000',
        borderRadius: '0px',
        color: '#000000',
        boxShadow: '2px 2px 0px #000',
      }} disabled>
        <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{
          borderColor: '#7C3AED',
          borderTopColor: 'transparent',
        }} />
        <span className="hidden sm:inline">Connecting...</span>
        <span className="sm:hidden">...</span>
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden lg:flex items-center gap-2 px-2 py-1.5 text-xs xl:text-sm" style={{
          background: '#ffffff',
          border: '2px solid #000000',
          borderRadius: '0px',
          boxShadow: '2px 2px 0px #000',
        }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{
            background: 'var(--accent-green)',
            border: '1px solid #000',
          }} />
          <a
            href={`https://sepolia.voyager.online/contract/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono font-bold hover:underline"
            style={{ color: '#000' }}
            title="View transactions on Voyager"
          >
            <span>{address.slice(0, 4)}..{address.slice(-3)}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
        {/* Mobile: same logic */}
        <div className="lg:hidden flex items-center gap-1.5 px-2 py-1.5" style={{
          background: '#ffffff',
          border: '2px solid #000000',
          borderRadius: '0px',
          boxShadow: '2px 2px 0px #000',
        }}>
          <div className="w-2 h-2 rounded-full" style={{
            background: 'var(--accent-green)',
            border: '1px solid #000',
          }} />
          <a
            href={`https://sepolia.voyager.online/contract/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-mono font-bold hover:underline"
            style={{ color: '#000' }}
            title="View transactions on Voyager"
          >
            <span>{address.slice(0, 4)}..{address.slice(-3)}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
        <button
          onClick={openProfile}
          className="hidden lg:flex w-8 h-8 xl:w-9 xl:h-9 flex-items-center justify-center shrink-0 transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px]"
          style={{
            background: '#ffffff',
            border: '2px solid #000000',
            borderRadius: '0px',
            color: '#000000',
            boxShadow: '2px 2px 0px #000',
          }}
          title="Profile"
        >
          <User className="w-4 h-4 xl:w-5 xl:h-5" />
        </button>
        <button
          onClick={disconnect}
          className="w-8 h-8 xl:w-9 xl:h-9 flex items-center justify-center shrink-0 transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px]"
          style={{
            background: 'var(--accent-red)',
            border: '2px solid #000000',
            borderRadius: '0px',
            color: '#ffffff',
            boxShadow: '2px 2px 0px #000',
          }}
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 xl:w-5 xl:h-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs xl:text-sm font-black uppercase transition-all hover:-translate-y-0.5 whitespace-nowrap"
      style={{
        background: 'var(--accent-primary)',
        border: '2px solid #000',
        boxShadow: '2px 2px 0px #000',
        color: '#000',
      }}
    >
      <Wallet className="w-4 h-4 shrink-0" />
      <span className="hidden lg:inline">Connect Wallet</span>
      <span className="lg:hidden">Connect</span>
    </button>
  );
}
