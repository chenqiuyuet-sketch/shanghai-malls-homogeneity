/* ============================================================
   viz_mds.js · 13 个高端商场 · 多维尺度分析散点
   依赖：d3 v7 全局
   入口：renderMDS({ container, data })
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 48, right: 96, bottom: 64, left: 80 };

  /**
   * 渲染 MDS 散点
   * @param {Object} opts
   * @param {HTMLElement} opts.container  容器元素
   * @param {Object} opts.data           {axes, malls:[...]}
   */
  function renderMDS(opts) {
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

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    // ---------- 比例尺：保持等比，避免视觉畸变 ----------
    const xExt = d3.extent(data.malls, (d) => d.x);
    const yExt = d3.extent(data.malls, (d) => d.y);

    const xPad = (xExt[1] - xExt[0]) * 0.15;
    const yPad = (yExt[1] - yExt[0]) * 0.15;

    const xDomain = [xExt[0] - xPad, xExt[1] + xPad];
    const yDomain = [yExt[0] - yPad, yExt[1] + yPad];

    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

    // ---------- 背景栅格 ----------
    const grid = g.append("g").attr("class", "mds-grid");

    grid
      .selectAll("line.gx")
      .data(xScale.ticks(8))
      .join("line")
      .attr("class", "gx")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerH);

    grid
      .selectAll("line.gy")
      .data(yScale.ticks(6))
      .join("line")
      .attr("class", "gy")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d));

    // ---------- 原点十字 ----------
    g.append("line")
      .attr("class", "mds-origin")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "var(--warm-gray-3)")
      .attr("stroke-width", 0.6)
      .attr("stroke-dasharray", "1 3");

    g.append("line")
      .attr("class", "mds-origin")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "var(--warm-gray-3)")
      .attr("stroke-width", 0.6)
      .attr("stroke-dasharray", "1 3");

    // ---------- 坐标轴 ----------
    const xAxis = d3.axisBottom(xScale).ticks(8).tickSize(4);
    const yAxis = d3.axisLeft(yScale).ticks(6).tickSize(4);

    g.append("g")
      .attr("class", "mds-axis")
      .attr("transform", `translate(0, ${innerH})`)
      .call(xAxis);

    g.append("g").attr("class", "mds-axis").call(yAxis);

    // ---------- 轴标题 ----------
    svg
      .append("text")
      .attr("class", "mds-axis-title")
      .attr("x", MARGIN.left + innerW)
      .attr("y", MARGIN.top + innerH + 44)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "11")
      .attr("fill", "var(--ink-mute)")
      .attr("letter-spacing", "0.1em")
      .text(data.axes.x_label);

    svg
      .append("text")
      .attr("class", "mds-axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -MARGIN.top)
      .attr("y", 22)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "11")
      .attr("fill", "var(--ink-mute)")
      .attr("letter-spacing", "0.1em")
      .text(data.axes.y_label);

    // ---------- 锚点与其他商场的连线（可选辅助） ----------
    const anchor = data.malls.find((d) => d.role === "anchor");

    if (anchor) {
      const linkGroup = g.append("g").attr("class", "mds-links");
      linkGroup
        .selectAll("line.anchor-link")
        .data(data.malls.filter((d) => d.role !== "anchor"))
        .join("line")
        .attr("class", "anchor-link")
        .attr("x1", xScale(anchor.x))
        .attr("y1", yScale(anchor.y))
        .attr("x2", (d) => xScale(d.x))
        .attr("y2", (d) => yScale(d.y))
        .attr("stroke", "var(--vermillion)")
        .attr("stroke-width", 0.4)
        .attr("stroke-dasharray", "1 4")
        .attr("opacity", 0);

      // 在锚点淡入完成后再渐显连线
      linkGroup
        .selectAll("line.anchor-link")
        .transition()
        .delay((_, i) => 800 + i * 60)
        .duration(800)
        .attr("opacity", 0.35);
    }

    // ---------- 数据点 ----------
    const tooltip = createTooltip(container);

    const dots = g
      .selectAll("circle.mds-dot")
      .data(data.malls)
      .join("circle")
      .attr("class", (d) => `mds-dot ${d.role}`)
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", d.role === "anchor" ? 14 : 11);
        showTooltip(tooltip, event, d, container);
      })
      .on("mousemove", function (event, d) {
        showTooltip(tooltip, event, d, container);
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).attr("r", d.role === "anchor" ? 11 : 7);
        hideTooltip(tooltip);
      });

    dots
      .transition()
      .delay((_, i) => 200 + i * 80)
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => (d.role === "anchor" ? 11 : 7));

    // ---------- 锚点光晕 ----------
    if (anchor) {
      g.append("circle")
        .attr("class", "mds-halo")
        .attr("cx", xScale(anchor.x))
        .attr("cy", yScale(anchor.y))
        .attr("r", 0)
        .attr("fill", "none")
        .attr("stroke", "var(--vermillion)")
        .attr("stroke-width", 1)
        .attr("opacity", 0)
        .transition()
        .delay(1200)
        .duration(1200)
        .attr("r", 28)
        .attr("opacity", 0.4)
        .transition()
        .duration(1200)
        .attr("r", 36)
        .attr("opacity", 0);
    }

    // ---------- 标签 ----------
    g.selectAll("text.mds-label")
      .data(data.malls)
      .join("text")
      .attr("class", (d) => `mds-label ${d.role}`)
      .attr("x", (d) => xScale(d.x))
      .attr("y", (d) => yScale(d.y) - (d.role === "anchor" ? 18 : 14))
      .attr("text-anchor", (d) => labelAnchor(d, xScale))
      .style("opacity", 0)
      .text((d) => d.name)
      .transition()
      .delay((_, i) => 600 + i * 80)
      .duration(800)
      .style("opacity", 1);

    return svg.node();
  }

  // ---------- 工具函数 ----------
  function labelAnchor(d, xScale) {
    const px = xScale(d.x);
    if (px < 100) return "start";
    if (px > xScale.range()[1] - 100) return "end";
    return "middle";
  }

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

  function showTooltip(tooltip, event, d, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    tooltip
      .style("left", `${x}px`)
      .style("top", `${y - 12}px`)
      .classed("visible", true);

    tooltip.select(".viz-tooltip-title").text(d.name);

    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(
        `<span>原文</span><strong>${d.name_en}</strong>`
      );
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .html(
        `<span>楼层</span><strong>${d.floors} 层 · ${d.brand_count} 品牌</strong>`
      );
    body
      .append("div")
      .attr("class", "viz-tooltip-row")
      .style("margin-top", "6px")
      .style("display", "block")
      .style("font-family", "var(--ff-display-cjk)")
      .style("color", "rgba(245,241,234,0.85)")
      .style("line-height", "1.45")
      .style("font-size", "12px")
      .text(d.note);
  }

  function hideTooltip(tooltip) {
    tooltip.classed("visible", false);
  }

  // ---------- 暴露到全局 ----------
  window.renderMDS = renderMDS;
})();
