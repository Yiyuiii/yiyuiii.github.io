# yiyuiii.github.io

Yiyu Chen 的双语个人站点，发布随笔、公开项目与合作论文。站点使用 Jekyll 构建，由 GitHub Actions 验证并部署。

## 目录

- _posts：当前正式文章。
- _pages、_layouts、_includes、_plugins：页面、布局、组件与本站插件。
- _data：关于页、项目、论文、界面文字与旧 URL 契约。
- assets：当前生产样式、脚本、favicon 和文章媒体。
- scripts：项目同步、翻译检查、封面处理与构建产物检查。
- tests：源码、数据、构建结果与浏览器回归。
- docs/content-editing.md：内容维护流程。
- docs/asset-provenance.yml：当前文章封面的来源、许可与哈希。
- docs/superpowers：已批准的设计与实施计划。

完整历史稿、AI 审阅稿、封面候选和原始大图不保存在 master 当前树；Git 历史负责版本恢复，当前生产资源的法律与处理信息由 asset-provenance.yml 维护。

## 验证

```powershell
pip install -r scripts/requirements.txt
python -m pytest -q
python scripts/translation_guard.py --check --production
$env:JEKYLL_ENV = "production"
bundle exec jekyll build --trace
Remove-Item Env:\JEKYLL_ENV
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
npm ci
npm run test:browser
```

Ruby production build 使用 Ruby 3.3.5 与 Jekyll 4.4.1；精确 CI 流程见 .github/workflows/deploy.yml。

Playwright 默认连接 http://localhost:62091；运行 npm run test:browser 前应先在该地址提供刚构建的 _site，或通过 SITE_URL 指向等价预览。

## 部署

Pull request 只执行验证并上传 site-preview。只有 master 的 push 在验证通过后部署 _site；不要直接把生成目录提交到 master。

## 许可

站点代码与仓库整体许可见 LICENSE。文章封面可能采用不同许可，逐项以 docs/asset-provenance.yml 和文章中的可见署名为准。
