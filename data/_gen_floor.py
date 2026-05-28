"""Generate floor_mock.json — three malls' real-floor stack vs B/G/M/T template.

Showcases the abstraction step used by V4 (Wasserstein distance).  Three malls
chosen because they illustrate three distinct floor patterns:
  1. 前滩太古里 (QT_TKL):   横向开放街区, 4 个低层街区 + 1 顶层, no deep basement
  2. 兴业太古汇 (XY_TKH):   竖向核心筒, B2–6F, 奢侈品在 1–3F
  3. 上海国金中心 (IFC):    传统竖向, LG2–LG1–GF–L1–L2–L3, 奢侈品集中 LG-GF

Real floors map onto the 4-level template B/G/M/T:
  B (下沉):   LG2 LG1 B2 B1
  G (入口):   GF L1 (1F 2F if 含街区)
  M (中层):   L2 L3 L4 (mid-floor cluster)
  T (目的地): L5 L6 L7 RT (top + rooftop)

Each real floor carries a dominant `mix` (vector over 8 categories summing to 1):
  lux  premium  fnb  lifestyle  kids  market  cinema  ops

The template floor's mix is the mean of the real floors that map into it,
yielding the P_i matrix used downstream by V4.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Category palette (matches MHI_f vector used in V3 heatmap)
CATS = ["lux", "premium", "fnb", "lifestyle", "kids", "market", "cinema", "ops"]
CAT_LABELS = {
    "lux":       "奢侈",
    "premium":   "轻奢",
    "fnb":       "餐饮",
    "lifestyle": "生活方式",
    "kids":      "儿童",
    "market":    "超市",
    "cinema":    "影院",
    "ops":       "办公辅助",
}
# Dominant-category colors (sample-aligned with V3 heatmap palette)
CAT_COLORS = {
    "lux":       "#A02822",  # vermillion-d
    "premium":   "#C8362E",  # vermillion
    "fnb":       "#B89968",  # brass
    "lifestyle": "#8E7449",  # brass-d
    "kids":      "#D9C28A",  # warm sand
    "market":    "#7A7A4D",  # viz olive
    "cinema":    "#3D5A7B",  # viz blue
    "ops":       "#8B8276",  # warm gray
}


def mix(**kw):
    """Build an 8-d mix vector from kwargs, missing keys are 0."""
    v = {c: 0.0 for c in CATS}
    for k, x in kw.items():
        if k not in v:
            raise KeyError(k)
        v[k] = x
    s = sum(v.values())
    if abs(s - 1.0) > 1e-3:
        raise ValueError(f"mix must sum to 1, got {s}: {v}")
    return v


def dominant(m):
    return max(CATS, key=lambda c: m[c])


# ============================================================
# Mall 1: 前滩太古里 (QT_TKL)
# 横向开放街区, 实际只有 5 个有效"楼层"（街区平层）
# ============================================================
qt_real = [
    {"label": "B1",  "h": 1, "mix": mix(market=0.5, fnb=0.3, ops=0.2),
     "template": "B"},
    {"label": "G",   "h": 1, "mix": mix(lux=0.45, premium=0.30, fnb=0.15, lifestyle=0.10),
     "template": "G"},
    {"label": "1F",  "h": 1, "mix": mix(lux=0.40, premium=0.35, lifestyle=0.15, fnb=0.10),
     "template": "G"},
    {"label": "2F",  "h": 1, "mix": mix(premium=0.40, lifestyle=0.30, fnb=0.20, kids=0.10),
     "template": "M"},
    {"label": "RT",  "h": 1, "mix": mix(fnb=0.55, lifestyle=0.30, lux=0.15),
     "template": "T"},
]

# ============================================================
# Mall 2: 兴业太古汇 (XY_TKH)
# 竖向核心筒, 8 层
# ============================================================
xy_real = [
    {"label": "B2",  "h": 1, "mix": mix(market=0.60, fnb=0.30, ops=0.10),
     "template": "B"},
    {"label": "B1",  "h": 1, "mix": mix(fnb=0.45, market=0.30, lifestyle=0.25),
     "template": "B"},
    {"label": "GF",  "h": 1, "mix": mix(lux=0.70, premium=0.20, lifestyle=0.10),
     "template": "G"},
    {"label": "L1",  "h": 1, "mix": mix(lux=0.55, premium=0.30, lifestyle=0.15),
     "template": "G"},
    {"label": "L2",  "h": 1, "mix": mix(premium=0.50, lifestyle=0.30, fnb=0.20),
     "template": "M"},
    {"label": "L3",  "h": 1, "mix": mix(lifestyle=0.45, premium=0.25, kids=0.20, fnb=0.10),
     "template": "M"},
    {"label": "L4",  "h": 1, "mix": mix(fnb=0.45, kids=0.30, lifestyle=0.25),
     "template": "T"},
    {"label": "L5",  "h": 1, "mix": mix(fnb=0.55, cinema=0.30, ops=0.15),
     "template": "T"},
]

# ============================================================
# Mall 3: 上海国金中心 (IFC)
# 传统竖向, 含双层 LG, 共 6 层
# ============================================================
ifc_real = [
    {"label": "LG2", "h": 1, "mix": mix(fnb=0.45, market=0.35, ops=0.20),
     "template": "B"},
    {"label": "LG1", "h": 1, "mix": mix(lux=0.50, premium=0.30, lifestyle=0.20),
     "template": "B"},
    {"label": "GF",  "h": 1, "mix": mix(lux=0.65, premium=0.25, lifestyle=0.10),
     "template": "G"},
    {"label": "L1",  "h": 1, "mix": mix(lux=0.55, premium=0.30, lifestyle=0.15),
     "template": "G"},
    {"label": "L2",  "h": 1, "mix": mix(premium=0.45, lifestyle=0.35, fnb=0.20),
     "template": "M"},
    {"label": "L3",  "h": 1, "mix": mix(fnb=0.60, lifestyle=0.25, cinema=0.15),
     "template": "T"},
]


def aggregate(real_floors):
    """Return the 4-row template matrix P_i by averaging real-floor mixes."""
    tmpl_floors = []
    for code in ["B", "G", "M", "T"]:
        members = [f for f in real_floors if f["template"] == code]
        if not members:
            tmpl_floors.append({
                "code": code,
                "mix": {c: 0.0 for c in CATS},
                "empty": True,
                "members": [],
            })
            continue
        weight_sum = sum(f["h"] for f in members)
        avg = {c: 0.0 for c in CATS}
        for f in members:
            for c in CATS:
                avg[c] += f["mix"][c] * f["h"] / weight_sum
        # Normalize tiny drift
        s = sum(avg.values())
        if s > 0:
            avg = {c: avg[c] / s for c in CATS}
        tmpl_floors.append({
            "code": code,
            "mix": avg,
            "empty": False,
            "members": [f["label"] for f in members],
        })
    return tmpl_floors


def annotate(real_floors):
    """Attach dominant category to each floor for fill color."""
    out = []
    for f in real_floors:
        d = dominant(f["mix"])
        out.append({**f, "dominant": d})
    return out


malls = [
    {
        "id": "QT_TKL",
        "name": "前滩太古里",
        "short": "QT.TKL",
        "type": "横向开放街区",
        "n_real": len(qt_real),
        "real": annotate(qt_real),
        "template": aggregate(qt_real),
    },
    {
        "id": "XY_TKH",
        "name": "兴业太古汇",
        "short": "XY.TKH",
        "type": "竖向核心筒",
        "n_real": len(xy_real),
        "real": annotate(xy_real),
        "template": aggregate(xy_real),
    },
    {
        "id": "IFC",
        "name": "上海国金中心",
        "short": "IFC",
        "type": "传统竖向",
        "n_real": len(ifc_real),
        "real": annotate(ifc_real),
        "template": aggregate(ifc_real),
    },
]

out = {
    "_note": (
        "三家高端商场实际楼层 → B/G/M/T 四级模板的抽象示意。"
        "左列为实际楼层栈，右列为模板对齐后的累积分布；"
        "颜色编码业态主导类别，连线展示真实楼层向模板层的归并关系。"
    ),
    "template_codes": ["B", "G", "M", "T"],
    "template_labels": {
        "B": "下沉层",
        "G": "入口层",
        "M": "中层",
        "T": "目的地层",
    },
    "categories": CATS,
    "category_labels": CAT_LABELS,
    "category_colors": CAT_COLORS,
    "malls": malls,
}

out_path = HERE / "floor_mock.json"
out_path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

# Sanity probes
for m in malls:
    tmpl_dom = [t["mix"] for t in m["template"] if not t["empty"]]
    print(f"{m['name']:8s}: real={m['n_real']:2d}floors  template_filled={len(tmpl_dom)}/4")

print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")
