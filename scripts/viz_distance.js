/* ============================================================
   viz_distance.js · 80×80 全样本楼层模板 Wasserstein 距离矩阵
   依赖：d3 v7 全局
   入口：renderDistance({ container, data })
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 96, right: 132, bottom: 56, left: 132 };

  function renderDistance(opts) {
    const { container, data } = opts;
    if (!container || !data) return;

    container.innerHTML = "";

    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const n = data.malls.length;
    const cell = Math.floor(Math.min(innerW, innerH) / n);
    const gridSize = cell * n;
    const offsetX = (innerW - gridSize) / 2;
    const offsetY = (innerH - gridSize) / 2;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const defs = svg.append("defs");

    // ---------- 自身对角线斜纹 ----------
    const pat = defs
      .append("pattern")
      .attr("id", "matrix-self")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 4)
      .attr("height", 4)
      .attr("patternTransform", "rotate(45)");
    pat.append("rect").attr("width", 4).attr("height", 4).attr("fill", "var(--paper-soft)");
    pat
      .append("line")
      .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 4)
      .attr("stroke", "var(--warm-gray-3)").attr("stroke-width", 0.7);

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left + offsetX}, ${MARGIN.top + offsetY})`);

    // ---------- 配色 · 距离越小越浅，越大越红 ----------
    const colorScale = d3
      .scaleLinear()
      .domain([0.02, 0.32, 0.62, 0.92])
      .range(["#F5F1EA", "#E5D4B0", "#B89968", "#A02822"])
      .interpolate(d3.interpolateRgb.gamma(2.0))
      .clamp(true);

    const anchorIdx = data.anchor_index ?? 0;
    const heSize = data.highend_block_size ?? 13;

    // ---------- 高端子集 13×13 背景框（强调左上角块） ----------
    g.append("rect")
      .attr("class", "matrix-he-bg")
      .attr("x", 0).attr("y", 0)
      .attr("width", heSize * cell).attr("height", heSize * cell)
      .attr("fill", "rgba(200, 54, 46, 0.04)");

    // ---------- 单元格（一次性渲染所有 6400 格） ----------
    const cells = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        cells.push({ row: r, col: c, value: data.matrix[r][c] });
      }
    }

    const tooltip = createTooltip(container);

    g.append("g")
      .attr("class", "matrix-cells")
      .selectAll("rect.matrix-cell")
      .data(cells)
      .join("rect")
      .attr("class", "matrix-cell")
      .attr("x", (d) => d.col * cell)
      .attr("y", (d) => d.row * cell)
      .attr("width", Math.max(cell - 0.4, 1))
      .attr("height", Math.max(cell - 0.4, 1))
      .attr("fill", (d) =>
        d.row === d.col ? "url(#matrix-self)" : colorScale(d.value)
      )
      .style("opacity", 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke", "var(--ink)").attr("stroke-width", 1).raise();
        showTooltip(tooltip, event, d, container, data);
      })
      .on("mousemove", function (event, d) {
        showTooltip(tooltip, event, d, container, data);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke", null);
        hideTooltip(tooltip);
      })
      .transition()
      .delay((d) => 80 + Math.max(d.row, d.col) * 18)
      .duration(380)
      .style("opacity", 1);

    // ---------- 高端子集边框（13×13 突出框） ----------
    g.append("rect")
      .attr("class", "matrix-he-frame")
      .attr("x", -1).attr("y", -1)
      .attr("width", heSize * cell + 2).attr("height", heSize * cell + 2)
      .attr("fill", "none")
      .attr("stroke", "var(--vermillion)")
      .attr("stroke-width", 1.4)
      .style("opacity", 0)
      .transition()
      .delay(1400).duration(700)
      .style("opacity", 0.85);

    // 标注 "D^H" 在子矩阵右上角
    g.append("text")
      .attr("class", "matrix-he-tag")
      .attr("x", heSize * cell - 4)
      .attr("y", -8)
      .attr("text-anchor", "end")
      .style("opacity", 0)
      .html(`D<tspan baseline-shift="super" font-size="0.75em">H</tspan> · 13 × 13 高端子矩阵`)
      .transition()
      .delay(1500).duration(700)
      .style("opacity", 1);

    // ---------- 锚点行列虚线带 ----------
    g.append("line")
      .attr("class", "matrix-anchor-band")
      .attr("x1", anchorIdx * cell + cell / 2)
      .attr("x2", anchorIdx * cell + cell / 2)
      .attr("y1", -6).attr("y2", gridSize + 6)
      .style("opacity", 0)
      .transition().delay(1700).duration(700)
      .style("opacity", 0.9);

    g.append("line")
      .attr("class", "matrix-anchor-band")
      .attr("y1", anchorIdx * cell + cell / 2)
      .attr("y2", anchorIdx * cell + cell / 2)
      .attr("x1", -6).attr("x2", gridSize + 6)
      .style("opacity", 0)
      .transition().delay(1700).duration(700)
      .style("opacity", 0.9);

    // ---------- 轴标签（防堆叠：抽稀 + 垂直放置） ----------
    // 80 商场 × 10px cell 太密，全标会全部叠在一起。策略：
    // (a) 锚点必标 (b) 高端 13 个每 2 个抽 1（约 7 个）(c) 标准 67 个每 10 个抽 1（约 7 个）
    // 列标签从 rotate(-55°) 改 rotate(-90°)，让水平投影宽度为 0，相邻标签不互相遮挡。
    const labelMask = data.malls.map((_, i) => {
      if (i === anchorIdx) return true;
      if (i < heSize) return i % 2 === 0;
      return (i - heSize) % 10 === 0;
    });

    // 列标签（顶部，旋转 -90° · 垂直立起）
    g.append("g")
      .attr("class", "matrix-col-labels")
      .selectAll("text")
      .data(data.malls.map((m, i) => ({ ...m, idx: i })))
      .join("text")
      .attr("class", (d) =>
        d.idx === anchorIdx
          ? "matrix-axis-label anchor"
          : d.role === "highend"
          ? "matrix-axis-label highend"
          : "matrix-axis-label standard"
      )
      .attr("x", 0).attr("y", 0)
      .attr(
        "transform",
        (d) => `translate(${d.idx * cell + cell / 2}, -6) rotate(-90)`
      )
      .attr("text-anchor", "start")
      .style("opacity", 0)
      .text((d) => (labelMask[d.idx] ? d.short : ""))
      .transition()
      .delay((d) => 200 + d.idx * 12)
      .duration(400)
      .style("opacity", (d) => (d.idx < heSize ? 1 : 0.55));

    // 行标签（左侧）
    g.append("g")
      .attr("class", "matrix-row-labels")
      .selectAll("text")
      .data(data.malls.map((m, i) => ({ ...m, idx: i })))
      .join("text")
      .attr("class", (d) =>
        d.idx === anchorIdx
          ? "matrix-axis-label anchor"
          : d.role === "highend"
          ? "matrix-axis-label highend"
          : "matrix-axis-label standard"
      )
      .attr("x", -8)
      .attr("y", (d) => d.idx * cell + cell / 2 + 0.5)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("opacity", 0)
      .text((d) => (labelMask[d.idx] ? d.short : ""))
      .transition()
      .delay((d) => 200 + d.idx * 12)
      .duration(400)
      .style("opacity", (d) => (d.idx < heSize ? 1 : 0.55));

    // ---------- 轴方向说明（在矩阵四角外） ----------
    svg.append("text")
      .attr("class", "matrix-axis-title")
      .attr("x", MARGIN.left + offsetX + gridSize / 2)
      .attr("y", MARGIN.top + offsetY + gridSize + 38)
      .attr("text-anchor", "middle")
      .text("商场 j · 按 MHI_i 升序 · 高端在左 · 标准在右");

    svg.append("text")
      .attr("class", "matrix-axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -(MARGIN.top + offsetY + gridSize / 2))
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .text("商场 i · 按 MHI_i 升序 · 高端在上 · 标准在下");

    // ---------- 色阶图例（右侧竖条） ----------
    const legendX = MARGIN.left + offsetX + gridSize + 36;
    const legendY = MARGIN.top + offsetY;
    const legendW = 14;
    const legendH = gridSize;

    const gradId = "matrix-grad";
    const grad = defs
      .append("linearGradient")
      .attr("id", gradId)
      .attr("x1", "0%").attr("y1", "100%")
      .attr("x2", "0%").attr("y2", "0%");

    d3.range(0, 1.01, 0.08).forEach((t) => {
      const v = 0.02 + t * (0.92 - 0.02);
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(v));
    });

    const legendG = svg
      .append("g")
      .attr("class", "matrix-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`)
      .style("opacity", 0);

    legendG
      .append("rect")
      .attr("width", legendW).attr("height", legendH)
      .attr("fill", `url(#${gradId})`)
      .attr("stroke", "var(--warm-gray-3)")
      .attr("stroke-width", 0.6);

    const legendScale = d3
      .scaleLinear()
      .domain([0.0, 1.0])
      .range([legendH, 0]);

    const legendAxis = d3
      .axisRight(legendScale)
      .tickValues([0.0, 0.2, 0.4, 0.6, 0.8, 1.0])
      .tickFormat(d3.format(".1f"))
      .tickSize(4);

    legendG
      .append("g")
      .attr("class", "matrix-legend-axis")
      .attr("transform", `translate(${legendW}, 0)`)
      .call(legendAxis);

    legendG
      .append("text")
      .attr("class", "matrix-legend-title")
      .attr("x", 0).attr("y", -16)
      .text("W₁ 距离");

    legendG
      .append("text")
      .attr("class", "matrix-legend-foot")
      .attr("x", 0).attr("y", legendH + 22)
      .text("低 = 模板相近");

    legendG.transition().delay(800).duration(600).style("opacity", 1);

    // ---------- 锚点 + 子矩阵说明 ----------
    svg
      .append("text")
      .attr("class", "matrix-note")
      .attr("x", legendX)
      .attr("y", legendY + legendH + 56)
      .style("opacity", 0)
      .text("朱砂红虚线 · 前滩太古里所在行列")
      .transition()
      .delay(1800).duration(600)
      .style("opacity", 1);

    svg
      .append("text")
      .attr("class", "matrix-note")
      .attr("x", legendX)
      .attr("y", legendY + legendH + 76)
      .style("opacity", 0)
      .text("朱砂红框 · 13×13 高端子矩阵 D^H")
      .transition()
      .delay(1900).duration(600)
      .style("opacity", 1);

    return svg.node();
  }

  // ---------- Tooltip 工具 ----------
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

  function showTooltip(tooltip, event, d, container, data) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    tooltip
      .style("left", `${x}px`)
      .style("top", `${y - 12}px`)
      .classed("visible", true);

    if (d.row === d.col) {
      tooltip.select(".viz-tooltip-title").text(data.malls[d.row].name);
      const body = tooltip.select(".viz-tooltip-body");
      body.html("");
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .html("<span>自距离</span><strong>W₁ = 0.00</strong>");
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .style("margin-top", "6px")
        .style("display", "block")
        .style("font-family", "var(--ff-display-cjk)")
        .style("color", "rgba(245,241,234,0.85)")
        .style("line-height", "1.45")
        .style("font-size", "12px")
        .text("对角线为商场与自身的距离，恒等于 0。");
      return;
    }

    const a = data.malls[d.row];
    const b = data.malls[d.col];
    tooltip.select(".viz-tooltip-title").text(`${a.name} · ${b.name}`);
    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>W₁ 距离</span><strong>${d.value.toFixed(3)}</strong>`);
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>MHI_i (i, j)</span><strong>${a.mhi_i.toFixed(2)} · ${b.mhi_i.toFixed(2)}</strong>`);

    const segLabel = (m) =>
      m.role === "anchor" ? "锚点" : m.role === "highend" ? "高端" : "标准";
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>分层</span><strong>${segLabel(a)} · ${segLabel(b)}</strong>`);

    // 关系判断
    let note = "";
    if (d.value < 0.18) note = "楼层模板高度同构，业态错位极小。";
    else if (d.value < 0.40) note = "模板接近，主层级布局相似。";
    else if (d.value < 0.65) note = "模板有可见差异，错位在某些层级显著。";
    else note = "模板差异大，业态层级分布几乎不同源。";
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .style("margin-top", "6px")
      .style("display", "block")
      .style("font-family", "var(--ff-display-cjk)")
      .style("color", "rgba(245,241,234,0.85)")
      .style("line-height", "1.45")
      .style("font-size", "12px")
      .text(note);
  }

  function hideTooltip(tooltip) {
    tooltip.classed("visible", false);
  }

  // ---------- 暴露到全局 ----------
  window.renderDistance = renderDistance;
})();
