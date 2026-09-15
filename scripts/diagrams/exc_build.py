#!/usr/bin/env python3
"""Compact Excalidraw JSON builder.

Usage from other scripts:
    from exc_build import Scene
    s = Scene()
    s.rect("learner", 100, 100, 220, 120, "Learner\nphone browser", color="blue")
    s.arrow("learner", "backend", label="① wss · Opus", color="blue", label_offset=(0, -30))
    s.write("/path/to/file.excalidraw")
"""
import json
import sys

PALETTES = {
    "blue":   {"stroke": "#1971c2", "fill": "#a5d8ff"},
    "green":  {"stroke": "#2b8a3e", "fill": "#b2f2bb"},
    "cyan":   {"stroke": "#0c8599", "fill": "#96f2d7"},
    "yellow": {"stroke": "#e67700", "fill": "#ffe066"},
    "pink":   {"stroke": "#c92a2a", "fill": "#ffc9c9"},
    "purple": {"stroke": "#7048e8", "fill": "#d0bfff"},
    "grey":   {"stroke": "#495057", "fill": "#e9ecef"},
    "boundary": {"stroke": "#868e96", "fill": "#f8f9fa"},
    "white":  {"stroke": "#1e1e1e", "fill": "#ffffff"},
    "plain":  {"stroke": "#1e1e1e", "fill": "transparent"},
}

class Scene:
    def __init__(self, width=1600, height=1000, roughness=1):
        self.width = width
        self.height = height
        self.roughness = roughness
        self.elements = []
        self.boxes = {}  # id -> (x, y, w, h) for arrow anchoring
        self._counter = 0
        self._z = 0

    def _next_id(self, prefix):
        self._counter += 1
        return f"{prefix}-{self._counter}"

    def _next_z(self):
        z = f"a{self._z:03x}"
        self._z += 1
        return z

    def _base(self, eid, x, y, w, h, kind="rectangle"):
        return {
            "id": eid,
            "type": kind,
            "x": x, "y": y, "width": w, "height": h,
            "angle": 0,
            "strokeColor": "#1e1e1e",
            "backgroundColor": "transparent",
            "fillStyle": "solid",
            "strokeWidth": 2,
            "strokeStyle": "solid",
            "roughness": self.roughness,
            "opacity": 100,
            "groupIds": [],
            "frameId": None,
            "index": self._next_z(),
            "roundness": {"type": 3},
            "seed": abs(hash(eid)) % 2147483647,
            "version": 1,
            "versionNonce": (abs(hash(eid + "n")) % 2147483647),
            "isDeleted": False,
            "boundElements": None,
            "updated": 1727827200000,
            "link": None,
            "locked": False,
        }

    def rect(self, key, x, y, w, h, text="", color="blue", *, text_size=17, text_align="center", stroke_style="solid"):
        e = self._base(key, x, y, w, h, "rectangle")
        pal = PALETTES[color]
        e["strokeColor"] = pal["stroke"]
        e["backgroundColor"] = pal["fill"]
        e["strokeStyle"] = stroke_style
        if stroke_style == "dashed":
            e["backgroundColor"] = pal["fill"]
        self.elements.append(e)
        self.boxes[key] = (x, y, w, h)
        if text:
            self.text(f"{key}-t", x + 15, y + h / 2 - self._est_h(text, text_size) / 2, w - 30, self._est_h(text, text_size), text, size=text_size, align=text_align, color=color if color in ("plain", "grey") else "plain")
        return e

    def diamond(self, key, x, y, w, h, text="", color="yellow", text_size=15):
        e = self._base(key, x, y, w, h, "diamond")
        pal = PALETTES[color]
        e["strokeColor"] = pal["stroke"]
        e["backgroundColor"] = pal["fill"]
        self.elements.append(e)
        self.boxes[key] = (x, y, w, h)
        if text:
            self.text(f"{key}-t", x + 10, y + h / 2 - self._est_h(text, text_size) / 2, w - 20, self._est_h(text, text_size), text, size=text_size, align="center", color="plain")

    def ellipse(self, key, x, y, w, h, text="", color="cyan", text_size=17):
        e = self._base(key, x, y, w, h, "ellipse")
        pal = PALETTES[color]
        e["strokeColor"] = pal["stroke"]
        e["backgroundColor"] = pal["fill"]
        e["roundness"] = None
        self.elements.append(e)
        self.boxes[key] = (x, y, w, h)
        if text:
            self.text(f"{key}-t", x + 10, y + h / 2 - self._est_h(text, text_size) / 2, w - 20, self._est_h(text, text_size), text, size=text_size, align="center", color="plain")

    def _est_h(self, text, size):
        lines = text.count("\n") + 1
        return int(size * 1.3 * lines)

    def text(self, key, x, y, w, h, text, size=16, align="left", color="plain", bold=False):
        e = self._base(key, x, y, w, h, "text")
        pal = PALETTES[color]
        e["strokeColor"] = pal["stroke"]
        e["backgroundColor"] = "transparent"
        e["roundness"] = None
        e["text"] = text
        e["fontSize"] = size
        e["fontFamily"] = 1
        e["textAlign"] = align
        e["verticalAlign"] = "top"
        self.elements.append(e)

    def arrow(self, from_key, to_key, *, label=None, label_pos="above", color="grey", style="solid", dogleg=None):
        """dogleg: None (straight), 'h' (horizontal-then-vertical), 'v' (vertical-then-horizontal)"""
        fx, fy, fw, fh = self.boxes[from_key]
        tx, ty, tw, th = self.boxes[to_key]
        # Compute cleanest edge-to-edge line
        fcx, fcy = fx + fw / 2, fy + fh / 2
        tcx, tcy = tx + tw / 2, ty + th / 2
        # Detect direction
        dx, dy = tcx - fcx, tcy - fcy
        if abs(dx) > abs(dy):
            # horizontal
            if dx > 0:
                sx, sy = fx + fw, fcy
                ex, ey = tx, tcy
            else:
                sx, sy = fx, fcy
                ex, ey = tx + tw, tcy
        else:
            if dy > 0:
                sx, sy = fcx, fy + fh
                ex, ey = tcx, ty
            else:
                sx, sy = fcx, fy
                ex, ey = tcx, ty + th
        # Points
        if dogleg == "h":
            points = [[0, 0], [ex - sx, 0], [ex - sx, ey - sy]]
        elif dogleg == "v":
            points = [[0, 0], [0, ey - sy], [ex - sx, ey - sy]]
        else:
            points = [[0, 0], [ex - sx, ey - sy]]
        eid = self._next_id("arrow")
        e = self._base(eid, sx, sy, ex - sx, ey - sy, "arrow")
        pal = PALETTES[color]
        e["strokeColor"] = pal["stroke"]
        e["strokeStyle"] = style
        e["roundness"] = {"type": 2}
        e["points"] = points
        e["startBinding"] = None
        e["endBinding"] = None
        self.elements.append(e)
        # Label
        if label:
            lx, ly = self._label_pos(sx, sy, ex, ey, label, label_pos)
            self.text(f"{eid}-lbl", lx, ly, max(160, len(label) * 8), self._est_h(label, 14), label, size=14, align="center", color=color)

    def _label_pos(self, sx, sy, ex, ey, text, pos):
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        line_h = self._est_h(text, 14)
        w = max(160, len(text) * 8)
        if pos == "above":
            return (mx - w / 2, my - line_h - 8)
        if pos == "below":
            return (mx - w / 2, my + 8)
        if pos == "left":
            return (mx - w - 10, my - line_h / 2)
        if pos == "right":
            return (mx + 10, my - line_h / 2)
        return (mx - w / 2, my - line_h / 2)

    def note(self, x, y, text, size=15, w=None, color="grey"):
        w = w or (self.width - x - 40)
        h = self._est_h(text, size)
        self.text(f"note-{self._counter}", x, y, w, h, text, size=size, align="left", color=color)
        self._counter += 1

    def title(self, text, x=60, y=40, size=26):
        h = self._est_h(text, size)
        self.text("title", x, y, self.width - x - 40, h, text, size=size, align="left", color="plain")

    def subtitle(self, text, x=60, y=80, size=15, color="green"):
        h = self._est_h(text, size)
        self.text("subtitle", x, y, self.width - x - 40, h, text, size=size, align="left", color=color)

    def write(self, path):
        doc = {
            "type": "excalidraw",
            "version": 2,
            "source": "https://excalidraw.com",
            "elements": self.elements,
            "appState": {
                "viewBackgroundColor": "#ffffff",
                "gridSize": 20,
            },
            "files": {},
        }
        with open(path, "w") as f:
            json.dump(doc, f, indent=2)
        print(f"WROTE {path}  ({len(self.elements)} elements)")

# ===== if called directly, just print help =====
if __name__ == "__main__":
    print("This is a helper module. Import it from another script.")
