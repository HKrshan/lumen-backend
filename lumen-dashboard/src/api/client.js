import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests if available
api.interceptors.request.use(async (config) => {
  try {
    const { supabase } = await import('../supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    // Auth not configured, continue without token
  }
  return config;
});

/* ── Endpoints ─────────────────────────────────── */

export async function startResearch({ query, model }) {
  const { data } = await api.post('/research', { query, model });
  return data;
}

export async function getTaskStatus(taskId) {
  const { data } = await api.get(`/status/${taskId}`);
  return data;
}

export async function listTasks() {
  const { data } = await api.get('/tasks');
  return data;
}

export default api;
