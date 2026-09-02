// GANTI dengan URL Cloudflare Worker lo setelah di-deploy (lihat cloudflare-worker/README.md)
const WORKER_URL = "https://GANTI-nama-worker.GANTI-username.workers.dev";

// === LOGIN ===
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Cek apakah user ini terdaftar sebagai admin (bukan tenant biasa)
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists) {
      document.getElementById('loginError').textContent = 'Akun ini bukan admin.';
      await auth.signOut();
      return;
    }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    loadDashboard();
    loadTenants();

    const savedToken = localStorage.getItem('crm_admin_token');
    if (savedToken) document.getElementById('adminToken').value = savedToken;
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  }
});

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  document.getElementById('loginError').textContent = '';

  auth.signInWithEmailAndPassword(email, password)
    .catch(() => {
      document.getElementById('loginError').textContent = 'Email/password salah.';
    });
}

// === NAVIGASI ===
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + item.dataset.page).style.display = 'block';
  });
});

// === DASHBOARD ===
async function loadDashboard() {
  const tenantsSnap = await db.collection('tenants').get();
  let totalActive = 0, quotaLow = 0;
  tenantsSnap.forEach(doc => {
    const t = doc.data();
    if (t.status === 'active') totalActive++;
    if (t.quotaUsed >= t.quotaLimit) quotaLow++;
  });
  document.getElementById('statTotalTenant').textContent = totalActive;
  document.getElementById('statQuotaLow').textContent = quotaLow;

  const leadsSnap = await db.collection('leads').get();
  document.getElementById('statTotalLeads').textContent = leadsSnap.size;
}

// === TENANTS ===
function loadTenants() {
  db.collection('tenants').orderBy('createdAt', 'desc').onSnapshot(snap => {
    const rows = snap.docs.map(doc => {
      const t = doc.data();
      const pct = t.quotaLimit ? Math.round((t.quotaUsed / t.quotaLimit) * 100) : 0;
      const statusClass = t.status === 'active' ? 'active' : (t.status === 'trial' ? 'trial' : 'habis');
      return `
        <tr>
          <td>${escapeHtml(t.businessName)}</td>
          <td>${t.plan}</td>
          <td>${t.quotaUsed || 0} / ${t.quotaLimit} (${pct}%)</td>
          <td><span class="status-pill ${statusClass}">${t.status}</span></td>
        </tr>`;
    }).join('');
    document.getElementById('tenantTableBody').innerHTML = rows || '<tr><td colspan="4">Belum ada klien.</td></tr>';
  });
}

function openAddTenant() { document.getElementById('tenantModal').classList.add('open'); }
function closeAddTenant() { document.getElementById('tenantModal').classList.remove('open'); }

async function saveTenant() {
  const businessName = document.getElementById('newTenantName').value.trim();
  const ownerName = document.getElementById('newTenantOwner').value.trim();
  const email = document.getElementById('newTenantEmail').value.trim();
  const password = document.getElementById('newTenantPassword').value;
  const plan = document.getElementById('newTenantPlan').value;

  if (!businessName || !email || !password) {
    alert('Nama toko, email, dan password wajib diisi.');
    return;
  }

  const quotaByPlan = { trial: 50, basic: 500, pro: 2000 };

  // Bikin tenant doc dulu
  const tenantRef = await db.collection('tenants').add({
    businessName, ownerName, plan,
    quotaLimit: quotaByPlan[plan],
    quotaUsed: 0,
    status: plan === 'trial' ? 'trial' : 'active',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  // Bikin akun login buat pemilik toko, pakai instance Firebase kedua
  // supaya sesi login admin yang lagi jalan gak ke-logout
  const secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary');
  try {
    const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      tenantId: tenantRef.id,
      email,
      role: 'tenant_owner',
    });
    await secondaryApp.auth().signOut();
  } catch (err) {
    alert('Gagal bikin akun login: ' + err.message);
  } finally {
    await secondaryApp.delete();
  }

  closeAddTenant();
  document.getElementById('newTenantName').value = '';
  document.getElementById('newTenantOwner').value = '';
  document.getElementById('newTenantEmail').value = '';
  document.getElementById('newTenantPassword').value = '';
}

// === WA SETTINGS (token disimpen di localStorage HP ini aja) ===
function saveAdminToken() {
  const token = document.getElementById('adminToken').value.trim();
  localStorage.setItem('crm_admin_token', token);
  alert('Token disimpan di perangkat ini.');
}

// === KIRIM PESAN via Cloudflare Worker ===
async function sendTestMessage() {
  const phone = document.getElementById('broadcastPhone').value.trim();
  const message = document.getElementById('broadcastMessage').value.trim();
  const token = localStorage.getItem('crm_admin_token') || '';
  const resultEl = document.getElementById('broadcastResult');

  if (!phone || !message) {
    resultEl.textContent = 'Nomor dan pesan wajib diisi.';
    resultEl.style.color = 'var(--rust)';
    return;
  }
  if (!token) {
    resultEl.textContent = 'Isi & simpan Token Admin dulu di halaman Setting API WA.';
    resultEl.style.color = 'var(--rust)';
    return;
  }

  resultEl.textContent = 'Mengirim...';
  resultEl.style.color = 'var(--text-soft)';

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify({ phone, message }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      resultEl.textContent = 'Pesan berhasil dikirim.';
      resultEl.style.color = 'var(--sage)';
    } else {
      resultEl.textContent = 'Gagal: ' + (data.error || 'Cek Worker/API key.');
      resultEl.style.color = 'var(--rust)';
    }
  } catch (err) {
    resultEl.textContent = 'Gagal konek ke Worker: ' + err.message;
    resultEl.style.color = 'var(--rust)';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
