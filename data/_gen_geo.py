"""Generate geo_mock.json — Shanghai central city schematic for V6.

The figure is not a real GIS choropleth; it is a teaching schematic with:
  • Huangpu river corridor (simplified centerline)
  • 4 sDNA accessibility hot-zones (radial gradients) representing main
    central-city integrators: Lujiazui / Jing'an / Xujiahui / Renmin Sq
  • 1 weaker hot-zone for Qiantan (the anchor's neighborhood)
  • 13 high-end mall points with approximate WGS84 coordinates

Downstream viz uses d3.geoMercator().fitExtent(bbox).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Bounding box for fitExtent: [west, south, east, north]
BBOX = [121.392, 31.158, 121.580, 31.302]

# Huangpu river centerline, north → south (lon, lat)
RIVER_CENTERLINE = [
    [121.498, 31.298],
    [121.488, 31.276],
    [121.483, 31.255],
    [121.494, 31.240],   # Lujiazui east bend
    [121.510, 31.232],
    [121.501, 31.218],
    [121.485, 31.202],
    [121.488, 31.188],
    [121.498, 31.175],   # near Qiantan
    [121.515, 31.165],
]
# River band width in degrees (~500m at this latitude)
RIVER_HALFWIDTH = 0.0045

# Build a closed river polygon by offsetting centerline +/- halfwidth perpendicular
def perp_offset(centerline, halfwidth):
    """Return left bank then reversed right bank to close polygon."""
    left = []
    right = []
    for i, (x, y) in enumerate(centerline):
        if i == 0:
            dx = centerline[1][0] - x
            dy = centerline[1][1] - y
        elif i == len(centerline) - 1:
            dx = x - centerline[-2][0]
            dy = y - centerline[-2][1]
        else:
            dx = centerline[i + 1][0] - centerline[i - 1][0]
            dy = centerline[i + 1][1] - centerline[i - 1][1]
        ln = (dx * dx + dy * dy) ** 0.5
        nx, ny = -dy / ln, dx / ln
        left.append([x + nx * halfwidth, y + ny * halfwidth])
        right.append([x - nx * halfwidth, y - ny * halfwidth])
    return left + list(reversed(right))


RIVER_POLY = perp_offset(RIVER_CENTERLINE, RIVER_HALFWIDTH)

# sDNA hot-zones: high-accessibility cores (where betweenness is dense).
# Each zone is rendered as a radial gradient (deep vermillion → transparent).
HOT_ZONES = [
    {
        "id": "lujiazui",
        "name": "陆家嘴",
        "center": [121.504, 31.236],
        "radius_deg": 0.012,
        "intensity": 0.95,
    },
    {
        "id": "jingan",
        "name": "静安南京西路",
        "center": [121.450, 31.231],
        "radius_deg": 0.014,
        "intensity": 0.92,
    },
    {
        "id": "renmin",
        "name": "人民广场",
        "center": [121.475, 31.232],
        "radius_deg": 0.010,
        "intensity": 0.88,
    },
    {
        "id": "xujiahui",
        "name": "徐家汇",
        "center": [121.434, 31.197],
        "radius_deg": 0.011,
        "intensity": 0.86,
    },
    # Anchor neighborhood — visibly weaker
    {
        "id": "qiantan",
        "name": "前滩",
        "center": [121.522, 31.181],
        "radius_deg": 0.010,
        "intensity": 0.42,
    },
]

# 13 high-end malls (approximate WGS84 coords)
MALLS = [
    {"id": "QT_TKL",   "name": "前滩太古里",     "short": "QT.TKL",   "lon": 121.522, "lat": 31.181, "role": "anchor",  "sdna": 0.42, "cluster": "qiantan"},
    {"id": "XY_TKH",   "name": "兴业太古汇",     "short": "XY.TKH",   "lon": 121.460, "lat": 31.230, "role": "highend", "sdna": 0.86, "cluster": "jingan"},
    {"id": "IFC",      "name": "上海国金中心",   "short": "IFC",      "lon": 121.506, "lat": 31.238, "role": "highend", "sdna": 0.95, "cluster": "lujiazui"},
    {"id": "HL_PLZ",   "name": "恒隆广场",       "short": "HL",       "lon": 121.443, "lat": 31.230, "role": "highend", "sdna": 0.92, "cluster": "jingan"},
    {"id": "GH_HL",    "name": "港汇恒隆",       "short": "GH.HL",    "lon": 121.434, "lat": 31.196, "role": "highend", "sdna": 0.86, "cluster": "xujiahui"},
    {"id": "KERRY",    "name": "嘉里中心",       "short": "KERRY",    "lon": 121.452, "lat": 31.228, "role": "highend", "sdna": 0.90, "cluster": "jingan"},
    {"id": "K11",      "name": "K11",            "short": "K11",      "lon": 121.473, "lat": 31.230, "role": "highend", "sdna": 0.88, "cluster": "renmin"},
    {"id": "JIUGUANG", "name": "久光百货",       "short": "JG",       "lon": 121.451, "lat": 31.232, "role": "highend", "sdna": 0.91, "cluster": "jingan"},
    {"id": "RAFFLES",  "name": "来福士广场",     "short": "RAFFLES",  "lon": 121.475, "lat": 31.234, "role": "highend", "sdna": 0.88, "cluster": "renmin"},
    {"id": "KERRY_PB", "name": "嘉里不夜城",     "short": "KR.PB",    "lon": 121.452, "lat": 31.250, "role": "highend", "sdna": 0.78, "cluster": "jingan"},
    {"id": "K11_PD",   "name": "浦东嘉里城",     "short": "PD.KR",    "lon": 121.561, "lat": 31.219, "role": "highend", "sdna": 0.74, "cluster": "lujiazui"},
    {"id": "SKP",      "name": "SKP上海",        "short": "SKP",      "lon": 121.408, "lat": 31.213, "role": "highend", "sdna": 0.80, "cluster": "xujiahui"},
    {"id": "BFC",      "name": "BFC外滩金融中心", "short": "BFC",      "lon": 121.495, "lat": 31.232, "role": "highend", "sdna": 0.87, "cluster": "renmin"},
]

# District labels (lon, lat, name)
DISTRICTS = [
    {"name": "陆家嘴金融城", "lon": 121.505, "lat": 31.245, "kind": "core"},
    {"name": "南京西路",     "lon": 121.448, "lat": 31.236, "kind": "core"},
    {"name": "人民广场",     "lon": 121.477, "lat": 31.240, "kind": "core"},
    {"name": "徐家汇",       "lon": 121.434, "lat": 31.193, "kind": "core"},
    {"name": "前滩",         "lon": 121.524, "lat": 31.176, "kind": "anchor"},
    {"name": "黄浦江",       "lon": 121.495, "lat": 31.222, "kind": "river"},
]

# Schematic arterial road polylines (for texture only)
ROADS = [
    # 延安东路 - 延安西路 横向主干
    [[121.395, 31.225], [121.425, 31.225], [121.450, 31.227], [121.480, 31.230], [121.498, 31.233]],
    # 世纪大道 (浦东斜向)
    [[121.500, 31.232], [121.525, 31.225], [121.555, 31.218]],
    # 南北高架
    [[121.465, 31.290], [121.467, 31.250], [121.468, 31.215], [121.470, 31.180]],
    # 龙阳路 (浦东南北)
    [[121.530, 31.250], [121.527, 31.215], [121.522, 31.180], [121.520, 31.160]],
    # 沪闵高架 (徐家汇向南)
    [[121.435, 31.200], [121.420, 31.180], [121.408, 31.165]],
    # 内环北侧
    [[121.395, 31.260], [121.425, 31.272], [121.465, 31.278], [121.500, 31.275]],
    # 内环南侧
    [[121.420, 31.180], [121.445, 31.175], [121.475, 31.172], [121.510, 31.170]],
]

out = {
    "_note": (
        "上海中心城区 sDNA-betweenness 示意（demo 阶段）。"
        "底图为简化黄浦江廊道与主干路网；4 个高强度可达性热区分别对应陆家嘴 / 静安 / 人民广场 / 徐家汇，"
        "前滩区独立成第 5 个弱热区。13 家高端商场点位按真实经纬度叠加。"
    ),
    "bbox": BBOX,
    "river": {
        "centerline": RIVER_CENTERLINE,
        "polygon": RIVER_POLY,
    },
    "hot_zones": HOT_ZONES,
    "roads": ROADS,
    "districts": DISTRICTS,
    "malls": MALLS,
    "legend": {
        "title": "sDNA · 1km 半径 betweenness 中位数",
        "stops": [
            {"v": 0.30, "label": "低"},
            {"v": 0.55, "label": "中"},
            {"v": 0.80, "label": "高"},
            {"v": 0.95, "label": "极高"},
        ],
    },
}

out_path = HERE / "geo_mock.json"
out_path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

n_anchor = sum(1 for m in MALLS if m["role"] == "anchor")
print(f"malls: {len(MALLS)} (anchor: {n_anchor})")
print(f"hot zones: {len(HOT_ZONES)}")
print(f"roads: {len(ROADS)} polylines")
print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")
