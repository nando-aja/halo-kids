
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


// Permintaan login/register yang sedang berjalan. Jika pengguna menekan
// tombol (atau Enter) berulang kali dengan data yang sama, request yang
// sama dipakai bersama. Ini mencegah beberapa verifikasi bcrypt berjalan
// paralel di server yang CPU-nya terbatas, yang membuat semuanya melambat.
let loginInFlight = null;
let registerInFlight = null;


export const authService = {

  // ==========================================
  // LOGIN
  // ==========================================

  login(email, password) {
    const key = `${email.trim().toLowerCase()}\u0000${password}`;

    if (loginInFlight && loginInFlight.key === key) {
      return loginInFlight.promise;
    }

    const promise = authService._performLogin(email, password).finally(() => {
      if (loginInFlight && loginInFlight.promise === promise) {
        loginInFlight = null;
      }
    });

    loginInFlight = { key, promise };

    return promise;
  },


  async _performLogin(email, password) {
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

      // Ambil pengajuan LKSA milik pengguna terlebih dahulu.
      // 404 berarti pengelola belum membuat pengajuan.
      let applicationLookupFailed = false;

      try {
        const applicationRes = await apiClient.get(
          '/api/pengajuan-lksa/me'
        );

        profileData.lksaApplication =
          applicationRes.data;

        profileData.lksaApplicationStatus =
          applicationRes.data.status_pengajuan;

      } catch (error) {
        profileData.lksaApplication = null;
        profileData.lksaApplicationStatus = null;

        applicationLookupFailed =
          error?.response?.status !== 404;
      }

      profileData.managedPanti = null;
      profileData.pantiName = null;

      // Data panti resmi hanya ada setelah pengajuan DISETUJUI.
      // Sebelum itu /api/panti/me pasti menjawab 403/404, jadi
      // tidak dipanggil agar login tidak membuang satu round-trip
      // dan Network tidak dipenuhi error yang memang diharapkan.
      // Jika status pengajuan tidak bisa dipastikan (gagal dimuat),
      // tetap coba ambil panti sebagai cadangan.
      const mayHaveOfficialPanti =
        profileData.lksaApplicationStatus === 'disetujui' ||
        applicationLookupFailed;

      if (mayHaveOfficialPanti) {
        try {
          const pantiRes = await apiClient.get(
            '/api/panti/me'
          );

          if (pantiRes.data) {
            profileData.managedPanti = pantiRes.data;
            profileData.pantiName =
              pantiRes.data.nama_panti;
          }
        } catch {
          // 403/404 normal bagi pengelola yang belum punya panti resmi.
        }
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

  register(data) {
    const key = JSON.stringify([
      data.nama,
      data.email,
      data.password,
      data.no_hp,
      data.role,
    ]);

    if (registerInFlight && registerInFlight.key === key) {
      return registerInFlight.promise;
    }

    const promise = authService._performRegister(data).finally(() => {
      if (registerInFlight && registerInFlight.promise === promise) {
        registerInFlight = null;
      }
    });

    registerInFlight = { key, promise };

    return promise;
  },


  async _performRegister({
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
  // STATUS PENGAJUAN LKSA TERBARU (PENGELOLA PANTI)
  // ==========================================
  //
  // Sesi disimpan saat login, jadi keputusan Dinsos yang terjadi
  // sesudahnya tidak ikut terbawa. Fungsi ini mengambil status
  // terbaru dan mengembalikan potongan profil yang siap digabung
  // ke sesi. Mengembalikan null jika status belum bisa dipastikan
  // (mis. jaringan putus), supaya sesi lama tidak ditimpa data kosong.

  async fetchPengelolaStatus() {
    let application = null;

    try {
      const res = await apiClient.get('/api/pengajuan-lksa/me');
      application = res.data;
    } catch (error) {
      // 404 = memang belum pernah mengajukan; selain itu gagal dimuat.
      if (error?.response?.status !== 404) return null;
    }

    const status = application?.status_pengajuan || null;

    const patch = {
      lksaApplication: application,
      lksaApplicationStatus: status,
      managedPanti: null,
      pantiName: null,
    };

    // Data panti resmi baru ada setelah pengajuan disetujui.
    if (status === 'disetujui') {
      try {
        const pantiRes = await apiClient.get('/api/panti/me');

        if (pantiRes.data) {
          patch.managedPanti = pantiRes.data;
          patch.pantiName = pantiRes.data.nama_panti;
        }
      } catch {
        // Status sudah disetujui; data panti dicoba lagi pada sinkronisasi berikutnya.
      }
    }

    return patch;
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
