#!/usr/bin/env python3
"""
generate_placeholders.py
Generates placeholder PNG files for all pigeon layers so the
game renders immediately, before the real art is ready.
Each placeholder is a 500x500 transparent PNG with a simple
shape + label so you can see the layer stacking.

Run once:  python3 generate_placeholders.py
Requires:  pip install Pillow --break-system-packages
"""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 500, 500

LAYERS = {
    "head": {
        "color": (91, 143, 196, 180),   # blue
        "shape": "ellipse",
        "rect":  (150, 60, 350, 260),
        "label_y": 150,
    },
    "torso": {
        "color": (61, 191, 122, 180),   # green
        "shape": "ellipse",
        "rect":  (130, 180, 370, 400),
        "label_y": 290,
    },
    "wings": {
        "color": (155, 127, 221, 180),  # purple
        "shape": "ellipse",
        "rect":  (60, 200, 200, 360),
        "label_y": 280,
    },
    "leg_far": {
        "color": (232, 160, 32, 180),   # gold
        "shape": "rect",
        "rect":  (200, 370, 280, 490),
        "label_y": 430,
    },
    "leg_near": {
        "color": (224, 92, 92, 180),    # red
        "shape": "rect",
        "rect":  (260, 370, 340, 490),
        "label_y": 430,
    },
}

EGG_STATES = ["egg_whole", "egg_crack1", "egg_crack2"]

VARIANTS = 5

def make_layer(layer_name, variant, cfg):
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    r, g, b, a = cfg["color"]
    # Slightly vary brightness per variant
    brightness = 0.7 + (variant - 1) * 0.075
    color = (int(r * brightness), int(g * brightness), int(b * brightness), a)
    outline = (255, 255, 255, 120)

    if cfg["shape"] == "ellipse":
        draw.ellipse(cfg["rect"], fill=color, outline=outline, width=3)
    else:
        draw.rectangle(cfg["rect"], fill=color, outline=outline, width=3)

    # Label
    label = f"{layer_name}\n#{variant}"
    # Use default font (no external font needed)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        font = ImageFont.load_default()

    cx = W // 2
    cy = cfg["label_y"]
    draw.text((cx, cy), label, fill=(255, 255, 255, 220), font=font, anchor="mm")

    return img

def make_egg(state_name):
    img  = Image.new("RGBA", (300, 400), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Egg body
    draw.ellipse((30, 10, 270, 380), fill=(240, 230, 210, 220), outline=(180, 160, 120, 255), width=4)

    # Cracks
    if "crack1" in state_name:
        draw.line([(140, 80), (160, 130), (145, 155)], fill=(80, 60, 40, 200), width=3)
    elif "crack2" in state_name:
        draw.line([(140, 80), (160, 130), (145, 155)], fill=(80, 60, 40, 200), width=3)
        draw.line([(170, 100), (190, 150), (175, 180)], fill=(80, 60, 40, 200), width=2)
        draw.line([(120, 140), (100, 180)], fill=(80, 60, 40, 200), width=2)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
    except Exception:
        font = ImageFont.load_default()

    draw.text((150, 320), state_name, fill=(120, 100, 80, 200), font=font, anchor="mm")
    return img

def make_nest_bg():
    img  = Image.new("RGBA", (800, 400), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Simple oval nest suggestion
    draw.ellipse((100, 200, 700, 390), fill=(60, 40, 20, 160), outline=(80, 55, 25, 200), width=4)
    for i in range(10):
        x1 = 120 + i * 55
        draw.arc((x1, 220, x1 + 80, 370), start=0, end=180, fill=(90, 65, 30, 140), width=3)
    return img

def main():
    # Pigeon layers
    for layer_name, cfg in LAYERS.items():
        folder = os.path.join("assets", "pigeon", layer_name)
        os.makedirs(folder, exist_ok=True)
        for v in range(1, VARIANTS + 1):
            img  = make_layer(layer_name, v, cfg)
            path = os.path.join(folder, f"{layer_name}_{v}.png")
            img.save(path, "PNG")
            print(f"  ✓ {path}")

    # Egg states
    egg_folder = os.path.join("assets", "egg")
    os.makedirs(egg_folder, exist_ok=True)
    for state in EGG_STATES:
        img  = make_egg(state)
        path = os.path.join(egg_folder, f"{state}.png")
        img.save(path, "PNG")
        print(f"  ✓ {path}")

    # Nest background
    nest = make_nest_bg()
    nest_path = os.path.join(egg_folder, "nest_bg.png")
    nest.save(nest_path, "PNG")
    print(f"  ✓ {nest_path}")

    # App icons (simple)
    icons_folder = os.path.join("assets", "icons")
    os.makedirs(icons_folder, exist_ok=True)
    for size in [192, 512]:
        icon = Image.new("RGBA", (size, size), (13, 13, 13, 255))
        draw = ImageDraw.Draw(icon)
        draw.ellipse((size//6, size//6, size*5//6, size*5//6), fill=(232, 160, 32, 255))
        icon.save(os.path.join(icons_folder, f"icon-{size}.png"), "PNG")
        print(f"  ✓ assets/icons/icon-{size}.png")

    print("\n✅ All placeholders generated! Drop your real PNGs in the same paths to replace them.")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("🎨 Generating placeholder assets…\n")
    main()
