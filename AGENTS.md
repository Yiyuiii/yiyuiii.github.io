# 项目 AI 记忆

## 用户原始要求

- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站归档，必须保留用于后续对比。
- D:\Codes\yiyuiii.github.io\master 应保持为与 GitHub master 一致的唯一正式 clone；功能工作使用仓库外临时 worktree，不直接修改 master。
- GitHub 主分支当前树应正式、精简、可构建、可维护；历史过程档案不应和生产源码混放。
- original-40a013 与 archives 不得进入站点提交。
- Anthropic 来源永久不可用，不得尝试。
- 对用户交流和审阅材料使用中文。
- 每篇随笔最终必须有完整中英文版本，并保持图片、公式、代码、标题结构、锚点与修订日期对应。

## 当前事实状态

- 站点使用 Jekyll 4.4.1、Ruby 3.3.5、Python 3.12 与 Node/Playwright。
- GitHub Actions 工作流为 .github/workflows/deploy.yml；PR 只验证和上传 site-preview，master push 或在 master 上 `workflow_dispatch` 手动触发时，build 成功后 deploy。
- _posts 保存当前文章；docs/asset-provenance.yml 按唯一正式封面关联中英文文章，并保存来源、许可、处理、SHA-256 与 160/320 px 索引派生规则。派生资产由 scripts/generate_post_thumbnails.py 预生成并提交，正文原图保留。
- _data/legacy_urls.yml、scripts/check_legacy_urls.py 与浏览器测试共同保护旧 URL。
- docs 已由 _config.yml 排除，不会生成公开页面。
- 11 篇迁移前旧文已获得稳定 `uid`、`translation_key` 和显式 permalink；2 篇英文源位于 `/en/posts/`，原 URL 通过 legacy 重定向兼容。
- `_data/translation_exemptions.yml` 只允许这 11 篇旧文暂时单语；新文章必须双语发布，每完成一组迁移就删除一个豁免。
- `scripts/translation_guard.py` 同时保护翻译 source hash、成对 URL、结构签名和修订日期；单语旧文不得提前声明不存在的 `translation_url`。
- 截至 2026-08-01，当前可用的外部审阅渠道只有 Ark Coding Plan 和本地 Kimi，DeepSeek API 暂不可用；这些是动态状态，未来每次使用前必须复核实际可用性。

## 常用验证

环境前提与首次依赖安装以 README.md 的“验证”为准。常用命令入口如下；这是入口清单，不是可以脱离各自前提直接串行执行的脚本：

```powershell
python -m pytest -q
python scripts/sync_projects.py
python scripts/translation_guard.py --check --production
python scripts/generate_post_thumbnails.py --check
bundle exec jekyll build --trace
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
npm ci
npm run test:browser
```

项目同步检查需要设置可用的 `GITHUB_TOKEN`；若使用 GitHub CLI，应先 `gh auth login`，再用 `gh auth token` 设置该环境变量，CI 会自动提供凭据。`npm ci` 属于首次准备。完整验证按 README.md 的“Production 构建”和“浏览器回归”执行：Jekyll 构建必须临时设置并在 `finally` 中恢复 `JEKYLL_ENV`，两个站点检查只能针对成功生成的 `_site`，浏览器测试必须针对刚构建的 `_site` 启动隐藏本地服务器，并在 `finally` 中停止服务器和恢复 `SITE_URL`；不要直接运行缺少这些前提的裸命令。

## 关键文档

- 内容维护：docs/content-editing.md
- 双语随笔基础：docs/superpowers/specs/2026-08-01-bilingual-post-foundation.md
- 生产封面来源：docs/asset-provenance.yml
- 目录整理设计：docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md
- 目录整理实施计划：docs/superpowers/plans/2026-08-01-formalize-repository-tree.md
- 主页下一阶段实施计划：docs/superpowers/plans/2026-08-01-homepage-refresh.md

## AI 历史总结

- 2026-07-31：本地根目录已整理为 master、original-40a013、archives 三个职责清楚的入口；冷备份及原站均已校验。该条是历史总结，继续工作前应以实际文件与 manifests 复核。
- 2026-08-01：用户批准方案 B，将完整修订稿、AI 审阅稿、封面候选与源图移出 master 当前树，并以结构化生产来源清单保留必要证据。该条是设计决策摘要，精确边界以已批准设计为准。
- 2026-08-01：用户批准按专业子任务实施欢迎页、双语随笔、正文排版、缩略图与阳光背景等下一阶段工作；欢迎页文案必须便于人工编辑，功能指引优先尝试箭头并在跨视口效果不佳时回退为文本。精确接口、依赖与验收以主页下一阶段实施计划为准。
