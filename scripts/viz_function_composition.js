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

    // X 轴：80 商场标签太密无法全标，改为只标 anchor + 高低端代表 + 排序方向提示
    const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`);

    // 排序方向 / 区间提示
    xAxisG.append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", 2).attr("y2", 2)
      .attr("stroke", "var(--rule)").attr("stroke-width", 0.6);
    xAxisG.append("text")
      .attr("x", 0).attr("y", 16)
      .attr("text-anchor", "start")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10.5px")
      .attr("fill", "var(--ink-mute)")
      .attr("letter-spacing", "0.08em")
      .text("← 总品牌数较少");
    xAxisG.append("text")
      .attr("x", innerW).attr("y", 16)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10.5px")
      .attr("fill", "var(--ink-mute)")
      .attr("letter-spacing", "0.08em")
      .text("总品牌数较多 →");
    xAxisG.append("text")
      .attr("x", innerW / 2).attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10.5px")
      .attr("fill", "var(--ink-mute)")
      .attr("letter-spacing", "0.06em")
      .text("· 共 80 家商场 · 鼠标悬停查看详情 ·");

    // 关键商场标注：anchor（前滩太古里） + 最小、最大、前滩兴业兴业
    const HIGHLIGHTS = ["前滩太古里", "兴业太古汇"];
    const sorted = [...records].sort((a, b) => d3.sum(a.vector) - d3.sum(b.vector));
    const extremes = new Set([sorted[0].name, sorted[sorted.length - 1].name]);
    const keyNames = [...new Set([...HIGHLIGHTS, ...extremes])]
      .filter((n) => records.some((r) => r.name === n));

    xAxisG.selectAll("g.key-name")
      .data(records.filter((d) => keyNames.includes(d.name)))
      .join("g").attr("class", "key-name")
      .attr("transform", (d) => `translate(${xScale(d.name) + xScale.bandwidth() / 2}, 30)`)
      .each(function (d) {
        const isAnchor = d.name === "前滩太古里";
        const isCompare = d.name === "兴业太古汇";
        const fill = isAnchor ? "var(--vermillion-d)" : isCompare ? "var(--vermillion)" : "var(--ink)";
        const sel = d3.select(this);
        // 连接线
        sel.append("line")
          .attr("x1", 0).attr("x2", 0)
          .attr("y1", -28).attr("y2", -4)
          .attr("stroke", fill)
          .attr("stroke-width", 1.2);
        sel.append("circle")
          .attr("cx", 0).attr("cy", -28).attr("r", 3.5)
          .attr("fill", fill);
        sel.append("text")
          .attr("x", 0).attr("y", 12)
          .attr("text-anchor", "middle")
          .attr("font-family", "var(--ff-display-cjk)")
          .attr("font-size", "10.5px")
          .attr("font-weight", isAnchor || isCompare ? 700 : 500)
          .attr("fill", fill)
          .text(d.name);
      });

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
