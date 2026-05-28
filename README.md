# 千店一面 · 上海购物中心同质化研究

> Shanghai Mall Homogeneity · An Interactive Long-Scroll Essay

研究 80 家上海购物中心是否真的「千店一面」，从品牌、业态、楼层三个维度上量化同质化程度，并把前滩太古里与兴业太古汇两家高端商场作为深度对照锚点展开讨论（兴业太古汇通过 MHI_sf 候选筛选选出，第二候选环贸 iapm 落选）。

## 在线访问

| 镜像 | URL |
| --- | --- |
| Cloudflare Pages | https://shanghai-malls-homogeneity.pages.dev |
| GitHub Pages | https://chenqiuyuet-sketch.github.io/shanghai-malls-homogeneity/ |

两条线互为镜像，国内访问选择最快的一条。

## 内容结构

- `index.html` 长卷主页，含 V1 至 V8 八个交互可视化
- `phase1.html` 阶段一交接说明，含 20 张分析图（PNG）
- `styles/` 设计令牌与组件 CSS
- `scripts/viz_*.js` 八个 D3 可视化组件
- `scripts/viz_mhi_sf.js` 阶段一 MHI_sf 候选筛选交互卡片
- `data/` 主页 viz 数据
  - `data/phase1/` 阶段一 11 份 JSON（80 商场基本信息、MHI_i、MHI_f、复合 MHI、品牌相似度 80×80、功能相似度 80×80、楼层矩阵、候选筛选）
- `assets/phase1/` 20 张分析图集 PNG

## 章节锚点

| 锚点 | 章节 | 主笔 |
| --- | --- | --- |
| `#frame` | 三层框架 | 吴起草，陈作图 |
| `#brand` | 品牌名义维度（MHI_i） | 吴 |
| `#function` | 业态构成维度（MHI_f） | 吴 |
| `#floor` | 楼层模板维度 | 陈 |
| `#mds` | 13 宫格 MDS | 陈 |
| `#geo` | 地理路径（接姚的 depthmap 输出） | 张 |
| `#space` | 两座太古并置 + MHI_sf 候选筛选 | 舒 / 黄 / 吴 |
| `#discussion` | 综合讨论 | 陈与吴合写 |
| `#appendix` | 方法学附录 | 陈整合 |

## 数据来源

阶段一数据来自《商场同质化指标阶段成果交接说明 · 2026-05-24》。原始 xlsx 表共 7 份，通过 `data/_convert_phase1.py` 转换为前端可消费的 JSON 文件。

## 本地预览

```bash
cd shanghai-malls-homogeneity
python3 -m http.server 8127
# 浏览器打开 http://localhost:8127
```

## 技术栈

- 原生 HTML5 + CSS（CSS 变量为设计令牌）
- D3.js v7（CDN 加载）
- 思源系字体（拉丁 Fraunces + 中文 Noto Serif SC 通过 Google Fonts）
- 静态站点，无构建流程，无 npm 依赖

## 组员

| 组员 | 角色 |
| --- | --- |
| 陈 | 统筹与前端工程主备 |
| 黄 | 数据采集与同质化指标主线 |
| 张 | 地理路径与结论一 |
| 吴 | MHI 计算与业态文字 |
| 姚 | depthmap 路网 + 业态分类 + 田野定性 |
| 舒 | 田野调查与结论二 |

## 许可

学术研究用途，未经许可不得商用。
