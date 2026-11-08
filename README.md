# Corporate Agent Desk

Di Windows, klik dua kali **Mulai Corporate Agent Desk.cmd**. Biarkan jendela terminal tetap terbuka. Anda juga bisa menjalankan `node server.mjs` di folder aplikasi lalu membuka http://127.0.0.1:3847/.

Aplikasi memakai Node.js 20+ dan Codex CLI yang tersedia di PATH. Jika diperlukan, masuk dengan `codex login` sebelum menjalankan agent. Brief dikirim ke Codex untuk diproses melalui sesi login Anda.

Klik **Tugas Baru** atau **Pilih Agent**, isi judul dan brief, lalu klik **Jalankan Agent**. Panel **Aktivitas** menampilkan status proses, durasi, dan hasil. Satu agent mengerjakan satu brief pada satu waktu. Ketiga agent bisa bekerja bersamaan.

Untuk **Partnership & Proposal**, tempel teks quotation lama atau gunakan **Pilih PDF quotation** untuk mengisi **Contoh Quotation**. PDF dengan teks yang dapat dipilih didukung hingga 10 MB dan 30 halaman. Tinjau hasil impor hingga 12.000 karakter sebelum menjalankan agent. Tata letak hasil ekstraksi bisa berbeda dari PDF. Untuk hasil pindai, tempelkan teks hasil OCR secara manual. Gunakan brief untuk harga, nama mitra, tanggal, dan rincian penawaran baru.

Impor PDF menggunakan Python dengan paket `pypdf` (versi 5 atau lebih baru). Runtime bawaan Codex digunakan jika tersedia bersama Node.js. Untuk instalasi mandiri, jalankan `python -m pip install "pypdf>=5"` atau atur `CORPORATE_DESK_PYTHON` ke lokasi Python yang sesuai. File PDF dibaca secara lokal. Teks contoh yang dikirim bersama tugas diproses melalui sesi Codex dan disimpan di riwayat.

Judul, brief, contoh quotation, status, dan hasil tugas tersimpan di komputer pada folder `%LOCALAPPDATA%\CorporateAgentDesk\history` dan dimuat kembali saat aplikasi dibuka. Cari tugas berdasarkan judul atau nama agent, atau saring hasil menurut status. Tugas aktif tetap terlihat saat riwayat disaring.

Jika aplikasi berhenti saat tugas berjalan, tugas itu ditandai **Gagal** pada pembukaan berikutnya. **Coba Lagi** membuka brief sebelumnya untuk ditinjau dan dikirim ulang. Hasil tersedia melalui **Lihat Hasil** dan **Salin Hasil**.
