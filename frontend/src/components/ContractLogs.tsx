'use client';
import { useContractLogs, ContractLog } from '@/hooks/useContractLogs';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { Clock, CheckCircle2, AlertTriangle, Shield, Wallet, Users, ArrowRight, Database, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Link from 'next/link';
import { formatTimestamp } from '@/lib/time';

function normalizeAddress(addr: string): string {
  return addr.replace(/^0x0*/i, '').toLowerCase();
}

export function ContractLogs() {
  const { data: logs, isLoading } = useContractLogs();
  const { address } = useStarkzap();

  if (isLoading || !logs) {
    return (
      <div className="flex flex-col gap-4">
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
      <div>
        <h3 className="text-base font-bold font-display uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Contract Logs</h3>
        <p className="text-sm font-bold text-center py-4">No on-chain events found.</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'LoanCreated': return <Wallet className="w-4 h-4 text-black" />;
      case 'VouchAdded': return <Users className="w-4 h-4 text-black" />;
      case 'LoanActivated': return <Shield className="w-4 h-4 text-black" />;
      case 'LoanRepaid': return <CheckCircle2 className="w-4 h-4 text-black" />;
      case 'LoanDefaulted': return <AlertTriangle className="w-4 h-4 text-black" />;
      case 'Staked': return <ArrowDownToLine className="w-4 h-4 text-black" />;
      case 'Unstaked': return <ArrowUpFromLine className="w-4 h-4 text-black" />;
      default: return <Database className="w-4 h-4 text-black" />;
    }
  };

  const getEventAccent = (type: string) => {
    switch (type) {
      case 'LoanCreated': return '#FFD500';
      case 'VouchAdded': return '#7B61FF';
      case 'LoanActivated': return '#00F5D4';
      case 'LoanRepaid': return '#22C55E';
      case 'LoanDefaulted': return '#FF3366';
      case 'Staked': return '#06B6D4';
      case 'Unstaked': return '#F72585';
      default: return '#E5E5E5';
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'LoanCreated': return '#FFF8DB';
      case 'VouchAdded': return '#F0EDFF';
      case 'LoanActivated': return '#E0FFF7';
      case 'LoanRepaid': return '#E8FAE8';
      case 'LoanDefaulted': return '#FFE8EE';
      case 'Staked': return '#E0F7FA';
      case 'Unstaked': return '#FCE4EC';
      default: return '#F5F5F5';
    }
  };

  const getEventLabel = (log: ContractLog) => {
    switch (log.type) {
      case 'LoanCreated':
        return <span>Requested <span className="text-amber-400 font-black">{log.data.amount} STRK</span> loan</span>;
      case 'VouchAdded':
        return <span>Received <span className="text-violet-400 font-black">{log.data.amount} STRK</span> social pledge</span>;
      case 'LoanActivated':
        return <span>Loan <span className="text-emerald-400 font-black">#{log.data.loanId}</span> fully funded & activated</span>;
      case 'LoanRepaid':
        return <span>Loan <span className="text-green-400 font-black">#{log.data.loanId}</span> was repaid</span>;
      case 'LoanDefaulted':
        return <span>Loan <span className="text-red-400 font-black">#{log.data.loanId}</span> defaulted</span>;
      case 'Staked':
        return <span>Staked <span className="text-cyan-400 font-black">{log.data.amount} STRK</span> into validator pool</span>;
      case 'Unstaked':
        return <span>Unstaked <span className="text-pink-400 font-black">{log.data.amount} STRK</span> from validator pool</span>;
      default:
        return <span>Unknown event</span>;
    }
  };

  const getAssociatedAddress = (log: ContractLog) => {
    if (log.type === 'LoanCreated') return log.data.borrower;
    if (log.type === 'VouchAdded') return log.data.friend;
    if (log.type === 'Staked' || log.type === 'Unstaked') return log.data.staker;
    return null;
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 12rem)', maxHeight: 'calc(100vh - 12rem)', overflow: 'hidden' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3 border-b-2 border-black pb-2 md:pb-3 mb-3 md:mb-4">
        <h3 className="text-sm md:text-base font-bold font-display uppercase tracking-widest flex items-center gap-2">
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
      
      <div className="flex-1 overflow-y-auto pr-1">
      <div className="space-y-1.5">
        {logs.map((log) => {
                const associatedAddr = getAssociatedAddress(log);
                const isMine = address && associatedAddr && normalizeAddress(associatedAddr) === normalizeAddress(address);
                const accent = getEventAccent(log.type);
                const bg = getEventBg(log.type);
                
                return (
                  <Link 
                    href={log.data.loanId ? `/loan/${log.data.loanId}` : (log.type === 'Staked' || log.type === 'Unstaked') ? '/stake' : '#'} 
                    key={log.id}
                    className="group flex items-center justify-between gap-2 sm:gap-3 p-2 sm:py-2.5 sm:px-3 cursor-pointer border-2 border-black hover-yellow-border hover-lift"
                    style={{ background: bg, borderLeft: `4px solid ${accent}` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div 
                        className="w-8 h-8 shrink-0 border-2 border-black flex items-center justify-center"
                        style={{ background: accent, boxShadow: '2px 2px 0px #000' }}
                      >
                        {getEventIcon(log.type)}
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-3 min-w-0">
                        <span className="text-[10px] sm:text-xs font-black px-1.5 py-0.5 border-2 border-black whitespace-nowrap hidden sm:inline-block uppercase" style={{ background: '#fff', color: '#000' }}>
                          {log.type}
                        </span>
                        
                        <p className="text-xs sm:text-sm font-bold truncate whitespace-nowrap text-black">
                          {getEventLabel(log)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                      {associatedAddr && (
                        <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 border-2 border-black whitespace-nowrap hidden md:inline-block ${isMine ? 'bg-[#FFD500] text-black' : 'bg-white text-black'}`}>
                          {isMine ? 'You' : `${associatedAddr.slice(0, 6)}...${associatedAddr.slice(-4)}`}
                        </span>
                      )}
                      
                      <span className="text-[10px] sm:text-xs font-bold text-black/60 whitespace-nowrap ml-auto">
                        {formatTimestamp(log.timestamp, log.blockNumber)}
                      </span>
                      
                      <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <ArrowRight className="w-3.5 h-3.5 text-black" />
                      </div>
                    </div>
                  </Link>
                );
              })}
      </div>
      </div>
    </div>
  );
}
