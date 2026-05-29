/* ============================================================
   viz_integration.js · 整合度地理散点
   v4: 换用 Leaflet + Carto Positron OSM 真实底图（路网/水系/地标）
   入口：renderIntegration({ container, data })
   data: Array<{rank, name, lng, lat, mean_dist_km, integration}>
   ============================================================ */
(function () {
  "use strict";

  const ANCHOR = "前滩太古里";
  const COMPARE = "兴业太古汇";

  function renderIntegration(opts) {
    const { container, data, axialUrl, axialField, axialLabel } = opts;
    if (!container || !data) return;
    if (typeof L === "undefined") {
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-mute);font-family:var(--ff-mono);font-size:12px;letter-spacing:.1em">' +
        "LEAFLET LOAD FAILED · 请检查网络</div>";
      return;
    }
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.background = "#F9F5EC";

    // 上海中心区，初始 zoom 11 大致覆盖中环以内 + 外环大部
    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,   // 防止滚动滚轮直接缩放误触
      doubleClickZoom: true,
      preferCanvas: false,
    }).setView([31.20, 121.50], 11);

    // 鼠标进入地图时启用滚轮缩放
    map.on("mouseover", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    // Carto Positron 浅米白底图（米白系，与 demo paper 调一致）
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OSM contributors</a> · © <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map);

    // ---------- 整合度色谱 ----------
    const iExtent = [
      Math.min.apply(null, data.map((d) => d.integration)),
      Math.max.apply(null, data.map((d) => d.integration)),
    ];
    function colorFor(i) {
      const t = (i - iExtent[0]) / (iExtent[1] - iExtent[0]);
      if (t < 0.5) {
        return d3.interpolateRgb("#5A7B9C", "#B89968")(t * 2);
      }
      return d3.interpolateRgb("#B89968", "#A02822")((t - 0.5) * 2);
    }
    function radiusFor(i) {
      const t = (i - iExtent[0]) / (iExtent[1] - iExtent[0]);
      return 4 + t * 8;
    }

    // ---------- 81 商场点 ----------
    const sorted = [...data].sort((a, b) => a.integration - b.integration);
    sorted.forEach((d) => {
      const isAnchor = d.name === ANCHOR;
      const isCompare = d.name === COMPARE;
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: radiusFor(d.integration),
        color: isAnchor ? "#A02822" : isCompare ? "#C8362E" : "#FFFFFF",
        weight: isAnchor || isCompare ? 2.5 : 1.1,
        fillColor: colorFor(d.integration),
        fillOpacity: 0.92,
        opacity: 1,
      }).addTo(map);

      marker.bindTooltip(
        `<b>${d.name}</b><br/>整合度 I = ${d.integration.toFixed(3)} · 排名 #${d.rank}`,
        { direction: "top", offset: [0, -8], className: "mall-tooltip", sticky: false }
      );

      marker.bindPopup(
        `<div style="font-family:'PingFang SC','Noto Serif SC',sans-serif;min-width:200px">
          <div style="font-weight:700;font-size:14.5px;color:#1A1A1A;border-bottom:1px solid #C9BFA8;padding-bottom:6px;margin-bottom:8px">${d.name}</div>
          <div style="font-size:12px;color:#1A1A1A;line-height:1.85">
            <div>整合度 I = <b style="color:#A02822">${d.integration.toFixed(4)}</b></div>
            <div>排名 ${d.rank} / ${data.length}</div>
            <div>到其他商场平均距离 ${d.mean_dist_km.toFixed(2)} km</div>
            <div style="color:#888;font-family:Menlo,monospace;font-size:10.5px;margin-top:4px">${d.lng.toFixed(4)}, ${d.lat.toFixed(4)}</div>
          </div>
        </div>`,
        { closeButton: true, autoPan: false, className: "mall-popup" }
      );
    });

    // ---------- 锚点 / 比较点的常驻标签 ----------
    [ANCHOR, COMPARE].forEach((name) => {
      const d = data.find((x) => x.name === name);
      if (!d) return;
      const isAnchor = name === ANCHOR;
      const labelColor = isAnchor ? "#A02822" : "#C8362E";
      L.marker([d.lat, d.lng], {
        icon: L.divIcon({
          className: "mall-static-label",
          html:
            `<div style="font-family:'PingFang SC',sans-serif;font-size:11px;font-weight:700;color:${labelColor};` +
            `background:rgba(245,241,234,0.94);padding:2px 7px;white-space:nowrap;` +
            `border:1px solid ${labelColor};box-shadow:0 1px 4px rgba(160,40,34,0.18);` +
            `transform:translate(12px, -28px);pointer-events:none">▸ ${d.name} · I=${d.integration.toFixed(2)}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(map);
    });

    // ---------- Top 3 标签 ----------
    const top3 = data.slice().sort((a, b) => b.integration - a.integration).slice(0, 3);
    top3.forEach((d) => {
      if (d.name === ANCHOR || d.name === COMPARE) return;
      L.marker([d.lat, d.lng], {
        icon: L.divIcon({
          className: "mall-static-label",
          html:
            `<div style="font-family:'PingFang SC',sans-serif;font-size:10px;font-weight:600;color:#8E7449;` +
            `background:rgba(245,241,234,0.88);padding:1px 5px;white-space:nowrap;` +
            `border:1px solid #C9BFA8;transform:translate(10px, -22px);pointer-events:none">#${d.rank} ${d.name}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(map);
    });

    // ---------- 自定义图例 ----------
    const legend = L.control({ position: "topright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "integ-legend");
      div.style.cssText =
        "background:rgba(245,241,234,0.95);padding:10px 12px;" +
        "border:1px solid #C9BFA8;font-family:Menlo,monospace;" +
        "font-size:10px;color:#555;line-height:1.5;box-shadow:0 2px 8px rgba(0,0,0,0.06)";
      const mid = (iExtent[0] + iExtent[1]) / 2;
      div.innerHTML = `
        <div style="font-weight:700;letter-spacing:.12em;margin-bottom:6px;color:#1A1A1A">INTEG</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div><span style="display:inline-block;width:18px;height:9px;background:#A02822;vertical-align:middle;border:0.3px solid rgba(0,0,0,0.1)"></span> <span style="vertical-align:middle">≥ ${iExtent[1].toFixed(1)}</span></div>
          <div><span style="display:inline-block;width:18px;height:9px;background:#B89968;vertical-align:middle;border:0.3px solid rgba(0,0,0,0.1)"></span> <span style="vertical-align:middle">≈ ${mid.toFixed(1)}</span></div>
          <div><span style="display:inline-block;width:18px;height:9px;background:#5A7B9C;vertical-align:middle;border:0.3px solid rgba(0,0,0,0.1)"></span> <span style="vertical-align:middle">≤ ${iExtent[0].toFixed(1)}</span></div>
        </div>
        <div style="font-weight:700;letter-spacing:.12em;margin:10px 0 4px;color:#1A1A1A">SAMPLES</div>
        <div style="font-size:9.5px;line-height:1.5">
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#A02822;border:1.5px solid #A02822;vertical-align:middle"></span> 前滩太古里</div>
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#C8362E;border:1.5px solid #C8362E;vertical-align:middle"></span> 兴业太古汇</div>
          <div style="margin-top:2px;color:#888;font-size:9px">n = ${data.length} 家</div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

    // ---------- 投影说明（左下角） ----------
    const note = L.control({ position: "bottomleft" });
    note.onAdd = function () {
      const div = L.DomUtil.create("div", "integ-note");
      div.style.cssText =
        "background:rgba(245,241,234,0.92);padding:5px 9px;" +
        "border:1px solid #C9BFA8;font-family:Menlo,monospace;" +
        "font-size:9.5px;letter-spacing:0.05em;color:#888;";
      div.innerHTML = "OSM · MERCATOR · 地图右上滚轮缩放";
      return div;
    };
    note.addTo(map);

    // ---------- 可选：叠加 depthmap 轴线整合度（矢量 GeoJSON） ----------
    // 姚提供 axial 矢量后即插即用；文件未就绪时静默跳过，保持点位地图不报错
    if (axialUrl) addAxialLayer(map, axialUrl, axialField, axialLabel);

    // 确保 mountViz IntersectionObserver 触发时尺寸已经稳定，强制 invalidateSize
    setTimeout(() => map.invalidateSize(), 100);
    return map;
  }

  // 读取轴线网络 GeoJSON，按整合度着色叠加为可切换图层（位于商场点位之下）
  function addAxialLayer(map, url, fieldHint, label) {
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("axial not ready");
        return r.json();
      })
      .then((gj) => {
        const feats = (gj.features || []).filter(
          (f) => f.geometry && /LineString/.test(f.geometry.type)
        );
        if (!feats.length) return;
        // 字段自动识别：优先显式 hint，再依次尝试 depthmap 常见整合度字段名
        const CANDS = fieldHint
          ? [fieldHint]
          : ["integration", "Integration", "Integration_HH", "Int_HH", "INT", "RA", "RRA", "value", "val"];
        const p0 = feats[0].properties || {};
        let field = CANDS.find((k) => k in p0 && isFinite(+p0[k]));
        if (!field) field = Object.keys(p0).find((k) => isFinite(+p0[k]));
        if (!field) return;
        const vals = feats.map((f) => +(f.properties || {})[field]).filter(isFinite);
        const ex = [Math.min.apply(null, vals), Math.max.apply(null, vals)];
        const aColor = (v) => {
          const t = (v - ex[0]) / (ex[1] - ex[0] || 1);
          return t < 0.5
            ? d3.interpolateRgb("#5A7B9C", "#B89968")(t * 2)
            : d3.interpolateRgb("#B89968", "#A02822")((t - 0.5) * 2);
        };
        map.createPane("axialPane");
        map.getPane("axialPane").style.zIndex = 350; // 在 overlayPane(400) 商场点之下
        const axialRenderer = L.canvas({ pane: "axialPane", padding: 0.5 }); // canvas 渲染上万条线更顺
        const layer = L.geoJSON(feats, {
          pane: "axialPane",
          renderer: axialRenderer,
          style: (f) => {
            const v = +(f.properties || {})[field];
            const t = isFinite(v) ? (v - ex[0]) / (ex[1] - ex[0] || 1) : 0;
            return { color: isFinite(v) ? aColor(v) : "#999", weight: 1 + t * 2.6, opacity: 0.82 };
          },
          onEachFeature: (f, lyr) => {
            const v = +(f.properties || {})[field];
            lyr.bindTooltip("轴线整合度 " + field + " = " + (isFinite(v) ? v.toFixed(3) : "—"), {
              sticky: true,
              className: "mall-tooltip",
            });
          },
        }).addTo(map);
        const ctlLabel = label || "路网整合度";
        L.control
          .layers(null, { [ctlLabel]: layer }, { collapsed: false, position: "topleft" })
          .addTo(map);
      })
      .catch(() => {
        /* 轴线矢量尚未提供：保持纯点位地图，不影响其余功能 */
      });
  }

  window.renderIntegration = renderIntegration;
})();
