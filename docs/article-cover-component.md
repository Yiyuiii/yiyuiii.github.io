# 随笔题图组件规范

## 目标与边界

随笔题图是文章布局中的显式组件，不属于 Markdown 正文图片。所有已发布随笔均由 `_layouts/post.liquid` 在正文前调用 `_includes/article-cover.liquid`；不得通过正文第一张图片、`:first-child`、文章 UID 或逐篇 CSS 猜测题图。

本规范只管理文章阅读页题图。随笔索引仍使用 `thumbnail` 生成的 160/320 px 响应式派生图，普通正文图片仍由 `.post-content img` 独立管理。

## 文章接口

每篇中英文文章都必须同时声明共享图片和本地化文案：

```yaml
thumbnail: /assets/posts/202301162233/cover-bgg-2898488-square.webp
article_cover:
  alt: "《四季物语》季节盘与能量标记"
  caption: >-
    题图：[Board up close](https://boardgamegeek.com/image/2898488/seasons)，图片：BoardGameGeek 用户 dodecalouise，[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)；本站作方形裁切。
```

- `thumbnail` 是中英文共用的唯一生产图片路径；不要复制图片或增加第二个题图路径。
- `article_cover.alt` 是本地化纯文本，必须非空，不得包含 Markdown 或 HTML。
- `article_cover.caption` 是本地化的单段行内 Markdown，只允许普通文字、强调和无标题的 HTTPS 链接。
- 外部图片的来源、作者／账号、许可证和独立许可证链接必须在图注中可见，并与 `docs/asset-provenance.yml` 一致。
- 自制图片必须清楚说明作者／本站自有事实；AI 生成图必须明确说明其生成性质及“并非事实照片或记录”的限制。

## 渲染与样式

组件输出一个 `<figure class="article-cover">`，其中图片最大高度为 `26rem`，保持原比例、水平居中且不裁切；窄屏使用可用自然宽度。图注使用统一的圆角、颜色、字号和段落节奏。

`.article-cover__image` 与 `.post-content img` 是两套独立规则。不得给普通正文图片继承 `26rem` 限高。

文章阅读页使用两级宽度：标题、正文段落、列表、引用与脚注限制在 `50rem` 的可读宽度内；题图、独立正文图片、表格、代码块、`figure` 与 Mermaid 可使用最长 `72rem` 的宽内容画布。题图和正文图片都只放宽容器，不强制放大超过图片自然尺寸。

小于 `1536px` 的视口使用正文内原生折叠目录；从 `1536px` 起，目录进入 `13rem` 的左侧粘性栏，与 `72rem` 内容画布保持 `2rem` 间隔。表格的横向溢出必须由表格自身承接，不得让页面产生横向滚动。正文可用 `.article-wide` 或 `.article-prose` 显式覆盖默认分层；独立图片段落在支持 `:has()` 的浏览器中自动进入宽内容画布，旧浏览器安全回退到正文宽度。

## 双语与来源保护

`scripts/translation_guard.py` 将源文章的 `article_cover` 纳入 `source_hash`，并执行以下检查：

- 每篇文章必须具有结构完整、非空且安全的 `article_cover`；
- 中英文继续共享同一 `thumbnail`；
- `alt` 与图注可本地化，但图注的 Markdown 结构、链接目标及顺序必须一致；
- 正文结构签名不再把题图和来源链接当作正文内容。

来源测试直接读取 frontmatter 组件数据，不再扫描正文第一张图片。更新源文章的题图元数据后，必须刷新对应翻译的 `source_hash`。

## 维护步骤

1. 将生产图片放在稳定的 `/assets/posts/<uid>/` 路径，并在 `docs/asset-provenance.yml` 建立或更新唯一来源记录。
2. 在中英文文章中使用相同 `thumbnail`，分别撰写自然、对应的 `alt` 与图注。
3. 不要把题图或题图图注再次写入 Markdown 正文。
4. 运行 `python scripts/translation_guard.py --write <翻译文章>` 刷新翻译哈希。
5. 运行完整 pytest、生产翻译守卫、缩略图检查、Jekyll 构建、站点检查、旧 URL 检查与 Playwright 回归。

2026-08-01 的初次迁移覆盖 11 组、22 篇文章：20 篇移除了正文重复题图与图注，2 篇装机记录从仅有索引缩略图升级为正式阅读页题图；没有复制任何图片文件。
