// === LOGIN ===
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById('loginScreen').classList.remove('open');
    document.getElementById('mainApp').style.display = 'block';
    initTenant(user.uid);
  } else {
    document.getElementById('loginScreen').classList.add('open');
    document.getElementById('mainApp').style.display = 'none';
  }
});

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  document.getElementById('loginError').textContent = '';

  auth.signInWithEmailAndPassword(email, password)
    .catch((err) => {
      document.getElementById('loginError').textContent = 'Email/password salah, coba lagi.';
    });
}

// === STATE ===
let tenantId = null;
let leadsCache = [];
let activeFilter = 'semua';
let editingId = null;
let selectedStatus = 'baru';
const statusLabel = { baru: 'Baru', proses: 'Diproses', deal: 'Deal', lewat: 'Terlambat', batal: 'Batal' };

// === INIT: ambil data tenant, lalu subscribe realtime ke leads-nya ===
async function initTenant(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    alert('Akun ini belum terdaftar sebagai tenant. Hubungi admin.');
    auth.signOut();
    return;
  }
  const userData = userDoc.data();
  tenantId = userData.tenantId;

  const tenantDoc = await db.collection('tenants').doc(tenantId).get();
  const tenantData = tenantDoc.data();
  document.getElementById('brandName').textContent = tenantData.businessName || 'Toko Anda';
  document.getElementById('avatarInitial').textContent = (tenantData.businessName || 'TA').substring(0, 2).toUpperCase();

  // Realtime listener — otomatis update kalau ada perubahan data
  db.collection('leads')
    .where('tenantId', '==', tenantId)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      leadsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      render();
    }, (err) => {
      console.error('Gagal memuat leads:', err);
      document.getElementById('emptyState').textContent = 'Gagal memuat data. Cek koneksi.';
    });
}

// === RENDER LIST ===
function daysSince(timestamp) {
  if (!timestamp) return 0;
  const last = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}

function render() {
  const list = document.getElementById('list');
  const filtered = leadsCache.filter(l => activeFilter === 'semua' || l.status === activeFilter);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">Belum ada leads di kategori ini.</div>';
  } else {
    list.innerHTML = filtered.map(l => {
      const days = daysSince(l.lastContactedAt);
      const overdueClass = days >= 2 ? 'overdue' : '';
      const daysText = days === 0 ? 'Hari ini' : days + ' hari lalu';
      return `
        <div class="lead status-${l.status}" onclick="openSheet('${l.id}')">
          <div class="lead-top">
            <div>
              <div class="lead-name">${escapeHtml(l.name)}</div>
              <div class="lead-phone">${escapeHtml(l.phone)}</div>
            </div>
            <span class="tag status-${l.status}">${statusLabel[l.status]}</span>
          </div>
          <div class="lead-msg">${escapeHtml(l.lastMessage || '')}</div>
          <div class="lead-meta">
            <span class="days-ago ${overdueClass}">${daysText}</span>
          </div>
        </div>`;
    }).join('');
  }

  const overdueCount = leadsCache.filter(l => l.status !== 'deal' && l.status !== 'batal' && daysSince(l.lastContactedAt) >= 2).length;
  document.getElementById('overdueCount').textContent = overdueCount;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// === FILTER CHIPS ===
document.getElementById('filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  activeFilter = chip.dataset.f;
  render();
});

// === SHEET (detail/tambah lead) ===
function openSheet(id) {
  editingId = id;
  const isNew = !id;

  document.getElementById('nameFieldLabel').style.display = isNew ? 'block' : 'none';
  document.getElementById('nameInput').style.display = isNew ? 'block' : 'none';
  document.getElementById('phoneFieldLabel').style.display = isNew ? 'block' : 'none';
  document.getElementById('phoneInput').style.display = isNew ? 'block' : 'none';
  document.getElementById('nameInput').value = '';
  document.getElementById('phoneInput').value = '';
  document.getElementById('noteBox').value = '';

  if (isNew) {
    document.getElementById('sheetName').textContent = 'Lead Baru';
    document.getElementById('sheetPhone').textContent = 'Isi manual di bawah';
    selectedStatus = 'baru';
  } else {
    const l = leadsCache.find(x => x.id === id);
    document.getElementById('sheetName').textContent = l.name;
    document.getElementById('sheetPhone').textContent = l.phone;
    selectedStatus = l.status === 'lewat' ? 'proses' : l.status;
  }
  updateStatusRow();
  document.getElementById('backdrop').classList.add('open');
}
function closeSheet() { document.getElementById('backdrop').classList.remove('open'); }

function updateStatusRow() {
  document.querySelectorAll('#statusRow .status-opt').forEach(el => {
    el.classList.toggle('sel', el.dataset.s === selectedStatus);
  });
}
document.getElementById('statusRow').addEventListener('click', e => {
  const opt = e.target.closest('.status-opt');
  if (!opt) return;
  selectedStatus = opt.dataset.s;
  updateStatusRow();
});

// === SIMPAN (create atau update) ===
async function saveLead() {
  const note = document.getElementById('noteBox').value.trim();

  if (editingId) {
    await db.collection('leads').doc(editingId).update({
      status: selectedStatus === 'batal' ? 'batal' : selectedStatus,
      lastContactedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if (note) {
      await db.collection('leads').doc(editingId).collection('notes').add({
        note,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.currentUser.uid,
      });
    }
  } else {
    const name = document.getElementById('nameInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    if (!name || !phone) {
      alert('Nama dan nomor WA wajib diisi.');
      return;
    }
    await db.collection('leads').add({
      tenantId,
      name,
      phone,
      lastMessage: note || '(ditambahkan manual)',
      status: 'baru',
      lastContactedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  closeSheet();
}
