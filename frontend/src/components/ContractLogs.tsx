'use client';

import { useState } from 'react';
import { useContractLogs, ContractLog } from '@/hooks/useContractLogs';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { Clock, CheckCircle2, AlertTriangle, Shield, Wallet, Users, ArrowRight, Database } from 'lucide-react';
import Link from 'next/link';
import { Pagination } from './Pagination';

function formatTimestamp(timestamp: number | null, blockNumber: number): string {
  if (!timestamp) return `Block #${blockNumber}`;
  
  const date = new Date(timestamp * 1000);
  // Example format: "Mar 15, 2026, 8:15:30 PM"
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit'
  });
}

function normalizeAddress(addr: string): string {
  return addr.replace(/^0x0*/i, '').toLowerCase();
}

export function ContractLogs() {
  const { data: logs, isLoading } = useContractLogs();
  const { address } = useStarkzap();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  if (isLoading || !logs) {
    return (
      <div className="neo-card p-5 flex flex-col gap-4">
        <h3 className="text-base font-bold font-display uppercase tracking-widest border-b-2 border-black pb-2">Contract Logs</h3>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex gap-4 items-start py-2">
            <div className="w-10 h-10 bg-gray-200 rounded-none border-2 border-black"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 w-3/4"></div>
              <div className="h-3 bg-gray-200 w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="neo-card p-5">
        <h3 className="text-base font-bold font-display uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Contract Logs</h3>
        <p className="text-sm font-bold text-center py-4">No on-chain events found.</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'LoanCreated': return <Wallet className="w-5 h-5 text-black" />;
      case 'VouchAdded': return <Users className="w-5 h-5 text-black" />;
      case 'LoanActivated': return <Shield className="w-5 h-5 text-black" />;
      case 'LoanRepaid': return <CheckCircle2 className="w-5 h-5 text-black" />;
      case 'LoanDefaulted': return <AlertTriangle className="w-5 h-5 text-black" />;
      default: return <Database className="w-5 h-5 text-black" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'LoanCreated': return '#FFD500';
      case 'VouchAdded': return '#B8B0FF';
      case 'LoanActivated': return '#00F5D4';
      case 'LoanRepaid': return '#22C55E';
      case 'LoanDefaulted': return '#FF3366';
      default: return '#fff';
    }
  };

  const getEventLabel = (log: ContractLog) => {
    switch (log.type) {
      case 'LoanCreated':
        return <span>Requested <span className="text-blue-600">{log.data.amount} STRK</span> loan</span>;
      case 'VouchAdded':
        return <span>Received <span className="text-purple-600">{log.data.amount} STRK</span> social pledge</span>;
      case 'LoanActivated':
        return <span>Loan <span className="text-blue-600">#{log.data.loanId}</span> fully funded & activated</span>;
      case 'LoanRepaid':
        return <span>Loan <span className="text-green-600">#{log.data.loanId}</span> was repaid</span>;
      case 'LoanDefaulted':
        return <span>Loan <span className="text-red-600">#{log.data.loanId}</span> defaulted</span>;
      default:
        return <span>Unknown event</span>;
    }
  };

  const getAssociatedAddress = (log: ContractLog) => {
    if (log.type === 'LoanCreated') return log.data.borrower;
    if (log.type === 'VouchAdded') return log.data.friend;
    return null;
  };

  return (
    <div className="neo-card p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-black pb-4 mb-5">
        <h3 className="text-base font-bold font-display uppercase tracking-widest flex items-center gap-2">
          <Database className="w-4 h-4" /> Raw Contract Logs
        </h3>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold bg-black text-white px-2 py-1 uppercase">Live Stream</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {(() => {
          const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE);
          const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
          const paginatedLogs = logs.slice(startIdx, startIdx + ITEMS_PER_PAGE);
          
          return (
            <>
              {paginatedLogs.map((log, idx) => {
                const associatedAddr = getAssociatedAddress(log);
                const isMine = address && associatedAddr && normalizeAddress(associatedAddr) === normalizeAddress(address);
                
                return (
                  <Link 
                    href={log.data.loanId ? `/loan/${log.data.loanId}` : '#'} 
                    key={log.id}
                    className="group flex items-center justify-between gap-3 sm:gap-4 p-2.5 sm:p-3 border-[2px] sm:border-[3px] border-black transition-all bg-white shadow-[2px_2px_0px_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_#000]"
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-8 h-8 shrink-0 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center transition-transform group-hover:-translate-y-1"
                        style={{ background: getEventBg(log.type) }}
                      >
                        {getEventIcon(log.type)}
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <span className="text-[10px] sm:text-xs font-bold bg-gray-100 px-1.5 py-0.5 border border-gray-400 text-gray-700 whitespace-nowrap hidden sm:inline-block">
                          {log.type}
                        </span>
                        
                        <p className="text-xs sm:text-sm font-bold truncate whitespace-nowrap">
                          {getEventLabel(log)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      {associatedAddr && (
                        <span className={`text-[10px] sm:text-xs font-bold font-mono px-1.5 py-0.5 border whitespace-nowrap hidden md:inline-block ${isMine ? 'bg-yellow-300 border-black border-2' : 'bg-gray-100 border-gray-300'}`}>
                          {isMine ? 'You' : `${associatedAddr.slice(0, 6)}...${associatedAddr.slice(-4)}`}
                        </span>
                      )}
                      
                      <span className="text-[10px] sm:text-xs font-bold text-gray-500 whitespace-nowrap ml-auto">
                        {formatTimestamp(log.timestamp, log.blockNumber)}
                      </span>
                      
                      <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              {totalPages > 1 && (
                <div className="pt-4 border-t-2 border-black mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
