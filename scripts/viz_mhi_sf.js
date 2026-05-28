/* ============================================================
   viz_mhi_sf.js · 阶段一 MHI_sf 候选筛选交互卡片
   依赖：d3 v7（仅用 selectAll，避免重复实现）
   入口：renderMhiSf({ container, data })
   ============================================================ */
(function () {
  "use strict";

  function renderMhiSf(opts) {
    const { container, data } = opts;
    if (!container || !data) return;
    container.innerHTML = "";

    // ---------- 表头说明 ----------
    const intro = document.createElement("div");
    intro.style.cssText = "font-size:13.5px;line-height:1.65;color:var(--ink-soft);margin-bottom:14px;";
    intro.innerHTML = `把每家商场抽象为「楼层 × 业态」向量，再与 <b>${data.target || "前滩太古里"}</b> 做余弦相似度。
    相似度越接近 1，越值得作为深度对照锚点。两个主要候选中最终<b style="color:var(--vermillion-d);">选定 MHI<sub>sf</sub> 最高的兴业太古汇</b>，
    第二候选环贸 iapm 在本研究中作为「落选案例」呈现，不参与深度对照分析。`;
    container.appendChild(intro);

    // ---------- 候选表格 ----------
    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;font-size:13px;font-family:var(--ff-body);";
    table.innerHTML = `
      <thead>
        <tr style="background:var(--paper-d);color:var(--ink);">
          <th style="text-align:left;padding:9px 10px;border-bottom:1.5px solid var(--brass);font-weight:700;">候选商场</th>
          <th style="text-align:right;padding:9px 10px;border-bottom:1.5px solid var(--brass);font-weight:700;">MHI<sub>sf</sub></th>
          <th style="text-align:right;padding:9px 10px;border-bottom:1.5px solid var(--brass);font-weight:700;">候选向量模长</th>
          <th style="text-align:right;padding:9px 10px;border-bottom:1.5px solid var(--brass);font-weight:700;">最高零售层</th>
          <th style="text-align:right;padding:9px 10px;border-bottom:1.5px solid var(--brass);font-weight:700;">楼层识别率</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    container.appendChild(table);
    const tbody = table.querySelector("tbody");

    // 把 identify_rate 表按 mall_name 索引，方便 candidate 取数
    const idMap = {};
    (data.identify_rate || []).forEach((r) => {
      idMap[r.mall_name] = r;
    });

    const targetIdRate = idMap[data.target] || {};

    // target 行
    const targetTr = document.createElement("tr");
    targetTr.style.cssText = "background:rgba(200,54,46,0.07);font-weight:600;";
    targetTr.innerHTML = `
      <td style="padding:10px;border-bottom:1px solid var(--rule);">${data.target} <span style="font-size:11px;color:var(--vermillion);letter-spacing:1px;margin-left:6px;">· TARGET</span></td>
      <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;color:var(--ink-mute);">—</td>
      <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">${(data.candidates[0]?.target_vector_norm || 0).toFixed(2)}</td>
      <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">L${data.candidates[0]?.target_top_floor || "?"}</td>
      <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">${targetIdRate.楼层识别率 ? (targetIdRate.楼层识别率 * 100).toFixed(1) + "%" : "—"}</td>
    `;
    tbody.appendChild(targetTr);

    // 候选行
    (data.candidates || []).forEach((c, i) => {
      const idRate = idMap[c.candidate_mall] || {};
      const tr = document.createElement("tr");
      tr.style.cssText = "transition:background .2s;";
      const score = c.MHI_sf || 0;
      const bar = Math.round(score * 100);
      tr.innerHTML = `
        <td style="padding:10px;border-bottom:1px solid var(--rule);font-weight:500;">${c.candidate_mall}</td>
        <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <span style="font-weight:700;color:var(--vermillion-d);">${score.toFixed(4)}</span>
            <span style="display:inline-block;width:80px;height:6px;background:var(--paper-d);border-radius:3px;overflow:hidden;">
              <span style="display:block;width:${bar}%;height:100%;background:var(--vermillion);"></span>
            </span>
          </div>
        </td>
        <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">${(c.candidate_vector_norm || 0).toFixed(2)}</td>
        <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">L${c.candidate_top_floor || "?"}</td>
        <td style="padding:10px;border-bottom:1px solid var(--rule);text-align:right;font-variant-numeric:tabular-nums;">${idRate.楼层识别率 ? (idRate.楼层识别率 * 100).toFixed(1) + "%" : "—"}</td>
      `;
      tr.addEventListener("mouseenter", () => {
        tr.style.background = "rgba(184,153,104,0.08)";
      });
      tr.addEventListener("mouseleave", () => {
        tr.style.background = "";
      });
      tbody.appendChild(tr);
    });

    // 结论一句
    const conclude = document.createElement("div");
    conclude.style.cssText = "margin-top:14px;font-size:12.5px;line-height:1.6;color:var(--ink-mute);border-top:1px dashed var(--rule);padding-top:12px;";
    const top = (data.candidates || [])[0];
    conclude.innerHTML = top
      ? `最像前滩的候选是 <b style="color:var(--vermillion-d);">${top.candidate_mall}</b>（MHI<sub>sf</sub> = ${top.MHI_sf.toFixed(4)}），
      已选定为本研究的深度对照对象。第二名 <b>${(data.candidates[1] || {}).candidate_mall || "—"}</b>（MHI<sub>sf</sub> = ${(data.candidates[1]?.MHI_sf || 0).toFixed(4)}）作为候选证据保留，不参与后续田野与建模分析。`
      : "暂无候选数据。";
    container.appendChild(conclude);
  }

  window.renderMhiSf = renderMhiSf;
})();
