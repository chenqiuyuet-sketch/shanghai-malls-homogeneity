/* ============================================================
   viz_brand_coverage.js · 头部品牌覆盖（对应 fig02）
   横向 bar chart：top N 品牌 + 覆盖商场数
   入口：renderBrandCoverage({ container, data })
   data: Array<{ brand: string, mall_count: number }>
   ============================================================ */
(function () {
  "use strict";

  const TOP_N = 30;
  const MARGIN = { top: 28, right: 90, bottom: 40, left: 96 };

  function renderBrandCoverage(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    const top = data.slice(0, TOP_N);
    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%").attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const maxN = d3.max(top, (d) => d.mall_count);
    const xScale = d3.scaleLinear().domain([0, maxN]).range([0, innerW]).nice();
    const yScale = d3.scaleBand().domain(top.map((d) => d.brand))
      .range([0, innerH]).padding(0.25);

    // Bar 背景轨
    g.selectAll("rect.bar-track")
      .data(top).join("rect")
      .attr("class", "bar-track")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.brand))
      .attr("width", innerW)
      .attr("height", yScale.bandwidth())
      .attr("fill", "rgba(184, 153, 104, 0.06)");

    // 渐变色（覆盖越广越红）
    const colorScale = d3.scaleLinear()
      .domain([5, Math.max(maxN, 30)])
      .range(["#B89968", "#A02822"])
      .interpolate(d3.interpolateRgb.gamma(1.6));

    // bars
    const bars = g.selectAll("rect.bar")
      .data(top).join("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.brand))
      .attr("width", 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.mall_count))
      .style("cursor", "pointer");

    bars.transition()
      .delay((_, i) => 60 + i * 22)
      .duration(620)
      .ease(d3.easeCubicOut)
      .attr("width", (d) => xScale(d.mall_count));

    // 数值标签
    g.selectAll("text.bar-value")
      .data(top).join("text")
      .attr("class", "bar-value")
      .attr("x", (d) => xScale(d.mall_count) + 6)
      .attr("y", (d) => yScale(d.brand) + yScale.bandwidth() / 2 + 4)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", "var(--ink)")
      .style("opacity", 0)
      .text((d) => d.mall_count)
      .transition()
      .delay((_, i) => 600 + i * 18)
      .duration(400)
      .style("opacity", 1);

    // Y 轴品牌名
    g.selectAll("text.bar-label")
      .data(top).join("text")
      .attr("class", "bar-label")
      .attr("x", -10)
      .attr("y", (d) => yScale(d.brand) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11.5px")
      .attr("fill", "var(--ink)")
      .text((d) => d.brand);

    // 顶部小标
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", 18)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text("BRAND · 头部品牌 / 商场覆盖数");

    svg.append("text")
      .attr("x", width - MARGIN.right).attr("y", 18)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text(`TOP ${TOP_N} · MAX = ${maxN} / 80`);

    // 底部 X 轴提示
    g.append("g")
      .attr("transform", `translate(0,${innerH + 4})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(3).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("fill", "var(--ink-mute)");

    // ---------- Tooltip ----------
    const tooltip = d3.select(container).append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");

    bars.on("mouseenter", function (event, d) {
      d3.select(this).attr("opacity", 0.85);
      const rect = container.getBoundingClientRect();
      tooltip.classed("visible", true)
        .style("left", `${event.clientX - rect.left}px`)
        .style("top", `${event.clientY - rect.top - 12}px`)
        .html(`
          <div class="viz-tooltip-title">${d.brand}</div>
          <div class="viz-tooltip-body">
            <div class="viz-tooltip-row"><span>覆盖商场</span><strong>${d.mall_count} / 80 家</strong></div>
            <div class="viz-tooltip-row"><span>渗透率</span><strong>${(d.mall_count / 80 * 100).toFixed(1)}%</strong></div>
          </div>
        `);
    })
    .on("mousemove", function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style("left", `${event.clientX - rect.left}px`)
             .style("top", `${event.clientY - rect.top - 12}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.classed("visible", false);
    });
  }

  window.renderBrandCoverage = renderBrandCoverage;
})();
