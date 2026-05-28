/* ============================================================
   viz_floor.js · 楼层抽象 · 三家高端商场实际楼层 → B/G/M/T 模板
   依赖：d3 v7 全局
   入口：renderFloor({ container, data })
   ============================================================ */

(function () {
  "use strict";

  const MARGIN = { top: 76, right: 32, bottom: 84, left: 32 };
  const PANEL_GAP = 18;
  const STACK_H = 308;          // 楼层栈高度
  const COL_REAL_W = 88;        // 实际楼层列宽
  const COL_TMPL_W = 88;        // 模板列宽
  const COL_TIE_W = 80;         // 连线带宽度
  const TEMPLATE_ORDER = ["T", "M", "G", "B"];  // 顶到底
  const TEMPLATE_LABEL_CN = { T: "目的地", M: "中层", G: "入口", B: "下沉" };

  function renderFloor(opts) {
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

    const root = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    const malls = data.malls;
    const n = malls.length;
    const panelW = (innerW - PANEL_GAP * (n - 1)) / n;
    const colsW = COL_REAL_W + COL_TIE_W + COL_TMPL_W;
    const padInside = (panelW - colsW) / 2;

    // 调色
    const catColor = data.category_colors;
    const tooltip = createTooltip(container);

    // ---------- 渲染每个面板 ----------
    malls.forEach((m, k) => {
      const panel = root
        .append("g")
        .attr("class", "floor-panel")
        .attr("transform", `translate(${k * (panelW + PANEL_GAP)}, 0)`);

      // 面板背景
      panel
        .append("rect")
        .attr("class", "floor-panel-bg")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", panelW)
        .attr("height", STACK_H + 32)
        .attr("fill", "rgba(255, 255, 255, 0.42)")
        .attr("stroke", "rgba(110, 103, 96, 0.16)")
        .attr("stroke-width", 1);

      // 面板标题
      panel
        .append("text")
        .attr("class", "floor-panel-name")
        .attr("x", padInside)
        .attr("y", -42)
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "17px")
        .attr("font-weight", 600)
        .attr("fill", "var(--ink)")
        .text(m.name);

      panel
        .append("text")
        .attr("class", "floor-panel-meta")
        .attr("x", padInside)
        .attr("y", -22)
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "10.5px")
        .attr("letter-spacing", "0.08em")
        .attr("fill", "var(--ink-mute)")
        .text(`${m.short} · ${m.n_real} FLOORS · ${m.type}`);

      // 列分组
      const realX = padInside;
      const tieX = realX + COL_REAL_W;
      const tmplX = tieX + COL_TIE_W;

      // ---------- 实际楼层栈 ----------
      const cellH = STACK_H / m.n_real;
      // 反转顺序：顶层在上
      const realFloors = m.real.slice().reverse();

      const realCells = panel
        .append("g")
        .attr("class", "floor-real-col")
        .selectAll("g.real-cell")
        .data(realFloors)
        .join("g")
        .attr("class", "real-cell")
        .attr("transform", (_, i) => `translate(${realX}, ${i * cellH})`);

      realCells
        .append("rect")
        .attr("width", COL_REAL_W)
        .attr("height", cellH - 1.2)
        .attr("fill", (d) => catColor[d.dominant])
        .attr("fill-opacity", 0.78)
        .attr("stroke", "rgba(26, 26, 26, 0.18)")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 1.2);
          showFloorTooltip(tooltip, event, m, d, "real", container);
        })
        .on("mousemove", function (event, d) {
          showFloorTooltip(tooltip, event, m, d, "real", container);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("fill-opacity", 0.78).attr("stroke-width", 0.5);
          hideTooltip(tooltip);
        });

      // 楼层标签
      realCells
        .append("text")
        .attr("x", COL_REAL_W / 2)
        .attr("y", cellH / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", Math.min(13, cellH * 0.45) + "px")
        .attr("font-weight", 500)
        .attr("fill", "var(--paper)")
        .attr("pointer-events", "none")
        .text((d) => d.label);

      // ---------- 模板栈 ----------
      const tmplCellH = STACK_H / 4;
      const tmplByCode = {};
      m.template.forEach((t) => (tmplByCode[t.code] = t));

      const tmplCells = panel
        .append("g")
        .attr("class", "floor-tmpl-col")
        .selectAll("g.tmpl-cell")
        .data(TEMPLATE_ORDER.map((code) => tmplByCode[code]))
        .join("g")
        .attr("class", "tmpl-cell")
        .attr("transform", (_, i) => `translate(${tmplX}, ${i * tmplCellH})`);

      tmplCells
        .append("rect")
        .attr("width", COL_TMPL_W)
        .attr("height", tmplCellH - 1.2)
        .attr("fill", (d) => {
          if (d.empty) return "rgba(110, 103, 96, 0.08)";
          // 用主导业态着色
          const dom = dominantOfMix(d.mix);
          return catColor[dom];
        })
        .attr("fill-opacity", (d) => (d.empty ? 0.4 : 0.82))
        .attr("stroke", (d) =>
          d.empty ? "rgba(110, 103, 96, 0.3)" : "rgba(26, 26, 26, 0.22)"
        )
        .attr("stroke-width", 0.6)
        .attr("stroke-dasharray", (d) => (d.empty ? "3 3" : "none"))
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          if (d.empty) return;
          d3.select(this).attr("fill-opacity", 1).attr("stroke-width", 1.4);
          showFloorTooltip(tooltip, event, m, d, "tmpl", container);
        })
        .on("mousemove", function (event, d) {
          if (d.empty) return;
          showFloorTooltip(tooltip, event, m, d, "tmpl", container);
        })
        .on("mouseleave", function (event, d) {
          d3.select(this).attr("fill-opacity", d.empty ? 0.4 : 0.82).attr("stroke-width", 0.6);
          hideTooltip(tooltip);
        });

      // 模板代码（大号字）
      tmplCells
        .append("text")
        .attr("x", 12)
        .attr("y", 20)
        .attr("font-family", "var(--ff-display-latin)")
        .attr("font-size", "22px")
        .attr("font-style", "italic")
        .attr("font-weight", 500)
        .attr("fill", (d) => (d.empty ? "var(--ink-mute)" : "var(--paper)"))
        .attr("pointer-events", "none")
        .text((d) => d.code);

      // 模板中文标签
      tmplCells
        .append("text")
        .attr("x", 12)
        .attr("y", 36)
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "10.5px")
        .attr("fill", (d) => (d.empty ? "var(--ink-mute)" : "rgba(245, 241, 234, 0.78)"))
        .attr("pointer-events", "none")
        .text((d) => TEMPLATE_LABEL_CN[d.code]);

      // 模板成员（小号字, 列出真实楼层名）
      tmplCells
        .append("text")
        .attr("x", COL_TMPL_W - 10)
        .attr("y", tmplCellH - 12)
        .attr("text-anchor", "end")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9.5px")
        .attr("letter-spacing", "0.04em")
        .attr("fill", (d) => (d.empty ? "var(--ink-mute)" : "rgba(245, 241, 234, 0.70)"))
        .attr("pointer-events", "none")
        .text((d) => (d.empty ? "（缺）" : d.members.join("·")));

      // ---------- 连线带 ----------
      const tieLayer = panel
        .append("g")
        .attr("class", "floor-tie-layer")
        .attr("pointer-events", "none");

      const link = d3
        .linkHorizontal()
        .x((p) => p[0])
        .y((p) => p[1]);

      realFloors.forEach((rf, ri) => {
        const cyReal = ri * cellH + cellH / 2;
        const tmplIndex = TEMPLATE_ORDER.indexOf(rf.template);
        const cyTmpl = tmplIndex * tmplCellH + tmplCellH / 2;

        const linkPath = link({
          source: [tieX, cyReal],
          target: [tmplX, cyTmpl],
        });

        tieLayer
          .append("path")
          .attr("class", "floor-tie")
          .attr("d", linkPath)
          .attr("fill", "none")
          .attr("stroke", catColor[rf.dominant])
          .attr("stroke-opacity", 0.42)
          .attr("stroke-width", Math.min(cellH * 0.55, 18))
          .attr("stroke-linecap", "butt");
      });

      // 列轴小标
      panel
        .append("text")
        .attr("x", realX + COL_REAL_W / 2)
        .attr("y", STACK_H + 18)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9.5px")
        .attr("letter-spacing", "0.12em")
        .attr("fill", "var(--ink-mute)")
        .text("ACTUAL");

      panel
        .append("text")
        .attr("x", tmplX + COL_TMPL_W / 2)
        .attr("y", STACK_H + 18)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "9.5px")
        .attr("letter-spacing", "0.12em")
        .attr("fill", "var(--ink-mute)")
        .text("TEMPLATE");

      // 中间箭头标注
      panel
        .append("text")
        .attr("x", tieX + COL_TIE_W / 2)
        .attr("y", STACK_H + 18)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-latin)")
        .attr("font-size", "13px")
        .attr("font-style", "italic")
        .attr("fill", "var(--vermillion)")
        .text("→");
    });

    // ---------- 底部业态图例 ----------
    const legendY = STACK_H + 56;
    const legend = root
      .append("g")
      .attr("class", "floor-legend")
      .attr("transform", `translate(0, ${legendY})`);

    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.12em")
      .attr("fill", "var(--ink-mute)")
      .text("DOMINANT CATEGORY");

    const cats = data.categories;
    const labels = data.category_labels;
    const swatchW = 14;
    const itemW = innerW / cats.length;

    const legendItems = legend
      .selectAll("g.legend-item")
      .data(cats)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(${i * itemW}, 12)`);

    legendItems
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", swatchW)
      .attr("height", swatchW)
      .attr("fill", (d) => catColor[d])
      .attr("fill-opacity", 0.8);

    legendItems
      .append("text")
      .attr("x", swatchW + 6)
      .attr("y", swatchW - 3)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("fill", "var(--ink)")
      .text((d) => labels[d]);

    // ---------- 顶部说明条 ----------
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 22)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "13px")
      .attr("font-weight", 500)
      .attr("fill", "var(--ink-soft)")
      .text("左列：实际楼层栈（含 LG / 夹层 / 天台）  ⟶  右列：B/G/M/T 四级模板（按业态主导着色）");

    svg
      .append("text")
      .attr("x", width - MARGIN.right)
      .attr("y", 22)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.14em")
      .attr("fill", "var(--vermillion)")
      .text("ABSTRACTION · 4 LAYERS");
  }

  // ---------- 工具 ----------
  function dominantOfMix(mix) {
    let best = null;
    let bv = -1;
    Object.entries(mix).forEach(([k, v]) => {
      if (v > bv) {
        bv = v;
        best = k;
      }
    });
    return best;
  }

  function topNCategories(mix, labels, n = 3) {
    return Object.entries(mix)
      .filter(([, v]) => v > 0.01)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ key: k, label: labels[k], pct: v }));
  }

  // ---------- Tooltip ----------
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

  function showFloorTooltip(tooltip, event, mall, d, kind, container) {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    tooltip
      .style("left", `${x}px`)
      .style("top", `${y - 12}px`)
      .classed("visible", true);

    const labels = {
      lux: "奢侈",
      premium: "轻奢",
      fnb: "餐饮",
      lifestyle: "生活方式",
      kids: "儿童",
      market: "超市",
      cinema: "影院",
      ops: "办公辅助",
    };

    if (kind === "real") {
      tooltip
        .select(".viz-tooltip-title")
        .text(`${mall.short} · ${d.label}`);

      const body = tooltip.select(".viz-tooltip-body");
      body.html("");
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .html(`<span>归并至</span><strong>模板 ${d.template} · ${TEMPLATE_LABEL_CN[d.template]}</strong>`);

      const tops = topNCategories(d.mix, labels, 3);
      tops.forEach((t) => {
        body
          .append("div")
          .attr("class", "viz-tooltip-row")
          .html(`<span>${t.label}</span><strong>${(t.pct * 100).toFixed(0)}%</strong>`);
      });
    } else {
      tooltip
        .select(".viz-tooltip-title")
        .text(`${mall.short} · 模板 ${d.code}`);

      const body = tooltip.select(".viz-tooltip-body");
      body.html("");
      body
        .append("div")
        .attr("class", "viz-tooltip-row")
        .html(`<span>含实际楼层</span><strong>${d.members.join(" · ")}</strong>`);

      const tops = topNCategories(d.mix, labels, 4);
      tops.forEach((t) => {
        body
          .append("div")
          .attr("class", "viz-tooltip-row")
          .html(`<span>${t.label}</span><strong>${(t.pct * 100).toFixed(0)}%</strong>`);
      });
    }
  }

  function hideTooltip(tooltip) {
    tooltip.classed("visible", false);
  }

  // ---------- 暴露到全局 ----------
  window.renderFloor = renderFloor;
})();
