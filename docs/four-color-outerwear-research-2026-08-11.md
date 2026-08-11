# 《四种颜色的外套》重构研究与视觉协议

## 任务目标

本轮保留文章初稿日期、`uid` 与中英文永久链接，整体替换正文。读者价值由两部分组成：

1. 用同一模特、同一镜头和同一光线建立可快速回看的穿搭图谱；
2. 把“看起来可以”转化为可在个人衣橱中复核的试穿与购买方法。

基准稿只有一张四件外套悬挂题图，正文没有穿搭图。Git 历史、原站归档与 Obsidian 导出工作树均没有可直接恢复的正文穿搭图，因此本轮生成新的受控比较图，不复制来源不明的商品图。

## 资料与可用结论

| 资料 | 对正文有用的结论 | 适用边界 |
|---|---|---|
| Hsiao 与 Grauman，[Creating Capsule Wardrobes from Fashion Images](https://openaccess.thecvf.com/content_cvpr_2018/papers/Hsiao_Creating_Capsule_Wardrobes_CVPR_2018_paper.pdf)，CVPR 2018 | 胶囊衣橱同时考虑兼容性、用途覆盖与个人偏好；新增一件衣物的价值来自它带来的整套新组合，不来自单件相似度 | 论文优化的是图像数据中的兼容性，不等于个人审美真理；正文只借用“新增可穿组合”这一决策结构 |
| Schloss 与 Palmer，[Aesthetic response to color combinations](https://pmc.ncbi.nlm.nih.gov/articles/PMC3037488/)，2011 | 对一组颜色的整体偏好、和谐判断，以及前景色是否突出，是三种不同判断；明度对比与色相关系也承担不同作用 | 实验使用受控色块，不直接推出服装搭配规则；正文据此避免用一条色轮规则替代整套试穿 |
| Zhang 等，[Learning Color Compatibility in Fashion Outfits](https://arxiv.org/abs/2007.02388)，2020 | 固定色相模板会偏离用户数据；完整穿搭的兼容性也不能可靠地化约成若干两两关系 | 训练数据会携带平台、年代与流行偏差；正文只把它作为拒绝“万能配色公式”的证据 |
| CIE，[CIECAM16](https://www.cie.co.at/publications/cie-2016-colour-appearance-model-colour-management-systems-ciecam16)，CIE 248:2022 | 色貌需要按观看条件建模，摄影印刷品与自发光显示器都涉及观看条件与色适应 | 本文图片只能比较当前图组中的相对关系，不能作为实物色样、染色标准或购买时的唯一颜色依据 |
| WRAP 与 Leeds Institute of Textiles and Colour，[Durability is fashion’s next competitive advantage](https://www.wrap.ngo/resources/report/durability-fashions-next-competitive-advantage)，2026 | 价格、品牌与纤维成分不能单独预测耐用性，耐用需要实际测量 | 报告面向产业级耐用测试；个人购买时只能做低成本的活动、结构、维护与使用记录，不能声称完成了实验室鉴定 |

## 同类文章观察

本轮还检查了 The Concept Wardrobe 的[衣橱调色盘步骤](https://theconceptwardrobe.com/build-a-wardrobe/step-4-create-a-colour-palette)、Permanent Style 的[夹克与裤装颜色指南](https://www.permanentstyle.com/2014/03/trouser-colours-to-wear-with-odd-jackets.html)，以及若干当前胶囊衣橱文章。它们的共同优点是图多、入口快、会把中性色与重点色分开。常见不足包括：

- 用不同人物、姿势、地点与曝光的街拍支持颜色结论，读者难以分清颜色与其它变量；
- 直接给出 `60/30/10`、固定中性色比例、冷暖底色或季型规则，却没有解释证据范围；
- 提供好看的商品拼图，却没有告诉读者新外套能否增加现有衣橱的可穿组合；
- 只展示成功搭配，没有给出失败记录、停止购买条件和实物复核步骤。

新稿的独特价值是“受控比较图 + 可复核衣橱实验 + 明确证据边界”。

## 正文结构

1. 先说明图片用途、固定变量与限制；
2. 用同款外套、同一内搭与下装比较四种颜色；
3. 逐色展示两套支持搭配，并解释视觉关系、适用场景与失败条件；
4. 用“新增可穿组合”记录表替代抽象的百搭判断；
5. 用自然光、活动、叠穿、背包、维护和退换窗口完成实物复核；
6. 在文末列出研究依据，并明确哪些结论属于个人方案。

## 正文图像控制协议

### 固定项

- 同一位短黑发东亚成年模特；
- 同一张脸、年龄、体型、表情和三分之四站姿；
- 同一暖浅灰摄影棚、镜头高度、白平衡、左侧柔光与地面阴影；
- 全身构图，头顶与鞋均完整；
- 无品牌、文字、首饰、包和装饰道具。

### 可变项

- 综合对照图：只改变同款工作外套的颜色；
- 四张分组图：每张图固定一种外套及版型，只改变明确列出的内搭、下装与鞋；
- 炭灰分组使用长羊毛大衣，承担寒冷天气与较正式场景；综合对照图仍使用同款短外套，避免把版型差异误读为颜色差异。

### 不能由图片证明的内容

- 实物色差、面料手感、垂坠、保暖、防雨、起球、粘毛和耐用性；
- 某种颜色对所有肤色、性别、体型、文化与场合都更合适；
- 生成图中的服装真实存在、可以买到或具有图中展示的结构质量。

完整生成提示、参考输入、尺寸与 SHA-256 记录在 `docs/article-assets/202608081100.yml`；正式题图继续由 `docs/asset-provenance.yml` 管理。
