import axios from 'axios';

const configuredApiUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  'http://127.0.0.1:8000';

export const API_BASE_URL = configuredApiUrl
  .trim()
  .replace(/\/+$/, '');

export const TOKEN_STORAGE_KEY = 'halokids_access_token';
export const SESSION_STORAGE_KEY = 'halokids_active_session';

/**
 * Axios instance terpusat untuk komunikasi dengan FastAPI backend HaloKids
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

/**
 * Request Interceptor:
 * Menyisipkan Bearer Token otomatis pada header Authorization jika token tersedia
 */
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Gagal membaca token dari localStorage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Menangani respon & otomatis mereset session saat 401 Unauthorized
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      // 401 Unauthorized: Session login sudah kedaluwarsa atau token tidak valid
      if (status === 401) {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {
          // ignore
        }

        // Broadcast event session expired agar modal login otomatis muncul & UI mereset state
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('halokids:auth_expired', {
              detail: { message: 'Sesi login telah berakhir. Silakan masuk kembali.' },
            })
          );
        }
      }
    }

    // Normalisasi pesan error agar mudah ditampilkan di UI toast/notifikasi
    const extractedMessage = 
      error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail))
        : error.response?.data?.message || error.message || 'Terjadi kesalahan pada server';

    error.friendlyMessage = extractedMessage;
    return Promise.reject(error);
  }
);

/**
 * Helper untuk decode payload JWT tanpa perlu library pihak ketiga
 */
export function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default apiClient;
