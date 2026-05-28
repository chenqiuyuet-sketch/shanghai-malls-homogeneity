/* ============================================================
   viz_composite.js · 复合 MHI 指数 H · 6 档可切换横向 bars（对应 fig07 + fig08）
   入口：renderComposite({ container, data })
   data: Array<{rank, name, H, MHI_i, MHI_f, district, positioning, ...}>
   ============================================================ */
(function () {
  "use strict";

  const MARGIN = { top: 30, right: 120, bottom: 40, left: 160 };

  const SLICE_DEFS = [
    { key: "total",     label: "全部 80 家", positionings: null },
    { key: "mass",      label: "大众 / 亲民", positionings: ["大众/亲民"] },
    { key: "mid",       label: "中端",        positionings: ["中端"] },
    { key: "upper_mid", label: "中高端",      positionings: ["中高端"] },
    { key: "high",      label: "高端",        positionings: ["高端"] },
    { key: "outlet",    label: "奥莱 / 折扣", positionings: ["奥莱/折扣"] }
  ];

  function renderComposite(opts) {
    const { container, data } = opts;
    if (!container || !data) return;

    // 移除可能存在的旧 tabs
    const oldTabs = container.parentNode.querySelector(".composite-tabs");
    if (oldTabs) oldTabs.remove();

    // 创建 tabs
    let activeKey = "total";
    const tabs = document.createElement("div");
    tabs.className = "composite-tabs quadrant-tabs";
    SLICE_DEFS.forEach((sd) => {
      const cnt = sd.positionings === null
        ? data.length
        : data.filter((d) => sd.positionings.includes(d.positioning)).length;
      const btn = document.createElement("button");
      btn.className = "quadrant-tab" + (sd.key === activeKey ? " active" : "");
      btn.dataset.key = sd.key;
      btn.innerHTML =
        `<span class="quadrant-tab-label">${sd.label}</span>` +
        `<span class="quadrant-tab-count">${cnt}</span>`;
      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".quadrant-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        draw(sd);
      });
      tabs.appendChild(btn);
    });
    container.parentNode.insertBefore(tabs, container);

    function draw(slice) {
      container.innerHTML = "";
      const subset = slice.positionings === null
        ? data
        : data.filter((d) => slice.positionings.includes(d.positioning));
      drawBars(container, subset, slice);
    }

    draw(SLICE_DEFS[0]);
  }

  function drawBars(container, rows, slice) {
    if (rows.length === 0) {
      container.innerHTML = `<div style="padding:60px;text-align:center;color:var(--ink-mute);font-family:var(--ff-mono)">该档暂无商场数据</div>`;
      return;
    }
    // 按 H 升序排列（同质化越低越上）
    rows = [...rows].sort((a, b) => a.H - b.H);

    const { width, height } = container.getBoundingClientRect();
    const rowH = Math.max(14, Math.min(28, (height - MARGIN.top - MARGIN.bottom) / Math.max(rows.length, 1)));
    const innerH = rows.length * rowH;
    const innerW = width - MARGIN.left - MARGIN.right;

    // 容器允许垂直滚动
    container.style.overflowY = "auto";

    const svgH = MARGIN.top + innerH + MARGIN.bottom;
    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width} ${svgH}`)
      .attr("width", "100%")
      .attr("height", svgH)
      .attr("preserveAspectRatio", "xMidYMin meet");

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const yScale = d3.scaleBand().domain(rows.map((d) => d.name))
      .range([0, innerH]).padding(0.22);

    const colorScale = d3.scaleLinear()
      .domain([0.4, 0.7, 0.95])
      .range(["#B89968", "#C8362E", "#A02822"])
      .interpolate(d3.interpolateRgb.gamma(1.6));

    // 背景行
    g.selectAll("rect.row-bg")
      .data(rows).join("rect")
      .attr("class", "row-bg")
      .attr("x", 0).attr("y", (d) => yScale(d.name))
      .attr("width", innerW).attr("height", yScale.bandwidth())
      .attr("fill", "rgba(184, 153, 104, 0.04)");

    // 中位数虚线
    const median = d3.median(rows, (d) => d.H);
    g.append("line")
      .attr("x1", xScale(median)).attr("x2", xScale(median))
      .attr("y1", -4).attr("y2", innerH + 4)
      .attr("stroke", "var(--brass-d)")
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "3,3");
    g.append("text")
      .attr("x", xScale(median)).attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("fill", "var(--brass-d)")
      .text(`中位 H = ${median.toFixed(3)}`);

    // bars
    const bars = g.selectAll("rect.h-bar")
      .data(rows).join("rect")
      .attr("class", "h-bar")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.name))
      .attr("width", 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.H))
      .style("opacity", (d) => (d.name === "前滩太古里" ? 1 : 0.85));

    bars.transition()
      .delay((_, i) => 40 + i * 14)
      .duration(520)
      .ease(d3.easeCubicOut)
      .attr("width", (d) => xScale(d.H));

    // 锚点描边
    g.selectAll("rect.h-bar")
      .filter((d) => d.name === "前滩太古里")
      .attr("stroke", "var(--vermillion-d)")
      .attr("stroke-width", 2);

    // 商场名（左侧）
    g.selectAll("text.bar-name")
      .data(rows).join("text")
      .attr("class", "bar-name")
      .attr("x", -8)
      .attr("y", (d) => yScale(d.name) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "10.5px")
      .attr("fill", (d) => (d.name === "前滩太古里" ? "var(--vermillion-d)" : "var(--ink)"))
      .attr("font-weight", (d) => (d.name === "前滩太古里" ? 700 : 400))
      .text((d) => (d.name.length > 13 ? d.name.slice(0, 12) + "…" : d.name));

    // 数值（右侧）
    g.selectAll("text.bar-val")
      .data(rows).join("text")
      .attr("class", "bar-val")
      .attr("x", (d) => xScale(d.H) + 6)
      .attr("y", (d) => yScale(d.name) + yScale.bandwidth() / 2 + 4)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("font-weight", 700)
      .attr("fill", "var(--ink)")
      .style("opacity", 0)
      .text((d) => d.H.toFixed(3))
      .transition()
      .delay((_, i) => 500 + i * 12)
      .duration(360)
      .style("opacity", 1);

    // X 轴
    g.append("g")
      .attr("transform", `translate(0,${innerH + 4})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".1f")))
      .selectAll("text")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("fill", "var(--ink-mute)");

    // 顶部 slice 标
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", 18)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.08em")
      .attr("fill", "var(--vermillion-d)")
      .text(`▸ ${slice.label} · n = ${rows.length} · H 升序排列`);

    // ---------- Tooltip ----------
    const tooltip = d3.select(container).append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");

    bars.on("mouseenter", function (event, d) {
      d3.select(this).style("opacity", 1);
      const rect = container.getBoundingClientRect();
      tooltip.classed("visible", true)
        .style("left", `${event.clientX - rect.left}px`)
        .style("top", `${event.clientY - rect.top - 12}px`)
        .html(`
          <div class="viz-tooltip-title">${d.name}</div>
          <div class="viz-tooltip-body">
            <div class="viz-tooltip-row"><span>复合 H</span><strong>${d.H.toFixed(4)}</strong></div>
            <div class="viz-tooltip-row"><span>H 排名</span><strong>${d.rank} / 80</strong></div>
            <div class="viz-tooltip-row"><span>MHI_i 标度</span><strong>${(d.S_i || 0).toFixed(4)}</strong></div>
            <div class="viz-tooltip-row"><span>MHI_f 标度</span><strong>${(d.S_f || 0).toFixed(4)}</strong></div>
            <div class="viz-tooltip-row" style="margin-top:6px;display:block;color:rgba(245,241,234,0.85);font-family:var(--ff-display-cjk);font-size:12px;line-height:1.5">${d.district} · ${d.positioning} · ${d.circle}</div>
          </div>
        `);
    })
    .on("mousemove", function (event) {
      const rect = container.getBoundingClientRect();
      tooltip.style("left", `${event.clientX - rect.left}px`)
             .style("top", `${event.clientY - rect.top - 12}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).style("opacity", (d) => (d.name === "前滩太古里" ? 1 : 0.85));
      tooltip.classed("visible", false);
    });
  }

  window.renderComposite = renderComposite;
})();
