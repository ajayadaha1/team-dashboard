import axios from 'axios';
import { useUserStore } from './store';

const API_BASE = '/team-dashboard-api/api';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const name = useUserStore.getState().currentUser;
  if (name) cfg.headers['X-User-Name'] = name;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // Clear cached user and prompt to pick again.
      useUserStore.getState().setCurrentUser('');
      const detail = err.response?.data?.detail || 'Pick your name first.';
      alert(detail);
    }
    return Promise.reject(err);
  },
);

export const downloadExport = async (
  tables: string[],
  format: 'xlsx' | 'csv',
): Promise<void> => {
  const res = await api.get('/export', {
    params: { tables: tables.join(','), format },
    responseType: 'blob',
  });
  const blob = new Blob([res.data]);
  const cd: string = res.headers['content-disposition'] || '';
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m ? m[1] : `export.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
