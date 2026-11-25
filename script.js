// Ganti dengan URL Web App Apps Script (hasil Deploy > New deployment > Web app)
const API_URL = 'GANTI_DENGAN_URL_WEB_APP';

const form = document.getElementById('form');
const tombol = document.getElementById('tombol');
const hasil = document.getElementById('hasil');

function tampil(jenis, node) {
  hasil.className = 'hasil ' + jenis;
  hasil.replaceChildren(node);
  hasil.hidden = false;
}

function teks(pesan) {
  return document.createTextNode(pesan);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    nama: form.nama.value.trim(),
    email: form.email.value.trim(),
    kelas: form.kelas.value,
    kode: form.kode.value.trim(),
  };

  if (!data.nama || !data.email || !data.kelas || !data.kode) {
    tampil('err', teks('Semua kolom harus diisi.'));
    return;
  }

  if (API_URL.startsWith('GANTI')) {
    tampil('err', teks('URL Apps Script belum diisi di script.js.'));
    return;
  }

  tombol.disabled = true;
  tombol.textContent = 'Memproses...';
  hasil.hidden = true;

  try {
    // Tanpa header khusus supaya tidak memicu preflight CORS
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
    const h = await res.json();

    if (!h.ok) {
      tampil('err', teks(h.pesan || 'Gagal. Coba lagi.'));
    } else {
      const wadah = document.createElement('div');
      wadah.appendChild(teks((h.pesan || 'Berhasil.') + ' '));
      const a = document.createElement('a');
      a.href = h.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Buka spreadsheet';
      wadah.appendChild(a);
      wadah.appendChild(document.createElement('br'));
      wadah.appendChild(teks('Akses berlaku sampai ' + h.batas + ' WIB. Pastikan membuka dengan akun ' + data.email + '.'));
      tampil('ok', wadah);
    }
  } catch (err) {
    tampil('err', teks('Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.'));
  } finally {
    tombol.disabled = false;
    tombol.textContent = 'Buka spreadsheet';
  }
});
