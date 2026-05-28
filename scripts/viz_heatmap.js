/* ============================================================
   viz_heatmap.js · 13×13 高端子集 · 业态向量余弦相似度热力图
   依赖：d3 v7 全局
   入口：renderHeatmap({ container, data })
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 92, right: 116, bottom: 20, left: 124 };

  /**
   * 渲染余弦相似度热力图
   * @param {Object} opts
   * @param {HTMLElement} opts.container 容器元素
   * @param {Object} opts.data {categories, malls, matrix, axes}
   */
  function renderHeatmap(opts) {
    const { container, data } = opts;
    if (!container || !data) return;

    container.innerHTML = "";

    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const n = data.malls.length;
    const cell = Math.floor(Math.min(innerW, innerH) / n);
    const gridSize = cell * n;

    // 在内部区域内居中放置 grid
    const offsetX = (innerW - gridSize) / 2;
    const offsetY = (innerH - gridSize) / 2;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    // ---------- 自身对角线斜纹 ----------
    const defs = svg.append("defs");
    const pat = defs
      .append("pattern")
      .attr("id", "heatmap-self")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 6)
      .attr("height", 6)
      .attr("patternTransform", "rotate(45)");
    pat
      .append("rect")
      .attr("width", 6)
      .attr("height", 6)
      .attr("fill", "var(--paper-soft)");
    pat
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 6)
      .attr("stroke", "var(--warm-gray-3)")
      .attr("stroke-width", 1);

    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${MARGIN.left + offsetX}, ${MARGIN.top + offsetY})`
      );

    // ---------- 配色 ----------
    const colorScale = d3
      .scaleLinear()
      .domain([0.45, 0.75, 1.0])
      .range(["#F5F1EA", "#B89968", "#C8362E"])
      .interpolate(d3.interpolateRgb.gamma(2.2))
      .clamp(true);

    // ---------- 锚点位置 ----------
    const anchorIdx = data.malls.findIndex((m) => m.id === "QT_TKL");

    // ---------- 格子数据 ----------
    const cells = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        cells.push({
          row: r,
          col: c,
          rowMall: data.malls[r],
          colMall: data.malls[c],
          value: data.matrix[r][c],
        });
      }
    }

    // ---------- 列标签（顶部，旋转 -55°） ----------
    g.append("g")
      .attr("class", "heatmap-col-labels")
      .selectAll("text")
      .data(data.malls)
      .join("text")
      .attr("class", (d, i) =>
        i === anchorIdx ? "heatmap-axis-mall anchor" : "heatmap-axis-mall"
      )
      .attr("x", 0)
      .attr("y", 0)
      .attr(
        "transform",
        (d, i) =>
          `translate(${i * cell + cell / 2}, -10) rotate(-55)`
      )
      .attr("text-anchor", "start")
      .style("opacity", 0)
      .text((d) => d.name)
      .transition()
      .delay((_, i) => 150 + i * 35)
      .duration(500)
      .style("opacity", 1);

    // ---------- 行标签（左侧） ----------
    g.append("g")
      .attr("class", "heatmap-row-labels")
      .selectAll("text")
      .data(data.malls)
      .join("text")
      .attr("class", (d, i) =>
        i === anchorIdx ? "heatmap-axis-mall anchor" : "heatmap-axis-mall"
      )
      .attr("x", -10)
      .attr("y", (d, i) => i * cell + cell / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("opacity", 0)
      .text((d) => d.name)
      .transition()
      .delay((_, i) => 150 + i * 35)
      .duration(500)
      .style("opacity", 1);

    // ---------- 锚点行列高亮带 ----------
    g.append("rect")
      .attr("class", "heatmap-anchor-band")
      .attr("x", anchorIdx * cell)
      .attr("y", -4)
      .attr("width", cell)
      .attr("height", gridSize + 8)
      .attr("fill", "none")
      .attr("stroke", "var(--vermillion)")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "2 3")
      .style("opacity", 0)
      .transition()
      .delay(1100)
      .duration(700)
      .style("opacity", 0.85);

    g.append("rect")
      .attr("class", "heatmap-anchor-band")
      .attr("x", -4)
      .attr("y", anchorIdx * cell)
      .attr("width", gridSize + 8)
      .attr("height", cell)
      .attr("fill", "none")
      .attr("stroke", "var(--vermillion)")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "2 3")
      .style("opacity", 0)
      .transition()
      .delay(1100)
      .duration(700)
      .style("opacity", 0.85);

    // ---------- 单元格 ----------
    const tooltip = createTooltip(container);

    const cellG = g
      .append("g")
      .attr("class", "heatmap-cells")
      .selectAll("g.heatmap-cell")
      .data(cells)
      .join("g")
      .attr("class", "heatmap-cell")
      .attr(
        "transform",
        (d) => `translate(${d.col * cell}, ${d.row * cell})`
      );

    cellG
      .append("rect")
      .attr("width", cell - 1.5)
      .attr("height", cell - 1.5)
      .attr("rx", 1.5)
      .attr("fill", (d) =>
        d.row === d.col ? "url(#heatmap-self)" : colorScale(d.value)
      )
      .attr("stroke", "var(--paper)")
      .attr("stroke-width", 0.8)
      .style("opacity", 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke", "var(--ink)").attr("stroke-width", 1.4);
        showTooltip(tooltip, event, d, container, data);
      })
      .on("mousemove", function (event, d) {
        showTooltip(tooltip, event, d, container, data);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("stroke", "var(--paper)")
          .attr("stroke-width", 0.8);
        hideTooltip(tooltip);
      })
      .transition()
      .delay((d) => 300 + (d.row + d.col) * 28)
      .duration(450)
      .style("opacity", 1);

    // 数值标签：自身格留白，其余格写两位小数
    cellG
      .append("text")
      .attr("x", (cell - 1.5) / 2)
      .attr("y", (cell - 1.5) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("class", "heatmap-cell-value")
      .style("fill", (d) =>
        d.row === d.col
          ? "transparent"
          : d.value > 0.78
          ? "rgba(245,241,234,0.92)"
          : "rgba(26,26,26,0.78)"
      )
      .style("font-size", cell >= 30 ? "10px" : "8.5px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .text((d) => (d.row === d.col ? "" : d.value.toFixed(2)))
      .transition()
      .delay((d) => 600 + (d.row + d.col) * 28)
      .duration(400)
      .style("opacity", 1);

    // ---------- 图例（右侧色阶条） ----------
    const legendX = MARGIN.left + offsetX + gridSize + 36;
    const legendY = MARGIN.top + offsetY;
    const legendH = gridSize;
    const legendW = 14;

    const gradId = "heatmap-grad";
    const grad = defs
      .append("linearGradient")
      .attr("id", gradId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    const stops = d3.range(0, 1.01, 0.1);
    stops.forEach((t) => {
      const v = 1.0 - t * (1.0 - 0.45); // 顶部 = 1.0，底部 = 0.45
      grad
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(v));
    });

    const legendG = svg
      .append("g")
      .attr("class", "heatmap-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`)
      .style("opacity", 0);

    legendG
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("fill", `url(#${gradId})`)
      .attr("stroke", "var(--warm-gray-3)")
      .attr("stroke-width", 0.6);

    const legendScale = d3
      .scaleLinear()
      .domain([1.0, 0.45])
      .range([0, legendH]);

    const legendAxis = d3
      .axisRight(legendScale)
      .tickValues([1.0, 0.9, 0.8, 0.7, 0.6, 0.5])
      .tickFormat(d3.format(".2f"))
      .tickSize(4);

    legendG
      .append("g")
      .attr("class", "heatmap-legend-axis")
      .attr("transform", `translate(${legendW}, 0)`)
      .call(legendAxis);

    legendG
      .append("text")
      .attr("class", "heatmap-legend-title")
      .attr("x", 0)
      .attr("y", -16)
      .text("余弦相似度");

    legendG
      .append("text")
      .attr("class", "heatmap-legend-foot")
      .attr("x", 0)
      .attr("y", legendH + 22)
      .text("cos(v_i, v_j)");

    legendG.transition().delay(800).duration(600).style("opacity", 1);

    // ---------- 锚点说明 ----------
    svg
      .append("text")
      .attr("class", "heatmap-anchor-note")
      .attr("x", legendX)
      .attr("y", legendY + legendH + 56)
      .style("opacity", 0)
      .text("朱砂红 · 前滩太古里所在行列")
      .transition()
      .delay(1400)
      .duration(600)
      .style("opacity", 1);

    return svg.node();
  }

  // ---------- 工具：tooltip ----------
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
      tooltip.select(".viz-tooltip-title").text(d.rowMall.name);
      const body = tooltip.select(".viz-tooltip-body");
      body.html("");
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .html("<span>自相似</span><strong>cos = 1.00</strong>");
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .style("margin-top", "6px")
        .style("display", "block")
        .style("font-family", "var(--ff-display-cjk)")
        .style("color", "rgba(245,241,234,0.85)")
        .style("line-height", "1.45")
        .style("font-size", "12px")
        .text("对角线为自身向量的相似度，恒等于 1，本图留白。");
      return;
    }

    tooltip
      .select(".viz-tooltip-title")
      .text(`${d.rowMall.name} · ${d.colMall.name}`);

    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(`<span>余弦相似度</span><strong>${d.value.toFixed(4)}</strong>`);

    // 共同重心：min(vec_a, vec_b) 取前 3
    const shared = computeShared(d.rowMall, d.colMall, data.categories);
    if (shared.length > 0) {
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .style("margin-top", "8px")
        .style("display", "block")
        .style("font-family", "var(--ff-mono)")
        .style("color", "rgba(245,241,234,0.55)")
        .style("font-size", "10px")
        .style("letter-spacing", "0.08em")
        .text("共同重心 / TOP 3");

      shared.slice(0, 3).forEach((s) => {
        body
          .append("div")
          .attr("class", "viz-tooltip-row")
          .html(
            `<span>${s.cat}</span><strong>${(s.overlap * 100).toFixed(
              1
            )}%</strong>`
          );
      });
    }
  }

  function hideTooltip(tooltip) {
    tooltip.classed("visible", false);
  }

  function computeShared(a, b, categories) {
    const vecA = a.vector;
    const vecB = b.vector;
    const result = vecA.map((va, i) => ({
      cat: categories[i],
      overlap: Math.min(va, vecB[i]),
    }));
    return result
      .filter((r) => r.overlap > 0.02)
      .sort((x, y) => y.overlap - x.overlap);
  }

  // ---------- 暴露到全局 ----------
  window.renderHeatmap = renderHeatmap;
})();
