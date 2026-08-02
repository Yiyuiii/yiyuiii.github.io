# 萌娘猜图组件维护说明

## 组件边界

`_includes/toy-moegirl-quiz.liquid` 是可直接嵌入双语“小玩意”页面的独立组件；组件自己加载 `assets/js/moegirl-quiz.js`。页面外壳只需在正文中使用：

```liquid
{% include toy-moegirl-quiz.liquid %}
```

文案、API 地址、超时和白名单条目池集中维护在 `_data/moegirl_quiz.yml`。中英文界面必须同步修改。

## 出题与网络行为

- 页面初次加载不会连接萌娘百科，也不会加载远程图片。
- 用户明确点击“开始一题 / Start a round”后，脚本用浏览器的 `crypto.getRandomValues()` 从人工白名单中均匀抽取 4 个不重复条目，再向 `https://zh.moegirl.org.cn/api.php` 发起一次元数据请求。
- API 返回的 4 个条目中，脚本在当前确实带有 HTTPS 缩略图的条目间均匀选择答案；其余 3 个仍作为本地选项显示。
- 随后浏览器用普通远程 `<img>` 直接显示 API 返回的缩略图。本站不下载、复制、代理、预生成或持久化图片，也不建立应用层缓存。
- API 请求与图片都使用 `no-referrer`；请求不带凭据并使用 `cache: no-store`。组件不使用 Cookie、`localStorage`、`sessionStorage`、分析或跟踪。
- 第三方仍可见请求和访问者 IP，开始按钮前的中英文提示明确披露这一点。
- API 请求 10 秒后中止。请求失败、没有可用缩略图或图片加载失败只会使组件进入可重试状态，不影响页面其它内容。

## 条目池与版权边界

条目池不是萌娘百科全站随机接口，而是普通角色条目的人工白名单。2026-08-02 已逐项核验这些标题能够从官方 API 返回正文页 URL 与缩略图；外部页面以后仍可能更名、撤图或更换题图，因此脚本保留了缺图和失败回退。

题图由萌娘百科页面及其图像存储即时提供，许可和权利状态并不统一。用户作答后组件才显示对应来源条目，并固定提示“图像版权以来源页为准 / Image copyright follows the source page”。不要把远程题图纳入本站资产目录或来源清单。

新增条目时必须：

1. 只加入适合普通公开页面展示的角色条目；
2. 用组件使用的 `pageimages|info` 查询核验准确标题、正文页 URL 和缩略图；
3. 不在数据文件中保存远程图片 URL；
4. 更新 `reviewed_on` 并运行组件契约与浏览器测试。

## 无障碍与性能

- 四个答案均为原生 `button`，可以用键盘操作；结果和错误通过 `aria-live` 宣读。
- 题图保留固定方形占位和 480 px API 缩略图上限，使用 `loading="lazy"`、`decoding="async"` 和 `object-fit: contain`。
- CSS/JS 无框架、无动画；明暗主题沿用全站变量，320/390/1280 px 均不得横向溢出。
- 无 JavaScript 时只显示说明，不显示无效开始按钮，也不会产生第三方请求。

相关验证：

```powershell
python -m pytest -q tests/test_moegirl_quiz_contracts.py
node --check assets/js/moegirl-quiz.js
npx playwright test tests/browser/moegirl-quiz.spec.mjs
```
