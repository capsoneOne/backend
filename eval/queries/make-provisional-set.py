"""
Builds the PROVISIONAL query set by perturbing the seeded catalog images.

    docker compose -f apps/server/docker-compose.yml cp \
        apps/server/scripts/seed/images embedder:/tmp/catalog
    docker compose -f apps/server/docker-compose.yml cp \
        eval/queries/make-provisional-set.py embedder:/tmp/make.py
    docker compose -f apps/server/docker-compose.yml exec embedder python /tmp/make.py
    docker compose -f apps/server/docker-compose.yml cp \
        embedder:/tmp/queries/. eval/queries/images/

This runs inside the embedder container purely because Pillow is already installed
there. It has nothing to do with the model.

READ THIS BEFORE TRUSTING ANY NUMBER PRODUCED FROM THIS SET
-----------------------------------------------------------
These are catalog images with rotation, cropping, recolouring, noise and a cluttered
background applied. They are NOT photographs. `ds-handoff.md` §4.1 is explicit that
the actual problem is the domain gap between studio catalog shots and real phone
photos, and that a model evaluated on catalog-derived images will score well and then
disappoint on real uploads.

So this set measures robustness to a few synthetic corruptions, which is a strictly
easier task than the real one. Its purpose is to make the harness runnable and to
establish a mechanical baseline before the real model exists. Replace it with real
phone photos of the real catalog before reporting anything.

Deterministic: every transform is seeded from the filename, so re-running reproduces
the set byte-for-byte.
"""

import hashlib
import os

import numpy as np
from PIL import Image, ImageFilter

SRC = "/tmp/catalog"
DST = "/tmp/queries"


def rng_for(name: str) -> np.random.Generator:
    seed = int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], "big")
    return np.random.default_rng(seed)


def angled(img: Image.Image, r: np.random.Generator) -> Image.Image:
    """Off-axis shot: rotation, off-centre crop, exposure shift, JPEG softening."""
    out = img.rotate(
        float(r.uniform(-18, 18)), resample=Image.BICUBIC, expand=True, fillcolor=(238, 236, 232)
    )
    w, h = out.size
    inset = 0.12
    dx, dy = r.uniform(-0.05, 0.05), r.uniform(-0.05, 0.05)
    out = out.crop(
        (
            int(w * (inset + dx)),
            int(h * (inset + dy)),
            int(w * (1 - inset + dx)),
            int(h * (1 - inset + dy)),
        )
    )
    arr = np.asarray(out, dtype=float)
    arr = np.clip(arr * r.uniform(0.82, 1.18) + r.uniform(-14, 14), 0, 255)
    return Image.fromarray(arr.astype("uint8")).resize((640, 640), Image.BICUBIC)


def cluttered(img: Image.Image, r: np.random.Generator) -> Image.Image:
    """Product photographed on a busy surface: smaller subject, textured backdrop, noise."""
    canvas = Image.fromarray(
        np.clip(
            r.normal(loc=r.uniform(90, 175), scale=26, size=(640, 640, 3)), 0, 255
        ).astype("uint8")
    ).filter(ImageFilter.GaussianBlur(radius=6))

    # A few muted blocks so the background has structure, not just noise.
    block = np.asarray(canvas).copy()
    for _ in range(5):
        x, y = int(r.integers(0, 520)), int(r.integers(0, 520))
        w, h = int(r.integers(60, 190)), int(r.integers(60, 190))
        tint = r.integers(60, 200, size=3)
        block[y : y + h, x : x + w] = (
            block[y : y + h, x : x + w] * 0.45 + tint * 0.55
        ).astype("uint8")
    canvas = Image.fromarray(block)

    scale = float(r.uniform(0.42, 0.62))
    subject = img.resize((int(640 * scale), int(640 * scale)), Image.BICUBIC)
    subject = subject.rotate(
        float(r.uniform(-12, 12)), resample=Image.BICUBIC, expand=True, fillcolor=(240, 238, 234)
    )
    px = int(r.integers(0, max(1, 640 - subject.size[0])))
    py = int(r.integers(0, max(1, 640 - subject.size[1])))
    canvas.paste(subject, (px, py))

    arr = np.asarray(canvas, dtype=float) + r.normal(0, 7, size=(640, 640, 3))
    return Image.fromarray(np.clip(arr, 0, 255).astype("uint8")).filter(
        ImageFilter.GaussianBlur(radius=0.6)
    )


os.makedirs(DST, exist_ok=True)
made = 0
for name in sorted(os.listdir(SRC)):
    if not name.endswith(".jpg"):
        continue
    stem = name[:-4]
    src = Image.open(os.path.join(SRC, name)).convert("RGB")
    for kind, fn in (("angle", angled), ("clutter", cluttered)):
        out = fn(src, rng_for(f"{stem}-{kind}"))
        out.save(os.path.join(DST, f"{stem}-{kind}.jpg"), "JPEG", quality=84)
        made += 1

print(f"wrote {made} query images to {DST}")
