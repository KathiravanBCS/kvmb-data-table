import { getDatabase, queryEmployees, updateEmployee } from './employees.service';
import type { Employee } from '../data';

/**
 * In-browser stand-in for the REST API so the docs work without a backend.
 * Honours AbortSignal like real `fetch`, with simulated latency.
 */
export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { signal } = init;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 350 + Math.random() * 300);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
  const parsed = new URL(url, 'http://localhost');
  if (parsed.pathname === '/api/employees' && (!init.method || init.method === 'GET')) {
    return queryEmployees(getDatabase(), parsed.searchParams) as T;
  }
  const match = /^\/api\/employees\/(.+)$/.exec(parsed.pathname);
  if (match && init.method === 'PATCH') {
    return updateEmployee(JSON.parse(String(init.body)) as Employee) as T;
  }
  throw new Error(`404 ${parsed.pathname}`);
}
