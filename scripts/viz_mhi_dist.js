/* ============================================================
   viz_mhi_dist.js · MHI_i / MHI_f 分布直方图（对应 fig04 / fig05）
   入口：renderMhiDist({ container, data })
   data: { metric: 'MHI_i'|'MHI_f', values: [...], anchor: {name, value}, mall_names: [...] }
   ============================================================ */
(function () {
  "use strict";
  const MARGIN = { top: 36, right: 40, bottom: 50, left: 56 };

  function renderMhiDist(opts) {
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
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const values = data.values;
    const min = d3.min(values);
    const max = d3.max(values);
    const median = d3.median(values);
    const mean = d3.mean(values);
    const span = max - min;
    const x0 = min - span * 0.04;
    const x1 = max + span * 0.04;

    const xScale = d3.scaleLinear().domain([x0, x1]).range([0, innerW]).nice();
    const bins = d3.bin().domain(xScale.domain()).thresholds(18)(values);
    const maxBinSize = d3.max(bins, (b) => b.length);
    const yScale = d3.scaleLinear().domain([0, maxBinSize + 1]).range([innerH, 0]);

    // Y 轴
    g.append("g").call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(d3.format("d")))
      .call((sel) => {
        sel.selectAll("line").attr("stroke", "var(--rule)").attr("opacity", 0.4);
        sel.selectAll("text")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "10px")
          .attr("fill", "var(--ink-mute)");
        sel.select(".domain").remove();
      });

    // X 轴
    const xFmt = span < 0.2 ? d3.format(".3f") : d3.format(".2f");
    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(4).tickFormat(xFmt))
      .call((sel) => {
        sel.selectAll("text")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "10px")
          .attr("fill", "var(--ink-mute)");
      });

    // 直方图柱
    const bars = g.selectAll("rect.hist-bar")
      .data(bins).join("rect")
      .attr("class", "hist-bar")
      .attr("x", (d) => xScale(d.x0) + 1)
      .attr("y", innerH)
      .attr("width", (d) => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
      .attr("height", 0)
      .attr("fill", "var(--brass)")
      .style("opacity", 0.85);
    bars.transition().delay((_, i) => 60 + i * 40).duration(540)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => yScale(d.length))
      .attr("height", (d) => innerH - yScale(d.length));

    // 柱内数字（只在 bin >= 3 时显示）
    g.selectAll("text.hist-count")
      .data(bins).join("text")
      .attr("class", "hist-count")
      .attr("x", (d) => (xScale(d.x0) + xScale(d.x1)) / 2)
      .attr("y", (d) => yScale(d.length) - 4)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("fill", "var(--ink-mute)")
      .style("opacity", 0)
      .text((d) => (d.length >= 3 ? d.length : ""))
      .transition().delay((_, i) => 600 + i * 40).duration(400)
      .style("opacity", 1);

    // 中位数虚线
    g.append("line").attr("class", "hist-median-line")
      .attr("x1", xScale(median)).attr("x2", xScale(median))
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "var(--brass-d)")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "4,3");
    g.append("text").attr("class", "hist-stat-label")
      .attr("x", xScale(median) + 4).attr("y", 10)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("fill", "var(--brass-d)")
      .text(`中位数 ${xFmt(median)}`);

    // 均值短虚线
    g.append("line")
      .attr("x1", xScale(mean)).attr("x2", xScale(mean))
      .attr("y1", innerH - 6).attr("y2", innerH + 6)
      .attr("stroke", "var(--ink-soft)")
      .attr("stroke-width", 1.2);

    // 锚点（前滩太古里）
    if (data.anchor) {
      const ax = xScale(data.anchor.value);
      g.append("line")
        .attr("x1", ax).attr("x2", ax)
        .attr("y1", 0).attr("y2", innerH)
        .attr("stroke", "var(--vermillion-d)")
        .attr("stroke-width", 1.5);
      g.append("circle")
        .attr("cx", ax).attr("cy", -8).attr("r", 4)
        .attr("fill", "var(--vermillion-d)");
      g.append("text")
        .attr("x", ax).attr("y", -16)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", "var(--vermillion-d)")
        .text(`${data.anchor.name} ${xFmt(data.anchor.value)}`);
    }

    // 轴标题
    svg.append("text")
      .attr("x", MARGIN.left + innerW / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text(`${data.metric} 取值`);
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(MARGIN.top + innerH / 2))
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text("商场数 (家)");

    // Tooltip
    const tooltip = d3.select(container).append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");

    bars.on("mouseenter", function (event, d) {
      d3.select(this).style("opacity", 1).attr("fill", "var(--vermillion)");
      const rect = container.getBoundingClientRect();
      const sample = d.slice(0, 5).map((v, i) => {
        const idx = values.indexOf(v);
        return data.mall_names ? data.mall_names[idx] : `#${idx}`;
      }).join("、");
      tooltip.classed("visible", true)
        .style("left", `${event.clientX - rect.left}px`)
        .style("top", `${event.clientY - rect.top - 12}px`)
        .html(`
          <div class="viz-tooltip-title">${data.metric} ∈ [${xFmt(d.x0)}, ${xFmt(d.x1)})</div>
          <div class="viz-tooltip-body">
            <div class="viz-tooltip-row"><span>该区间商场数</span><strong>${d.length} 家</strong></div>
            <div class="viz-tooltip-row" style="margin-top:6px;display:block;color:rgba(245,241,234,0.85);font-family:var(--ff-display-cjk);font-size:12px;line-height:1.5">
              ${sample}${d.length > 5 ? " 等" : ""}
            </div>
          </div>
        `);
    })
    .on("mousemove", function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style("left", `${event.clientX - rect.left}px`)
             .style("top", `${event.clientY - rect.top - 12}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).style("opacity", 0.85).attr("fill", "var(--brass)");
      tooltip.classed("visible", false);
    });
  }

  window.renderMhiDist = renderMhiDist;
})();
