# `yiyuiii.top` 与 Cloudflare Web Analytics

## 目标与当前状态

本轮用户要求把 `yiyuiii.top` 指向现有 GitHub Pages 站点，并使用已创建的 Cloudflare Web Analytics 站点令牌统计全球访问。

2026-09-03 的只读核对结果如下：

- GitHub Pages 正式地址仍是 `https://yiyuiii.github.io/`，Pages API 的 `cname` 为空。
- Cloudflare 是 `yiyuiii.top` 的权威 DNS 托管方；现有根域 A/AAAA 记录已直接使用 GitHub Pages 官方地址，`www` CNAME 已指向 `yiyuiii.github.io`。HTTP 响应来自 GitHub 边缘，但因为 Pages 尚未认领该 Host，目前返回 404；HTTPS 还会先因证书主机名不匹配而被正常客户端拒绝。
- `_github-pages-challenge-Yiyuiii.yiyuiii.top` 的 TXT 查询返回域名不存在。该查询无法读取 GitHub 账户页面中的待验证状态，但用于持续验证的公开 TXT 确实缺失，因此发布流程必须按“尚未验证”处理。
- Cloudflare Web Analytics 面板中的站点是 `yiyuiii.top`。Cloudflare 会校验发送数据的页面主机名，因此同一令牌不能直接用于 `yiyuiii.github.io`。
- 本文对应的代码仍是未发布候选。正式域名、统计数据和重定向状态必须在受保护发布后重新核对。

## 代码边界

- `_config.yml` 把正式 `url` 设为 `https://yiyuiii.top`，并保存公开的站点令牌与允许主机名。
- 根目录 `CNAME` 随构建产物进入 `gh-pages`，用于让 GitHub Pages 认领 `yiyuiii.top`。
- `_includes/cloudflare-web-analytics.liquid` 只在非重定向的正式布局中加载同源启动器。
- `assets/js/cloudflare-web-analytics.js` 只在当前主机恰好是 `yiyuiii.top` 或其子域时创建用户提供的 `type="module"` Cloudflare beacon。loopback、本地 artifact 和旧 `yiyuiii.github.io` 地址均不联系 Cloudflare。
- 每页至多创建一个 `data-cf-beacon` 脚本；脚本被广告拦截器、CSP 或网络阻断时，不影响页面内容和交互。
- CSP 仅新增 `https://static.cloudflareinsights.com` 的脚本权限和 `https://cloudflareinsights.com` 的连接权限；不使用泛化的 `https:`。
- `giscus.json` 同时允许新正式域名与旧 GitHub Pages 域名，便于域名切换期间继续使用评论。

Cloudflare 的手动安装通过 JavaScript beacon 读取浏览器性能数据，并将数据发送到 `cloudflareinsights.com/cdn-cgi/rum`。Cloudflare 声明该产品不使用 Cookie、本地存储或访客指纹，也不会跨站跟踪访客。页脚以中英文长期披露这一边界并链接官方说明。站点令牌会公开出现在浏览器 DOM 中，它是站点标识，不是账户凭据。

手动脚本没有可安全使用的固定版本或 SRI 哈希；这是 Cloudflare 当前明确记录的限制。若将来改用 Cloudflare 自动注入，应先删除本站手动启动器，避免同页出现多个 beacon。当前方案在 Cloudflare 面板应选择“使用 JS 代码段安装”，不要同时开启自动注入。

## 发布与域名切换顺序

1. **先完成账户级域名验证，未通过则禁止发布。** 登录 GitHub 后进入个人头像下的 **Settings → Pages**（不是仓库设置），添加 `yiyuiii.top`；把 GitHub 当场生成的精确 TXT 名称和值加入 Cloudflare DNS，等待 `Resolve-DnsName -Type TXT _github-pages-challenge-Yiyuiii.yiyuiii.top` 能读到该值，再回到 GitHub 点击 **Verify**。长期保留 TXT，不得猜测或复用其它账户的挑战值。
2. 候选必须通过 `python scripts/validate.py --browser` 和人工审阅；未经用户确认，不合入 `master`。
3. 域名验证完成并获得发布确认后，将同一候选合入 `master`。成功的 GitHub Actions 部署会把 `CNAME`、新 canonical URL、Giscus 来源和统计代码一起送入 `gh-pages`，避免只切域名而让评论或 canonical 暂时失配。
4. 部署后必须检查 GitHub 仓库的 **Settings → Pages → Custom domain** 或 Pages API，只有其明确显示 `yiyuiii.top` 才能认为认领成功；若仍为空，再显式保存该域名，不能只根据仓库中存在 `CNAME` 宣布完成。
5. 现有 DNS 已完成用户希望的指向，无需修改：根域四条 A、四条 AAAA 均为 GitHub Pages 官方地址，`www` 是指向 `yiyuiii.github.io` 的 CNAME。DNS 只负责解析，旧地址到新地址的路径保留重定向由 GitHub Pages 在认领自定义域名后处理。不要添加通配符记录。
6. 当前记录直接返回 GitHub 地址，相当于 Cloudflare 面板中的 **DNS only**；保持该状态，等待 GitHub 完成 DNS 检查、证书签发并允许启用 HTTPS。若以后改为 Cloudflare 代理，应在证书和重定向均验证后再单独评估。
7. 完成后逐项验证：
   - `https://yiyuiii.top/` 返回 200，且内容和当前正式部署一致；
   - `https://www.yiyuiii.top/` 重定向到根域；
   - `https://yiyuiii.github.io/` 重定向到根域并保留路径；
   - canonical、hreflang、sitemap 与 Giscus backlink 使用 `https://yiyuiii.top`；
   - 正式域名每页只请求一次 `beacon.min.js`，关闭页面时只向允许的 RUM 端点发送统计；
   - 阻断 `static.cloudflareinsights.com` 后，导航、搜索、文章、评论按钮和小玩意仍正常。

DNS 与证书变更可能需要最多 24 小时传播。Cloudflare 面向中国大陆的专用 China Network 是企业级附加服务并要求 ICP 相关条件；免费方案对大陆访客只能视为尽力而为，不承诺境内加速或统计上报的完整率。

## 官方依据

- [GitHub Pages：管理自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages：验证自定义域名并防止接管](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [GitHub Pages：HTTPS 与证书排查](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [Cloudflare：apex CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening/set-up-cname-flattening/)
- [Cloudflare Web Analytics：启用方式](https://developers.cloudflare.com/web-analytics/get-started/)
- [Cloudflare Web Analytics：FAQ、主机名校验、CSP 与 SRI](https://developers.cloudflare.com/web-analytics/faq/)
- [Cloudflare Web Analytics：数据来源与发送端点](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/)
- [Cloudflare China Network](https://developers.cloudflare.com/china-network/)
