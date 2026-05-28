/* ============================================================
   viz_integration.js · 整合度地理散点（接姚的 80 商场整合度数据）
   v3: 同步首渲染 + 异步追加 GeoJSON 底图，避免 async 时序问题
   入口：renderIntegration({ container, data })
   data: Array<{rank, name, lng, lat, mean_dist_km, integration}>
   ============================================================ */
(function () {
  "use strict";

  const MARGIN = { top: 36, right: 130, bottom: 30, left: 30 };
  const GEO_URL = "./data/geo/shanghai_districts.json";

  // 上海大致 BBox 兜底，确保即使 GeoJSON 加载失败也能正确投影
  const SHANGHAI_BBOX_GEOJSON = {
    type: "Polygon",
    coordinates: [[
      [121.05, 30.70], [122.05, 30.70],
      [122.05, 31.95], [121.05, 31.95],
      [121.05, 30.70]
    ]]
  };

  const CENTRAL_DISTRICTS = new Set([
    "黄浦区", "静安区", "徐汇区", "长宁区", "普陀区",
    "虹口区", "杨浦区", "浦东新区"
  ]);

  function renderIntegration(opts) {
    const { container, data } = opts;
    if (!container || !data) return;

    // 同步首渲染（用 BBox 兜底投影，先把点云画出来）
    drawScene(container, data, null);

    // 异步加载 GeoJSON，加载成功后用底图重渲染
    fetch(GEO_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((geojson) => {
        if (geojson) {
          drawScene(container, data, geojson);
        }
      })
      .catch((e) => console.warn("[viz_integration] geo load failed:", e));
  }

  function drawScene(container, data, geojson) {
    container.innerHTML = "";

    const { width, height } = container.getBoundingClientRect();
    const innerW = Math.max(width - MARGIN.left - MARGIN.right, 200);
    const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 200);

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%").attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    // ---------- 几何正确的墨卡托投影 ----------
    const projection = d3.geoMercator()
      .fitSize([innerW, innerH], geojson || SHANGHAI_BBOX_GEOJSON);
    const path = d3.geoPath(projection);
    const project = (lng, lat) => projection([lng, lat]);

    // ---------- 背景框 ----------
    g.append("rect")
      .attr("width", innerW).attr("height", innerH)
      .attr("fill", "#F9F5EC")
      .attr("stroke", "var(--rule)")
      .attr("stroke-width", 0.6);

    // ---------- 上海 16 区底图 ----------
    if (geojson) {
      const districtsG = g.append("g").attr("class", "districts");
      districtsG.selectAll("path.district")
        .data(geojson.features).join("path")
        .attr("class", "district")
        .attr("d", path)
        .attr("fill", (d) => CENTRAL_DISTRICTS.has(d.properties.name) ? "#EDE3D0" : "#F2EBD8")
        .attr("stroke", "#C9BFA8")
        .attr("stroke-width", 0.7)
        .attr("stroke-linejoin", "round");

      districtsG.selectAll("text.district-name")
        .data(geojson.features).join("text")
        .attr("class", "district-name")
        .attr("transform", (d) => {
          const c = path.centroid(d);
          return `translate(${c[0]},${c[1]})`;
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "10px")
        .attr("fill", (d) => CENTRAL_DISTRICTS.has(d.properties.name) ? "#7A6850" : "#A8A18E")
        .style("pointer-events", "none")
        .text((d) => d.properties.name.replace("区", ""));
    } else {
      // 没有 GeoJSON 时画一个上海大致轮廓提示
      g.append("text")
        .attr("x", innerW / 2).attr("y", 24)
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-mono)")
        .attr("font-size", "10px")
        .attr("fill", "var(--ink-mute)")
        .text("BASE MAP LOADING...");
    }

    // ---------- 人民广场参考点 ----------
    const pmPlaza = project(121.4737, 31.2304);
    g.append("circle")
      .attr("cx", pmPlaza[0]).attr("cy", pmPlaza[1]).attr("r", 3.5)
      .attr("fill", "var(--ink-soft)")
      .attr("stroke", "white").attr("stroke-width", 1.4);
    g.append("text")
      .attr("x", pmPlaza[0] + 8).attr("y", pmPlaza[1] + 3)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "9.5px")
      .attr("fill", "var(--ink-soft)")
      .style("pointer-events", "none")
      .text("人民广场");

    // ---------- 整合度色谱 · 蓝→金→红 ----------
    const iExtent = d3.extent(data, (d) => d.integration);
    const colorScale = d3.scaleLinear()
      .domain([iExtent[0], (iExtent[0] + iExtent[1]) / 2, iExtent[1]])
      .range(["#5A7B9C", "#B89968", "#A02822"])
      .interpolate(d3.interpolateRgb.gamma(1.6));
    const rScale = d3.scaleLinear().domain(iExtent).range([4, 11]);

    // ---------- Tooltip ----------
    const tooltip = d3.select(container).append("div")
      .attr("class", "viz-tooltip")
      .style("left", "0px").style("top", "0px");

    const ANCHOR_NAME = "前滩太古里";
    const COMPARE_NAME = "兴业太古汇";
    const sorted = [...data].sort((a, b) => a.integration - b.integration);

    g.append("g").attr("class", "integ-dots")
      .selectAll("circle")
      .data(sorted).join("circle")
      .attr("class", "integ-dot")
      .attr("cx", (d) => project(d.lng, d.lat)[0])
      .attr("cy", (d) => project(d.lng, d.lat)[1])
      .attr("r", (d) => rScale(d.integration))
      .attr("fill", (d) => colorScale(d.integration))
      .attr("stroke", (d) => {
        if (d.name === ANCHOR_NAME) return "var(--vermillion-d)";
        if (d.name === COMPARE_NAME) return "var(--vermillion)";
        return "white";
      })
      .attr("stroke-width", (d) => (d.name === ANCHOR_NAME || d.name === COMPARE_NAME ? 2.5 : 1))
      .attr("opacity", 0.92)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("r", rScale(d.integration) + 4);
        const rect = container.getBoundingClientRect();
        tooltip.classed("visible", true)
          .style("left", `${event.clientX - rect.left}px`)
          .style("top", `${event.clientY - rect.top - 12}px`)
          .html(`
            <div class="viz-tooltip-title">${d.name}</div>
            <div class="viz-tooltip-body">
              <div class="viz-tooltip-row"><span>整合度 I</span><strong>${d.integration.toFixed(4)}</strong></div>
              <div class="viz-tooltip-row"><span>整合度排名</span><strong>${d.rank} / ${data.length}</strong></div>
              <div class="viz-tooltip-row"><span>到其他商场平均距离</span><strong>${d.mean_dist_km.toFixed(2)} km</strong></div>
              <div class="viz-tooltip-row"><span>经纬度</span><strong>${d.lng.toFixed(4)}, ${d.lat.toFixed(4)}</strong></div>
            </div>
          `);
      })
      .on("mousemove", function (event) {
        const rect = container.getBoundingClientRect();
        tooltip.style("left", `${event.clientX - rect.left}px`)
               .style("top", `${event.clientY - rect.top - 12}px`);
      })
      .on("mouseleave", function (event, d) {
        d3.select(this).attr("r", rScale(d.integration));
        tooltip.classed("visible", false);
      });

    // ---------- 关键商场标注：前滩 + 兴业 + top 3 ----------
    const top3 = data.slice().sort((a, b) => b.integration - a.integration).slice(0, 3);
    const labelTargets = [...top3];
    const anchor = data.find((d) => d.name === ANCHOR_NAME);
    const compare = data.find((d) => d.name === COMPARE_NAME);
    if (anchor && !labelTargets.find((d) => d.name === anchor.name)) labelTargets.push(anchor);
    if (compare && !labelTargets.find((d) => d.name === compare.name)) labelTargets.push(compare);

    // 智能错位偏移：根据点位决定标签放在左/右/上/下
    function getLabelOffset(d) {
      const [px, py] = project(d.lng, d.lat);
      const isRight = px < innerW * 0.65;
      const isTop = py > innerH * 0.35;
      return {
        dx: isRight ? 14 : -14,
        dy: isTop ? -10 : 18,
        anchor: isRight ? "start" : "end"
      };
    }

    g.selectAll("g.integ-label-grp")
      .data(labelTargets).join("g")
      .attr("class", "integ-label-grp")
      .attr("transform", (d) => `translate(${project(d.lng, d.lat)[0]},${project(d.lng, d.lat)[1]})`)
      .each(function (d) {
        const sel = d3.select(this);
        const isAnchor = d.name === ANCHOR_NAME;
        const isCompare = d.name === COMPARE_NAME;
        const fill = isAnchor ? "var(--vermillion-d)" : isCompare ? "var(--vermillion)" : "var(--ink)";
        const off = getLabelOffset(d);
        const txt = (isAnchor ? "▸ " : isCompare ? "▸ " : `#${d.rank} `) + d.name + ` · I=${d.integration.toFixed(2)}`;
        // 引线
        sel.append("line")
          .attr("x1", 0).attr("y1", 0)
          .attr("x2", off.dx * 0.7).attr("y2", off.dy * 0.7)
          .attr("stroke", fill).attr("stroke-width", 1);
        // 白色描边的标签
        sel.append("text")
          .attr("x", off.dx).attr("y", off.dy + 4)
          .attr("text-anchor", off.anchor)
          .attr("font-family", "var(--ff-display-cjk)")
          .attr("font-size", "10.5px")
          .attr("font-weight", isAnchor || isCompare ? 700 : 600)
          .attr("fill", fill)
          .attr("paint-order", "stroke")
          .attr("stroke", "white").attr("stroke-width", 3)
          .text(txt);
      });

    // ---------- 右侧色阶图例 ----------
    const legendW = 14;
    const legendH = Math.min(innerH * 0.4, 240);
    const legendX = width - MARGIN.right + 18;
    const legendY = MARGIN.top + innerH * 0.18;

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
      .attr("id", "integ-grad")
      .attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
    [
      { o: 0, c: "#5A7B9C" },
      { o: 0.5, c: "#B89968" },
      { o: 1, c: "#A02822" }
    ].forEach((s) => grad.append("stop").attr("offset", s.o).attr("stop-color", s.c));

    svg.append("rect")
      .attr("x", legendX).attr("y", legendY)
      .attr("width", legendW).attr("height", legendH)
      .attr("fill", "url(#integ-grad)")
      .attr("stroke", "var(--rule)").attr("stroke-width", 0.5);

    const legendScale = d3.scaleLinear().domain(iExtent)
      .range([legendY + legendH, legendY]);
    svg.append("g")
      .attr("transform", `translate(${legendX + legendW},0)`)
      .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".1f")))
      .call((sel) => {
        sel.selectAll("text")
          .attr("font-family", "var(--ff-mono)")
          .attr("font-size", "9.5px")
          .attr("fill", "var(--ink-mute)");
        sel.select(".domain").remove();
      });
    svg.append("text")
      .attr("x", legendX + legendW / 2).attr("y", legendY - 8)
      .attr("text-anchor", "middle")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-soft)")
      .text("INTEG");

    // ---------- 顶部 meta（单行避免重叠） ----------
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", 20)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "9.5px")
      .attr("letter-spacing", "0.08em")
      .attr("fill", "var(--ink-mute)")
      .text(`PROJECTION = MERCATOR · n = ${data.length} MALLS`);
  }

  window.renderIntegration = renderIntegration;
})();
