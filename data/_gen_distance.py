"""Generate distance_mock.json — an 80×80 demo Wasserstein matrix.

Order: anchor (QT_TKL) first, then 12 highend sorted by MHI_i ascending,
then 67 standard sorted by MHI_i ascending.  The matrix is symmetric and
deliberately structured so the top-left 13×13 block reads as the high-end
cluster, while the standard block has visible sub-clusters (Wanda template,
outlet, lifestyle street).  Values are W₁ on B/G/M/T floor templates,
clamped to [0, 1].
"""
import json
import math
import random
from pathlib import Path

random.seed(20260522)

HERE = Path(__file__).resolve().parent
QUAD = json.loads((HERE / "quadrant_mock.json").read_text(encoding="utf-8"))

# Sort by MHI_i ascending (anchor pinned to index 0)
anchor = next(m for m in QUAD["malls"] if m["role"] == "anchor")
highend = sorted(
    [m for m in QUAD["malls"] if m["role"] == "highend"],
    key=lambda m: m["x"],
)
standard = sorted(
    [m for m in QUAD["malls"] if m["role"] == "standard"],
    key=lambda m: m["x"],
)
malls = [anchor] + highend + standard
assert len(malls) == 80, f"expected 80 malls, got {len(malls)}"

# Cluster tags for standard malls — used to bias distances
WANDA_KEYS = ["万达"]
OUTLET_KEYS = ["奥莱", "佛罗伦萨", "杉杉"]
STREETBLK_KEYS = ["新天地", "丰盛里", "张园", "鸿寿坊", "蟠龙", "瑞虹"]
MIXC_KEYS = ["万象"]
COMMUNITY_KEYS = ["印象", "龙之梦", "万达", "百联"]


def tag(name: str) -> str:
    for k in WANDA_KEYS:
        if k in name:
            return "wanda"
    for k in OUTLET_KEYS:
        if k in name:
            return "outlet"
    for k in STREETBLK_KEYS:
        if k in name:
            return "street"
    for k in MIXC_KEYS:
        if k in name:
            return "mixc"
    for k in COMMUNITY_KEYS:
        if k in name:
            return "chain"
    return "other"


tags = [tag(m["name"]) for m in malls]


def base_distance(i: int, j: int) -> float:
    """Return an unjittered base distance reflecting the structural prior."""
    if i == j:
        return 0.0
    role_i = malls[i]["role"]
    role_j = malls[j]["role"]
    # Anchor <-> highend
    if {role_i, role_j} == {"anchor", "highend"}:
        # closer to top high-end (low MHI_i), further from K11 etc.
        return 0.10 + abs(malls[i]["x"] - malls[j]["x"]) * 0.6
    # Anchor <-> standard
    if {role_i, role_j} == {"anchor", "standard"}:
        return 0.42 + abs(malls[i]["x"] - malls[j]["x"]) * 0.55
    # Highend <-> highend
    if role_i == "highend" and role_j == "highend":
        return 0.14 + abs(malls[i]["x"] - malls[j]["x"]) * 0.85
    # Highend <-> standard
    if {role_i, role_j} == {"highend", "standard"}:
        return 0.48 + abs(malls[i]["x"] - malls[j]["x"]) * 0.45
    # Standard <-> standard, with cluster bias
    if role_i == "standard" and role_j == "standard":
        t_i, t_j = tags[i], tags[j]
        if t_i == t_j and t_i != "other":
            # Same sub-cluster — short distance
            cluster_base = {
                "wanda": 0.08,
                "outlet": 0.12,
                "street": 0.16,
                "mixc": 0.18,
                "chain": 0.22,
            }.get(t_i, 0.30)
            return cluster_base + abs(malls[i]["x"] - malls[j]["x"]) * 0.5
        return 0.30 + abs(malls[i]["x"] - malls[j]["x"]) * 0.7
    return 0.5


n = len(malls)
matrix = [[0.0] * n for _ in range(n)]
for i in range(n):
    for j in range(i + 1, n):
        b = base_distance(i, j)
        jitter = random.uniform(-0.04, 0.04)
        v = max(0.02, min(0.98, b + jitter))
        matrix[i][j] = round(v, 3)
        matrix[j][i] = matrix[i][j]

# Sanity probes
hh_mean = sum(matrix[i][j] for i in range(13) for j in range(i + 1, 13)) / 78
hs_mean = sum(matrix[i][j] for i in range(13) for j in range(13, 80)) / (13 * 67)
ss_mean = sum(matrix[i][j] for i in range(13, 80) for j in range(i + 1, 80)) / (67 * 66 / 2)

print(f"high-end block mean: {hh_mean:.3f}")
print(f"high-end ↔ standard mean: {hs_mean:.3f}")
print(f"standard block mean: {ss_mean:.3f}")

# Short codes for axis labels (max ~6 chars when CJK)
short_codes = []
for m in malls:
    n_chars = m["name"]
    if len(n_chars) <= 5:
        short_codes.append(n_chars)
    else:
        short_codes.append(n_chars[:4] + "…")

out = {
    "_note": (
        "80×80 楼层模板 Wasserstein W₁ 距离矩阵 · demo 阶段示意数据。"
        "顺序按 MHI_i 升序重排（锚点 QT_TKL 固定首位），左上角 13×13 即高端子集 D^H。"
        "数值越小，两商场的 B/G/M/T 业态分布越接近。"
    ),
    "axes": {
        "metric": "W₁",
        "min": 0.0,
        "max": 1.0,
        "row_label": "商场 i（按 MHI_i 升序）",
        "col_label": "商场 j（按 MHI_i 升序）",
    },
    "highend_block_size": 13,
    "anchor_index": 0,
    "malls": [
        {
            "id": m["id"],
            "name": m["name"],
            "short": short_codes[k],
            "role": m["role"],
            "mhi_i": m["x"],
            "cluster": tags[k] if m["role"] == "standard" else m["role"],
        }
        for k, m in enumerate(malls)
    ],
    "matrix": matrix,
}

out_path = HERE / "distance_mock.json"
out_path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"wrote {out_path} ({out_path.stat().st_size // 1024} KB)")
