/* ============================================================
   viz_tech_route.js · 七阶段技术路线流程图（对应 tech_route + fig01）
   纯 DOM 实现，可点击展开每步说明。
   入口：renderTechRoute({ container })
   ============================================================ */
(function () {
  "use strict";

  const STEPS = [
    {
      key: "crawl",
      idx: 1,
      title: "爬取 80 家商场数据",
      brief: "高德 POI · 大众点评 · 商场官网 三源交叉",
      detail: "以「上海 + 购物中心」为关键词从高德 API 抓取候选 POI，按建筑面积、品牌密度、知名度筛出 80 家样本。" +
        "每家商场抓取的字段包括：标准名称、POI_IDs、地址、行政区、经纬度、距人民广场距离、空间圈层、档次定位。" +
        "tenant 与 brand 列表通过 POI 关联抓取，共 11,140 条品牌记录、6,369 个 unique 品牌。",
      owner: "黄"
    },
    {
      key: "clean",
      idx: 2,
      title: "清洗与业态归类",
      brief: "tenant_brand → 14 业态分类",
      detail: "原始 tenant_name 含大量重复（连锁店多店）与异写（品牌名拼写差异），先做品牌别名标准化得到唯一 brand_name。" +
        "随后按高德 type_code 与人工补全规则把每个品牌归入 14 个业态大类（餐饮、服饰鞋包、美妆个护、亲子儿童零售等）。" +
        "归类规则与业态字典见阶段一附件 category_map。",
      owner: "黄 + 姚"
    },
    {
      key: "mhi",
      idx: 3,
      title: "MHI 复合同质化指标",
      brief: "Jaccard + 余弦 + 加权平均",
      detail: "品牌层 MHI_i 用 Jaccard 相似度：S(i, j) = |A∩B| / |A∪B|。" +
        "业态层 MHI_f 用 14 维向量余弦相似度。" +
        "复合 H = (S_i + S_f) / 2，作为单一同质化标度。" +
        "三个指标都先做两两计算得 80×80 矩阵，再对每行取均值落到单商场分。",
      owner: "黄 + 吴 + 张"
    },
    {
      key: "sdna",
      idx: 4,
      title: "depthmap 路网建构",
      brief: "上海全市轴线图 · Integration + Choice",
      detail: "用 depthmap 软件把上海外环线以内的全市路网建模为轴线图（axial map）。" +
        "运行 Integration[n]、Integration[r=3]、Choice[n] 三个空间句法指标，" +
        "把全市每根轴线的可达性属性输出为 CSV，再 spatial join 到 80 家商场点位上。",
      owner: "姚"
    },
    {
      key: "select",
      idx: 5,
      title: "MHI_sf 候选筛选",
      brief: "楼层 × 业态 余弦 · 选两家深度对照",
      detail: "把前滩太古里的「楼层 × 14 业态品牌数」当作目标向量，对所有高端候选做余弦相似度 MHI_sf。" +
        "MHI_sf 越接近 1 越值得作为对照锚点。最终筛出兴业太古汇（0.8385）与环贸 iapm（0.8274）两家进入深度对照。",
      owner: "黄"
    },
    {
      key: "field",
      idx: 6,
      title: "田野定性 + 工具定量",
      brief: "现场踏勘 + 楼层模板距离矩阵",
      detail: "舒带队在前滩太古里、兴业太古汇、环贸 iapm 三家实地踏勘，按动线、视线、广场尺度、店面深度四个维度做结构化观察记录。" +
        "同时陈在工具层用 Wasserstein 距离对三家的楼层模板分布做定量比较，与现场观察交叉验证。",
      owner: "舒 + 陈 + 吴"
    },
    {
      key: "compose",
      idx: 7,
      title: "HTML 长卷整合发布",
      brief: "D3 + 思源字体 + Cloudflare/GitHub Pages",
      detail: "用 D3.js v7 把所有指标重做成可交互可视化，集成进单 URL 长卷。" +
        "字体用思源宋体 + 思源黑体，配色用 paper / brass / vermillion 三色锚定。" +
        "部署走 GitHub Pages 与 Cloudflare Pages 双线互为镜像，确保国内可访问。",
      owner: "陈"
    }
  ];

  function renderTechRoute(opts) {
    const { container } = opts;
    if (!container) return;
    container.innerHTML = "";

    // 上方步骤条
    const strip = document.createElement("div");
    strip.className = "tech-route-strip";
    container.appendChild(strip);

    const detailBox = document.createElement("div");
    detailBox.className = "tech-route-detail";
    container.appendChild(detailBox);

    let active = STEPS[0].key;

    STEPS.forEach((s, i) => {
      const node = document.createElement("button");
      node.className = "tech-route-node" + (s.key === active ? " active" : "");
      node.dataset.key = s.key;
      node.innerHTML = `
        <span class="tr-idx">${s.idx}</span>
        <span class="tr-title">${s.title}</span>
        <span class="tr-brief">${s.brief}</span>
      `;
      node.addEventListener("click", () => setActive(s.key));
      strip.appendChild(node);

      if (i < STEPS.length - 1) {
        const arrow = document.createElement("div");
        arrow.className = "tech-route-arrow";
        arrow.innerHTML = "→";
        strip.appendChild(arrow);
      }
    });

    function setActive(key) {
      active = key;
      strip.querySelectorAll(".tech-route-node").forEach((n) =>
        n.classList.toggle("active", n.dataset.key === key)
      );
      const s = STEPS.find((x) => x.key === key);
      detailBox.innerHTML = `
        <div class="tr-detail-head">
          <span class="tr-detail-idx">${String(s.idx).padStart(2, "0")}</span>
          <div>
            <div class="tr-detail-title">${s.title}</div>
            <div class="tr-detail-owner">由 <b>${s.owner}</b> 负责</div>
          </div>
        </div>
        <div class="tr-detail-body">${s.detail}</div>
      `;
    }

    setActive(active);
  }

  window.renderTechRoute = renderTechRoute;
})();
