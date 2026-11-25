// Ganti dengan URL Web App Apps Script (hasil Deploy > New deployment > Web app)
const API_URL = 'https://script.google.com/macros/s/AKfycbwrCUQ6VwDayVS_4Jj0qVriuZZXjgj5VR0wssRywsWuIjxyL65LYrTBojcimfTgoWlknA/exec';

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
    kelas: form.kelas.value,
  };

  if (!data.nama || !data.kelas) {
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
      wadah.appendChild(teks('Akses berlaku sampai ' + h.batas + ' WIB.'));
      tampil('ok', wadah);
    }
  } catch (err) {
    tampil('err', teks('Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.'));
  } finally {
    tombol.disabled = false;
    tombol.textContent = 'Buka spreadsheet';
  }
});
