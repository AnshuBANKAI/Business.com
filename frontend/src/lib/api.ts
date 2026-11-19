export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(import.meta.env.DEV ? 'Can\u2019t reach the API. Run: npm run dev:all' : 'Can\u2019t reach the server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok && !data && import.meta.env.DEV && res.status >= 500) {
    throw new ApiError('The API server isn\u2019t running. In a second terminal run: npm run server (and make sure MongoDB is running). Or start both with: npm run dev:all', res.status);
  }
  if (!res.ok) throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', res.status, data?.fields);
  return data as T;
}

export const api = {
  get: <T,>(url: string) => request<T>('GET', url),
  post: <T,>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T,>(url: string, body: unknown) => request<T>('PUT', url, body),
  patch: <T,>(url: string, body: unknown) => request<T>('PATCH', url, body),
  del: <T,>(url: string) => request<T>('DELETE', url),
  upload: <T,>(url: string, field: string, file: File) => {
    const fd = new FormData();
    fd.append(field, file);
    return request<T>('POST', url, fd);
  },
};

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
