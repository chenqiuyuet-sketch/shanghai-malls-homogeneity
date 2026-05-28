/* ============================================================
   viz_compare.js · 前滩太古里 vs 兴业太古汇 · 同与异的并置剖面
   依赖：d3 v7 全局
   入口：renderCompare({ container, data })
   说明：
     顶部三枚指标块（α / cos / D_t）表明品牌池与业态向量都很接近，
     仅楼层模板距离显著拉开；中部两幅剖面图分别呈现横向街区与
     竖向核心筒两种空间策略；中央细带提示两侧业态色谱一致。
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 64, right: 32, bottom: 80, left: 32 };

  // 顶部三指标块的版式
  const METRIC_BAND_H = 56;
  const METRIC_GAP = 14;

  // 品牌池条
  const BRAND_BAND_H = 44;
  const BRAND_CAPTION_H = 14;

  // 中部并置剖面
  const PANEL_BAND_H = 188;
  const PANEL_GAP = 110;   // 留给中央分隔条
  const LEFT_BASELINE_RATIO = 0.92;  // 左侧街区底线在面板内的纵向位置
  const LEFT_BLOCK_MAX_H = 156;      // h_norm = 1 时的最大块高

  // 注解 + 底部图例
  const ANNO_BAND_H = 32;
  const LEGEND_BAND_H = 44;

  // 业态色谱图例顺序，与 floor_mock.json 对齐
  const CAT_ORDER = ["lux", "premium", "fnb", "lifestyle", "kids", "market", "cinema", "ops"];

  function renderCompare(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const root = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    const catColor = data.category_colors;
    const catLabel = data.category_labels;
    const tooltip = createTooltip(container);

    // ---------- 顶部说明条 ----------
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 22)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "13px")
      .attr("font-weight", 500)
      .attr("fill", "var(--ink-soft)")
      .text("品牌池一致, 业态向量相近, 唯独楼层模板的距离把两种空间策略拉开");

    svg
      .append("text")
      .attr("x", width - MARGIN.right)
      .attr("y", 22)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.14em")
      .attr("fill", "var(--vermillion)")
      .text("V8 · QT.TKL vs XY.TKH");

    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 40)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.10em")
      .attr("fill", "var(--ink-mute)")
      .text("SPLIT SECTION · BRAND POOL ≡  ·  FUNCTIONAL MIX ≡  ·  FLOOR TEMPLATE ↯");

    // ---------- 1. 三枚指标块 ----------
    const metricsG = root.append("g").attr("class", "compare-metrics");

    const metrics = data.metrics;
    const pillW = (innerW - METRIC_GAP * (metrics.length - 1)) / metrics.length;

    metrics.forEach((m, i) => {
      const isDiff = m.verdict === "diff";
      const pill = metricsG
        .append("g")
        .attr("class", "compare-metric")
        .attr("transform", `translate(${i * (pillW + METRIC_GAP)}, 0)`);

      // 背板
      pill
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", pillW)
        .attr("height", METRIC_BAND_H)
        .attr("rx", 3)
        .attr("fill", isDiff ? "rgba(200, 54, 46, 0.10)" : "rgba(184, 153, 104, 0.10)")
        .attr("stroke", isDiff ? "rgba(160, 40, 34, 0.55)" : "rgba(142, 116, 73, 0.42)")
        .attr("stroke-width", isDiff ? 1.2 : 0.8);

      // 左：标签
      pill
        .append("text")
        .attr("x", 16)
        .attr("y", 22)
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "12.5px")
        .attr("font-weight", 500)
        .attr("fill", isDiff ? "var(--vermillion-d)" : "var(--ink-soft)")
        .text(m.label);

      // 左下：英文小标
      pill
        .append("text")
        .attr("x", 16)
        .attr("y", 40)
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9.5px")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "var(--ink-mute)")
        .text(metricEnglishHint(m.id));

      // 右：数值
      pill
        .append("text")
        .attr("x", pillW - 60)
        .attr("y", 32)
        .attr("text-anchor", "end")
        .attr("font-family", "var(--ff-display-latin)")
        .attr("font-size", "26px")
        .attr("font-style", "italic")
        .attr("font-weight", 600)
        .attr("fill", isDiff ? "var(--vermillion-d)" : "var(--brass-d)")
        .text(m.value.toFixed(2));

      // 右：判定符
      pill
        .append("text")
        .attr("x", pillW - 22)
        .attr("y", 32)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-latin)")
        .attr("font-size", isDiff ? "22px" : "18px")
        .attr("font-weight", 700)
        .attr("fill", isDiff ? "var(--vermillion)" : "var(--brass)")
        .text(isDiff ? "↯" : "≡");

      pill
        .append("text")
        .attr("x", pillW - 22)
        .attr("y", 47)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "10px")
        .attr("font-weight", 600)
        .attr("fill", isDiff ? "var(--vermillion)" : "var(--brass)")
        .text(isDiff ? "异" : "同");
    });

    // ---------- 2. 品牌池条 ----------
    const brandsY = METRIC_BAND_H + 22;
    const brandsG = root
      .append("g")
      .attr("class", "compare-brands")
      .attr("transform", `translate(0, ${brandsY})`);

    const brands = data.shared_brands;
    const chipGap = 8;
    const chipW = (innerW - chipGap * (brands.length - 1)) / brands.length;
    const chipH = BRAND_BAND_H - 12;

    brands.forEach((b, i) => {
      const chip = brandsG
        .append("g")
        .attr("transform", `translate(${i * (chipW + chipGap)}, 6)`);

      chip
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", chipW)
        .attr("height", chipH)
        .attr("rx", 2)
        .attr("fill", "rgba(184, 153, 104, 0.16)")
        .attr("stroke", "rgba(142, 116, 73, 0.48)")
        .attr("stroke-width", 0.6);

      chip
        .append("text")
        .attr("x", chipW / 2)
        .attr("y", chipH / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", chipW < 80 ? "10px" : "11px")
        .attr("letter-spacing", "0.06em")
        .attr("fill", "var(--ink)")
        .text(b);
    });

    // 品牌池说明
    root
      .append("text")
      .attr("x", 0)
      .attr("y", brandsY + BRAND_BAND_H + 4)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.10em")
      .attr("fill", "var(--ink-mute)")
      .text("SHARED LUXURY POOL · 10 BRANDS · OVERLAP α ≈ 0.98");

    // ---------- 3. 中部并置剖面 ----------
    const panelY = brandsY + BRAND_BAND_H + BRAND_CAPTION_H + 12;
    const panelsG = root
      .append("g")
      .attr("class", "compare-panels")
      .attr("transform", `translate(0, ${panelY})`);

    const halfW = (innerW - PANEL_GAP) / 2;
    const malls = data.malls;
    const qt = malls.find((m) => m.layout === "horizontal");
    const xy = malls.find((m) => m.layout === "vertical");

    // ---- 左：前滩太古里（横向街区） ----
    const leftG = panelsG.append("g").attr("class", "panel-left");

    // 背板
    leftG
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", halfW)
      .attr("height", PANEL_BAND_H)
      .attr("fill", "rgba(255, 252, 245, 0.5)")
      .attr("stroke", "rgba(110, 103, 96, 0.18)")
      .attr("stroke-width", 1);

    // 顶部标签
    leftG
      .append("text")
      .attr("x", 14)
      .attr("y", 18)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "13.5px")
      .attr("font-weight", 600)
      .attr("fill", "var(--ink)")
      .text(qt.name);

    leftG
      .append("text")
      .attr("x", 14)
      .attr("y", 32)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.10em")
      .attr("fill", "var(--brass-d)")
      .text(`${qt.short} · ${qt.type.toUpperCase()}`);

    // 街区基准线
    const baselineY = PANEL_BAND_H * LEFT_BASELINE_RATIO;
    const padInsideL = 18;
    const blocks = qt.blocks;
    const blockW = (halfW - padInsideL * 2 - 8 * (blocks.length - 1)) / blocks.length;

    // 地面虚线（步行街隐喻）
    leftG
      .append("line")
      .attr("x1", padInsideL - 6)
      .attr("x2", halfW - padInsideL + 6)
      .attr("y1", baselineY + 0.5)
      .attr("y2", baselineY + 0.5)
      .attr("stroke", "rgba(110, 103, 96, 0.55)")
      .attr("stroke-width", 0.8)
      .attr("stroke-dasharray", "3 3");

    blocks.forEach((b, i) => {
      const bh = b.h_norm * LEFT_BLOCK_MAX_H;
      const bx = padInsideL + i * (blockW + 8);
      const by = baselineY - bh;

      // 块体
      leftG
        .append("rect")
        .attr("x", bx)
        .attr("y", by)
        .attr("width", blockW)
        .attr("height", bh)
        .attr("fill", catColor[b.dominant])
        .attr("fill-opacity", 0.82)
        .attr("stroke", "rgba(26, 26, 26, 0.22)")
        .attr("stroke-width", 0.7)
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          d3.select(this).attr("fill-opacity", 1);
          showBlockTooltip(tooltip, event, qt, b, catLabel, container);
        })
        .on("mousemove", function (event) {
          showBlockTooltip(tooltip, event, qt, b, catLabel, container);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("fill-opacity", 0.82);
          hideTooltip(tooltip);
        });

      // 块顶楼层标签
      leftG
        .append("text")
        .attr("x", bx + blockW / 2)
        .attr("y", by - 4)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9px")
        .attr("letter-spacing", "0.06em")
        .attr("fill", "var(--ink-mute)")
        .text(b.floors);

      // 块体内中文小标，垂直排列时若高度太小则放底部
      const labelInside = bh > 56;
      leftG
        .append("text")
        .attr("x", bx + blockW / 2)
        .attr("y", labelInside ? by + 18 : baselineY + 14)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "10.5px")
        .attr("font-weight", 500)
        .attr("fill", labelInside ? "var(--paper)" : "var(--ink-soft)")
        .attr("pointer-events", "none")
        .text(b.label);
    });

    // ---- 中央分隔带 ----
    const dividerG = panelsG
      .append("g")
      .attr("class", "panel-divider")
      .attr("transform", `translate(${halfW}, 0)`);

    // 主轴线
    dividerG
      .append("line")
      .attr("x1", PANEL_GAP / 2)
      .attr("x2", PANEL_GAP / 2)
      .attr("y1", 8)
      .attr("y2", PANEL_BAND_H - 8)
      .attr("stroke", "rgba(110, 103, 96, 0.32)")
      .attr("stroke-width", 0.7)
      .attr("stroke-dasharray", "2 3");

    // 中央 VS 标
    dividerG
      .append("text")
      .attr("x", PANEL_GAP / 2)
      .attr("y", PANEL_BAND_H / 2 - 14)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-display-latin)")
      .attr("font-size", "16px")
      .attr("font-style", "italic")
      .attr("font-weight", 600)
      .attr("fill", "var(--vermillion-d)")
      .text("vs");

    dividerG
      .append("text")
      .attr("x", PANEL_GAP / 2)
      .attr("y", PANEL_BAND_H / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.18em")
      .attr("fill", "var(--ink-mute)")
      .text("D_t ≈ 0.71");

    dividerG
      .append("text")
      .attr("x", PANEL_GAP / 2)
      .attr("y", PANEL_BAND_H / 2 + 20)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "10px")
      .attr("fill", "var(--ink-mute)")
      .text("色谱共用");

    // ---- 右：兴业太古汇（竖向核心筒） ----
    const rightG = panelsG
      .append("g")
      .attr("class", "panel-right")
      .attr("transform", `translate(${halfW + PANEL_GAP}, 0)`);

    rightG
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", halfW)
      .attr("height", PANEL_BAND_H)
      .attr("fill", "rgba(255, 252, 245, 0.5)")
      .attr("stroke", "rgba(110, 103, 96, 0.18)")
      .attr("stroke-width", 1);

    rightG
      .append("text")
      .attr("x", 14)
      .attr("y", 18)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "13.5px")
      .attr("font-weight", 600)
      .attr("fill", "var(--ink)")
      .text(xy.name);

    rightG
      .append("text")
      .attr("x", 14)
      .attr("y", 32)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.10em")
      .attr("fill", "var(--brass-d)")
      .text(`${xy.short} · ${xy.type.toUpperCase()}`);

    // 楼层栈
    const stackTop = 46;
    const stackBottom = PANEL_BAND_H - 14;
    const stackH = stackBottom - stackTop;
    const stack = xy.stack;
    const layerH = stackH / stack.length;
    const padInsideR = 60;
    const stackX = padInsideR;
    const stackW = halfW - padInsideR - 30;

    // 中央核心筒虚线（贯穿楼层栈左侧的核心隐喻）
    rightG
      .append("line")
      .attr("x1", padInsideR - 18)
      .attr("x2", padInsideR - 18)
      .attr("y1", stackTop - 4)
      .attr("y2", stackBottom + 4)
      .attr("stroke", "var(--vermillion-d)")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "2 4")
      .attr("opacity", 0.55);

    rightG
      .append("text")
      .attr("x", padInsideR - 18)
      .attr("y", stackTop - 8)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9px")
      .attr("letter-spacing", "0.10em")
      .attr("fill", "var(--vermillion-d)")
      .text("核心筒");

    stack.forEach((layer, i) => {
      const ly = stackTop + i * layerH;

      // 楼层块
      rightG
        .append("rect")
        .attr("x", stackX)
        .attr("y", ly)
        .attr("width", stackW)
        .attr("height", layerH - 1.5)
        .attr("fill", catColor[layer.dominant])
        .attr("fill-opacity", 0.82)
        .attr("stroke", "rgba(26, 26, 26, 0.22)")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          d3.select(this).attr("fill-opacity", 1);
          showLayerTooltip(tooltip, event, xy, layer, catLabel, container);
        })
        .on("mousemove", function (event) {
          showLayerTooltip(tooltip, event, xy, layer, catLabel, container);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("fill-opacity", 0.82);
          hideTooltip(tooltip);
        });

      // 左侧楼层标
      rightG
        .append("text")
        .attr("x", stackX - 8)
        .attr("y", ly + layerH / 2 + 4)
        .attr("text-anchor", "end")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "10px")
        .attr("letter-spacing", "0.06em")
        .attr("fill", "var(--ink-soft)")
        .text(layer.label);

      // 右侧业态中文标
      rightG
        .append("text")
        .attr("x", stackX + 10)
        .attr("y", ly + layerH / 2 + 4)
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "10.5px")
        .attr("font-weight", 500)
        .attr("fill", "var(--paper)")
        .attr("pointer-events", "none")
        .text(catLabel[layer.dominant]);
    });

    // ---------- 4. 注解条 ----------
    const annoY = panelY + PANEL_BAND_H + 12;
    const annoG = root
      .append("g")
      .attr("class", "compare-anno")
      .attr("transform", `translate(0, ${annoY})`);

    annoG
      .append("text")
      .attr("x", 0)
      .attr("y", 12)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink-soft)")
      .text(`◀ ${qt.annotation}`);

    annoG
      .append("text")
      .attr("x", innerW)
      .attr("y", 12)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink-soft)")
      .text(`${xy.annotation} ▶`);

    // ---------- 5. 底部业态图例 ----------
    const legendY = annoY + ANNO_BAND_H;
    const legendG = root
      .append("g")
      .attr("class", "compare-legend")
      .attr("transform", `translate(0, ${legendY})`);

    legendG
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.12em")
      .attr("fill", "var(--ink-mute)")
      .text("DOMINANT CATEGORY · SHARED PALETTE");

    const itemW = innerW / CAT_ORDER.length;
    const items = legendG
      .selectAll("g.legend-item")
      .data(CAT_ORDER)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(${i * itemW}, 14)`);

    items
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", (d) => catColor[d])
      .attr("fill-opacity", 0.82);

    items
      .append("text")
      .attr("x", 20)
      .attr("y", 11)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text((d) => catLabel[d]);
  }

  // ---------- 文案与小工具 ----------
  function metricEnglishHint(id) {
    if (id === "alpha")  return "BRAND POOL OVERLAP (JACCARD)";
    if (id === "cosine") return "FUNCTIONAL VECTOR COSINE";
    if (id === "dt")     return "FLOOR TEMPLATE WASSERSTEIN";
    return "";
  }

  // ---------- Tooltip ----------
  function createTooltip(container) {
    const t = d3
      .select(container)
      .append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px")
      .style("top", "0px");
    t.append("div").attr("class", "viz-tooltip-title");
    t.append("div").attr("class", "viz-tooltip-body");
    return t;
  }

  function showBlockTooltip(tooltip, event, mall, b, catLabel, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    tooltip
      .style("left", `${x}px`)
      .style("top", `${y - 14}px`)
      .classed("visible", true);

    tooltip.select(".viz-tooltip-title").text(`${mall.short} · ${b.label}`);
    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>主导业态</span><strong>${catLabel[b.dominant]}</strong>`);
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>覆盖楼层</span><strong>${b.floors}</strong>`);
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>相对体量</span><strong>${b.h_norm.toFixed(2)}</strong>`);
  }

  function showLayerTooltip(tooltip, event, mall, layer, catLabel, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    tooltip
      .style("left", `${x}px`)
      .style("top", `${y - 14}px`)
      .classed("visible", true);

    tooltip.select(".viz-tooltip-title").text(`${mall.short} · ${layer.label}`);
    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>主导业态</span><strong>${catLabel[layer.dominant]}</strong>`);
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>所属位序</span><strong>核心筒第 ${layer.label} 层</strong>`);
  }

  function hideTooltip(tooltip) {
    tooltip.classed("visible", false);
  }

  // ---------- 暴露到全局 ----------
  window.renderCompare = renderCompare;
})();
