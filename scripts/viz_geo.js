/* ============================================================
   viz_geo.js · 上海中心城区 sDNA 通达性示意 + 13 家高端商场标点
   依赖：d3 v7 全局
   入口：renderGeo({ container, data })
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 68, right: 40, bottom: 96, left: 40 };

  // 每个热区的标签偏移，避免互相覆盖
  const LABEL_OFFSETS = {
    lujiazui: { dx: 30, dy: -4, anchor: "start" },
    jingan:   { dx: -32, dy: -16, anchor: "end" },
    renmin:   { dx: 6, dy: 32, anchor: "start" },
    xujiahui: { dx: -34, dy: 6, anchor: "end" },
    qiantan:  { dx: 28, dy: 30, anchor: "start" },
  };

  const CLUSTER_CN = {
    lujiazui: "陆家嘴",
    jingan:   "静安",
    renmin:   "人民广场",
    xujiahui: "徐家汇",
    qiantan:  "前滩",
  };

  function renderGeo(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    // ---------- 投影 ----------
    const bbox = data.bbox;
    const bboxFeature = {
      type: "Polygon",
      coordinates: [[
        [bbox[0], bbox[3]],
        [bbox[2], bbox[3]],
        [bbox[2], bbox[1]],
        [bbox[0], bbox[1]],
        [bbox[0], bbox[3]],
      ]],
    };
    const projection = d3
      .geoMercator()
      .fitExtent([[6, 6], [innerW - 6, innerH - 6]], bboxFeature);
    const path = d3.geoPath(projection);

    // ---------- Defs：热区径向渐变 + 图例线性渐变 ----------
    const defs = svg.append("defs");

    data.hot_zones.forEach((z) => {
      const grad = defs
        .append("radialGradient")
        .attr("id", `hot-${z.id}`)
        .attr("cx", 0.5)
        .attr("cy", 0.5)
        .attr("r", 0.5);
      const innerColor = z.id === "qiantan" ? "#C8362E" : "#A02822";
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", innerColor)
        .attr("stop-opacity", Math.min(0.74, z.intensity * 0.78));
      grad
        .append("stop")
        .attr("offset", "45%")
        .attr("stop-color", "#C8362E")
        .attr("stop-opacity", z.intensity * 0.34);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#C8362E")
        .attr("stop-opacity", 0);
    });

    const legendGradId = "geo-legend-gradient";
    const lg = defs
      .append("linearGradient")
      .attr("id", legendGradId)
      .attr("x1", "0%")
      .attr("x2", "100%");
    lg.append("stop").attr("offset", "0%").attr("stop-color", "#C8362E").attr("stop-opacity", 0.06);
    lg.append("stop").attr("offset", "55%").attr("stop-color", "#C8362E").attr("stop-opacity", 0.46);
    lg.append("stop").attr("offset", "100%").attr("stop-color", "#A02822").attr("stop-opacity", 0.88);

    // ---------- 主容器 ----------
    const root = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    // 底卡
    root
      .append("rect")
      .attr("x", -10)
      .attr("y", -10)
      .attr("width", innerW + 20)
      .attr("height", innerH + 20)
      .attr("fill", "rgba(255, 252, 245, 0.42)")
      .attr("stroke", "rgba(110, 103, 96, 0.18)")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    // ---------- 1. 热区径向渐变 ----------
    const hotG = root.append("g").attr("class", "geo-hot-zones");
    data.hot_zones.forEach((z) => {
      const [cx, cy] = projection(z.center);
      const [rx] = projection([z.center[0] + z.radius_deg, z.center[1]]);
      const rPx = Math.abs(rx - cx) * 1.85;
      hotG
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", rPx)
        .attr("fill", `url(#hot-${z.id})`);
    });

    // ---------- 2. 道路（在河流之下作为背景纹理） ----------
    const roadsG = root.append("g").attr("class", "geo-roads");
    const lineGen = d3
      .line()
      .x((d) => projection(d)[0])
      .y((d) => projection(d)[1])
      .curve(d3.curveCatmullRom.alpha(0.5));
    data.roads.forEach((rd) => {
      roadsG
        .append("path")
        .attr("d", lineGen(rd))
        .attr("fill", "none")
        .attr("stroke", "rgba(110, 103, 96, 0.30)")
        .attr("stroke-width", 0.7)
        .attr("stroke-dasharray", "1.4 2.4");
    });

    // ---------- 3. 黄浦江 ----------
    const riverFeature = {
      type: "Polygon",
      coordinates: [data.river.polygon.concat([data.river.polygon[0]])],
    };
    root
      .append("path")
      .datum(riverFeature)
      .attr("d", path)
      .attr("fill", "rgba(142, 116, 73, 0.18)")
      .attr("stroke", "rgba(142, 116, 73, 0.48)")
      .attr("stroke-width", 0.9);

    const centerline = data.river.centerline;
    const riverLineGen = d3
      .line()
      .x((d) => projection(d)[0])
      .y((d) => projection(d)[1])
      .curve(d3.curveCatmullRom.alpha(0.5));
    root
      .append("path")
      .attr("d", riverLineGen(centerline))
      .attr("fill", "none")
      .attr("stroke", "rgba(142, 116, 73, 0.36)")
      .attr("stroke-width", 0.5);

    // 河流标签
    const riverLabelCoord = projection([121.470, 31.213]);
    root
      .append("text")
      .attr("x", riverLabelCoord[0])
      .attr("y", riverLabelCoord[1])
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "10.5px")
      .attr("font-style", "italic")
      .attr("font-weight", 500)
      .attr("fill", "rgba(142, 116, 73, 0.72)")
      .attr("letter-spacing", "0.5em")
      .text("黄浦江");

    // ---------- 4. 热区标签 ----------
    const labelG = root.append("g").attr("class", "geo-zone-labels");
    data.hot_zones.forEach((z) => {
      const [cx, cy] = projection(z.center);
      const off = LABEL_OFFSETS[z.id] || { dx: 0, dy: -28, anchor: "middle" };
      const isAnchor = z.id === "qiantan";

      labelG
        .append("text")
        .attr("x", cx + off.dx)
        .attr("y", cy + off.dy)
        .attr("text-anchor", off.anchor)
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", isAnchor ? "13px" : "12px")
        .attr("font-weight", 600)
        .attr("fill", isAnchor ? "var(--vermillion-d)" : "var(--ink-soft)")
        .text(z.name);

      labelG
        .append("text")
        .attr("x", cx + off.dx)
        .attr("y", cy + off.dy + 13)
        .attr("text-anchor", off.anchor)
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9.5px")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "var(--ink-mute)")
        .text(`β ≈ ${z.intensity.toFixed(2)}`);
    });

    // ---------- 5. 商场标点 ----------
    const tooltip = createTooltip(container);
    const mallG = root.append("g").attr("class", "geo-malls");

    data.malls.forEach((m) => {
      const [mx, my] = projection([m.lon, m.lat]);
      const isAnchor = m.role === "anchor";

      const node = mallG.append("g").attr("class", "geo-mall");

      // 外层光晕，让符号在径向渐变上仍然清晰
      node
        .append("circle")
        .attr("cx", mx)
        .attr("cy", my)
        .attr("r", isAnchor ? 13 : 9)
        .attr("fill", "rgba(245, 241, 234, 0.72)")
        .attr("stroke", "none");

      if (isAnchor) {
        node
          .append("rect")
          .attr("x", mx - 5.5)
          .attr("y", my - 5.5)
          .attr("width", 11)
          .attr("height", 11)
          .attr("transform", `rotate(45 ${mx} ${my})`)
          .attr("fill", "var(--vermillion)")
          .attr("stroke", "var(--paper)")
          .attr("stroke-width", 1.4);
      } else {
        node
          .append("circle")
          .attr("cx", mx)
          .attr("cy", my)
          .attr("r", 4.4)
          .attr("fill", "var(--brass)")
          .attr("stroke", "var(--paper)")
          .attr("stroke-width", 1.1);
      }

      // 透明命中区
      node
        .append("circle")
        .attr("cx", mx)
        .attr("cy", my)
        .attr("r", 13)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          showMallTooltip(tooltip, event, m, container);
        })
        .on("mousemove", function (event) {
          showMallTooltip(tooltip, event, m, container);
        })
        .on("mouseleave", function () {
          hideTooltip(tooltip);
        });
    });

    // ---------- 6. 前滩离群标注 ----------
    const [ax, ay] = projection([121.522, 31.181]);
    const calloutX = ax + 68;
    const calloutY = ay + 42;
    const callG = root.append("g").attr("class", "geo-callout");

    callG
      .append("path")
      .attr("d", `M ${ax + 8} ${ay + 8} L ${calloutX - 6} ${calloutY - 14}`)
      .attr("fill", "none")
      .attr("stroke", "var(--vermillion)")
      .attr("stroke-width", 0.9)
      .attr("stroke-dasharray", "2 2");

    callG
      .append("text")
      .attr("x", calloutX)
      .attr("y", calloutY - 12)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11.5px")
      .attr("font-weight", 600)
      .attr("fill", "var(--vermillion-d)")
      .text("锚点 · 前滩太古里");

    callG
      .append("text")
      .attr("x", calloutX)
      .attr("y", calloutY + 4)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.06em")
      .attr("fill", "var(--ink-mute)")
      .text("β = 0.42");

    callG
      .append("text")
      .attr("x", calloutX)
      .attr("y", calloutY + 18)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.06em")
      .attr("fill", "var(--ink-mute)")
      .text("其余 12 家中位 0.87");

    // ---------- 顶部说明 ----------
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 22)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "13px")
      .attr("font-weight", 500)
      .attr("fill", "var(--ink-soft)")
      .text("上海中心城区示意，朱砂红强带代表高 sDNA-betweenness 区段，前滩独立成弱带");

    svg
      .append("text")
      .attr("x", width - MARGIN.right)
      .attr("y", 22)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.14em")
      .attr("fill", "var(--vermillion)")
      .text("R = 1 KM · n = 13");

    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 40)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.10em")
      .attr("fill", "var(--ink-mute)")
      .text("SHANGHAI · CENTRAL DISTRICTS · SCHEMATIC");

    // ---------- 底部图例 ----------
    const legendY = innerH + 32;
    const legend = root
      .append("g")
      .attr("class", "geo-legend")
      .attr("transform", `translate(0, ${legendY})`);

    // 左：可达性梯度条
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.12em")
      .attr("fill", "var(--ink-mute)")
      .text("ACCESSIBILITY · sDNA β");

    const barW = 280;
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 12)
      .attr("width", barW)
      .attr("height", 10)
      .attr("fill", `url(#${legendGradId})`)
      .attr("stroke", "rgba(110, 103, 96, 0.22)")
      .attr("stroke-width", 0.5);

    data.legend.stops.forEach((s, i, arr) => {
      const xp = (i / (arr.length - 1)) * barW;
      legend
        .append("text")
        .attr("x", xp)
        .attr("y", 36)
        .attr("text-anchor", i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9.5px")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "var(--ink-mute)")
        .text(s.label);
    });

    // 右：商场符号
    const mallLegend = legend
      .append("g")
      .attr("transform", `translate(${innerW - 260}, 0)`);

    mallLegend
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.12em")
      .attr("fill", "var(--ink-mute)")
      .text("MALL · 13 HIGH-END");

    const anchorMarker = mallLegend.append("g").attr("transform", "translate(8, 22)");
    anchorMarker
      .append("rect")
      .attr("x", -5.5)
      .attr("y", -5.5)
      .attr("width", 11)
      .attr("height", 11)
      .attr("transform", "rotate(45)")
      .attr("fill", "var(--vermillion)")
      .attr("stroke", "var(--paper)")
      .attr("stroke-width", 1.2);
    anchorMarker
      .append("text")
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text("研究锚点");

    const highMarker = mallLegend.append("g").attr("transform", "translate(118, 22)");
    highMarker
      .append("circle")
      .attr("r", 4.4)
      .attr("fill", "var(--brass)")
      .attr("stroke", "var(--paper)")
      .attr("stroke-width", 1.1);
    highMarker
      .append("text")
      .attr("x", 11)
      .attr("y", 4)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text("高端商场");

    // 河流符号
    const riverMarker = mallLegend.append("g").attr("transform", "translate(208, 22)");
    riverMarker
      .append("rect")
      .attr("x", -6)
      .attr("y", -3.5)
      .attr("width", 12)
      .attr("height", 7)
      .attr("fill", "rgba(142, 116, 73, 0.22)")
      .attr("stroke", "rgba(142, 116, 73, 0.55)")
      .attr("stroke-width", 0.6);
    riverMarker
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text("黄浦江");
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

  function showMallTooltip(tooltip, event, m, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    tooltip
      .style("left", `${x}px`)
      .style("top", `${y - 14}px`)
      .classed("visible", true);

    tooltip.select(".viz-tooltip-title").text(m.name);

    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>区位</span><strong>${CLUSTER_CN[m.cluster] || m.cluster}</strong>`);
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>sDNA · β</span><strong>${m.sdna.toFixed(2)}</strong>`);
    if (m.role === "anchor") {
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .html(`<span>角色</span><strong style="color:var(--vermillion)">研究锚点</strong>`);
    }
  }

  function hideTooltip(tooltip) {
    tooltip.classed("visible", false);
  }

  // ---------- 暴露到全局 ----------
  window.renderGeo = renderGeo;
})();
