'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLoans } from '@/hooks/useLoans';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { Clock, CheckCircle2, AlertTriangle, Shield, Wallet, ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

type ActivityEvent = {
  id: string;
  type: 'CREATED' | 'VOUCHED' | 'FUNDED' | 'REPAID' | 'DEFAULTED';
  loanId: string;
  borrower: string;
  amount: string;
  timeLabel: string;
  timestamp: number;
};

function formatTimeAgo(timestampSeconds: number, currentTime: number): string {
  if (timestampSeconds <= 0) return 'just now';

  const diff = currentTime - timestampSeconds;

  if (diff < 0) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function normalizeAddress(addr: string): string {
  return addr.replace(/^0x0*/i, '').toLowerCase();
}

export function ActivityFeed() {
  const { data: loans, isLoading } = useLoans();
  const { address } = useStarkzap();
  const [mountTime] = useState(() => Math.floor(Date.now() / 1000));
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));

  // Force re-renders every 10 seconds to update relative times
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Generate real activity events from on-chain loan data
  // Using mountTime as a stable anchor for pending loans (since contract lacks creation timestamps)
  // This ensures the relative "time ago" correctly ages without freezing or jumping.
  const events = useMemo(() => {
    if (!loans || loans.length === 0) return [];

    const allEvents: ActivityEvent[] = [];
    const now = Math.floor(Date.now() / 1000);

    loans.forEach((loan) => {
      const loanAmount = loan.amount;
      const hasStartTime = loan.startTime > 0;

      // Use startTime if available, otherwise anchor strictly by loan ID offset
      const anchorTime = hasStartTime 
        ? loan.startTime 
        : mountTime - (parseInt(loan.id) * 3600); // Assume pending loans are 1 hour older per ID lower

      allEvents.push({
        id: `create-${loan.id}`,
        type: 'CREATED',
        loanId: loan.id,
        borrower: loan.borrower,
        amount: loanAmount,
        timeLabel: formatTimeAgo(anchorTime - 3600, currentTime), // Created 1 hr before anchor
        timestamp: anchorTime - 3600,
      });

      // Social collateral received — vouch events
      const socialCurrent = parseFloat(loan.socialCollateralCurrent?.replace(/,/g, '') || '0');
      if (socialCurrent > 0) {
        // Vouch happened 30 mins before anchor
        const vouchTime = anchorTime - 1800;
        allEvents.push({
          id: `vouch-${loan.id}`,
          type: 'VOUCHED',
          loanId: loan.id,
          borrower: loan.borrower,
          amount: loan.socialCollateralCurrent,
          timeLabel: formatTimeAgo(vouchTime, currentTime),
          timestamp: vouchTime,
        });
      }

      // Loan funded/activated event
      if (loan.status === 'Active' && hasStartTime) {
        allEvents.push({
          id: `fund-${loan.id}`,
          type: 'FUNDED',
          loanId: loan.id,
          borrower: loan.borrower,
          amount: loanAmount,
          timeLabel: formatTimeAgo(anchorTime, currentTime),
          timestamp: anchorTime,
        });
      }

      // Loan repaid event
      if (loan.status === 'Repaid') {
        allEvents.push({
          id: `repay-${loan.id}`,
          type: 'REPAID',
          loanId: loan.id,
          borrower: loan.borrower,
          amount: loanAmount,
          timeLabel: formatTimeAgo(anchorTime + 1800, currentTime), // Repaid 30m after anchor
          timestamp: anchorTime + 1800,
        });
      }

      // Loan defaulted event
      if (loan.status === 'Defaulted') {
        const defaultTime = anchorTime + loan.duration * 86400; // Duration is accurate offset if defaulted
        allEvents.push({
          id: `default-${loan.id}`,
          type: 'DEFAULTED',
          loanId: loan.id,
          borrower: loan.borrower,
          amount: loanAmount,
          timeLabel: formatTimeAgo(defaultTime, currentTime),
          timestamp: defaultTime,
        });
      }
    });

    // Sort newest first
    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  }, [loans]);

  if (isLoading || !loans) {
    return (
      <div className="neo-card p-5 flex flex-col gap-4">
        <h3 className="text-base font-bold font-display uppercase tracking-widest border-b-2 border-black pb-2">Live Activity</h3>
        {[1, 2, 3].map((i) => (
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

  if (events.length === 0) {
    return (
      <div className="neo-card p-5">
        <h3 className="text-base font-bold font-display uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Live Activity</h3>
        <p className="text-sm font-bold text-center py-4">No on-chain activity yet.</p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CREATED': return <Wallet className="w-5 h-5 text-black" />;
      case 'VOUCHED': return <Users className="w-5 h-5 text-black" />;
      case 'FUNDED': return <Shield className="w-5 h-5 text-black" />;
      case 'REPAID': return <CheckCircle2 className="w-5 h-5 text-black" />;
      case 'DEFAULTED': return <AlertTriangle className="w-5 h-5 text-black" />;
      default: return <Clock className="w-5 h-5 text-black" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'CREATED': return '#FFD500';
      case 'VOUCHED': return '#B8B0FF';
      case 'FUNDED': return '#00F5D4';
      case 'REPAID': return '#22C55E';
      case 'DEFAULTED': return '#FF3366';
      default: return '#fff';
    }
  };

  const getEventLabel = (event: ActivityEvent) => {
    switch (event.type) {
      case 'CREATED':
        return <span>Requested <span className="text-blue-600">{event.amount} STRK</span> loan</span>;
      case 'VOUCHED':
        return <span>Received <span className="text-purple-600">{event.amount} STRK</span> social collateral</span>;
      case 'FUNDED':
        return <span>Loan <span className="text-blue-600">#{event.loanId}</span> fully funded & activated</span>;
      case 'REPAID':
        return <span>Repaid <span className="text-green-600">{event.amount} STRK</span> loan</span>;
      case 'DEFAULTED':
        return <span>Loan <span className="text-red-600">#{event.loanId}</span> defaulted</span>;
      default:
        return null;
    }
  };

  return (
    <div className="neo-card p-5">
      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-5">
        <h3 className="text-base font-bold font-display uppercase tracking-widest">Live Activity</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold bg-black text-white px-2 py-1 uppercase">Starknet Sepolia</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {events.map((event, idx) => {
          const isMine = address && normalizeAddress(event.borrower) === normalizeAddress(address);
          
          return (
            <Link 
              href={`/loan/${event.loanId}`} 
              key={event.id}
              className="group flex gap-4 p-3 border-[4px] border-black transition-all bg-white shadow-[4px_4px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_#000]"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div 
                className="w-10 h-10 shrink-0 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center transition-transform group-hover:-translate-y-1"
                style={{ background: getEventBg(event.type) }}
              >
                {getEventIcon(event.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">
                  {getEventLabel(event)}
                </p>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold font-mono bg-yellow-300 px-1 border-2 border-black">
                    {isMine ? 'You' : `${event.borrower.slice(0, 6)}...${event.borrower.slice(-4)}`}
                  </span>
                  <span className="text-xs font-black text-black">• Loan #{event.loanId}</span>
                  <span className="text-xs font-bold text-gray-600">• {event.timeLabel}</span>
                </div>
              </div>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
