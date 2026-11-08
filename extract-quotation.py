import io
import json
import sys


def extract(data):
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    if reader.is_encrypted:
        return {"error": "PDF terkunci. Gunakan salinan PDF tanpa kata sandi."}
    if len(reader.pages) > 30:
        return {"error": "PDF maksimal 30 halaman. Pilih bagian yang ingin dijadikan contoh."}

    parts = []
    remaining = 12001
    for page in reader.pages:
        content = page.extract_text(extraction_mode="layout").strip()
        if not content:
            continue
        if parts:
            remaining -= 2
        parts.append(content[:max(0, remaining)])
        remaining -= len(parts[-1])
        if remaining <= 0:
            break
    if not parts:
        return {"error": "Teks tidak ditemukan. Untuk PDF hasil pindai, salin teks dari hasil OCR ke Contoh Quotation."}
    return {"text": "\n\n".join(parts), "truncated": remaining <= 0}


try:
    result = extract(sys.stdin.buffer.read())
except ImportError:
    result = {"error": "Pembaca PDF belum tersedia. Pasang pypdf sesuai petunjuk README."}
except Exception:
    result = {"error": "PDF tidak bisa dibaca. Coba gunakan salinan PDF yang bisa dibuka."}

print(json.dumps(result, ensure_ascii=True))
