import { useState, useMemo } from 'react';
import type { RequestLog } from '@mockd/shared';
import { RequestItem } from './RequestItem';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { ConnectionStatus } from '../../hooks/useWebSocket';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const STATUS_CATEGORIES = [
  { label: '2xx Success', min: 200, max: 299 },
  { label: '3xx Redirect', min: 300, max: 399 },
  { label: '4xx Client Error', min: 400, max: 499 },
  { label: '5xx Server Error', min: 500, max: 599 },
] as const;

interface RequestListProps {
  requests: RequestLog[];
  status: ConnectionStatus;
  onClear: () => void;
}

export function RequestList({ requests, status, onClear }: RequestListProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (methodFilter && req.method.toUpperCase() !== methodFilter) {
        return false;
      }
      if (statusFilter && req.response_status !== null) {
        const category = STATUS_CATEGORIES.find(c => c.label === statusFilter);
        if (category && (req.response_status < category.min || req.response_status > category.max)) {
          return false;
        }
      }
      return true;
    });
  }, [requests, methodFilter, statusFilter]);

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    onClear();
    setShowClearConfirm(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="px-4 py-3 border-b border-base-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base-content">Request Stream</h3>
          {status === 'connected' && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-base-content/70">Live</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="select select-bordered select-xs"
          >
            <option value="">All Methods</option>
            {HTTP_METHODS.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select select-bordered select-xs"
          >
            <option value="">All Status</option>
            {STATUS_CATEGORIES.map(cat => (
              <option key={cat.label} value={cat.label}>{cat.label}</option>
            ))}
          </select>
          <button
            onClick={handleClearClick}
            disabled={requests.length === 0}
            className="btn btn-ghost btn-sm"
          >
            Clear
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Request Logs"
        message={`Are you sure you want to clear all ${requests.length} request log${requests.length === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText="Clear All"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
      />

      <div className="max-h-[600px] overflow-y-auto">
        {status === 'connecting' ? (
          <div className="px-4 py-12 text-center text-base-content/50">
            <span className="loading loading-spinner loading-md mb-2" />
            <p className="text-sm">Connecting to request stream...</p>
          </div>
        ) : status === 'error' || status === 'disconnected' ? (
          <div className="px-4 py-12 text-center text-base-content/50">
            <p className="mb-2 text-warning">Connection lost</p>
            <p className="text-sm">Attempting to reconnect...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-4 py-12 text-center text-base-content/50">
            {requests.length === 0 ? (
              <>
                <p className="mb-2">No requests yet</p>
                <p className="text-sm">
                  Send a request to your endpoint to see it appear here
                </p>
              </>
            ) : (
              <>
                <p className="mb-2">No matching requests</p>
                <p className="text-sm">
                  Try adjusting your filters ({requests.length} request{requests.length === 1 ? '' : 's'} hidden)
                </p>
              </>
            )}
          </div>
        ) : (
          filteredRequests.map(request => (
            <RequestItem key={request.id} request={request} />
          ))
        )}
      </div>
    </div>
  );
}
