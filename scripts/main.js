/* ============================================================
   main.js · 滚动导航、章节高亮、可视化挂载
   ============================================================ */

(function () {
  "use strict";

  // ---------- 1. 导航高亮 ----------
  function initTOC() {
    const sections = document.querySelectorAll("section[id]");
    const tocItems = document.querySelectorAll(".toc-item");

    if (sections.length === 0 || tocItems.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tocItems.forEach((item) => {
              item.classList.toggle(
                "active",
                item.dataset.target === id
              );
            });
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => obs.observe(s));

    tocItems.forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.target;
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // ---------- 2. 顶部铭牌瘦身 ----------
  function initMasthead() {
    const mast = document.querySelector(".masthead");
    if (!mast) return;

    window.addEventListener(
      "scroll",
      () => {
        mast.classList.toggle("compact", window.scrollY > 80);
      },
      { passive: true }
    );
  }

  // ---------- 3. 出场动画 ----------
  function initFadeIn() {
    const items = document.querySelectorAll(".fade-in");
    if (items.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    items.forEach((item) => obs.observe(item));
  }

  // ---------- 4. 可视化挂载 ----------
  function mountViz(opts) {
    const { containerId, dataUrl, renderFn, label, transform } = opts;
    const container = document.getElementById(containerId);
    if (!container || typeof window[renderFn] !== "function") return;

    fetch(dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error("fetch fail");
        return r.json();
      })
      .then((raw) => {
        const data = typeof transform === "function" ? transform(raw) : raw;
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                window[renderFn]({ container, data });
                obs.unobserve(entry.target);
              }
            });
          },
          { rootMargin: "0px 0px -20% 0px", threshold: 0.15 }
        );
        obs.observe(container);
      })
      .catch((err) => {
        console.warn(`[${label}] data load failed:`, err);
        container.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-mute);font-family:var(--ff-mono);font-size:12px;letter-spacing:.1em">
            DATA UNAVAILABLE · 请通过 http 协议访问本页面
          </div>`;
      });
  }

  function initVisualizations() {
    mountViz({
      containerId: "viz-quadrant",
      dataUrl: "./data/phase1/quadrant_phase1.json",
      renderFn: "renderQuadrant",
      label: "viz_quadrant",
    });
    mountViz({
      containerId: "viz-mds",
      dataUrl: "./data/mds_mock.json",
      renderFn: "renderMDS",
      label: "viz_mds",
    });
    mountViz({
      containerId: "viz-heatmap",
      dataUrl: "./data/heatmap_mock.json",
      renderFn: "renderHeatmap",
      label: "viz_heatmap",
    });
    mountViz({
      containerId: "viz-distance",
      dataUrl: "./data/distance_mock.json",
      renderFn: "renderDistance",
      label: "viz_distance",
    });
    mountViz({
      containerId: "viz-floor",
      dataUrl: "./data/floor_mock.json",
      renderFn: "renderFloor",
      label: "viz_floor",
    });
    mountViz({
      containerId: "viz-geo",
      dataUrl: "./data/geo_mock.json",
      renderFn: "renderGeo",
      label: "viz_geo",
    });
    mountViz({
      containerId: "viz-compare",
      dataUrl: "./data/compare_mock.json",
      renderFn: "renderCompare",
      label: "viz_compare",
    });
    mountViz({
      containerId: "viz-mhi-sf",
      dataUrl: "./data/phase1/mhi_sf.json",
      renderFn: "renderMhiSf",
      label: "viz_mhi_sf",
    });
    // ---------- 阶段一新增 viz ----------
    mountViz({
      containerId: "viz-brand-coverage",
      dataUrl: "./data/phase1/brand_coverage.json",
      renderFn: "renderBrandCoverage",
      label: "viz_brand_coverage",
    });
    mountViz({
      containerId: "viz-mhi-i-dist",
      dataUrl: "./data/phase1/mhi_brand.json",
      renderFn: "renderMhiDist",
      label: "viz_mhi_i_dist",
      transform: (rows) => ({
        metric: "MHI_i",
        values: rows.map((r) => r.MHI_i),
        mall_names: rows.map((r) => r.name),
        anchor: (() => {
          const a = rows.find((r) => r.name === "前滩太古里");
          return a ? { name: a.name, value: a.MHI_i } : null;
        })(),
      }),
    });
    mountViz({
      containerId: "viz-mhi-f-dist",
      dataUrl: "./data/phase1/mhi_function.json",
      renderFn: "renderMhiDist",
      label: "viz_mhi_f_dist",
      transform: (rows) => ({
        metric: "MHI_f",
        values: rows.map((r) => r.MHI_f),
        mall_names: rows.map((r) => r.name),
        anchor: (() => {
          const a = rows.find((r) => r.name === "前滩太古里");
          return a ? { name: a.name, value: a.MHI_f } : null;
        })(),
      }),
    });
    mountViz({
      containerId: "viz-function-composition",
      dataUrl: "./data/phase1/function_vectors.json",
      renderFn: "renderFunctionComposition",
      label: "viz_function_composition",
    });
    mountViz({
      containerId: "viz-composite",
      dataUrl: "./data/phase1/mhi_composite.json",
      renderFn: "renderComposite",
      label: "viz_composite",
    });
    // viz_tech_route 不需要数据，直接渲染
    const tr = document.getElementById("viz-tech-route");
    if (tr && typeof window.renderTechRoute === "function") {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            window.renderTechRoute({ container: tr });
            obs.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -20% 0px", threshold: 0.15 });
      obs.observe(tr);
    }
  }

  // ---------- 5. 启动 ----------
  document.addEventListener("DOMContentLoaded", () => {
    initTOC();
    initMasthead();
    initFadeIn();
    initVisualizations();
  });
})();
