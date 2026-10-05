export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function apiFetch(url, options = {}, retries = 2) {
  const token = localStorage.getItem('redactx_auth_token');
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions = {
    credentials: 'include',
    ...options,
    headers,
  };

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, finalOptions);

      // If the response is an HTML page (such as the Cloud Run / AI Studio cookie check or proxy warmup)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const text = await res.text();
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        // Return a response-like object that throws clean error on .json()
        return {
          ok: false,
          status: res.status || 503,
          statusText: 'Service initializing',
          headers: res.headers,
          text: async () => text,
          json: async () => {
            throw new Error('Connection initializing. Please try again.');
          },
        };
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
