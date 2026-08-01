# 随笔双语、URL 与 SEO 基础设计

## 目标和边界

本阶段只建立可逐篇迁移的生产契约，不翻译 11 篇正文，也不占用未来欢迎页的 `/` 与 `/en/` 路由。真实原稿语言保持不变：现有 2 篇英文仍是英文源，9 篇中文仍是中文源。

## 稳定身份与 URL

- 每篇源文章拥有引号包裹的 12 位 `uid` 和 `post-<uid>` 形式的 `translation_key`。
- 所有文章显式声明 `permalink`；中文位于 `/posts/`，英文位于 `/en/posts/`。
- 单语迁移期文章不声明 `translation_url`，因此不会向读者或爬虫暴露不存在的译文。
- 译文完成后，两篇必须用 `translation_url` 互指；恰好一篇通过 `translation_source` 指向真实原稿。
- 两篇 2021 英文文章迁入 `/en/posts/`；原有无语言前缀 URL 保留为兼容重定向，并以新 URL 为 canonical。

## 迁移豁免

`_data/translation_exemptions.yml` 是关闭的迁移清单，只列出本契约建立前已经存在的 11 篇单语文章。生产检查对清单外的 singleton 直接失败；一组译文完成后必须同步删除该 key 的豁免，残留豁免同样失败。不得用新增豁免规避新文章双语发布。

## 翻译新鲜度与结构

`source_hash` 除可见文字外还追踪 post 的 `uid`、日期、作者、封面、数学和 Mermaid 开关。路由字段由独立的双向 URL 契约检查，不进入正文 hash。

成对文章必须保持以下结构签名一致：

- 标题层级序列；
- 正文图片目标与顺序；
- 行内和块级公式；
- fenced code 的语言与正文；
- 围栏外行内代码 token；
- 外部链接目标与顺序；站内已配对文章链接按 `translation_key` 映射到同一身份，未识别站内链接仍要求目标一致；
- Markdown 表格的表数量和逐行列数轮廓；
- 显式锚点、脚注引用、资料说明标记；
- `uid`、作者、发布日期、封面、数学/Mermaid 开关和修订日期序列。

结构通过不代表翻译质量通过。只有语义复核完成后才可设置 `translation_status: current` 并刷新 `source_hash`。

## SEO 与归档

站点关闭主题内以 `site.lang` 和 `/blog/` 猜测页面类型的 OG/Schema 输出，改由站点自有 include 输出：

- 自指 canonical；兼容重定向页可用 `canonical_url` 指向目标；
- 只有实际存在 `translation_url` 时才输出 `zh-CN`、`en`、`x-default` alternates；
- 随页面语言变化的 OG locale；
- post 使用 `BlogPosting` 和正确的 `inLanguage`、发布日期、修订日期。

标签和分类入口回到当前语言的随笔筛选，不再把英文访客送到无语言前缀的混合归档。旧的 tag/category/year URL 继续保留：同一归档中只要存在中文随笔就优先显示中文；仅有英文旧文时保留英文归档，避免历史页面被过滤为空。

## 欢迎页和译文任务接口

- 欢迎页任务把 `_data/site_text.yml` 的 writing URL 从 `/`、`/en/` 改到 `/writing/`、`/en/writing/` 后，标签、分类、文章标签和 fallback 会自动跟随。
- 欢迎页任务负责迁移写作索引、品牌链接和旧 query/hash；本阶段不提前占用这些路径。
- 每完成一篇译文：补译文文件、双方 `translation_url`、译文来源状态/hash，删除一个 exemption，运行生产翻译守卫和完整构建。
