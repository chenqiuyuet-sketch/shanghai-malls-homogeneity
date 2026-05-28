"""Generate compare_mock.json — V8 前滩 vs 兴业 split-screen.

V8 argument: same luxury brand pool (alpha ≈ 0.98), near-identical functional
mix (cosine ≈ 0.94), but radically different spatial logic on the floor-
template axis (Wasserstein D_t ≈ 0.71).

Output drives a two-panel SVG: brand chip row on top to establish similarity,
schematic section drawing in the middle to show divergence, and a centre
divider that prints all three metrics.

Categories and colors are aligned with V7 (floor_mock.json).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

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
CAT_COLORS = {
    "lux":       "#A02822",
    "premium":   "#C8362E",
    "fnb":       "#B89968",
    "lifestyle": "#8E7449",
    "kids":      "#D9C28A",
    "market":    "#7A7A4D",
    "cinema":    "#3D5A7B",
    "ops":       "#8B8276",
}

# Shared luxury brand pool — 10 names common to both malls
SHARED_BRANDS = [
    "LV", "GUCCI", "DIOR", "PRADA", "HERMÈS",
    "CELINE", "VALENTINO", "BV", "LOEWE", "MIU MIU",
]

# Three headline metrics (mock but plausible)
METRICS = [
    {"id": "alpha",  "label": "α · 品牌池一致度",   "value": 0.98, "verdict": "same"},
    {"id": "cosine", "label": "cos · 业态向量相似",  "value": 0.94, "verdict": "same"},
    {"id": "dt",     "label": "D_t · 楼层模板距离", "value": 0.71, "verdict": "diff"},
]

# Left: 前滩太古里 — 5 building footprints, open-block layout
qt = {
    "id": "QT_TKL",
    "name": "前滩太古里",
    "short": "QT.TKL",
    "type": "横向 · 开放街区",
    "layout": "horizontal",
    "annotation": "5 个独立体量沿步行街铺展, 业态在水平方向铺展",
    "blocks": [
        # x_idx left→right, w 宽度比, h_norm 体量高度（视觉上的相对高度）
        {"label": "B1·街区超市",   "dominant": "market",    "h_norm": 0.55, "floors": "B1"},
        {"label": "S1·奢侈品街区", "dominant": "lux",       "h_norm": 0.90, "floors": "G·1F·2F"},
        {"label": "S2·轻奢街区",   "dominant": "premium",   "h_norm": 0.95, "floors": "G·1F·2F"},
        {"label": "S3·生活方式",   "dominant": "lifestyle", "h_norm": 0.80, "floors": "G·1F·2F"},
        {"label": "RT·屋顶餐饮",   "dominant": "fnb",       "h_norm": 0.60, "floors": "RT"},
    ],
}

# Right: 兴业太古汇 — 8 stacked layers, vertical core
xy = {
    "id": "XY_TKH",
    "name": "兴业太古汇",
    "short": "XY.TKH",
    "type": "竖向 · 核心筒",
    "layout": "vertical",
    "annotation": "8 个楼层沿垂直核心筒堆叠, 业态在垂直方向分层",
    "stack": [
        # top→bottom
        {"label": "L5", "dominant": "fnb",       "share": 1.0},
        {"label": "L4", "dominant": "fnb",       "share": 1.0},
        {"label": "L3", "dominant": "lifestyle", "share": 1.0},
        {"label": "L2", "dominant": "premium",   "share": 1.0},
        {"label": "L1", "dominant": "lux",       "share": 1.0},
        {"label": "GF", "dominant": "lux",       "share": 1.0},
        {"label": "B1", "dominant": "fnb",       "share": 1.0},
        {"label": "B2", "dominant": "market",    "share": 1.0},
    ],
}

out = {
    "_note": (
        "V8 前滩太古里 vs 兴业太古汇并置剖面对照。"
        "顶部品牌池与中部业态相似度都很高（α≈0.98, cos≈0.94），"
        "但楼层模板距离显著拉开（D_t≈0.71）。"
        "可视化用同样的色谱标注业态层级，左横右纵分别体现两种空间策略。"
    ),
    "categories": CATS,
    "category_labels": CAT_LABELS,
    "category_colors": CAT_COLORS,
    "shared_brands": SHARED_BRANDS,
    "metrics": METRICS,
    "malls": [qt, xy],
}

out_path = HERE / "compare_mock.json"
out_path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

print(f"shared brands: {len(SHARED_BRANDS)}")
print(f"left blocks: {len(qt['blocks'])} / right layers: {len(xy['stack'])}")
print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")
