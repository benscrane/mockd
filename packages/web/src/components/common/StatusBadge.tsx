interface StatusBadgeProps {
  status: number | null;
  size?: 'sm' | 'md';
}

function getStatusBadgeVariant(status: number): string {
  if (status >= 200 && status < 300) return 'badge-success';
  if (status >= 300 && status < 400) return 'badge-warning';
  if (status >= 400) return 'badge-error';
  return 'badge-ghost';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  if (status === null) {
    return null;
  }

  const variantClass = getStatusBadgeVariant(status);
  const sizeClass = size === 'sm' ? 'badge-xs' : 'badge-sm';

  return (
    <span className={`badge ${variantClass} ${sizeClass} font-mono`}>
      {status}
    </span>
  );
}
