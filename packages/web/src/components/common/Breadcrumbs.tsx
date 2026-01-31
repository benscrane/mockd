import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="breadcrumbs text-sm">
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {item.href ? (
              <Link to={item.href} className="text-base-content/70 hover:text-base-content">
                {item.label}
              </Link>
            ) : (
              <span className="text-base-content font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
