/* ============================================================
   viz_integration.js · 整合度地理散点（接姚的 80 商场整合度数据）
   使用 d3.geoMercator 投影，修正经纬度直接当 XY 导致的比例失真。
   入口：renderIntegration({ container, data })
   data: Array<{rank, name, lng, lat, mean_dist_km, integration}>
   ============================================================ */
(function () {
  "use strict";

  const MARGIN = { top: 30, right: 130, bottom: 36, left: 36 };

  function renderIntegration(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%").attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    // ---------- 几何正确的墨卡托投影 ----------
    // 把 80 商场点云用 fitSize 自动适配到 innerW × innerH
    const points = {
      type: "MultiPoint",
      coordinates: data.map((d) => [d.lng, d.lat])
    };
    const projection = d3.geoMercator().fitSize([innerW, innerH], points);
    const project = (lng, lat) => projection([lng, lat]);

    // ---------- 背景框 ----------
    g.append("rect")
      .attr("width", innerW).attr("height", innerH)
      .attr("fill", "#FAF7F0")
      .attr("stroke", "var(--rule)")
      .attr("stroke-width", 0.5);

    // ---------- 经纬度参考网格（每 0.1°） ----------
    const lngExtent = d3.extent(data, (d) => d.lng);
    const latExtent = d3.extent(data, (d) => d.lat);
    const lngLines = d3.range(Math.floor(lngExtent[0] * 10) / 10, Math.ceil(lngExtent[1] * 10) / 10 + 0.001, 0.1);
    const latLines = d3.range(Math.floor(latExtent[0] * 10) / 10, Math.ceil(latExtent[1] * 10) / 10 + 0.001, 0.2);

    const gridG = g.append("g").attr("class", "geo-grid");
    lngLines.forEach((lng) => {
      const p1 = project(lng, latExtent[0]);
      const p2 = project(lng, latExtent[1]);
      if (p1 && p2) {
        gridG.append("line")
          .attr("x1", p1[0]).attr("y1", p1[1])
          .attr("x2", p2[0]).attr("y2", p2[1])
          .attr("stroke", "var(--rule)").attr("stroke-width", 0.4).attr("opacity", 0.4);
        gridG.append("text")
          .attr("x", p2[0]).attr("y", p2[1] + 12)
          .attr("text-anchor", "middle")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "8.5px")
          .attr("fill", "var(--ink-mute)")
          .text(`${lng.toFixed(1)}°E`);
      }
    });
    latLines.forEach((lat) => {
      const p1 = project(lngExtent[0], lat);
      const p2 = project(lngExtent[1], lat);
      if (p1 && p2) {
        gridG.append("line")
          .attr("x1", p1[0]).attr("y1", p1[1])
          .attr("x2", p2[0]).attr("y2", p2[1])
          .attr("stroke", "var(--rule)").attr("stroke-width", 0.4).attr("opacity", 0.4);
        gridG.append("text")
          .attr("x", p1[0] - 4).attr("y", p1[1] + 3)
          .attr("text-anchor", "end")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "8.5px")
          .attr("fill", "var(--ink-mute)")
          .text(`${lat.toFixed(1)}°N`);
      }
    });

    // ---------- 人民广场作为参考点 ----------
    const pmPlaza = project(121.4737, 31.2304);
    g.append("circle")
      .attr("cx", pmPlaza[0]).attr("cy", pmPlaza[1])
      .attr("r", 3)
      .attr("fill", "var(--ink-soft)")
      .attr("stroke", "white")
      .attr("stroke-width", 1.2);
    g.append("text")
      .attr("x", pmPlaza[0] + 8).attr("y", pmPlaza[1] + 3)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "10px")
      .attr("fill", "var(--ink-soft)")
      .text("人民广场 (origin)");

    // ---------- 整合度色谱 · 蓝→金→红 ----------
    const iExtent = d3.extent(data, (d) => d.integration);
    const colorScale = d3.scaleLinear()
      .domain([iExtent[0], (iExtent[0] + iExtent[1]) / 2, iExtent[1]])
      .range(["#5A7B9C", "#B89968", "#A02822"])
      .interpolate(d3.interpolateRgb.gamma(1.6));

    // 半径：整合度越高半径越大
    const rScale = d3.scaleLinear().domain(iExtent).range([4, 11]);

    // ---------- 商场点 ----------
    const tooltip = d3.select(container).append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");

    const ANCHOR_NAME = "前滩太古里";
    const sorted = [...data].sort((a, b) => a.integration - b.integration);

    g.append("g").attr("class", "integ-dots")
      .selectAll("circle")
      .data(sorted).join("circle")
      .attr("class", "integ-dot")
      .attr("cx", (d) => project(d.lng, d.lat)[0])
      .attr("cy", (d) => project(d.lng, d.lat)[1])
      .attr("r", 0)
      .attr("fill", (d) => colorScale(d.integration))
      .attr("stroke", (d) => (d.name === ANCHOR_NAME ? "var(--vermillion-d)" : "white"))
      .attr("stroke-width", (d) => (d.name === ANCHOR_NAME ? 2.5 : 1))
      .attr("opacity", 0.92)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", rScale(d.integration) + 4);
        const rect = container.getBoundingClientRect();
        tooltip.classed("visible", true)
          .style("left", `${event.clientX - rect.left}px`)
          .style("top", `${event.clientY - rect.top - 12}px`)
          .html(`
            <div class="viz-tooltip-title">${d.name}</div>
            <div class="viz-tooltip-body">
              <div class="viz-tooltip-row"><span>整合度 I</span><strong>${d.integration.toFixed(4)}</strong></div>
              <div class="viz-tooltip-row"><span>整合度排名</span><strong>${d.rank} / 80</strong></div>
              <div class="viz-tooltip-row"><span>到 79 家平均距离</span><strong>${d.mean_dist_km.toFixed(2)} km</strong></div>
              <div class="viz-tooltip-row"><span>经纬度</span><strong>${d.lng.toFixed(4)}, ${d.lat.toFixed(4)}</strong></div>
            </div>
          `);
      })
      .on("mousemove", function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style("left", `${event.clientX - rect.left}px`)
               .style("top", `${event.clientY - rect.top - 12}px`);
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).attr("r", rScale(d.integration));
        tooltip.classed("visible", false);
      })
      .transition()
      .delay((_, i) => 60 + i * 14)
      .duration(520)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => rScale(d.integration));

    // ---------- 标注 top 5 ----------
    const top5 = data.slice().sort((a, b) => b.integration - a.integration).slice(0, 5);
    g.selectAll("text.integ-label")
      .data(top5).join("text")
      .attr("class", "integ-label")
      .attr("x", (d) => project(d.lng, d.lat)[0] + 12)
      .attr("y", (d) => project(d.lng, d.lat)[1] + 4)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "10.5px")
      .attr("font-weight", "600")
      .attr("fill", "var(--vermillion-d)")
      .style("opacity", 0)
      .text((d) => `#${d.rank} ${d.name}`)
      .transition()
      .delay(1500)
      .duration(800)
      .style("opacity", 1);

    // ---------- 锚点（前滩太古里）特别标注 ----------
    const anchor = data.find((d) => d.name === ANCHOR_NAME);
    if (anchor) {
      const [ax, ay] = project(anchor.lng, anchor.lat);
      g.append("text")
        .attr("x", ax + 12).attr("y", ay - 8)
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", "var(--vermillion-d)")
        .style("opacity", 0)
        .text(`▸ ${anchor.name} · I=${anchor.integration.toFixed(3)} · #${anchor.rank}`)
        .transition().delay(1800).duration(600).style("opacity", 1);
    }

    // ---------- 右侧色阶图例 ----------
    const legendW = 18;
    const legendH = innerH * 0.5;
    const legendX = width - MARGIN.right + 24;
    const legendY = MARGIN.top + innerH * 0.18;

    const grad = svg.append("defs").append("linearGradient")
      .attr("id", "integ-grad")
      .attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
    [
      { o: 0, c: "#5A7B9C" },
      { o: 0.5, c: "#B89968" },
      { o: 1, c: "#A02822" }
    ].forEach((s) => {
      grad.append("stop").attr("offset", s.o).attr("stop-color", s.c);
    });

    svg.append("rect")
      .attr("x", legendX).attr("y", legendY)
      .attr("width", legendW).attr("height", legendH)
      .attr("fill", "url(#integ-grad)")
      .attr("stroke", "var(--rule)").attr("stroke-width", 0.5);

    const legendScale = d3.scaleLinear().domain(iExtent)
      .range([legendY + legendH, legendY]);
    svg.append("g")
      .attr("transform", `translate(${legendX + legendW},0)`)
      .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".1f")))
      .call((sel) => {
        sel.selectAll("text")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "9.5px")
          .attr("fill", "var(--ink-mute)");
        sel.select(".domain").remove();
      });
    svg.append("text")
      .attr("x", legendX + legendW / 2).attr("y", legendY - 8)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-soft)")
      .text("INTEG");

    // ---------- 顶部 / 底部 meta ----------
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", 18)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text("PROJECTION = MERCATOR · 80 MALLS · INTEG SCALE 0.4 ~ 2.0");
    svg.append("text")
      .attr("x", width - MARGIN.right).attr("y", 18)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text(`RATIO ≈ ${(innerW / innerH).toFixed(2)} (geo-correct)`);

    // ---------- 投影说明 ----------
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", height - 8)
      .attr("font-family", "var(--ff-body-cjk)")
      .attr("font-size", "10px")
      .attr("fill", "var(--ink-mute)")
      .text("注 · 使用 d3.geoMercator 等角投影，南北方向已恢复真实地理比例；姚原图直接以 lng-lat 作 XY，南北被压缩约 2.2 倍。");
  }

  window.renderIntegration = renderIntegration;
})();
