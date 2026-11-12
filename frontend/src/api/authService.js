
import apiClient, {
  TOKEN_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  decodeJwt,
} from './apiClient';


/**
 * Mapping role backend ke role frontend.
 */
export function mapBackendRoleToFrontend(role) {
  const normalized = (role || '').toLowerCase();

  if (normalized === 'admin') {
    return {
      role: 'Super Admin',
      roleCode: 'admin',
      roleMode: 'superadmin',
      roleLabel: 'Dinas Sosial (Super Admin)',
    };
  }

  if (
    normalized === 'pengelola-panti' ||
    normalized === 'pengelola panti'
  ) {
    return {
      role: 'Admin Panti',
      roleCode: 'pengelola-panti',
      roleMode: 'pantiadmin',
      roleLabel: 'Pengelola Panti Asuhan / LKSA',
    };
  }

  return {
    role: 'User Publik',
    roleCode: 'masyarakat',
    roleMode: 'user',
    roleLabel: 'Masyarakat / Warga Umum',
  };
}


export const authService = {

  // ==========================================
  // LOGIN
  // ==========================================

  async login(email, password) {
    const params = new URLSearchParams();

    params.append('username', email.trim().toLowerCase());
    params.append('password', password);

    const response = await apiClient.post(
      '/api/auth/login',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const {
      access_token,
      token_type,
    } = response.data;

    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      access_token
    );

    const jwtPayload = decodeJwt(access_token);
    const backendRole = jwtPayload?.role || 'masyarakat';

    const roleMeta = mapBackendRoleToFrontend(
      backendRole
    );

    let profileData = {
      id: jwtPayload?.sub
        ? parseInt(jwtPayload.sub, 10)
        : null,

      email: email.trim().toLowerCase(),
      name: email.split('@')[0],

      ...roleMeta,
    };


    // ==========================================
    // PROFIL MASYARAKAT
    // ==========================================

    if (backendRole === 'masyarakat') {
      try {
        const meRes = await apiClient.get(
          '/api/masyarakat/me'
        );

        if (meRes.data) {
          profileData = {
            ...profileData,
            ...meRes.data,

            name: meRes.data.nama || profileData.name,
            phone: meRes.data.no_hp || '',

            ...roleMeta,
          };
        }
      } catch (error) {
        console.warn(
          'Profil masyarakat belum dapat dimuat:',
          error
        );
      }
    }


    // ==========================================
    // PROFIL PENGELOLA LKSA
    // ==========================================

    if (backendRole === 'pengelola-panti') {

      // Panti hanya tersedia jika sudah disetujui.
      try {
        const pantiRes = await apiClient.get(
          '/api/panti/me'
        );

        if (pantiRes.data) {
          profileData.managedPanti = pantiRes.data;
          profileData.pantiName =
            pantiRes.data.nama_panti;
        }
      } catch (error) {
        // 404 normal bagi pengelola yang belum mempunyai panti resmi.
        profileData.managedPanti = null;
        profileData.pantiName = null;
      }


      // Ambil pengajuan LKSA milik pengguna.
      try {
        const applicationRes = await apiClient.get(
          '/api/pengajuan-lksa/me'
        );

        profileData.lksaApplication =
          applicationRes.data;

        profileData.lksaApplicationStatus =
          applicationRes.data.status_pengajuan;

      } catch (error) {
        // 404 berarti pengelola belum membuat pengajuan.
        profileData.lksaApplication = null;
        profileData.lksaApplicationStatus = null;
      }
    }


    // ==========================================
    // SIMPAN SESSION
    // ==========================================

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(profileData)
    );

    return {
      token: access_token,
      tokenType: token_type,
      user: profileData,
    };
  },


  // ==========================================
  // REGISTER
  // ==========================================

  async register({
    nama,
    email,
    password,
    no_hp,
    role = 'masyarakat',
  }) {
    const payload = {
      nama: nama.trim(),
      email: email.trim().toLowerCase(),
      password,
      no_hp: no_hp ? no_hp.trim() : null,
      role,
    };

    const response = await apiClient.post(
      '/api/auth/register',
      payload
    );

    return response.data;
  },


  // ==========================================
  // PROFIL SAYA
  // ==========================================

  async getMyProfile(role = 'masyarakat') {

    if (role === 'pengelola-panti') {
      const response = await apiClient.get(
        '/api/panti/me'
      );

      return response.data;
    }

    const response = await apiClient.get(
      '/api/masyarakat/me'
    );

    return response.data;
  },


  // ==========================================
  // SESSION
  // ==========================================

  getStoredSession() {
    try {
      const raw = localStorage.getItem(
        SESSION_STORAGE_KEY
      );

      return raw ? JSON.parse(raw) : null;

    } catch (error) {
      console.error(
        'Gagal membaca session:',
        error
      );

      return null;
    }
  },


  // ==========================================
  // LOGOUT
  // ==========================================

  logout() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);

    } catch (error) {
      console.error(
        'Gagal menghapus session:',
        error
      );
    }
  },
};


export default authService;
