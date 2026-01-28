interface MethodBadgeProps {
  method: string;
  size?: 'sm' | 'md';
}

const methodBadgeVariants: Record<string, string> = {
  GET: 'badge-success',
  POST: 'badge-info',
  PUT: 'badge-warning',
  PATCH: 'badge-warning',
  DELETE: 'badge-error',
  HEAD: 'badge-secondary',
  OPTIONS: 'badge-ghost',
};

export function MethodBadge({ method, size = 'md' }: MethodBadgeProps) {
  const variantClass = methodBadgeVariants[method.toUpperCase()] || 'badge-ghost';
  const sizeClass = size === 'sm' ? 'badge-xs' : 'badge-sm';

  return (
    <span
      className={`badge ${variantClass} ${sizeClass} font-semibold`}
    >
      {method.toUpperCase()}
    </span>
  );
}
