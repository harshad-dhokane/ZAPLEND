export function formatTimestamp(timestamp: number | null, blockNumber?: number): string {
  if (!timestamp) {
    return typeof blockNumber === 'number' ? `Block #${blockNumber}` : '—';
  }

  const date = new Date(timestamp * 1000);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateShort(timestamp: number | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateCompact(timestamp: number | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
