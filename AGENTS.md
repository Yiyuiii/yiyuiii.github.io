# 项目 AI 记忆

## 用户原始要求

- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站归档，必须保留用于后续对比。
- D:\Codes\yiyuiii.github.io\master 应保持为与 GitHub master 一致的唯一正式 clone；功能工作使用仓库外临时 worktree，不直接修改 master。
- GitHub 主分支当前树应正式、精简、可构建、可维护；历史过程档案不应和生产源码混放。
- original-40a013 与 archives 不得进入站点提交。
- 当前外部审阅渠道只有 Ark Coding Plan 和本地 Kimi；Anthropic 来源永久不可用，DeepSeek API 暂不可用。
- 对用户交流和审阅材料使用中文。

## 当前事实状态

- 站点使用 Jekyll 4.4.1、Ruby 3.3.5、Python 3.12 与 Node/Playwright。
- GitHub Actions 工作流为 .github/workflows/deploy.yml；PR 构建只验证和上传 site-preview，master push 才部署。
- _posts 保存当前文章；docs/asset-provenance.yml 保存当前文章封面的来源、许可、处理与 SHA-256。
- _data/legacy_urls.yml、scripts/check_legacy_urls.py 与浏览器测试共同保护旧 URL。
- docs 已由 _config.yml 排除，不会生成公开页面。

## 常用验证

```powershell
python -m pytest -q
python scripts/sync_projects.py
python scripts/translation_guard.py --check --production
bundle exec jekyll build --trace
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
npm ci
npm run test:browser
```

## 关键文档

- 内容维护：docs/content-editing.md
- 生产封面来源：docs/asset-provenance.yml
- 目录整理设计：docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md
- 目录整理实施计划：docs/superpowers/plans/2026-08-01-formalize-repository-tree.md

## AI 历史总结

- 2026-07-31：本地根目录已整理为 master、original-40a013、archives 三个职责清楚的入口；冷备份及原站均已校验。该条是历史总结，继续工作前应以实际文件与 manifests 复核。
- 2026-08-01：用户批准方案 B，将完整修订稿、AI 审阅稿、封面候选与源图移出 master 当前树，并以结构化生产来源清单保留必要证据。该条是设计决策摘要，精确边界以已批准设计为准。
