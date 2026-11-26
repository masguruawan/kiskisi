// Ganti dengan URL Web App Apps Script (hasil Deploy > New deployment > Web app)
const API_URL = 'https://script.google.com/macros/s/AKfycbyDAA21fwQM9cuMzN9Lyes1D72cYXf1arcnBJUS1SacK9MgAs3ARrfqueFtvNycU3sX/exec';

const PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Hanya untuk mengisi pilihan di layar. Yang berlaku tetap pemeriksaan di server (Code.gs).
const MAPEL_PER_KELAS = {
  'X PSPT': ['Informatika', 'D2PK'],
  'X TSM 1': ['Informatika', 'KKA'],
  'X TSM 2': ['Informatika', 'KKA'],
};

const $ = (id) => document.getElementById(id);
const kartu = $('kartu');
const form = $('form');
const tombol = $('tombol');
const hasil = $('hasil');
const pilihKelas = $('kelas');
const pilihMapel = $('mapel');
const materi = $('materi');

let sesi = null; // { kelas, mapel } untuk permintaan berkas berikutnya

// Membuat elemen dengan aman (teks dimasukkan sebagai teks, bukan HTML)
function el(tag, atribut, ...anak) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atribut || {})) e.setAttribute(k, v);
  e.append(...anak);
  return e;
}

function tampilPesan(jenis, teks) {
  hasil.className = 'hasil ' + jenis;
  hasil.textContent = teks;
  hasil.hidden = false;
}

async function kirim(data) {
  // Tanpa header khusus supaya tidak memicu preflight CORS
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  return res.json();
}

// ---------- Pilihan kelas -> mapel ----------

pilihKelas.addEventListener('change', () => {
  const daftar = MAPEL_PER_KELAS[pilihKelas.value] || [];
  pilihMapel.replaceChildren(
    el('option', { value: '' }, daftar.length ? '-- Pilih mata pelajaran --' : '-- Pilih kelas dulu --'),
    ...daftar.map((m) => el('option', { value: m }, m))
  );
  pilihMapel.disabled = daftar.length === 0;
});

// ---------- Kirim pilihan ----------

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    aksi: 'daftar',
    nama: form.nama.value.trim(),
    kelas: pilihKelas.value,
    mapel: pilihMapel.value,
  };

  if (!data.nama || !data.kelas || !data.mapel) {
    tampilPesan('err', 'Nama, kelas, dan mata pelajaran harus diisi.');
    return;
  }
  if (API_URL.startsWith('GANTI')) {
    tampilPesan('err', 'URL Apps Script belum diisi di script.js.');
    return;
  }

  tombol.disabled = true;
  tombol.textContent = 'Memproses...';
  hasil.hidden = true;

  try {
    const h = await kirim(data);
    if (!h.ok) {
      tampilPesan('err', h.pesan || 'Gagal. Coba lagi.');
    } else {
      sesi = { kelas: data.kelas, mapel: data.mapel };
      tampilMateri(h);
    }
  } catch (err) {
    tampilPesan('err', 'Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.');
  } finally {
    tombol.disabled = false;
    tombol.textContent = 'Buka materi';
  }
});

$('kembali').addEventListener('click', () => {
  materi.hidden = true;
  form.hidden = false;
  kartu.classList.remove('lebar');
  $('bagian').replaceChildren();
  sesi = null;
});

// ---------- Tampilan materi ----------

function amanUrl(url) {
  return /^https?:\/\//i.test(url) ? url : '#';
}

function tombolTautan(teks, url) {
  return el('a', { class: 'tombol', href: amanUrl(url), target: '_blank', rel: 'noopener noreferrer' }, teks);
}

function tampilMateri(h) {
  $('judul-materi').textContent = h.mapel + ' – ' + h.kelas;
  $('info-materi').textContent = 'Akses berlaku sampai ' + h.batas + ' WIB.';

  const bagian = $('bagian');
  bagian.replaceChildren();

  if (h.spreadsheet) {
    const kotak = el('div', { class: 'bagian' }, el('h3', {}, 'Spreadsheet'), tombolTautan('Buka spreadsheet', h.spreadsheet));
    if (h.pesan) kotak.append(el('p', { class: 'catatan' }, h.pesan));
    bagian.append(kotak);
  }

  if (h.tautan.length) {
    bagian.append(el('div', { class: 'bagian' }, el('h3', {}, 'Materi'), ...h.tautan.map((t) => tombolTautan(t.judul, t.url))));
  }

  if (h.berkas.length) {
    bagian.append(el('div', { class: 'bagian' }, el('h3', {}, 'Jobsheet dan gambar'), ...h.berkas.map(itemBerkas)));
  }

  if (!bagian.children.length) {
    bagian.append(el('p', { class: 'catatan' }, 'Materi untuk pelajaran ini belum tersedia.'));
  }

  form.hidden = true;
  hasil.hidden = true;
  materi.hidden = false;
  kartu.classList.add('lebar');
}

// Berkas dimuat saat tombolnya ditekan, supaya halaman tetap ringan
function itemBerkas(b) {
  const wadah = el('div', { class: 'berkas-wadah', hidden: '' });
  const btn = el('button', { type: 'button', class: 'sekunder' }, 'Lihat: ' + b.judul);
  let termuat = false;

  btn.addEventListener('click', async () => {
    if (termuat) {
      wadah.hidden = !wadah.hidden;
      btn.textContent = (wadah.hidden ? 'Lihat: ' : 'Sembunyikan: ') + b.judul;
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Memuat...';
    wadah.hidden = false; // harus terlihat dulu agar lebar halaman PDF bisa dihitung
    wadah.replaceChildren(el('p', { class: 'catatan' }, 'Memuat berkas...'));

    try {
      const r = await kirim({ aksi: 'berkas', kelas: sesi.kelas, mapel: sesi.mapel, id: b.id });
      if (!r.ok) throw new Error(r.pesan || 'Gagal memuat berkas.');
      await isiBerkas(wadah, r);
      termuat = true;
      btn.textContent = 'Sembunyikan: ' + b.judul;
    } catch (err) {
      const teks = err instanceof TypeError ? 'Tidak bisa terhubung ke server.' : err.message;
      wadah.replaceChildren(el('p', { class: 'hasil err' }, teks));
      btn.textContent = 'Coba lagi: ' + b.judul;
    } finally {
      btn.disabled = false;
    }
  });

  return el('div', { class: 'item-berkas' }, btn, wadah);
}

async function isiBerkas(wadah, r) {
  const bytes = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));

  if (r.mime === 'application/pdf') {
    if (!window.pdfjsLib) throw new Error('Penampil PDF gagal dimuat. Muat ulang halaman.');
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const lebar = wadah.clientWidth || 320;
    wadah.replaceChildren();

    for (let n = 1; n <= pdf.numPages; n++) {
      const halaman = await pdf.getPage(n);
      const dasar = halaman.getViewport({ scale: 1 });
      const skala = (lebar / dasar.width) * Math.min(window.devicePixelRatio || 1, 2);
      const vp = halaman.getViewport({ scale: skala });

      const kanvas = el('canvas', { class: 'halaman' });
      kanvas.width = Math.floor(vp.width);
      kanvas.height = Math.floor(vp.height);
      wadah.append(kanvas);
      await halaman.render({ canvasContext: kanvas.getContext('2d'), viewport: vp }).promise;
    }
  } else {
    const img = el('img', { class: 'gambar', alt: 'Gambar materi' });
    img.src = URL.createObjectURL(new Blob([bytes], { type: r.mime }));
    wadah.replaceChildren(img);
  }
}
