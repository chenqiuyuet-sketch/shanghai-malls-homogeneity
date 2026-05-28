/* ============================================================
   viz_integration.js · 整合度地理散点（接姚的 80 商场整合度数据）
   v2: 叠加上海 16 区行政边界 GeoJSON 作底图
   使用 d3.geoMercator 投影，修正经纬度直接当 XY 导致的比例失真。
   入口：renderIntegration({ container, data })
   data: Array<{rank, name, lng, lat, mean_dist_km, integration}>
   ============================================================ */
(function () {
  "use strict";

  const MARGIN = { top: 30, right: 130, bottom: 36, left: 36 };
  const GEO_URL = "./data/geo/shanghai_districts.json";

  // 16 区按地理位置分组：中心城区高亮，外围浅色
  const CENTRAL_DISTRICTS = new Set([
    "黄浦区", "静安区", "徐汇区", "长宁区", "普陀区",
    "虹口区", "杨浦区", "浦东新区"
  ]);

  async function renderIntegration(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    let geojson = null;
    try {
      const r = await fetch(GEO_URL);
      if (r.ok) geojson = await r.json();
    } catch (e) {
      console.warn("[viz_integration] GeoJSON load failed, falling back to points only:", e);
    }

    drawScene(container, data, geojson);
  }

  function drawScene(container, data, geojson) {
    const { width, height } = container.getBoundingClientRect();
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%").attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top})`);

    // ---------- 几何正确的墨卡托投影 ----------
    // 优先用 GeoJSON 边界 fitSize（覆盖整个上海），否则用点云
    const projection = d3.geoMercator();
    if (geojson) {
      projection.fitSize([innerW, innerH], geojson);
    } else {
      projection.fitSize([innerW, innerH], {
        type: "MultiPoint",
        coordinates: data.map((d) => [d.lng, d.lat])
      });
    }
    const path = d3.geoPath(projection);
    const project = (lng, lat) => projection([lng, lat]);

    // ---------- 背景框 ----------
    g.append("rect")
      .attr("width", innerW).attr("height", innerH)
      .attr("fill", "#F9F5EC")
      .attr("stroke", "var(--rule)")
      .attr("stroke-width", 0.5);

    // ---------- 上海 16 区底图 ----------
    if (geojson) {
      const districtsG = g.append("g").attr("class", "districts");
      districtsG.selectAll("path.district")
        .data(geojson.features).join("path")
        .attr("class", "district")
        .attr("d", path)
        .attr("fill", (d) => CENTRAL_DISTRICTS.has(d.properties.name) ? "#EDE3D0" : "#F0E8D4")
        .attr("stroke", "#C9BFA8")
        .attr("stroke-width", 0.7)
        .attr("stroke-linejoin", "round");

      // 区名标注（计算每个 polygon 的几何中心）
      districtsG.selectAll("text.district-name")
        .data(geojson.features).join("text")
        .attr("class", "district-name")
        .attr("transform", (d) => {
          const centroid = path.centroid(d);
          return `translate(${centroid[0]},${centroid[1]})`;
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "var(--ff-display-cjk)")
        .attr("font-size", "9.5px")
        .attr("fill", (d) => CENTRAL_DISTRICTS.has(d.properties.name) ? "#7A6850" : "#A8A18E")
        .style("pointer-events", "none")
        .text((d) => d.properties.name.replace("区", ""));
    }

    // ---------- 经纬度参考网格（淡） ----------
    const lngLines = d3.range(121.0, 122.1, 0.2);
    const latLines = d3.range(30.7, 32.0, 0.2);
    const gridG = g.append("g").attr("class", "geo-grid").attr("opacity", 0.3);
    lngLines.forEach((lng) => {
      const p1 = project(lng, 30.6);
      const p2 = project(lng, 31.9);
      if (p1 && p2) {
        gridG.append("line")
          .attr("x1", p1[0]).attr("y1", p1[1])
          .attr("x2", p2[0]).attr("y2", p2[1])
          .attr("stroke", "var(--ink-mute)").attr("stroke-width", 0.3)
          .attr("stroke-dasharray", "2,3");
      }
    });
    latLines.forEach((lat) => {
      const p1 = project(121.0, lat);
      const p2 = project(122.1, lat);
      if (p1 && p2) {
        gridG.append("line")
          .attr("x1", p1[0]).attr("y1", p1[1])
          .attr("x2", p2[0]).attr("y2", p2[1])
          .attr("stroke", "var(--ink-mute)").attr("stroke-width", 0.3)
          .attr("stroke-dasharray", "2,3");
      }
    });

    // ---------- 人民广场作为参考点 ----------
    const pmPlaza = project(121.4737, 31.2304);
    g.append("circle")
      .attr("cx", pmPlaza[0]).attr("cy", pmPlaza[1])
      .attr("r", 3.5)
      .attr("fill", "var(--ink-soft)")
      .attr("stroke", "white")
      .attr("stroke-width", 1.4);
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
      .attr("r", 0)
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
              <div class="viz-tooltip-row"><span>整合度排名</span><strong>${d.rank} / 80</strong></div>
              <div class="viz-tooltip-row"><span>到 79 家平均距离</span><strong>${d.mean_dist_km.toFixed(2)} km</strong></div>
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
      })
      .transition()
      .delay((_, i) => 60 + i * 14)
      .duration(520)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => rScale(d.integration));

    // ---------- 标注 top 3 + anchor + compare ----------
    const top3 = data.slice().sort((a, b) => b.integration - a.integration).slice(0, 3);
    const labelTargets = [...top3];
    const anchor = data.find((d) => d.name === ANCHOR_NAME);
    const compare = data.find((d) => d.name === COMPARE_NAME);
    if (anchor && !labelTargets.find((d) => d.name === anchor.name)) labelTargets.push(anchor);
    if (compare && !labelTargets.find((d) => d.name === compare.name)) labelTargets.push(compare);

    g.selectAll("text.integ-label")
      .data(labelTargets).join("text")
      .attr("class", "integ-label")
      .attr("x", (d) => project(d.lng, d.lat)[0] + 14)
      .attr("y", (d) => project(d.lng, d.lat)[1] + 4)
      .attr("font-family", "var(--ff-display-cjk)")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("fill", (d) => d.name === ANCHOR_NAME ? "var(--vermillion-d)"
        : d.name === COMPARE_NAME ? "var(--vermillion)" : "var(--ink)")
      .attr("paint-order", "stroke")
      .attr("stroke", "white").attr("stroke-width", 3)
      .style("opacity", 0)
      .text((d) => `${d.name === ANCHOR_NAME ? "▸ " : d.name === COMPARE_NAME ? "▸ " : `#${d.rank} `}${d.name} · I=${d.integration.toFixed(3)}`)
      .transition()
      .delay(1500)
      .duration(800)
      .style("opacity", 1);

    // ---------- 右侧色阶图例 ----------
    const legendW = 18;
    const legendH = innerH * 0.42;
    const legendX = width - MARGIN.right + 26;
    const legendY = MARGIN.top + innerH * 0.18;

    const grad = svg.append("defs").append("linearGradient")
      .attr("id", "integ-grad")
      .attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
    [
      { o: 0, c: "#5A7B9C" },
      { o: 0.5, c: "#B89968" },
      { o: 1, c: "#A02822" }
    ].forEach((s) => {
      grad.append("stop").attr("offset", s.o).attr("stop-color", s.c);
    });

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

    // ---------- 顶部 meta ----------
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", 18)
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text("PROJECTION = MERCATOR · 80 MALLS · BASE = SHANGHAI 16 DISTRICTS");
    svg.append("text")
      .attr("x", width - MARGIN.right - 8).attr("y", 18)
      .attr("text-anchor", "end")
      .attr("font-family", "var(--ff-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .attr("fill", "var(--ink-mute)")
      .text(`DATA = DataV.GeoAtlas 310000`);
  }

  window.renderIntegration = renderIntegration;
})();
