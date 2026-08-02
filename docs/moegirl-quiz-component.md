# 萌娘百科角色问答组件维护说明

## 组件边界

`_includes/toy-moegirl-quiz.liquid` 是嵌入双语“小玩意”页面的渐进增强组件，自己加载 `assets/js/moegirl-quiz.js`。文案、API 地址、超时和白名单集中在 `_data/moegirl_quiz.yml`；中英文界面必须同步修改。

## 出题与网络行为

- 页面初次加载不连接萌娘百科，也不预连接其域名。玩具页可能仍加载全站共用资源，因此这里的精确契约是“点击前零萌娘百科请求”，不是“全页零外部请求”。
- 用户明确点击“开始一题 / Start a round”后，脚本用 `crypto.getRandomValues()` 和拒绝采样，从本地白名单均匀抽出 4 个不重复角色，再向 `https://zh.moegirl.org.cn/api.php` 发起一次 `extracts|info` 纯文本请求。
- 组件不调用 `pageimages`，不请求、嵌入、代理、复制、缓存或保存萌娘共享图片。萌娘共享官方说明其不是外链图站，且文件许可不统一，因此不要恢复远程题图实现：`https://commons.moegirl.org.cn/`。
- 请求使用 `no-referrer`、`credentials: omit`、`cache: no-store` 与 `redirect: error`；任何 HTTP 重定向都会作为失败处理，不能把一次点击扩张为第二个网络目标。组件不使用 Cookie、`localStorage`、`sessionStorage`、分析或跟踪。萌娘百科仍可看到 API 请求与访问者 IP，开始按钮前会明确披露。
- API 10 秒后中止，声明或实际响应超过 256 KiB 会拒绝；网络失败、异常 JSON、条目缺失或匿名化后线索不足会进入可重试状态，不影响页面其它内容。

## 匿名化、来源与许可

脚本只接受萌娘百科主命名空间正文页及其 HTTPS `fullurl`。它解析 API 数据中的 `normalized` / `redirects` 映射，拒绝多个候选映射到同一正文页的歧义，然后对导言执行 Unicode 规范化、控制字符清理与空白折叠。四个候选标题、标题中的连续汉字片段、当前正文标题和本地核验过的 `aliases` 会按长度降序屏蔽；匿名化后不足 60 个字符的条目不可作为答案，最终线索最多约 420 个字符，并始终通过 `textContent` 写入。

作答后才显示准确来源条目和许可说明。线索属于来源条目的匿名化节选，复用时仍需遵循来源页标示的许可并保留来源与署名。组件提供 CC BY-NC-SA 3.0 默认许可入口，但来源页是最终依据。

新增条目时必须：

1. 确认是单一角色正文页，不是消歧页、列表或主题页；
2. 用组件相同的 `extracts|info` 查询核验标题、正文 URL 和纯文本导言；
3. 检查屏蔽角色名后仍有至少 60 个字符且具有可玩性；
4. 把导言中的简称、外文名、罗马字与常见别称全部补进 `aliases`，不得保存远程图片 URL；
5. 更新 `reviewed_on`，运行契约测试、浏览器桩测试和至少一次真实 API 回归。

## 无障碍与性能

- 线索容器可聚焦；出题成功后焦点移到线索，四个答案均为原生 `button`，结果和错误通过 `aria-live` 宣读。
- 组件无图片、无框架、无动画；明暗主题沿用全站变量，320/390/1280 px 不得横向溢出。
- 中英文界面完整，但官方导言是中文；英文提示必须明确这一点。
- 无 JavaScript 时只显示说明，不显示无效开始按钮，也不连接萌娘百科。

相关验证：

```powershell
python -m pytest -q tests/test_moegirl_quiz_contracts.py
node --check assets/js/moegirl-quiz.js
npx playwright test tests/browser/moegirl-quiz.spec.mjs
```
