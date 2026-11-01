"""Stitch the UI screenshot suite into a single review PDF.

One page per screenshot, page sized to the image (plus a caption band), so
nothing is scaled oddly. A short cover page lists the contents. Metadata is
set for the reviewer.
"""
import os
import pymupdf

SRC_DIR = os.path.join("images", "screenshots", "redesign-2026-10-28")
OUT = os.path.join("images", "screenshots", "LANStreamer-UI-Review-2026-10-28.pdf")

CAPTIONS = {
    "01-dashboard-multi-dark.png": "1. Admin dashboard — multiple streams (dark) · one live, one error (collapsed details), rest stopped",
    "02-dashboard-multi-light.png": "2. Admin dashboard — multiple streams (light)",
    "03-dashboard-add-modal-dark.png": "3. Admin dashboard — add stream modal (dark)",
    "04-dashboard-add-modal-light.png": "4. Admin dashboard — add stream modal (light)",
    "05-dashboard-empty-dark.png": "5. Admin dashboard — no streams (dark)",
    "06-dashboard-empty-light.png": "6. Admin dashboard — no streams (light)",
    "07-listener-desktop-dark.png": "7. Listener page — desktop (dark)",
    "08-listener-desktop-light.png": "8. Listener page — desktop (light)",
    "09-listener-mobile-dark.png": "9. Listener page — mobile (dark)",
    "10-listener-mobile-light.png": "10. Listener page — mobile (light)",
}

BG = (0.05, 0.06, 0.08)     # near-black, matches the app's dark surfaces
FG = (0.95, 0.96, 0.98)
MUTED = (0.60, 0.64, 0.70)
ACCENT = (0.0, 0.68, 0.94)  # LANStreamer cyan

PAD = 24            # page padding around the image
CAPTION_H = 40      # caption band height


def main():
    doc = pymupdf.open()

    # ---- Cover ----
    cover = doc.new_page(width=842, height=595)  # A4 landscape
    cover_rect = cover.rect
    cover.draw_rect(cover_rect, color=None, fill=BG)
    logo = os.path.join("public", "assets", "logo.svg")
    if os.path.exists(logo):
        try:
            cover.insert_image(pymupdf.Rect(60, 60, 320, 108), filename=logo, keep_proportion=True)
        except Exception:
            pass
    cover.insert_textbox(
        pymupdf.Rect(60, 150, 782, 200),
        "LANStreamer — UI Review Package",
        fontsize=30, fontname="hebo", color=FG,
    )
    cover.insert_textbox(
        pymupdf.Rect(60, 205, 782, 240),
        "Admin dashboard + listener page · dark & light · desktop & mobile",
        fontsize=13, fontname="helv", color=MUTED,
    )
    y = 270
    for caption in CAPTIONS.values():
        cover.insert_textbox(pymupdf.Rect(70, y, 770, y + 16), caption, fontsize=10.5, fontname="helv", color=FG)
        y += 19
    cover.insert_textbox(
        pymupdf.Rect(60, 535, 782, 560),
        "Generated 2026-10-28 · for external design review",
        fontsize=9, fontname="helv", color=MUTED,
    )

    # ---- One page per screenshot ----
    for fname, caption in CAPTIONS.items():
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print(f"!! missing {fname}, skipped")
            continue
        with pymupdf.open(path) as img_doc:
            w, h = img_doc[0].rect.width, img_doc[0].rect.height
        page_w = w + PAD * 2
        page_h = h + PAD * 2 + CAPTION_H
        page = doc.new_page(width=page_w, height=page_h)
        page.draw_rect(page.rect, color=None, fill=BG)
        page.insert_image(pymupdf.Rect(PAD, PAD + CAPTION_H, PAD + w, PAD + CAPTION_H + h), filename=path)
        # Caption: accent tick + text
        page.draw_line(pymupdf.Point(PAD, PAD + 16), pymupdf.Point(PAD + 22, PAD + 16), color=ACCENT, width=2.5)
        page.insert_textbox(
            pymupdf.Rect(PAD + 30, PAD + 4, page_w - PAD, PAD + 30),
            caption, fontsize=12, fontname="hebo", color=FG,
        )
        print(f"page: {caption.split('·')[0].strip()}")

    doc.set_metadata({
        "title": "LANStreamer UI Review — 2026-10-28",
        "author": "LANStreamer",
        "subject": "Admin dashboard and listener page screenshots (dark/light, desktop/mobile) for external design review",
        "creator": "LANStreamer screenshot suite",
    })
    doc.save(OUT, garbage=4, deflate=True)
    size_kb = os.path.getsize(OUT) // 1024
    print(f"saved {OUT} — {doc.page_count} pages, {size_kb} KB")


if __name__ == "__main__":
    main()
