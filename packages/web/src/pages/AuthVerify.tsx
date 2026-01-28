import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:8787';
  }
  return '';
}

export function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    // Handle error from redirect
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_token: 'This link is invalid. Please request a new one.',
        token_used: 'This link has already been used. Please request a new one.',
        token_expired: 'This link has expired. Please request a new one.',
      };
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.');
      return;
    }

    // Redirect to API verify endpoint
    if (token) {
      window.location.href = `${getApiBaseUrl()}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
    } else {
      setError('No verification token provided.');
    }
  }, [token, errorParam, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="card bg-base-100 shadow-sm p-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-error/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-base-content mb-2">Verification Failed</h1>
            <p className="text-base-content/70 mb-6">{error}</p>
            <Link
              to="/login"
              className="btn btn-primary w-full"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="card bg-base-100 shadow-sm p-6">
          <span className="loading loading-spinner loading-lg mx-auto mb-4"></span>
          <h1 className="text-xl font-semibold text-base-content mb-2">Verifying</h1>
          <p className="text-base-content/70">Please wait while we sign you in...</p>
        </div>
      </div>
    </div>
  );
}
