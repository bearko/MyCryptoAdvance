#!/usr/bin/env python3
"""宝箱スプライトシート生成 (32x32 x 8コマ / 横1列)

マイクリの宝箱アイコン（金地にクリームの縁取り・縦帯・中央の錠前）を、
フィールドに置けるドット絵に起こしたもの。フタが開くモーション付き。

    pip install Pillow
    python3 rpg/tools/build_chest_sprite.py

出力: rpg/assets/objects/chest.png (+ 目視確認用 chest_preview.gif)
"""

from pathlib import Path

from PIL import Image

W = H = 32
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "objects" / "chest.png"

# --- パレット（アイコンの金＋クリーム。草地で沈まないよう外周は暗色） ---
CLEAR = (0, 0, 0, 0)
LINE = (52, 30, 12, 255)      # アウトライン
GOLD_H = (255, 236, 176, 255)  # ハイライト
GOLD_L = (247, 206, 104, 255)
GOLD_M = (214, 154, 46, 255)
GOLD_D = (166, 106, 26, 255)
BAND = (255, 246, 214, 255)   # クリームの金具（アイコンの白縁に対応）
BAND_D = (203, 168, 100, 255)
IN_D = (36, 22, 14, 255)      # 箱の中
IN_M = (72, 46, 26, 255)
COIN_L = (255, 228, 138, 255)
COIN_M = (228, 172, 46, 255)
FLASH = (255, 252, 228, 255)
SHADOW = (0, 0, 0, 70)

# --- 座標 ---
LID_X0, LID_X1 = 3, 28        # フタは本体より少し広い（オーバーハング）
BX0, BX1 = 4, 27              # 本体
BODY_TOP, BODY_BOT = 18, 28
LID_BOT_CLOSED = 17
LID_H_CLOSED = 9
STRAPS = ((9, 10), (21, 22))  # クリームの縦帯


class Px:
    def __init__(self):
        self.img = Image.new("RGBA", (W, H), CLEAR)
        self.p = self.img.load()

    def set(self, x, y, c):
        if not (0 <= x < W and 0 <= y < H) or c is None:
            return
        if c[3] == 255:
            self.p[x, y] = c
            return
        b = self.p[x, y]
        if b[3] == 0:      # 透明地に重ねると黒が混ざるのでそのまま置く
            self.p[x, y] = c
            return
        a = c[3] / 255
        self.p[x, y] = (
            int(c[0] * a + b[0] * (1 - a)),
            int(c[1] * a + b[1] * (1 - a)),
            int(c[2] * a + b[2] * (1 - a)),
            max(b[3], c[3]),
        )

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, x, y1, c)


def cut_at(y, y0, y1, top_cut, bot_cut):
    """角丸の食い込み量"""
    if y - y0 < top_cut:
        return top_cut - (y - y0)
    if y1 - y < bot_cut:
        return bot_cut - (y1 - y)
    return 0


def round_fill(px, x0, y0, x1, y1, c, top_cut=0, bot_cut=0):
    for y in range(y0, y1 + 1):
        cut = cut_at(y, y0, y1, top_cut, bot_cut)
        px.rect(x0 + cut, y, x1 - cut, y, c)


def round_outline(px, x0, y0, x1, y1, c, top_cut=0, bot_cut=0):
    for y in range(y0, y1 + 1):
        cut = cut_at(y, y0, y1, top_cut, bot_cut)
        px.set(x0 + cut, y, c)
        px.set(x1 - cut, y, c)
        prev = cut_at(y - 1, y0, y1, top_cut, bot_cut) if y > y0 else cut + 1
        nxt = cut_at(y + 1, y0, y1, top_cut, bot_cut) if y < y1 else cut + 1
        for step, edge in ((prev, y == y0), (nxt, y == y1)):
            if step > cut or edge:
                px.rect(x0 + cut, y, x0 + min(step, x1 - x0), y, c)
                px.rect(x1 - min(step, x1 - x0), y, x1 - cut, y, c)


def draw_shadow(px):
    px.hline(BX0 + 2, BX1 - 2, BODY_BOT + 1, SHADOW)
    px.hline(BX0 + 4, BX1 - 4, BODY_BOT + 2, SHADOW)


def draw_body(px):
    """本体（下箱）。フタが開いても常に見える部分"""
    round_fill(px, BX0, BODY_TOP, BX1, BODY_BOT, GOLD_M, bot_cut=1)
    px.hline(BX0 + 1, BX1 - 1, BODY_TOP, GOLD_L)
    px.hline(BX0 + 1, BX1 - 1, BODY_TOP + 1, GOLD_L)
    px.hline(BX0 + 1, BX1 - 1, BODY_BOT - 3, GOLD_D)
    for sx0, sx1 in STRAPS:
        px.rect(sx0, BODY_TOP, sx1, BODY_BOT - 3, BAND)
        px.vline(sx1, BODY_TOP, BODY_BOT - 3, BAND_D)
    # 台座
    px.rect(BX0 + 1, BODY_BOT - 2, BX1 - 1, BODY_BOT - 1, BAND)
    px.hline(BX0 + 2, BX1 - 2, BODY_BOT - 1, BAND_D)
    px.hline(BX0 + 2, BX1 - 2, BODY_BOT, GOLD_D)
    round_outline(px, BX0, BODY_TOP, BX1, BODY_BOT, LINE, bot_cut=1)


def draw_interior(px, lid_bot, t):
    """フタと本体の間に見える箱の中"""
    top = lid_bot + 1
    if top >= BODY_TOP:
        return
    px.rect(BX0 + 1, top, BX1 - 1, BODY_TOP - 1, IN_D)
    px.hline(BX0 + 1, BX1 - 1, top, IN_M)          # 奥の縁
    px.vline(BX0, top, BODY_TOP - 1, LINE)
    px.vline(BX1, top, BODY_TOP - 1, LINE)
    # 中の金貨
    if t >= 0.6 and BODY_TOP - 1 - top >= 2:
        base = BODY_TOP - 1
        for cx, w, up in ((6, 5, 0), (12, 6, 1), (19, 5, 0), (24, 3, 0)):
            y = base - up
            if y - 1 <= top:
                continue
            px.rect(cx, y - 1, cx + w - 1, y, COIN_M)
            px.hline(cx + 1, cx + w - 2, y - 1, COIN_L)
            px.set(cx, y - 1, LINE)
            px.set(cx + w - 1, y - 1, LINE)


def draw_lid(px, top, bot, t):
    """フタ。t が大きいほど奥に倒れて薄く見える"""
    h = bot - top
    inset = 1 if t >= 0.55 else 0
    x0, x1 = LID_X0 + inset, LID_X1 - inset
    top_cut = 3 if h >= 6 else (2 if h >= 4 else 1)
    round_fill(px, x0, top, x1, bot, GOLD_M, top_cut=top_cut)
    px.hline(x0 + top_cut, x1 - top_cut, top, GOLD_H)
    if h >= 3:
        px.hline(x0 + max(1, top_cut - 1), x1 - max(1, top_cut - 1), top + 1, GOLD_L)
    if h >= 5:
        px.hline(x0 + 1, x1 - 1, bot - 2, GOLD_D)
    # 縦帯
    for sx0, sx1 in STRAPS:
        for y in range(top, bot + 1):
            cut = cut_at(y, top, bot, top_cut, 0)
            a, b = max(x0 + cut, sx0), min(x1 - cut, sx1)
            if a <= b:
                px.rect(a, y, b, y, BAND)
    # 下端のクリーム金具
    px.hline(x0, x1, bot, BAND)
    if h >= 4:
        px.hline(x0 + 1, x1 - 1, bot - 1, BAND_D)
    round_outline(px, x0, top, x1, bot, LINE, top_cut=top_cut)


def draw_lock(px, cy):
    """中央の錠前（角丸四角＋鍵穴）"""
    x0, x1 = 13, 18
    y0, y1 = cy - 3, cy + 3
    round_fill(px, x0, y0, x1, y1, BAND, top_cut=1, bot_cut=1)
    round_outline(px, x0, y0, x1, y1, LINE, top_cut=1, bot_cut=1)
    px.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 2, LINE)
    px.rect(x0 + 2, y0 + 3, x1 - 2, y1 - 2, (86, 52, 20, 255))


def draw_flash(px, s, lid_bot):
    """開いた瞬間の光。箱の中を照らし、上に光の粒が舞う"""
    if s <= 0:
        return
    wash = (255, 206, 96, int(150 * s))     # 中を照らす金色の光
    rim = (255, 240, 186, int(220 * s))
    px.rect(BX0 + 1, lid_bot + 1, BX1 - 1, BODY_TOP - 1, wash)
    px.hline(BX0 + 2, BX1 - 2, lid_bot + 1, rim)
    if s > 0.7:
        for x, y in ((6, 8), (25, 9), (16, 3), (10, 5), (22, 4)):
            px.set(x, y, FLASH)
            px.set(x - 1, y, wash)
            px.set(x + 1, y, wash)
            px.set(x, y - 1, wash)
            px.set(x, y + 1, wash)


def draw_sparkle(px, kind):
    pts = ((6, 11), (25, 14), (17, 6)) if kind == 0 else ((25, 10), (7, 15), (13, 5))
    glow = (255, 246, 205, 160)
    for x, y in pts:
        px.set(x, y, FLASH)
        px.set(x - 1, y, glow)
        px.set(x + 1, y, glow)
        px.set(x, y - 1, glow)
        px.set(x, y + 1, glow)


def build_frame(t=0.0, dx=0, flash=0.0, spark=None):
    """t: 0=閉じている 1=全開"""
    px = Px()
    tc = min(max(t, 0.0), 1.0)
    lid_h = max(3, round(LID_H_CLOSED - 5 * tc))
    lid_bot = LID_BOT_CLOSED - round(10 * tc)
    lid_top = lid_bot - lid_h + 1

    draw_shadow(px)
    draw_body(px)
    draw_interior(px, lid_bot, tc)
    draw_flash(px, flash, lid_bot)
    draw_lid(px, lid_top, lid_bot, tc)
    # 錠前はフタ下端に付いて一緒に持ち上がる
    if tc < 0.85:
        draw_lock(px, lid_bot + 1 if tc == 0 else lid_bot)
    if spark is not None:
        draw_sparkle(px, spark)

    if dx:
        moved = Image.new("RGBA", (W, H), CLEAR)
        moved.paste(px.img, (dx, 0))
        return moved
    return px.img


FRAME_SPECS = [
    dict(t=0.0),                     # 0 閉
    dict(t=0.0, dx=-1),              # 1 ガタッ
    dict(t=0.0, dx=1),               # 2 ガタッ
    dict(t=0.35),                    # 3 開きはじめ
    dict(t=0.7, flash=0.55),         # 4
    dict(t=1.0, flash=1.0),          # 5 開いた瞬間の閃光
    dict(t=1.0, spark=0),            # 6 開いた状態A
    dict(t=1.0, spark=1),            # 7 開いた状態B
]
PREVIEW_MS = [700, 90, 90, 90, 80, 100, 420, 420]


def main():
    frames = [build_frame(**s) for s in FRAME_SPECS]
    sheet = Image.new("RGBA", (W * len(frames), H), CLEAR)
    for i, f in enumerate(frames):
        sheet.paste(f, (i * W, 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT)
    print(f"wrote {OUT} ({sheet.width}x{sheet.height}, {len(frames)} frames)")

    big = [f.resize((W * 5, H * 5), Image.NEAREST) for f in frames]
    big[0].save(
        OUT.with_name("chest_preview.gif"),
        save_all=True,
        append_images=big[1:],
        duration=PREVIEW_MS,
        loop=0,
        disposal=2,
    )


if __name__ == "__main__":
    main()
