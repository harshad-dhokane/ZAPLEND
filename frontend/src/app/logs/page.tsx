'use client';

import { Navbar } from '@/components/Navbar';
import { ContractLogs } from '@/components/ContractLogs';
import { Database } from 'lucide-react';

export default function LogsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 md:px-8 pt-8 pb-8">
        {/* Header */}
        <div className="mb-4 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-6 h-6 md:w-8 md:h-8 text-black" />
            <h1 className="text-2xl md:text-4xl font-black font-display uppercase text-black">
              Contract <span className="gradient-text">Logs</span>
            </h1>
          </div>
          <p className="text-sm md:text-base font-bold text-black mb-4">
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
