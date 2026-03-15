'use client';

import { useStarkzap } from '@/providers/StarkzapProvider';
import { Wallet, LogOut } from 'lucide-react';

export function WalletButton() {
  const { isConnected, isConnecting, address, connect, disconnect } = useStarkzap();

  if (isConnecting) {
    return (
      <button className="flex items-center gap-1.5 px-2.5 py-2 md:px-4 md:py-2.5 text-xs md:text-sm font-bold" style={{
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
      <div className="flex items-center gap-1.5">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5" style={{
          background: '#ffffff',
          border: '2px solid #000000',
          borderRadius: '0px',
          boxShadow: '2px 2px 0px #000',
        }}>
          <div className="w-2 h-2 rounded-full" style={{
            background: 'var(--accent-green)',
            border: '1px solid #000',
          }} />
          <span className="text-xs font-mono font-bold" style={{ color: '#000' }}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        {/* Mobile: just show green dot + short address */}
        <div className="sm:hidden flex items-center gap-1.5 px-2 py-1.5" style={{
          background: '#ffffff',
          border: '2px solid #000000',
          borderRadius: '0px',
          boxShadow: '2px 2px 0px #000',
        }}>
          <div className="w-2 h-2 rounded-full" style={{
            background: 'var(--accent-green)',
            border: '1px solid #000',
          }} />
          <span className="text-[10px] font-mono font-bold" style={{ color: '#000' }}>
            {address.slice(0, 4)}..{address.slice(-3)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 md:p-2 transition-all duration-150 hover:translate-x-[1px] hover:translate-y-[1px]"
          style={{
            background: 'var(--accent-red)',
            border: '2px solid #000000',
            borderRadius: '0px',
            color: '#ffffff',
            boxShadow: '2px 2px 0px #000',
          }}
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-1 font-black uppercase transition-all hover:-translate-y-0.5"
      style={{
        padding: '5px 10px',
        fontSize: '10px',
        background: 'var(--accent-primary)',
        border: '2px solid #000',
        boxShadow: '2px 2px 0px #000',
        color: '#000',
      }}
    >
      <Wallet className="w-3 h-3" />
      <span className="hidden sm:inline">Connect Wallet</span>
      <span className="sm:hidden">Connect</span>
    </button>
  );
}
