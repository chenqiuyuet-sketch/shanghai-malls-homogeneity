/* ============================================================
   viz_quadrant.js · 80 个商场 · MHI_i × MHI_f 四象限散点
   v2: 增加 6 档消费分层 tab 切换（total / mass / mid / upper_mid / high / outlet）
   依赖：d3 v7 全局
   入口：renderQuadrant({ container, data })
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 56, right: 96, bottom: 72, left: 88 };

  function renderQuadrant(opts) {
    const { container, data } = opts;
    if (!container || !data) return;

    // 清理可能存在的上一次 tabs
    const oldTabs = container.parentNode.querySelector(".quadrant-tabs");
    if (oldTabs) oldTabs.remove();

    // 如果带 slices 元数据，构建 6 档切换 tab
    let activeKey = "total";
    if (data.slices && data.slices.length > 1) {
      const tabs = document.createElement("div");
      tabs.className = "quadrant-tabs";
      data.slices.forEach((s) => {
        const btn = document.createElement("button");
        btn.className = "quadrant-tab" + (s.key === activeKey ? " active" : "");
        btn.dataset.key = s.key;
        btn.innerHTML =
          `<span class="quadrant-tab-label">${s.label}</span>` +
          `<span class="quadrant-tab-count">${s.count}</span>`;
        btn.addEventListener("click", () => {
          tabs.querySelectorAll(".quadrant-tab").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          drawAll(s.key);
        });
        tabs.appendChild(btn);
      });
      container.parentNode.insertBefore(tabs, container);
    }

    function drawAll(key) {
      const slice = (data.slices || []).find((s) => s.key === key);
      const subset = slice && slice.positionings
        ? data.malls.filter((m) => slice.positionings.includes(m.positioning))
        : data.malls;
      drawScatter(container, data, subset, key);
    }
    drawAll(activeKey);
  }

  // ---------- 主体：散点渲染 ----------
  function drawScatter(container, data, malls, sliceKey) {
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

    // ---------- 比例尺 ----------
    const xDomain = data.axes.x_domain || [0.1, 0.95];
    const yDomain = data.axes.y_domain || [0.2, 0.95];
    const xScale = d3.scaleLinear().domain(xDomain).range([0, innerW]);
    const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

    const xMed = data.axes.x_median;
    const yMed = data.axes.y_median;

    // ---------- 象限底色 ----------
    const [x0d, x1d] = xDomain;
    const [y0d, y1d] = yDomain;
    const quadColors = [
      { x0: x0d,  x1: xMed, y0: y0d,  y1: yMed, fill: "rgba(200, 54, 46, 0.045)" },
      { x0: xMed, x1: x1d,  y0: y0d,  y1: yMed, fill: "rgba(184, 153, 104, 0.022)" },
      { x0: x0d,  x1: xMed, y0: yMed, y1: y1d,  fill: "rgba(184, 153, 104, 0.022)" },
      { x0: xMed, x1: x1d,  y0: yMed, y1: y1d,  fill: "rgba(0, 0, 0, 0.025)" }
    ];
    g.selectAll("rect.quadrant-bg")
      .data(quadColors)
      .join("rect")
      .attr("class", "quadrant-bg")
      .attr("x", (d) => xScale(d.x0))
      .attr("y", (d) => yScale(d.y1))
      .attr("width", (d) => xScale(d.x1) - xScale(d.x0))
      .attr("height", (d) => yScale(d.y0) - yScale(d.y1))
      .attr("fill", (d) => d.fill);

    // ---------- 背景栅格 ----------
    const grid = g.append("g").attr("class", "quadrant-grid");
    grid.selectAll("line.gx")
      .data(xScale.ticks(8))
      .join("line").attr("class", "gx")
      .attr("x1", (d) => xScale(d)).attr("x2", (d) => xScale(d))
      .attr("y1", 0).attr("y2", innerH);
    grid.selectAll("line.gy")
      .data(yScale.ticks(6))
      .join("line").attr("class", "gy")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", (d) => yScale(d)).attr("y2", (d) => yScale(d));

    // ---------- 中位数虚线 ----------
    g.append("line").attr("class", "quadrant-median")
      .attr("x1", xScale(xMed)).attr("x2", xScale(xMed))
      .attr("y1", 0).attr("y2", innerH);
    g.append("line").attr("class", "quadrant-median")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", yScale(yMed)).attr("y2", yScale(yMed));

    // ---------- 象限标签 ----------
    const lx0 = x0d + (x1d - x0d) * 0.04;
    const lx1 = x0d + (x1d - x0d) * 0.96;
    const ly0 = y0d + (y1d - y0d) * 0.04;
    const ly1 = y0d + (y1d - y0d) * 0.96;
    const quadLabels = [
      { x: lx0, y: ly0, label: "品牌 × 业态 · 双低", sub: "MHI 双低（视觉左下）", anchor: "start" },
      { x: lx1, y: ly1, label: "品牌 × 业态 · 双高", sub: "MHI 双高（视觉右上）", anchor: "end" },
      { x: lx0, y: ly1, label: "品牌低 · 业态高", sub: "高品牌差异 × 业态收敛", anchor: "start" },
      { x: lx1, y: ly0, label: "品牌高 · 业态低", sub: "品牌相似 × 业态分化", anchor: "end" }
    ];
    g.selectAll("text.quadrant-label")
      .data(quadLabels)
      .join("text").attr("class", "quadrant-label")
      .attr("x", (d) => xScale(d.x))
      .attr("y", (d) => yScale(d.y))
      .attr("text-anchor", (d) => d.anchor)
      .each(function (d) {
        const t = d3.select(this);
        t.append("tspan").attr("class", "quadrant-label-main")
          .attr("x", xScale(d.x)).text(d.label);
        t.append("tspan").attr("class", "quadrant-label-sub")
          .attr("x", xScale(d.x)).attr("dy", "1.25em").text(d.sub);
      });

    // ---------- 坐标轴 ----------
    const xFmt = (x1d - x0d) < 0.2 ? d3.format(".3f") : d3.format(".2f");
    const yFmt = (y1d - y0d) < 0.5 ? d3.format(".2f") : d3.format(".1f");
    g.append("g").attr("class", "quadrant-axis")
      .attr("transform", `translate(0, ${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(4).tickFormat(xFmt));
    g.append("g").attr("class", "quadrant-axis")
      .call(d3.axisLeft(yScale).ticks(5).tickSize(4).tickFormat(yFmt));

    // ---------- 轴标题 ----------
    svg.append("text").attr("class", "quadrant-axis-title")
      .attr("x", MARGIN.left + innerW / 2)
      .attr("y", MARGIN.top + innerH + 48)
      .attr("text-anchor", "middle")
      .text(data.axes.x_label);
    svg.append("text").attr("class", "quadrant-axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -(MARGIN.top + innerH / 2))
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .text(data.axes.y_label);

    // ---------- 中位数刻度提示 ----------
    g.append("text").attr("class", "quadrant-median-label")
      .attr("x", xScale(xMed)).attr("y", -8)
      .attr("text-anchor", "middle")
      .text(`x̃ = ${xFmt(xMed)}`);
    g.append("text").attr("class", "quadrant-median-label")
      .attr("x", innerW + 6).attr("y", yScale(yMed) + 3)
      .attr("text-anchor", "start")
      .text(`ỹ = ${yFmt(yMed)}`);

    // ---------- 切片提示：当前 slice 名 + 数量 ----------
    if (sliceKey && sliceKey !== "total") {
      const slice = (data.slices || []).find((s) => s.key === sliceKey);
      if (slice) {
        svg.append("text").attr("class", "quadrant-slice-tag")
          .attr("x", MARGIN.left + 4).attr("y", MARGIN.top - 18)
          .attr("text-anchor", "start")
          .style("font-family", "var(--ff-mono)")
          .style("font-size", "11px")
          .style("font-weight", "700")
          .style("letter-spacing", "0.08em")
          .style("fill", "var(--vermillion-d)")
          .text(`▸ ${slice.label} · n = ${malls.length}`);
      }
    }

    // ---------- Tooltip ----------
    const tooltip = createTooltip(container);

    // ---------- 数据点 · 三层渲染 ----------
    const stdMalls = malls.filter((d) => d.role === "standard");
    const heMalls = malls.filter((d) => d.role === "highend");
    const anchor = malls.find((d) => d.role === "anchor");

    g.append("g").attr("class", "quadrant-dots-std")
      .selectAll("circle")
      .data(stdMalls)
      .join("circle")
      .attr("class", "quadrant-dot standard")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 4.2)
      .style("opacity", 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 7);
        showTooltip(tooltip, event, d, container);
      })
      .on("mousemove", function (event, d) { showTooltip(tooltip, event, d, container); })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 4.2);
        hideTooltip(tooltip);
      })
      .transition().delay((_, i) => 80 + i * 8).duration(420)
      .style("opacity", 0.85);

    g.append("g").attr("class", "quadrant-dots-he")
      .selectAll("circle")
      .data(heMalls)
      .join("circle")
      .attr("class", "quadrant-dot highend")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 7)
      .style("opacity", 0)
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", 11);
        showTooltip(tooltip, event, d, container);
      })
      .on("mousemove", function (event, d) { showTooltip(tooltip, event, d, container); })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 7);
        hideTooltip(tooltip);
      })
      .transition().delay((_, i) => 320 + i * 50).duration(560)
      .style("opacity", 1);

    // anchor
    if (anchor) {
      const ax = xScale(anchor.x);
      const ay = yScale(anchor.y);
      g.append("circle").attr("class", "quadrant-anchor-halo")
        .attr("cx", ax).attr("cy", ay).attr("r", 0).attr("opacity", 0)
        .transition().delay(700).duration(900).attr("r", 26).attr("opacity", 0.55)
        .transition().duration(1100).attr("r", 36).attr("opacity", 0);

      g.append("rect").attr("class", "quadrant-anchor")
        .attr("x", ax - 6).attr("y", ay - 6).attr("width", 12).attr("height", 12)
        .style("opacity", 0)
        .on("mouseenter", function (event) {
          showTooltip(tooltip, event, anchor, container);
        })
        .on("mousemove", function (event) { showTooltip(tooltip, event, anchor, container); })
        .on("mouseleave", function () { hideTooltip(tooltip); })
        .transition().delay(650).duration(420)
        .style("opacity", 1);

      g.append("text").attr("class", "quadrant-anchor-label")
        .attr("x", ax + 12).attr("y", ay + 4)
        .attr("text-anchor", "start").style("opacity", 0)
        .text(anchor.name)
        .transition().delay(900).duration(500).style("opacity", 1);
    } else if (sliceKey && sliceKey !== "total") {
      // 当前 slice 里没有锚点，给个小说明
      svg.append("text").attr("class", "quadrant-anchor-missing")
        .attr("x", MARGIN.left + innerW - 4)
        .attr("y", MARGIN.top - 18)
        .attr("text-anchor", "end")
        .style("font-family", "var(--ff-mono)")
        .style("font-size", "10.5px")
        .style("fill", "var(--ink-mute)")
        .text("前滩太古里不在本档");
    }

    // ---------- 高端商场标签（仅在 total 与 high 视图） ----------
    if (sliceKey === "total" || sliceKey === "high") {
      const keyHE = pickKeyHighEnds(heMalls);
      g.selectAll("text.quadrant-he-label")
        .data(keyHE)
        .join("text").attr("class", "quadrant-he-label")
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y) - 12)
        .attr("text-anchor", "middle")
        .style("opacity", 0)
        .text((d) => d.name)
        .transition()
        .delay((_, i) => 1100 + i * 100)
        .duration(600)
        .style("opacity", 1);
    }
  }

  function pickKeyHighEnds(malls) {
    if (!malls || malls.length === 0) return [];
    const byX = [...malls].sort((a, b) => a.x - b.x);
    const byY = [...malls].sort((a, b) => a.y - b.y);
    const picked = new Map();
    picked.set(byX[0].id, byX[0]);
    picked.set(byX[byX.length - 1].id, byX[byX.length - 1]);
    picked.set(byY[0].id, byY[0]);
    picked.set(byY[byY.length - 1].id, byY[byY.length - 1]);
    return [...picked.values()];
  }

  // ---------- Tooltip 工具函数 ----------
  function createTooltip(container) {
    const t = d3.select(container)
      .append("div").attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");
    t.append("div").attr("class", "viz-tooltip-title");
    t.append("div").attr("class", "viz-tooltip-body");
    return t;
  }

  function showTooltip(tooltip, event, d, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    tooltip.style("left", `${x}px`).style("top", `${y - 12}px`).classed("visible", true);
    tooltip.select(".viz-tooltip-title").text(d.name);
    const body = tooltip.select(".viz-tooltip-body");
    body.html("");
    body.append("div").attr("class", "viz-tooltip-row")
      .html(`<span>MHI_i</span><strong>${d.x.toFixed(4)}</strong>`);
    body.append("div").attr("class", "viz-tooltip-row")
      .html(`<span>MHI_f</span><strong>${d.y.toFixed(3)}</strong>`);
    body.append("div").attr("class", "viz-tooltip-row")
      .html(`<span>规模</span><strong>${d.brand_count} 品牌 · ${d.function_count || "-"} 个业态</strong>`);
    if (d.H_rank) {
      body.append("div").attr("class", "viz-tooltip-row")
        .html(`<span>H 排名</span><strong>${d.H_rank} / 80</strong>`);
    }
    if (d.positioning) {
      body.append("div").attr("class", "viz-tooltip-row")
        .style("margin-top", "6px").style("display", "block")
        .style("font-family", "var(--ff-display-cjk)")
        .style("color", "rgba(245,241,234,0.85)")
        .style("font-size", "12px")
        .text(`${d.district} · ${d.positioning}`);
    }
  }

  function hideTooltip(tooltip) { tooltip.classed("visible", false); }

  window.renderQuadrant = renderQuadrant;
})();
