# 全站 GitHub Discussions 评论计划

## 用户原始要求

- 在每个正式页面底部提供评论功能。
- 使用 GitHub 提供的讨论能力；评论内容公开保存在 GitHub Discussions。
- 不干扰正在独立 worktree 推进的 SETI 随笔。

## 产品边界

- 评论覆盖使用 `default` 布局、具有稳定 canonical URL 的正式页面和随笔。
- 旧 URL 重定向页与 404 不创建评论线程；重定向应落到目标页，404 没有稳定内容身份。
- 中文与英文 URL 分别映射到自己的讨论，避免两种语言被迫混在同一线程。
- 没有自动加载偏好的页面首次打开不请求 `giscus.app` 或 GitHub。读者明确点击“显示评论”后只加载当前页；明确勾选“自动加载评论”后，当前页与今后访问的正式页面自动加载 Giscus。
- 加载前明确说明评论公开、会连接 `giscus.app` 与 GitHub、发送当前页面路径，以及当前空评论区首次加载约 `0.13 MB`；按钮同步显示这一近似体积。站点只为自动加载选项保存一个最小化本机偏好，不增加 Cookie、路径或访问记录。
- “评论公开保存在 GitHub Discussions”中的 `GitHub Discussions` 直接链接到当前评论分类；JavaScript 不可用或评论加载失败时，这个普通链接仍然可用。

## GitHub 配置

1. 为公开仓库 `Yiyuiii/yiyuiii.github.io` 启用 Discussions。
2. 安装官方 Giscus GitHub App，并只授权该仓库。
3. 使用仓库启用 Discussions 时自动创建的 `Announcements` 分类；普通读者可以评论，但不能绕过 Giscus 任意创建页面线程。后续若站点需要单独发布公告，再将评论迁移到专用的 `Comments` 公告分类。
4. 用 GitHub GraphQL 读取仓库与分类 Node ID，写入 `_config.yml`。
5. 根目录 `giscus.json` 只允许正式站点和受控本地预览来源嵌入评论。

## 页面组件

- `_includes/page-comments.liquid` 保存结构和由 `_data/site_text.yml` 提供的双语文案。
- `_layouts/default.liquid` 在正文之后、页脚之前只渲染评论；`page.redirect` 时排除评论，404 布局也不渲染评论。
- `assets/js/page-comments.js` 只处理手动／自动加载、最小化偏好、配置注入、失败重试与主题同步。
- Giscus 使用 `pathname`、严格匹配、分类严格筛选、公开 reactions、底部输入框和按页面语言选择的 `zh-CN` / `en`。
- 初始与切换后的站点主题都通过 Giscus 官方 `setConfig` 消息同步；明亮使用官方 `light`，夜晚使用官方 `dark`。保留 Giscus 原生署名位置，不以自定义主题依赖、隐藏或重排 iframe 内部结构。

## 验收

1. 中文和英文欢迎页、随笔、项目、论文、小玩意与 About 均有且仅有一个评论区。
2. 默认与普通手动显示不创建偏好；默认页面初始加载不请求 `giscus.app` 或 GitHub，点击一次只注入一个客户端脚本。
3. 配置中的仓库、分类、Node ID、pathname、严格匹配、语言和主题正确。
4. 明确开启自动加载时只保存 `yiyuiii.comments.v1=auto` 并立即加载；后续页面自动加载，关闭时删除该键但保留当前已加载评论。无效值或存储失败不得自动联网。
5. 脚本失败后显示本地化错误并允许重试；无 JavaScript 时自动加载选项隐藏，GitHub Discussions 链接可用。
6. 主题切换向现有 Giscus iframe 发送官方 `setConfig` 消息。
7. 重定向与 404 不渲染评论；320 px 无横向溢出。
8. Python/Node 契约、production 构建、站点检查、旧 URL 检查和 Playwright 全部通过。

## 外部状态

- 2026-08-03：仓库 GitHub Discussions 已启用，选用默认的 `Announcements` 公告分类。
- 2026-08-04：用户完成 Giscus GitHub App 的仓库级授权；Giscus 官方分类接口返回配置中的仓库与分类 Node ID。
- 2026-08-04：在 PR #10 的 CI `site-preview` artifact 上验证中文与英文真实 Giscus iframe、GitHub 登录入口和明暗主题切换；未创建讨论、回应或评论。
- 2026-08-04：用户决定由评论取代站内重复的 Issue／邮件反馈提示，因此移除全站页面反馈组件；仓库原生 Issue Form 仍保留。Discussions 入口并入公开存储说明句。评估过将 Giscus 署名移到评论框下方的方案后，为避免依赖上游 iframe 内部结构，最终保留官方主题与原生署名位置，不修改 Giscus 源码。
- 2026-08-04：用户在保留默认显式点击的基础上，要求另设明确的“自动加载评论”选项。普通显示不持久化；只有勾选才保存最小化偏好，取消则停止后续页面自动加载。

## 加载体积与交互取舍

- 2026-08-04 使用全新 Chrome 缓存测量当前空评论区：`client.js` 为 `3,596 B` 未压缩、`1,555 B` gzip；真实 iframe 首次传输约 `117 KB`，计入客户端脚本、请求头等后整体约 `130 KB`（`0.13 MB`），解压后约 `296 KB`。
- 同一浏览器会话后续页面的 iframe 实测约 `4 KB`，连同客户端脚本缓存验证约 `5–7 KB`。Giscus 版本、评论数量、头像及缓存状态都会改变实际用量，因此页面只给出近似首次体积，并注明实际用量随评论内容变化。
- 用户复核后决定保留显式点击：下载量只是次要理由，主要价值是让读者在发送页面路径并连接第三方前自行选择；代价是评论可见性和参与路径多一次操作。
- 对连续阅读并希望减少重复点击的读者，另提供默认关闭的持久“自动加载评论”选项。一次普通显示不等于长期授权；只有明确勾选才使后续页面自动连接第三方，取消后只停止未来加载，当前已经发生的请求无法撤回。
