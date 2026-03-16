'use client';

interface CreditScoreProps {
  score: number;
  totalLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
}

export function CreditScore({ score, totalLoans, repaidLoans, defaultedLoans }: CreditScoreProps) {
  const maxScore = 1000;
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 58;
  const dashOffset = circumference - (percentage / 100) * circumference;

  const getScoreLabel = () => {
    if (score >= 800) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 500) return 'Fair';
    return 'Poor';
  };

  const getScoreColor = () => {
    if (score >= 800) return '#22C55E';
    if (score >= 650) return '#FFD500';
    if (score >= 500) return '#FF6B00';
    return '#FF3366';
  };

  return (
    <div className="neo-card p-6 hover-lift" style={{ background: '#7C3AED' }}>
      <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-white" style={{ textShadow: '2px 2px 0px #000' }}>
        Credit Score
      </h3>

      {/* Circular gauge */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background circle */}
            <circle
              cx="70" cy="70" r="58"
              fill="none"
              stroke="rgba(124, 58, 237, 0.15)"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="70" cy="70" r="58"
              fill="none"
              stroke={getScoreColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 70 70)"
              style={{
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: `drop-shadow(0 0 8px ${getScoreColor()}40)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white" style={{ textShadow: `2px 2px 0px #000` }}>
              {score}
            </span>
            <span className="text-sm font-bold mt-1 px-2 py-0.5 bg-white border-2 border-black" style={{ color: '#000' }}>
              {getScoreLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: totalLoans, color: '#000', bg: '#ffffff' },
          { label: 'Repaid', value: repaidLoans, color: '#000', bg: 'var(--accent-green)' },
          { label: 'Defaulted', value: defaultedLoans, color: '#fff', bg: 'var(--accent-red)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="text-center p-3 border-[3px] border-black" style={{ background: bg, boxShadow: '4px 4px 0px #000' }}>
            <p className="text-xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs mt-1 font-bold uppercase" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
