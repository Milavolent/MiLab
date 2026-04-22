let modalSiswa, modalKelolaKelas, modalCatatan, modalTindakLanjut, modalKonseling, modalLapor;
let semuaDataSiswa = [], semuaDataKelas = [], semuaDataCatatan = [], semuaDataLaporan = [], semuaDataKonseling = [], presensiSaya = [];
let kelasAktifSiswa = 'Semua Kelas', kelasAktifPresensi = '';
let filterStatusLaporan = 'Semua', filterStatusKonseling = 'Semua';
let presensiHariIni = {}; 
let loginData = { role: '', nama: '', nis: '', kelas: '' };
let activeLoginRole = 'Guru';
let modeForm = 'tambah', nisYangDiedit = '';

window.onload = () => {
  // 1. Inisialisasi Modal Bootstrap
  modalSiswa = new bootstrap.Modal(document.getElementById('modalFormSiswa'));
  modalKelolaKelas = new bootstrap.Modal(document.getElementById('modalKelolaKelas'));
  modalCatatan = new bootstrap.Modal(document.getElementById('modalFormCatatan'));
  modalTindakLanjut = new bootstrap.Modal(document.getElementById('modalTindakLanjut'));
  modalKonseling = new bootstrap.Modal(document.getElementById('modalFormKonseling'));
  modalLapor = new bootstrap.Modal(document.getElementById('modalLapor'));
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inpTanggalPresensi').value = today;
  document.getElementById('inpCatatanTanggal').value = today;
  document.getElementById('inpKonselingTanggal').value = today;

  // 2. CEK SESSION STORAGE (Fitur Anti-Logout)
  const savedSession = sessionStorage.getItem('sankalaSession');
  if (savedSession) {
    loginData = JSON.parse(savedSession);
    pulihkanTampilanSesuaiRole();
    muatSemuaDataAwal();
  }

  // 3. Jalankan Router pertama kali
  jalankanRouter();
};

// ==========================================
// SISTEM ROUTING & KEAMANAN (NEW)
// ==========================================

// Mendengarkan jika URL/Hash berubah (misal tombol Back di HP ditekan)
window.addEventListener('hashchange', jalankanRouter);

function switchPage(pageId, element) { 
  // Mengubah perintah klik lama 'page-guru-dashboard' menjadi link '#/guru/dashboard'
  const hashPath = '#/' + pageId.replace('page-', '').replace('-', '/');
  window.location.hash = hashPath; // Ini akan memicu fungsi jalankanRouter()
}

function jalankanRouter() {
  const hash = window.location.hash || '#/login';

  // ROUTE GUARD 1: Belum login, tapi coba-coba akses menu dalam
  if (!loginData.role && hash !== '#/login') {
    window.location.hash = '#/login';
    return;
  }

  // ROUTE GUARD 2: Siswa mencoba mengakses link Guru
  if (loginData.role === 'Siswa' && hash.startsWith('#/guru')) {
    window.location.hash = '#/siswa/dashboard';
    return;
  }

  // ROUTE GUARD 3: Guru mencoba mengakses link Siswa
  if (loginData.role === 'Guru' && hash.startsWith('#/siswa')) {
    window.location.hash = '#/guru/dashboard';
    return;
  }

  // EKSEKUSI TAMPILAN BERDASARKAN URL
  if (hash === '#/login') {
    document.getElementById('login-wrapper').style.display = 'flex';
    document.getElementById('main-app-wrapper').style.display = 'none';
  } else {
    document.getElementById('login-wrapper').style.display = 'none';
    document.getElementById('main-app-wrapper').style.display = 'block';

    // Terjemahkan balik '#/guru/dashboard' menjadi id div 'page-guru-dashboard'
    const targetPageId = hash.replace('#/', 'page-').replace('/', '-');
    
    document.querySelectorAll('.page-section').forEach(el => el.style.display = 'none'); 
    const pageElement = document.getElementById(targetPageId);
    if(pageElement) pageElement.style.display = 'block';

    // Beri efek warna (active) pada menu navigasi yang sedang dibuka
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
    const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(targetPageId));
    if(activeNav) activeNav.classList.add('active'); 

    // Fitur Khusus: Jalankan fungsi otomatis di halaman tertentu
    if(hash === '#/guru/attendance') muatPresensi();
  }
}

function pulihkanTampilanSesuaiRole() {
  document.getElementById('lblHeaderNamaInfo').innerText = loginData.nama; 
  document.getElementById('lblHeaderRoleInfo').innerText = loginData.role.toUpperCase(); 
  
  if(loginData.role === 'Guru') {
     document.querySelectorAll('.guru-nav').forEach(el => el.style.display = 'flex');
     document.querySelectorAll('.siswa-nav').forEach(el => el.style.display = 'none');
     document.getElementById('wrapper-chatbot-guru').style.display = 'block';
     document.getElementById('lblDashboardNama').innerText = loginData.nama.split(' ')[0];
  } else {
     document.querySelectorAll('.guru-nav').forEach(el => el.style.display = 'none');
     document.querySelectorAll('.siswa-nav').forEach(el => el.style.display = 'flex');
     document.getElementById('wrapper-chatbot-guru').style.display = 'none';
     document.querySelectorAll('.txtNamaSiswaPanggilan').forEach(el => el.innerText = loginData.nama.split(' ')[0]);
     document.querySelectorAll('.txtNamaSiswaLengkap').forEach(el => el.innerText = loginData.nama);
     document.querySelectorAll('.txtKelasSiswa').forEach(el => el.innerText = 'Kelas ' + loginData.kelas);
     document.getElementById('txtNisSiswa').innerText = loginData.nis;
  }
}

// ==========================================
// FUNGSI UTAMA APLIKASI
// ==========================================

function setRoleLogin(role) { 
  activeLoginRole = role; 
  document.getElementById('btnRoleGuru').classList.toggle('active', role === 'Guru'); 
  document.getElementById('btnRoleSiswa').classList.toggle('active', role === 'Siswa'); 
  document.getElementById('lblUsername').innerText = role === 'Guru' ? 'NIP PEGAWAI' : 'NIS SISWA'; 
  document.getElementById('inpLoginUsername').placeholder = role === 'Guru' ? 'Masukkan NIP' : 'Masukkan NIS'; 
  document.getElementById('btnLoginSubmit').innerText = role === 'Guru' ? 'MASUK SEBAGAI GURU' : 'MASUK SEBAGAI SISWA'; 
}

function prosesLogin() { 
  const u = document.getElementById('inpLoginUsername').value.trim(); 
  const p = document.getElementById('inpLoginPassword').value; 
  if(!u || !p) return alert("Harap isi ID dan Password!"); 
  
  document.getElementById('loading-global').style.display = 'flex';
  
  callAPI('prosesLogin', [activeLoginRole, u, p]).then(res => { 
    document.getElementById('loading-global').style.display = 'none';
    if(res.status === 'success') { 
      loginData = res; 
      
      // SIMPAN DATA LOGIN KE MEMORI BROWSER
      sessionStorage.setItem('sankalaSession', JSON.stringify(loginData));
      
      pulihkanTampilanSesuaiRole();
      muatSemuaDataAwal(); 

      // Arahkan URL ke Dasbor yang tepat
      if(res.role === 'Guru') {
         window.location.hash = '#/guru/dashboard';
      } else {
         window.location.hash = '#/siswa/dashboard';
      }
    } else {
      alert(res.message); 
    }
  }); 
}

function logoutApp() { 
  toggleSidebar(false);
  if(confirm('Yakin ingin keluar dari SANKALA?')) { 
    // HAPUS SESI DARI MEMORI
    sessionStorage.removeItem('sankalaSession');
    
    document.getElementById('formLogin').reset();
    semuaDataSiswa = []; semuaDataKelas = []; semuaDataCatatan = []; 
    semuaDataLaporan = []; semuaDataKonseling = []; presensiSaya = [];
    loginData = { role: '', nama: '', nis: '', kelas: '' };

    // Paksa kembali ke URL Login
    window.location.hash = '#/login';
  } 
}

function formatDateIndo(dateStr) { 
  if(!dateStr) return '-'; 
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; 
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; 
  const d = new Date(dateStr); 
  if(isNaN(d.getTime())) return dateStr; 
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`; 
}

function toggleSidebar(show) {
  const sidebar = document.getElementById('sidebar-main');
  const overlay = document.querySelector('.sidebar-overlay');
  if(show) { sidebar.classList.add('show'); overlay.style.display = 'block'; } 
  else { sidebar.classList.remove('show'); overlay.style.display = 'none'; }
}

function muatSemuaDataAwal() {
  callAPI('getInitialData', [loginData.role, loginData.nis]).then(res => {
    try { semuaDataKelas = (res.kelas || []).sort(); if(semuaDataKelas.length > 0) kelasAktifPresensi = semuaDataKelas[0]; renderFilterKelasSiswa(); renderFilterKelasPresensi(); renderDropdownKelas(); renderListKelasModal(); } catch(e){}
    try { semuaDataSiswa = res.siswa || []; renderTabelSiswa(); renderDropdownSiswaUntukCatatan(); } catch(e){}
    try { semuaDataCatatan = res.catatan || []; renderListCatatanGuru(); } catch(e){}
    try { semuaDataLaporan = res.laporan || []; updateDashboardBadgeLaporan(); renderListLaporanGuru(); renderLaporanSiswa(); } catch(e){}
    try { semuaDataKonseling = res.konseling || []; renderListKonselingGuru(); renderKonselingSiswa(); } catch(e){}
    try { presensiSaya = res.presensiSaya || []; renderPresensiSaya(); } catch(e){}
    
    if(loginData.role === 'Guru') {
       document.getElementById('stat-siswa').innerText = semuaDataSiswa.length;
       const laporanBaru = semuaDataLaporan.filter(l => l && l[6] === 'Menunggu').length;
       document.getElementById('stat-laporan').innerText = laporanBaru;
       const b = document.getElementById('badge-laporan-baru');
       if(b) { b.style.display = laporanBaru > 0 ? 'inline-block' : 'none'; b.innerText = laporanBaru; }
       
       const konselingPending = semuaDataKonseling.filter(k => k && k[3] === 'Dipesan').length;
       document.getElementById('stat-konseling').innerText = konselingPending;
       
       const tglHariIni = new Date().toISOString().split('T')[0];
       callAPI('getPresensiTanggal', [tglHariIni]).then(function(dataPre) {
          let hadirCount = 0;
          if(dataPre && !dataPre.error) { dataPre.forEach(r => { if(r && r[5] === 'Hadir') hadirCount++; }); }
          document.getElementById('stat-hadir').innerText = hadirCount;
       });
       
       const validCatatan = semuaDataCatatan.filter(c => c && c[2]);
       const actTitle = document.getElementById('act-1-title');
       const actDesc = document.getElementById('act-1-desc');
       if(validCatatan.length > 0) {
          const c = validCatatan[0];
          actTitle.innerText = c[2] + " (" + (c[5] || 'Catatan') + ")";
          let tglStr = c[4] ? String(c[4]) : ''; if (tglStr.includes('T')) tglStr = tglStr.split('T')[0];
          actDesc.innerText = formatDateIndo(tglStr) + " • " + (c[7] || 'Admin');
       } else { actTitle.innerText = "Belum ada aktivitas tercatat."; actDesc.innerText = "-"; }
    }
  });
}

function renderPresensiSaya() {
  const container = document.getElementById('list-presensi-saya');
  if(presensiSaya.length === 0) { container.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4 fw-bold">Belum ada riwayat presensi.</td></tr>'; return; }
  container.innerHTML = presensiSaya.map(p => {
    if(!p || !p[5]) return ''; 
    let badgeColor = 'bg-secondary';
    if(p[5] === 'Hadir') badgeColor = 'bg-success'; else if(p[5] === 'Izin') badgeColor = 'bg-warning text-dark'; else if(p[5] === 'Sakit') badgeColor = 'bg-orange'; else if(p[5] === 'Alpha') badgeColor = 'bg-danger';
    return `<tr><td class="fw-bold text-dark">${formatDateIndo(p[1])}</td><td><span class="badge ${badgeColor} px-3 py-2 rounded-pill text-uppercase" style="letter-spacing: 1px;">${p[5]}</span></td></tr>`;
  }).join('');
}

function renderLaporanSiswa() {
  const container = document.getElementById('list-laporan-saya');
  if (!semuaDataLaporan || semuaDataLaporan.length === 0) { container.innerHTML = '<div class="text-center py-5 text-muted fw-bold">Belum ada riwayat laporan yang kamu kirim.</div>'; return; }
  let html = '';
  semuaDataLaporan.forEach(l => {
    if(!l || !l[6]) return; 
    let badgeColor = 'bg-danger'; if(l[6]==='Diproses') badgeColor='bg-warning text-dark'; if(l[6]==='Selesai') badgeColor='bg-success';
    html += `<div class="glass-card p-4 border-start border-4 border-${badgeColor.split(' ')[0].replace('bg-','')}"><div class="d-flex justify-content-between mb-3 align-items-center"><span class="badge ${badgeColor} px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">${l[6]}</span><small class="text-muted fw-bold">${formatDateIndo(l[0])}</small></div><h5 class="fw-bold text-dark mb-3"><i class="bi bi-tag-fill text-muted me-2"></i>${l[4]}</h5><div class="p-3 rounded-4" style="background: #f8fafc; border: 1px solid #f1f5f9;"><p class="mb-0 text-slate-600 fst-italic">"${l[5]}"</p></div>${l[7] ? `<div class="mt-3 p-3 rounded-4" style="background: #eff6ff; border: 1px dashed #bfdbfe;"><div class="fw-bold text-primary small mb-1">Tanggapan Guru BK:</div><div class="text-dark small">${l[7]}</div></div>` : ''}</div>`;
  });
  container.innerHTML = html;
}

function bukaModalLapor() { document.getElementById('formLaporSiswa').reset(); modalLapor.show(); }

function kirimLaporanSiswa() {
  const kat = document.getElementById('inpLaporKategori').value; 
  const isi = document.getElementById('inpLaporIsi').value;
  if (!isi) return alert("Silakan ceritakan detail laporannya!");
  
  const btn = document.querySelector('#modalLapor .btn-danger'); 
  btn.disabled = true; btn.innerText = 'Mengirim...';
  document.getElementById('loading-global').style.display = 'flex';
  
  callAPI('simpanLaporanSiswa', [{ nis: loginData.nis, nama: loginData.nama, kategori: kat, isi: isi }]).then(res => { 
    btn.disabled = false; btn.innerText = 'KIRIM LAPORAN'; 
    document.getElementById('loading-global').style.display = 'none';
    modalLapor.hide(); alert("Laporan berhasil terkirim ke Guru BK!"); 
    muatSemuaDataAwal(); 
  });
}

function renderKonselingSiswa() {
  const container = document.getElementById('list-konseling-siswa');
  if(!semuaDataKonseling) { 
    container.innerHTML = '<div class="col-12 text-center text-muted py-5 fw-bold">Belum ada slot jadwal.</div>'; 
    return; 
  }
  
  // Cek apakah siswa punya janji aktif
  const janjiAktif = semuaDataKonseling.find(k => k && k[4] === loginData.nis && (k[3] === 'Dipesan' || k[3] === 'Menunggu'));
  
  let html = '';
  
  semuaDataKonseling.forEach(k => {
    if (!k) return;
    const idJadwal = k[0];
    let tglStr = k[1];
    if (typeof tglStr === 'string' && tglStr.includes('T')) tglStr = tglStr.split('T')[0];
    const waktu = k[2];
    const status = k[3];
    const nisPemesan = k[4];

    // 1. KARTU KHUSUS: Jadwal yang sudah dipesan oleh siswa ini
    if ((status === 'Dipesan' || status === 'Ditunda') && nisPemesan === loginData.nis) {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="glass-card p-4 h-100 d-flex flex-column border-start border-4 border-primary" style="background: #eff6ff;">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="badge bg-primary px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">⭐ JADWAL ANDA</span>
            </div>
            <h5 class="fw-bold text-dark mb-1"><i class="bi bi-calendar-event text-primary me-2"></i>${formatDateIndo(tglStr)}</h5>
            <h6 class="text-primary fw-bold mb-4"><i class="bi bi-clock me-2"></i>${waktu}</h6>
            <button class="btn btn-outline-danger bg-white w-100 py-3 mt-auto rounded-pill fw-bold shadow-sm" onclick="batalKonselingSiswa('${idJadwal}')">
              <i class="bi bi-x-circle me-1"></i> BATALKAN JANJI
            </button>
          </div>
        </div>`;
    } 
    // 2. KARTU BIASA: Jadwal lain yang masih kosong
    else if (status === 'Tersedia') {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="glass-card p-4 h-100 d-flex flex-column border-start border-4 border-orange">
            <h5 class="fw-bold text-dark mb-1"><i class="bi bi-calendar-event text-orange me-2"></i>${formatDateIndo(tglStr)}</h5>
            <h6 class="text-orange fw-bold mb-4"><i class="bi bi-clock me-2"></i>${waktu}</h6>
            <button class="btn ${janjiAktif ? 'btn-secondary text-white' : 'btn-warning text-dark'} w-100 py-3 mt-auto rounded-pill fw-bold shadow-sm" ${janjiAktif ? 'disabled' : ''} onclick="bookingJadwal('${idJadwal}')">
              ${janjiAktif ? 'Anda Memiliki Janji Aktif' : 'PILIH JADWAL INI'}
            </button>
          </div>
        </div>`;
    }
  });
  
  container.innerHTML = html || '<div class="col-12 text-center text-muted py-5 fw-bold">Belum ada slot jadwal yang dibuka oleh Guru BK.</div>';
}
function bookingJadwal(id) {
  if(!confirm("Yakin ingin memesan jadwal ini? Anda hanya bisa memiliki maksimal 1 janji aktif.")) return;
  document.getElementById('loading-global').style.display = 'flex';
  callAPI('bookingJadwalSiswa', [id, loginData.nis, loginData.nama, loginData.kelas]).then(res => {
    document.getElementById('loading-global').style.display = 'none';
    if(res.status==='success') { alert("Berhasil mendaftar! Silakan datang tepat waktu."); muatSemuaDataAwal(); } else alert(res.message);
  });
}

function batalKonselingSiswa(idJadwal) {
  if(!confirm("Yakin ingin membatalkan jadwal konseling ini? Slot ini akan kembali terbuka untuk siswa lain.")) return;
  
  document.getElementById('loading-global').style.display = 'flex';
  
  // Menggunakan fungsi updateStatusKonseling milik Guru secara cerdas 
  // untuk mengubah statusnya kembali menjadi 'Tersedia'
  callAPI('updateStatusKonseling', [idJadwal, 'Tersedia']).then(res => {
    document.getElementById('loading-global').style.display = 'none';
    if(res.status === 'success') { 
      alert("Jadwal berhasil dibatalkan."); 
      muatSemuaDataAwal(); 
    } else {
      alert(res.message);
    }
  });
}

function renderTabelSiswa() { 
  const container = document.getElementById('tabel-siswa'); 
  if (!semuaDataSiswa || semuaDataSiswa.length === 0) { container.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">Tidak ada data siswa.</td></tr>'; return; } 
  const dt = kelasAktifSiswa === 'Semua Kelas' ? semuaDataSiswa : semuaDataSiswa.filter(s => s && s[2] === kelasAktifSiswa); 
  let html = ''; 
  dt.forEach(row => { 
    if(!row || !row[0] || row.join('').trim() === '') return; 
    html += `<tr><td class="text-dark fw-bold">${row[0]}</td><td><span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1 me-2 rounded-pill">${row[2]}</span><span class="text-muted small">${row[1]}</span></td><td class="text-muted">${row[3] || '-'}</td><td><code class="bg-light px-2 py-1 rounded text-dark">${row[4] || '123456'}</code></td><td class="text-end"><button class="btn btn-sm btn-light text-primary me-1" onclick="bukaModalEdit('${row[0]}', '${row[1]}', '${row[2]}', '${row[3]}', '${row[4] || '123456'}')"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-light text-danger" onclick="konfirmasiHapus('${row[1]}')"><i class="bi bi-trash"></i></button></td></tr>`; 
  }); 
  container.innerHTML = html || '<tr><td colspan="5" class="text-center py-5 text-muted">Tidak ada data siswa di kelas ini.</td></tr>'; 
}

function renderFilterKelasSiswa() { 
  let html = `<button class="btn ${kelasAktifSiswa === 'Semua Kelas' ? 'btn-primary' : 'btn-outline-secondary bg-white text-dark border-0 shadow-sm'} rounded-pill px-4 fw-bold flex-shrink-0" onclick="setFilterSiswa('Semua Kelas')">Semua Kelas</button>`; 
  semuaDataKelas.forEach(kelas => { html += `<button class="btn ${kelasAktifSiswa === kelas ? 'btn-primary' : 'btn-outline-secondary bg-white text-dark border-0 shadow-sm'} rounded-pill px-4 fw-bold flex-shrink-0" onclick="setFilterSiswa('${kelas}')">${kelas}</button>`; }); 
  document.getElementById('filter-kelas-container').innerHTML = html; 
}
function setFilterSiswa(k) { kelasAktifSiswa = k; renderFilterKelasSiswa(); renderTabelSiswa(); }

function renderListCatatanGuru() { 
  const container = document.getElementById('list-catatan'); 
  if(!semuaDataCatatan || semuaDataCatatan.length === 0) { container.innerHTML = '<div class="text-center py-5 text-muted fw-bold">Belum ada catatan harian.</div>'; return; } 
  let html = ''; 
  semuaDataCatatan.forEach(c => { 
    if(!c || c.join('').trim() === '') return; 
    let tglStr = c[4] ? String(c[4]) : ''; if (tglStr.includes('T')) tglStr = tglStr.split('T')[0]; 
    let kategori = c[5] || '-'; let nama = c[2] || 'Siswa Anonim'; let kelas = c[3] || '-'; let isi = c[6] || ''; let guru = c[7] || 'Sistem'; 
    html += `<div class="glass-card p-4 mb-3"><div class="d-flex justify-content-between align-items-start mb-3"><div class="d-flex align-items-center gap-2"><span class="badge fw-bold" style="background: #f3e8ff; color: #a855f7; padding: 6px 12px; letter-spacing: 1px; text-transform: uppercase; font-size: 10px;">${kategori}</span><span class="text-muted small fw-bold">${formatDateIndo(tglStr)}</span></div><div class="text-end"><div style="font-size: 10px; font-weight: 800; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase;">Ditulis Oleh</div><div class="fw-bold text-dark" style="font-size: 13px;">${guru}</div></div></div><h4 class="fw-bold text-dark mb-3">${nama} <span class="text-muted" style="font-size: 14px; font-weight: normal;">(${kelas})</span></h4><div class="p-3 rounded-4" style="background: #f8fafc; border: 1px solid #f1f5f9;"><p class="mb-0 text-slate-600 fst-italic" style="font-size: 14px; line-height: 1.6;">"${isi}"</p></div></div>`; 
  }); 
  container.innerHTML = html || '<div class="text-center py-5 text-muted fw-bold">Belum ada catatan valid.</div>'; 
}

function renderDropdownSiswaUntukCatatan() { 
  if(!semuaDataSiswa || semuaDataSiswa.length === 0) return; 
  const siswaUrut = [...semuaDataSiswa].filter(s => s && s[0]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))); 
  let html = ''; siswaUrut.forEach(s => { html += `<option value="${s[0]}">Kelas ${s[2]||'-'}</option>`; }); 
  document.getElementById('listNamaSiswa').innerHTML = html; 
}

function bukaModalCatatan() { 
  let form = document.getElementById('formInputCatatan');
  if (form) { form.reset(); } else {
    document.getElementById('inpCatatanSiswa').value = '';
    document.getElementById('inpCatatanKategori').value = '';
    document.getElementById('inpCatatanDetail').value = '';
  }
  document.getElementById('inpCatatanTanggal').valueAsDate = new Date(); 
  modalCatatan.show(); 
}

function simpanDataCatatan() { 
  const namaInput = document.getElementById('inpCatatanSiswa').value.trim(); 
  const tanggal = document.getElementById('inpCatatanTanggal').value; 
  const kategori = document.getElementById('inpCatatanKategori').value; 
  const detail = document.getElementById('inpCatatanDetail').value; 
  if(!namaInput || !tanggal || !detail || !kategori) return alert("Lengkapi form catatan!"); 
  const siswaDitemukan = semuaDataSiswa.find(s => s && s[0] && String(s[0]).toLowerCase() === namaInput.toLowerCase()); 
  const data = { nis: siswaDitemukan ? siswaDitemukan[1] : '-', nama: namaInput, kelas: siswaDitemukan ? siswaDitemukan[2] : '-', tanggal: tanggal, kategori: kategori, detail: detail, guru: loginData.nama || "Administrator" }; 
  document.getElementById('loading-global').style.display = 'flex';
  callAPI('tambahCatatan', [data]).then(res => { 
    document.getElementById('loading-global').style.display = 'none'; 
    if(res.status === 'success') { modalCatatan.hide(); muatSemuaDataAwal(); } else alert(res.message); 
  }); 
}

function updateDashboardBadgeLaporan() { 
  if(!semuaDataLaporan) return;
  const laporanBaru = semuaDataLaporan.filter(l => l && l[6] === 'Menunggu').length; 
  const statLap = document.getElementById('stat-laporan'); if(statLap) statLap.innerText = laporanBaru; 
  const badgeNav = document.getElementById('badge-laporan-baru'); 
  if(badgeNav) { if(laporanBaru > 0) { badgeNav.style.display = 'inline-block'; badgeNav.innerText = laporanBaru; } else { badgeNav.style.display = 'none'; } } 
}

function setFilterLaporan(status) { filterStatusLaporan = status; const buttons = document.getElementById('filter-status-laporan').children; for(let btn of buttons) { if(btn.innerText.includes(status) || (status === 'Semua' && btn.innerText === 'Semua Laporan')) { btn.className = "btn btn-primary rounded-pill px-4 fw-bold flex-shrink-0"; } else { btn.className = "btn btn-outline-secondary bg-white text-dark border-0 shadow-sm rounded-pill px-4 fw-bold flex-shrink-0"; } } renderListLaporanGuru(); }

function renderListLaporanGuru() { 
  const container = document.getElementById('list-laporan-guru'); 
  if(!semuaDataLaporan || semuaDataLaporan.length === 0) { container.innerHTML = '<div class="text-center py-5 text-muted fw-bold">Tidak ada laporan.</div>'; return; }
  const dt = filterStatusLaporan === 'Semua' ? semuaDataLaporan : semuaDataLaporan.filter(l => l && l[6] === filterStatusLaporan); 
  if(!dt || dt.length === 0) { container.innerHTML = '<div class="text-center py-5 text-muted fw-bold">Tidak ada laporan di status ini.</div>'; return; } 
  let html = ''; 
  dt.forEach(l => { 
    if(!l || l.join('').trim() === '') return; 
    let tglStr = l[0] ? String(l[0]) : ''; if (tglStr.includes('T')) tglStr = tglStr.split('T')[0]; 
    let badgeColor = 'bg-secondary'; let statusIcon = ''; if(l[6] === 'Menunggu') { badgeColor = 'bg-danger'; statusIcon = '🔴'; } if(l[6] === 'Diproses') { badgeColor = 'bg-warning text-dark'; statusIcon = '🟡'; } if(l[6] === 'Selesai') { badgeColor = 'bg-success'; statusIcon = '🟢'; } 
    html += `<div class="glass-card p-4 mb-3 border-start border-4 border-${badgeColor.split(' ')[0].replace('bg-','')}"><div class="d-flex justify-content-between align-items-start mb-3"><div class="d-flex align-items-center gap-2"><span class="badge ${badgeColor} px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">${statusIcon} ${l[6]}</span><span class="text-muted small fw-bold">${formatDateIndo(tglStr)}</span></div><button class="btn btn-sm btn-dark fw-bold rounded-pill px-3" onclick="bukaModalTindakLanjut('${l[1]}', '${(l[5]||'').replace(/'/g, "\\'")}', '${l[6]}', '${(l[7]||'').replace(/'/g, "\\'")}')">Tindak Lanjut</button></div><h5 class="fw-bold text-dark mb-1">${l[3]} <span class="text-muted small fw-normal">(NIS: ${l[2]})</span></h5><p class="text-muted small fw-bold mb-3"><i class="bi bi-tag-fill me-1"></i> ${l[4]}</p><div class="p-3 rounded-4" style="background: #f8fafc; border: 1px solid #f1f5f9;"><p class="mb-0 text-slate-600 fst-italic" style="font-size: 14px; line-height: 1.6;">"${l[5]}"</p></div>${l[7] ? `<div class="mt-3 p-3 rounded-4" style="background: #eff6ff; border: 1px dashed #bfdbfe;"><div class="fw-bold text-primary small mb-1">Tanggapan Guru:</div><div class="text-dark small">${l[7]}</div></div>` : ''}</div>`; 
  }); 
  container.innerHTML = html; 
}

function simulasiLaporanBaru() { document.getElementById('loading-global').style.display = 'flex'; callAPI('tambahLaporanSimulasi', []).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { muatSemuaDataAwal(); } else { alert(res.message); } }); }
function bukaModalTindakLanjut(id, isi, status, tanggapan) { document.getElementById('inpHiddenIdLaporan').value = id; document.getElementById('txtLaporanIsi').innerText = `"${isi}"`; document.getElementById('inpLaporanStatus').value = status; document.getElementById('inpLaporanTanggapan').value = tanggapan || ''; modalTindakLanjut.show(); }
function simpanStatusLaporan() { document.getElementById('loading-global').style.display = 'flex'; const id = document.getElementById('inpHiddenIdLaporan').value; const status = document.getElementById('inpLaporanStatus').value; const tanggapan = document.getElementById('inpLaporanTanggapan').value; callAPI('updateStatusLaporan', [id, status, tanggapan]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { modalTindakLanjut.hide(); muatSemuaDataAwal(); } else alert(res.message); }); }

function renderFilterKelasPresensi() { let html = ''; semuaDataKelas.forEach(kelas => { html += `<button class="btn ${kelasAktifPresensi === kelas ? 'btn-primary' : 'btn-outline-secondary bg-white text-dark border-0 shadow-sm'} rounded-pill px-4 fw-bold flex-shrink-0" onclick="setFilterPresensi('${kelas}')">${kelas}</button>`; }); document.getElementById('filter-kelas-presensi').innerHTML = html; renderTabelPresensiGuru(); }
function setFilterPresensi(kelas) { kelasAktifPresensi = kelas; renderFilterKelasPresensi(); }
function muatPresensi() { const tgl = document.getElementById('inpTanggalPresensi').value; if(!tgl) return; document.getElementById('label-tanggal-presensi').innerText = formatDateIndo(tgl); document.getElementById('list-presensi').innerHTML = '<div class="text-center py-5 text-muted fw-bold">Mengambil data...</div>'; callAPI('getPresensiTanggal', [tgl]).then(function(data) { presensiHariIni = {}; if(data && !data.error) { data.forEach(row => { if(row && row[2]) presensiHariIni[row[2]] = row[5]; }); } renderTabelPresensiGuru(); }); }
function renderTabelPresensiGuru() { const container = document.getElementById('list-presensi'); if(!semuaDataSiswa) return; const dt = semuaDataSiswa.filter(s => s && s[2] === kelasAktifPresensi); if (!dt || dt.length === 0) { container.innerHTML = '<div class="text-center py-5 text-muted fw-bold">Tidak ada siswa di kelas ini.</div>'; return; } let html = ''; dt.forEach(siswa => { const nis = siswa[1], nama = siswa[0], kelas = siswa[2], status = presensiHariIni[nis] || ''; html += `<div class="d-flex justify-content-between align-items-center py-3 border-bottom border-light"><div><h5 class="fw-bold text-dark mb-0 fs-6">${nama}</h5><small class="text-muted fw-bold" style="font-size: 11px;">${kelas}</small></div><div class="d-flex gap-2"><button class="btn-status btn-hadir ${status === 'Hadir' ? 'active' : ''}" onclick="tandaiPresensi('${nis}', '${nama}', '${kelas}', 'Hadir')">Hadir</button><button class="btn-status btn-izin ${status === 'Izin' ? 'active' : ''}" onclick="tandaiPresensi('${nis}', '${nama}', '${kelas}', 'Izin')">Izin</button><button class="btn-status btn-sakit ${status === 'Sakit' ? 'active' : ''}" onclick="tandaiPresensi('${nis}', '${nama}', '${kelas}', 'Sakit')">Sakit</button><button class="btn-status btn-alpha ${status === 'Alpha' ? 'active' : ''}" onclick="tandaiPresensi('${nis}', '${nama}', '${kelas}', 'Alpha')">Alpha</button></div></div>`; }); container.innerHTML = html; }
function tandaiPresensi(nis, nama, kelas, status) { const tgl = document.getElementById('inpTanggalPresensi').value; if(!tgl) return alert("Pilih tanggal terlebih dahulu!"); presensiHariIni[nis] = status; renderTabelPresensiGuru(); document.getElementById('loading-global').style.display = 'flex'; callAPI('simpanPresensi', [{ tanggal: tgl, nis: nis, nama: nama, kelas: kelas, status: status }]).then(() => { document.getElementById('loading-global').style.display = 'none'; }); }
function tandaiHadirSemuaKelas() { const tgl = document.getElementById('inpTanggalPresensi').value; if(!tgl) return alert("Pilih tanggal terlebih dahulu!"); const dt = semuaDataSiswa.filter(s => s && s[2] === kelasAktifPresensi); if (!dt || dt.length === 0) return; let dataToSave = []; dt.forEach(siswa => { const nis = siswa[1], nama = siswa[0], kelas = siswa[2]; presensiHariIni[nis] = 'Hadir'; dataToSave.push({ tanggal: tgl, nis: nis, nama: nama, kelas: kelas, status: 'Hadir' }); }); renderTabelPresensiGuru(); if (dataToSave.length > 0) { document.getElementById('loading-global').style.display = 'flex'; callAPI('simpanPresensiMasal', [dataToSave]).then(() => { document.getElementById('loading-global').style.display = 'none'; }); } }

function exportMatriksBulanan() { const tglStr = document.getElementById('inpTanggalPresensi').value; if(!tglStr) return; const parts = tglStr.split('-'); const tahun = parts[0], bulan = parts[1]; if(!confirm(`Unduh Matriks Presensi untuk Bulan ${bulan} Tahun ${tahun}?`)) return; callAPI('getRekapBulananData', [bulan, tahun]).then(function(dataPresensiBulan) { let csvContent = "data:text/csv;charset=utf-8,Nama Siswa,NIS,Kelas,"; for(let i=1; i<=31; i++) csvContent += i + ","; csvContent += "H,I,S,A\n"; let mapPresensi = {}; if(dataPresensiBulan && !dataPresensiBulan.error) { dataPresensiBulan.forEach(row => { if(!row || !row[2]) return; const nis = row[2], tglHari = String(row[1]).split('-')[2], inisialStatus = String(row[5]).charAt(0).toUpperCase(); if(!mapPresensi[nis]) mapPresensi[nis] = {}; mapPresensi[nis][tglHari] = inisialStatus; }); } const siswaUrut = [...semuaDataSiswa].filter(s => s && s[0]).sort((a,b) => { if(a[2] === b[2]) return String(a[0]).localeCompare(String(b[0])); return String(a[2]).localeCompare(String(b[2])); }); siswaUrut.forEach(siswa => { const nama = siswa[0], nis = siswa[1], kelas = siswa[2]; let rowCsv = `${nama},${nis},${kelas},`; let totalH = 0, totalI = 0, totalS = 0, totalA = 0; for(let d=1; d<=31; d++) { let dayStr = d < 10 ? '0'+d : ''+d; let statusHariIni = ''; if(mapPresensi[nis] && mapPresensi[nis][dayStr]) { statusHariIni = mapPresensi[nis][dayStr]; if(statusHariIni === 'H') totalH++; if(statusHariIni === 'I') totalI++; if(statusHariIni === 'S') totalS++; if(statusHariIni === 'A') totalA++; } rowCsv += statusHariIni + ","; } rowCsv += `${totalH},${totalI},${totalS},${totalA}\n`; csvContent += rowCsv; }); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Rekap_Presensi_Bulan_${bulan}_${tahun}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); }); }

function setFilterKonseling(status) { filterStatusKonseling = status; const buttons = document.getElementById('filter-status-konseling').children; for(let btn of buttons) { if(btn.innerText.includes(status) || (status === 'Semua' && btn.innerText === 'Semua Jadwal')) { btn.className = "btn btn-primary rounded-pill px-4 fw-bold flex-shrink-0"; } else { btn.className = "btn btn-outline-secondary bg-white text-dark border-0 shadow-sm rounded-pill px-4 fw-bold flex-shrink-0"; } } renderListKonselingGuru(); }
function renderListKonselingGuru() { const container = document.getElementById('list-konseling-guru'); if(!semuaDataKonseling) return; const dt = filterStatusKonseling === 'Semua' ? semuaDataKonseling : semuaDataKonseling.filter(k => k && k[3] === filterStatusKonseling); if(!dt || dt.length === 0) { container.innerHTML = '<div class="text-center py-5 text-muted fw-bold col-12">Tidak ada jadwal konseling.</div>'; return; } let html = ''; dt.forEach(k => { if(!k || k.join('').trim() === '') return; const idJadwal = k[0]; let tglStr = k[1]; if (typeof tglStr === 'string' && tglStr.includes('T')) tglStr = tglStr.split('T')[0]; const waktu = k[2]; const status = k[3]; const nis = k[4] || ''; const namaSiswa = k[5] || ''; const kelasSiswa = k[6] || ''; if(status === 'Tersedia') { html += `<div class="col-md-6 col-lg-4"><div class="glass-card p-4 h-100 d-flex flex-column border-start border-4 border-success"><div class="d-flex justify-content-between align-items-center mb-3"><span class="badge bg-success px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">🟢 TERSEDIA</span><div class="dropdown"><button class="btn btn-sm btn-light text-muted" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button><ul class="dropdown-menu shadow border-0"><li><a class="dropdown-item text-danger fw-bold" href="#" onclick="hapusKonseling('${idJadwal}')"><i class="bi bi-trash me-2"></i>Hapus Slot</a></li></ul></div></div><h5 class="fw-bold text-dark mb-1"><i class="bi bi-calendar-event text-primary me-2"></i>${formatDateIndo(tglStr)}</h5><h6 class="text-primary fw-bold mb-4"><i class="bi bi-clock me-2"></i>${waktu}</h6><div class="mt-auto p-3 rounded-4 text-center border border-dashed border-success bg-success bg-opacity-10"><span class="text-success small fw-bold">Belum ada siswa mendaftar</span></div></div></div>`; } else if (status === 'Dipesan') { html += `<div class="col-md-6 col-lg-4"><div class="glass-card p-4 h-100 d-flex flex-column border-start border-4 border-primary" style="background: linear-gradient(to bottom right, #ffffff, #eff6ff);"><div class="d-flex justify-content-between align-items-center mb-3"><span class="badge bg-primary px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">🔵 DIPESAN</span><div class="dropdown"><button class="btn btn-sm btn-light text-muted" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button><ul class="dropdown-menu shadow border-0"><li><a class="dropdown-item text-success fw-bold" href="#" onclick="ubahStatusKonseling('${idJadwal}', 'Selesai')"><i class="bi bi-check-circle me-2"></i>Tandai Selesai</a></li><li><a class="dropdown-item text-warning fw-bold" href="#" onclick="ubahStatusKonseling('${idJadwal}', 'Ditunda')"><i class="bi bi-clock-history me-2"></i>Tunda / Batal</a></li><li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-danger fw-bold" href="#" onclick="hapusKonseling('${idJadwal}')"><i class="bi bi-trash me-2"></i>Hapus Jadwal</a></li></ul></div></div><h5 class="fw-bold text-dark mb-1"><i class="bi bi-calendar-event text-primary me-2"></i>${formatDateIndo(tglStr)}</h5><h6 class="text-primary fw-bold mb-4"><i class="bi bi-clock me-2"></i>${waktu}</h6><div class="mt-auto p-3 rounded-4 bg-white border shadow-sm"><div class="text-muted" style="font-size: 10px; font-weight: 800; letter-spacing: 1px;">DI-BOOKING OLEH:</div><div class="fw-bold text-dark mt-1" style="font-size: 15px;">${namaSiswa}</div><div class="text-muted small fw-bold mt-1">Kelas ${kelasSiswa} • NIS: ${nis}</div></div></div></div>`; } else if (status === 'Selesai') { html += `<div class="col-md-6 col-lg-4"><div class="glass-card p-4 h-100 d-flex flex-column border-start border-4 border-secondary opacity-75" style="background: #f8fafc;"><div class="d-flex justify-content-between align-items-center mb-3"><span class="badge bg-secondary px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">⚪ SELESAI</span><div class="dropdown"><button class="btn btn-sm btn-light text-muted" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button><ul class="dropdown-menu shadow border-0"><li><a class="dropdown-item text-danger fw-bold" href="#" onclick="hapusKonseling('${idJadwal}')"><i class="bi bi-trash me-2"></i>Hapus Riwayat</a></li></ul></div></div><h5 class="fw-bold text-muted mb-1"><i class="bi bi-calendar-event me-2"></i>${formatDateIndo(tglStr)}</h5><h6 class="text-muted fw-bold mb-4"><i class="bi bi-clock me-2"></i>${waktu}</h6><div class="mt-auto p-3 rounded-4 bg-light border"><div class="text-muted" style="font-size: 10px; font-weight: 800; letter-spacing: 1px;">DIHADIRI OLEH:</div><div class="fw-bold text-muted mt-1" style="font-size: 15px;">${namaSiswa}</div></div></div></div>`; } else if (status === 'Ditunda') { html += `<div class="col-md-6 col-lg-4"><div class="glass-card p-4 h-100 d-flex flex-column border-start border-4 border-warning" style="background: #fffbeb;"><div class="d-flex justify-content-between align-items-center mb-3"><span class="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold text-uppercase" style="letter-spacing: 0.5px;">🟠 DITUNDA</span><div class="dropdown"><button class="btn btn-sm btn-light text-muted" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button><ul class="dropdown-menu shadow border-0"><li><a class="dropdown-item text-danger fw-bold" href="#" onclick="hapusKonseling('${idJadwal}')"><i class="bi bi-trash me-2"></i>Hapus Riwayat</a></li></ul></div></div><h5 class="fw-bold text-dark mb-1"><i class="bi bi-calendar-event text-warning me-2"></i>${formatDateIndo(tglStr)}</h5><h6 class="text-warning text-dark fw-bold mb-4"><i class="bi bi-clock me-2"></i>${waktu}</h6><div class="mt-auto p-3 rounded-4 bg-white border border-warning shadow-sm"><div class="text-muted" style="font-size: 10px; font-weight: 800; letter-spacing: 1px;">SISWA BERHALANGAN:</div><div class="fw-bold text-dark mt-1" style="font-size: 15px;">${namaSiswa}</div></div></div></div>`; } }); container.innerHTML = html; }
function ubahStatusKonseling(idJadwal, statusBaru) { if(!confirm(`Ubah status jadwal ini menjadi ${statusBaru}?`)) return; document.getElementById('loading-global').style.display = 'flex'; callAPI('updateStatusKonseling', [idJadwal, statusBaru]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { muatSemuaDataAwal(); } else alert(res.message); }); }
function bukaModalKonseling() { document.getElementById('formInputKonseling').reset(); document.getElementById('inpKonselingTanggal').valueAsDate = new Date(); modalKonseling.show(); }
function simpanDataKonseling() { const tanggal = document.getElementById('inpKonselingTanggal').value; const waktu = document.getElementById('inpKonselingWaktu').value.trim(); if(!tanggal || !waktu) return alert("Tanggal dan Waktu wajib diisi!"); document.getElementById('loading-global').style.display = 'flex'; callAPI('tambahJadwalKonseling', [{ tanggal: tanggal, waktu: waktu }]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { modalKonseling.hide(); muatSemuaDataAwal(); } else alert(res.message); }); }
function hapusKonseling(idJadwal) { if(!confirm('Yakin ingin menghapus jadwal ini?')) return; document.getElementById('loading-global').style.display = 'flex'; callAPI('hapusJadwalKonseling', [idJadwal]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { muatSemuaDataAwal(); } else alert(res.message); }); }

function renderDropdownKelas() { document.getElementById('inpKelas').innerHTML = semuaDataKelas.map(k => `<option value="${k}">${k}</option>`).join('') || '<option value="">(Buat Kelas Dulu)</option>'; }
function renderListKelasModal() { document.getElementById('list-kelas-modal').innerHTML = semuaDataKelas.length === 0 ? '<div class="text-center text-muted small py-4">Belum ada kelas.</div>' : semuaDataKelas.map(k => `<div class="d-flex justify-content-between align-items-center p-3 mb-1 bg-white" style="border: 1px solid #e2e8f0; border-radius: 12px;"><span class="fw-bold text-dark" style="font-size: 15px;">${k}</span><i class="bi bi-trash text-danger" style="cursor:pointer;" onclick="hapusKelasList('${k}')"></i></div>`).join(''); }
function bukaModalKelolaKelas() { document.getElementById('inpKelasBaru').value = ''; renderListKelasModal(); modalKelolaKelas.show(); }
function tambahKelasBaru() { const namaKelas = document.getElementById('inpKelasBaru').value.trim().toUpperCase(); if(!namaKelas || semuaDataKelas.includes(namaKelas)) return; document.getElementById('loading-global').style.display = 'flex'; callAPI('tambahKelas', [namaKelas]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { muatSemuaDataAwal(); } }); }
function hapusKelasList(namaKelas) { if(confirm(`Yakin hapus kelas ${namaKelas}?`)) { document.getElementById('loading-global').style.display = 'flex'; callAPI('hapusKelas', [namaKelas]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') { muatSemuaDataAwal(); } }); } }
function bukaModalTambah() { if(semuaDataKelas.length === 0) return alert('Buat Kelas dulu!'); modeForm = 'tambah'; document.getElementById('formInputSiswa').reset(); document.getElementById('inpPassword').value = '123456'; modalSiswa.show(); }
function bukaModalEdit(nama, nis, kelas, gender, password) { modeForm = 'edit'; nisYangDiedit = nis; document.getElementById('inpNama').value = nama; document.getElementById('inpNIS').value = nis; let d = document.getElementById('inpKelas'); if(!semuaDataKelas.includes(kelas)) d.innerHTML += `<option value="${kelas}" selected>${kelas} (Dihapus)</option>`; d.value = kelas; document.getElementById('inpGender').value = gender; document.getElementById('inpPassword').value = password; modalSiswa.show(); }
function simpanDataSiswa() { const data = { nama: document.getElementById('inpNama').value, nis: document.getElementById('inpNIS').value, kelas: document.getElementById('inpKelas').value, gender: document.getElementById('inpGender').value, password: document.getElementById('inpPassword').value }; if(!data.nama || !data.nis || !data.password) return alert("Lengkapi data!"); document.getElementById('loading-global').style.display = 'flex'; if (modeForm === 'tambah') { callAPI('tambahSiswaBaru', [data]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status==='success'){ modalSiswa.hide(); muatSemuaDataAwal(); } }); } else { callAPI('updateSiswa', [nisYangDiedit, data]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status==='success'){ modalSiswa.hide(); muatSemuaDataAwal(); } }); } }
function konfirmasiHapus(nis) { if(confirm('Hapus siswa ini?')) { document.getElementById('loading-global').style.display = 'flex'; callAPI('hapusSiswa', [nis]).then(res => { document.getElementById('loading-global').style.display = 'none'; if(res.status === 'success') muatSemuaDataAwal(); }); } }

function toggleChat() { const chat = document.getElementById('chatWindow'); chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; }
function handleChatEnter(e) { if (e.key === 'Enter') kirimPesanAI(); }
function kirimPesanAI() { const input = document.getElementById('chatInput'); const pesan = input.value.trim(); if (!pesan) return; const chatBody = document.getElementById('chatBody'); chatBody.innerHTML += `<div class="msg-user">${pesan}</div>`; input.value = ''; const loadingId = 'loading-' + Date.now(); chatBody.innerHTML += `<div id="${loadingId}" class="msg-bot text-muted fst-italic">AI mengetik...</div>`; chatBody.scrollTop = chatBody.scrollHeight; callAPI('chatSankalaAI', [pesan, loginData.nama]).then(function(balasan) { document.getElementById(loadingId).remove(); chatBody.innerHTML += `<div class="msg-bot">${balasan}</div>`; chatBody.scrollTop = chatBody.scrollHeight; }); }
