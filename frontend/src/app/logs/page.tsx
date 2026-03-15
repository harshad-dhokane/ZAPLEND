'use client';

import { Navbar } from '@/components/Navbar';
import { ContractLogs } from '@/components/ContractLogs';
import { Database } from 'lucide-react';

export default function LogsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-12 pb-24">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-black" />
            <h1 className="text-3xl md:text-4xl font-black font-display uppercase text-black">
              Contract <span className="gradient-text">Logs</span>
            </h1>
          </div>
          <p className="text-base font-bold text-black mb-6">
            100% genuine real-time raw event logs directly from the ZapLend smart contract on Starknet Sepolia.
          </p>
        </div>

        <div className="animate-fade-in-up animate-delay-100">
          <ContractLogs />
        </div>
      </div>
    </main>
  );
}
