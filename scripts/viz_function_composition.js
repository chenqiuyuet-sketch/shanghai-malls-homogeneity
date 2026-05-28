/* ============================================================
   viz_function_composition.js · 80 商场 × 14 业态品牌数堆叠（对应 fig03）
   入口：renderFunctionComposition({ container, data })
   data: { axes: [...14 业态名], data: [{name, vector, ...}] }
   ============================================================ */
(function () {
  "use strict";

  const MARGIN = { top: 40, right: 16, bottom: 96, left: 64 };
  // 14 业态调色板
  const CAT_COLORS = [
    "#A02822", "#C8362E", "#D9665C", "#B89968", "#8E7449",
    "#D9C28A", "#7A7A4D", "#5A8F4D", "#3D5A7B", "#5A7B9C",
    "#7B5A8F", "#8B7B8B", "#B89968", "#8B8276"
  ];

  function renderFunctionComposition(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    const categories = data.axes;
    const records = data.data;

    // 按总品牌数从低到高排序，让头部商场在右边
    records.sort((a, b) => (a.total_brand_count || 0) - (b.total_brand_count || 0));

    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%").attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const maxTotal = d3.max(records, (d) => d3.sum(d.vector));
    const xScale = d3.scaleBand().domain(records.map((d) => d.name))
      .range([0, innerW]).padding(0.18);
    const yScale = d3.scaleLinear().domain([0, maxTotal]).range([innerH, 0]).nice();

    const colorByCat = (i) => CAT_COLORS[i % CAT_COLORS.length];

    // Y 轴
    g.append("g").call(d3.axisLeft(yScale).ticks(6).tickSize(-innerW))
      .call((sel) => {
        sel.selectAll("line").attr("stroke", "var(--rule)").attr("opacity", 0.35);
        sel.selectAll("text")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "10px")
          .attr("fill", "var(--ink-mute)");
        sel.select(".domain").remove();
      });

    // 堆叠 bar：每家商场一根
    const barG = g.selectAll("g.mall-bar")
      .data(records).join("g")
      .attr("class", "mall-bar")
      .attr("transform", (d) => `translate(${xScale(d.name)},0)`);

    barG.each(function (mall) {
      let acc = 0;
      const segs = mall.vector.map((v, i) => ({ cat: categories[i], val: v, y0: acc, y1: (acc += v) }));
      d3.select(this).selectAll("rect")
        .data(segs).join("rect")
        .attr("x", 0)
        .attr("y", (s) => yScale(s.y1))
        .attr("width", xScale.bandwidth())
        .attr("height", (s) => Math.max(0, yScale(s.y0) - yScale(s.y1)))
        .attr("fill", (_, i) => colorByCat(i))
        .style("opacity", 0)
        .transition()
        .delay((_, i) => 40 + i * 20)
        .duration(420)
        .style("opacity", (s) => (s.val > 0 ? 0.9 : 0));
    });

    // X 轴商场名（旋转 -65°）
    g.append("g").attr("transform", `translate(0,${innerH})`)
      .selectAll("text").data(records).join("text")
      .attr("x", (d) => xScale(d.name) + xScale.bandwidth() / 2)
      .attr("y", 8)
      .attr("text-anchor", "end")
      .attr("transform", (d) => `rotate(-65, ${xScale(d.name) + xScale.bandwidth() / 2}, 8)`)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "9.5px")
      .attr("fill", "var(--ink-soft)")
      .text((d) => (d.name.length > 11 ? d.name.slice(0, 10) + "…" : d.name));

    // 标题
    svg.append("text").attr("x", MARGIN.left).attr("y", 22)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text("FUNCTION COMPOSITION · 80 家商场 × 14 业态品牌数");
    svg.append("text").attr("x", width - MARGIN.right).attr("y", 22)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text(`MAX TOTAL = ${maxTotal} 品牌`);

    // 图例
    const legendG = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${height - 70})`);
    const colsPerRow = 7;
    const cellW = innerW / colsPerRow;
    legendG.selectAll("g.legend-item")
      .data(categories).join("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(${(i % colsPerRow) * cellW},${Math.floor(i / colsPerRow) * 22})`)
      .each(function (cat, i) {
        const sel = d3.select(this);
        sel.append("rect")
          .attr("x", 0).attr("y", 0)
          .attr("width", 10).attr("height", 10)
          .attr("fill", colorByCat(i));
        sel.append("text")
          .attr("x", 14).attr("y", 9)
          .attr("font-family", "var(--ff-display-cjk)")
          .attr("font-size", "10.5px")
          .attr("fill", "var(--ink)")
          .text(cat);
      });

    // ---------- Tooltip ----------
    const tooltip = d3.select(container).append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");

    barG.on("mouseenter", function (event, mall) {
      d3.select(this).selectAll("rect").style("opacity", 1);
      const rect = container.getBoundingClientRect();
      const rows = mall.vector.map((v, i) => ({ cat: categories[i], val: v }))
        .filter((s) => s.val > 0)
        .sort((a, b) => b.val - a.val);
      const list = rows.slice(0, 6).map((s) =>
        `<div class="viz-tooltip-row"><span>${s.cat}</span><strong>${s.val}</strong></div>`
      ).join("");
      tooltip.classed("visible", true)
        .style("left", `${event.clientX - rect.left}px`)
        .style("top", `${event.clientY - rect.top - 12}px`)
        .html(`
          <div class="viz-tooltip-title">${mall.name}</div>
          <div class="viz-tooltip-body">
            <div class="viz-tooltip-row"><span>总品牌</span><strong>${d3.sum(mall.vector)} 个</strong></div>
            <div class="viz-tooltip-row"><span>覆盖业态</span><strong>${mall.function_count || rows.length} 类</strong></div>
            <div style="border-top:1px solid rgba(255,255,255,0.15);margin:6px 0 4px"></div>
            ${list}
            ${rows.length > 6 ? `<div class="viz-tooltip-row" style="margin-top:4px;color:rgba(245,241,234,0.6)"><span>其它</span><strong>${rows.length - 6} 类</strong></div>` : ""}
          </div>
        `);
    })
    .on("mousemove", function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style("left", `${event.clientX - rect.left}px`)
             .style("top", `${event.clientY - rect.top - 12}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).selectAll("rect").style("opacity", 0.9);
      tooltip.classed("visible", false);
    });
  }

  window.renderFunctionComposition = renderFunctionComposition;
})();
