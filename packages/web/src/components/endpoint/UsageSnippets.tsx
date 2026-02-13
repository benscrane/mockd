import { useState, useMemo } from 'react';
import type { Endpoint } from '@mockd/shared';
import { CopyButton } from '../common';

type Language = 'curl' | 'javascript' | 'python';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];
const LANGUAGES: { key: Language; label: string }[] = [
  { key: 'curl', label: 'cURL' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'python', label: 'Python' },
];

interface UsageSnippetsProps {
  endpointUrl: string;
  endpoint: Endpoint;
}

function getSampleBody(endpoint: Endpoint): string | null {
  if (!endpoint.responseBody) return null;
  try {
    // Use the endpoint's response body as a reasonable sample
    const parsed = JSON.parse(endpoint.responseBody);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

function generateCurl(method: HttpMethod, url: string, contentType: string, sampleBody: string | null): string {
  const parts = [`curl -X ${method} "${url}"`];
  if (method !== 'GET') {
    parts.push(`  -H "Content-Type: ${contentType}"`);
    if (sampleBody) {
      parts.push(`  -d '${sampleBody.replace(/\n/g, '').replace(/\s{2,}/g, ' ')}'`);
    }
  }
  return parts.join(' \\\n');
}

function generateJavaScript(method: HttpMethod, url: string, contentType: string, sampleBody: string | null): string {
  if (method === 'GET') {
    return `const response = await fetch("${url}");
const data = await response.json();
console.log(data);`;
  }

  const bodyStr = sampleBody
    ? `JSON.stringify(${sampleBody.replace(/\n/g, '\n  ')})`
    : `JSON.stringify({ key: "value" })`;

  return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "Content-Type": "${contentType}",
  },
  body: ${bodyStr},
});
const data = await response.json();
console.log(data);`;
}

function generatePython(method: HttpMethod, url: string, contentType: string, sampleBody: string | null): string {
  if (method === 'GET') {
    return `import requests

response = requests.get("${url}")
print(response.json())`;
  }

  const methodLower = method.toLowerCase();
  const isJson = contentType.includes('json');
  const bodyParam = isJson ? 'json' : 'data';
  const bodyStr = sampleBody
    ? sampleBody.replace(/\n/g, '\n    ').replace(/"([^"]+)":/g, '"$1":')
    : '{"key": "value"}';

  return `import requests

payload = ${bodyStr}
response = requests.${methodLower}(
    "${url}",
    ${bodyParam}=payload,
)
print(response.json())`;
}

function generateSnippet(
  language: Language,
  method: HttpMethod,
  url: string,
  contentType: string,
  sampleBody: string | null,
): string {
  switch (language) {
    case 'curl':
      return generateCurl(method, url, contentType, sampleBody);
    case 'javascript':
      return generateJavaScript(method, url, contentType, sampleBody);
    case 'python':
      return generatePython(method, url, contentType, sampleBody);
  }
}

export function UsageSnippets({ endpointUrl, endpoint }: UsageSnippetsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMethod, setActiveMethod] = useState<HttpMethod>('GET');
  const [activeLanguage, setActiveLanguage] = useState<Language>('curl');

  const sampleBody = useMemo(() => getSampleBody(endpoint), [endpoint]);
  const snippet = useMemo(
    () => generateSnippet(activeLanguage, activeMethod, endpointUrl, endpoint.contentType, sampleBody),
    [activeLanguage, activeMethod, endpointUrl, endpoint.contentType, sampleBody],
  );

  return (
    <div className="card bg-base-100 shadow-sm mb-6">
      <div className="px-4 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-base-content hover:text-base-content/80 transition-colors w-full"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Usage
          <span className="text-xs font-normal text-base-content/50 ml-1">code snippets</span>
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-base-200 pt-3">
          {/* Endpoint URL with copy */}
          <div className="flex items-center gap-2 mb-3 bg-base-200 rounded-lg px-3 py-2">
            <code className="text-xs font-mono text-base-content flex-1 truncate">{endpointUrl}</code>
            <CopyButton text={endpointUrl} label="Copy" iconOnly className="shrink-0" />
          </div>

          {/* Method selector */}
          <div className="flex gap-1 mb-3">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMethod(m)}
                className={`btn btn-xs font-mono ${activeMethod === m ? 'btn-primary' : 'btn-ghost'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Language tabs */}
          <div className="tabs tabs-bordered mb-3">
            {LANGUAGES.map(({ key, label }) => (
              <button
                key={key}
                className={`tab tab-sm ${activeLanguage === key ? 'tab-active' : ''}`}
                onClick={() => setActiveLanguage(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Code snippet */}
          <div className="relative">
            <pre className="bg-base-200 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
              {snippet}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={snippet} label="Copy" iconOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
