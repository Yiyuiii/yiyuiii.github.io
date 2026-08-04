# 萌娘百科角色问答组件维护说明

## 组件边界

`_includes/toy-moegirl-quiz.liquid` 是嵌入双语“小玩意”单栏折叠清单的渐进增强组件，自己加载 `assets/js/moegirl-quiz.js`。折叠条目的可见标题和简述由 `_data/toys.yml` 统一提供，组件自身不重复标题；组件文案、API 地址、随机批次大小、近期排除窗口和超时集中在 `_data/moegirl_quiz.yml`，中英文界面必须同步修改。

## 出题与网络行为

- 页面初次加载不连接萌娘百科，也不预连接其域名。玩具页可能仍加载全站共用资源，因此这里的精确契约是“点击前零萌娘百科请求”，不是“全页零外部请求”。
- 用户明确点击“开始一题 / Start a round”后，脚本向 `https://zh.moegirl.org.cn/api.php` 发起一次 `generator=random` 查询，请求 50 个主命名空间、非重定向页面及其纯文本导言、分类和规范来源 URL；萌娘百科当前的 Extracts 模块在一次普通请求中最多返回 20 个导言，脚本显式声明该上限且不追随 continuation。随后浏览器在本地筛选，并用 `crypto.getRandomValues()` 与拒绝采样生成四选一题目。
- 每次请求带 128 位随机 nonce、`maxage=0` 与 `smaxage=0`，避免 CDN 把随机查询固化成同一批结果。脚本只在当前页面内记住最近 24 个候选并从后续批次排除；刷新即清空，不写入 `localStorage` 或 `sessionStorage`。
- 组件不调用 `pageimages`，不请求、嵌入、代理、复制、缓存或保存萌娘共享图片。萌娘共享官方说明其不是外链图站，且文件许可不统一，因此不要恢复远程题图实现：`https://commons.moegirl.org.cn/`。
- 请求使用 `no-referrer`、`credentials: omit`、`cache: no-store` 与 `redirect: error`；任何 HTTP 重定向都会作为失败处理，不能把一次点击扩张为第二个网络目标。组件不使用 Cookie、`localStorage`、`sessionStorage`、分析或跟踪。萌娘百科仍可看到 API 请求与访问者 IP，开始按钮前会明确披露。
- API 10 秒后中止，声明或实际响应超过 256 KiB 会拒绝；网络失败、异常 JSON、条目缺失或匿名化后线索不足会进入可重试状态，不影响页面其它内容。

## 匿名化、来源与许可

脚本只接受萌娘百科主命名空间正文页及其 HTTPS `fullurl`。候选必须在导言或分类中具有角色、人物、虚拟主播、吉祥物或拟人角色信号；敏感主题、消歧义页、列表页、歌曲/音乐作品页和 `/人格面具` 装备子页会被拒绝。导言先执行 Unicode 规范化、控制字符清理与空白折叠，再把第一个介绍性“是/为”之前的完整主语、四个候选标题及其连续汉字片段、常见别名字段替换为 `⬛`；若没有实际遮蔽任何文本，该导言不得作为答案。连续黑方块会按当前配置动态折叠。匿名化后不足 30 个字符的条目不可作为答案，最终线索最多约 420 个字符，并始终通过 `textContent` 写入。

作答后才显示准确来源条目和许可说明。线索属于来源条目的匿名化节选，复用时仍需遵循来源页标示的许可并保留来源与署名。组件提供 CC BY-NC-SA 3.0 默认许可入口，但来源页是最终依据。

固定的导言来源、名称遮蔽方式和网络隐私边界统一放在开始按钮前的披露段落中。出题后的线索框只显示“这是谁？ / Who is this character?”和本轮动态线索，不再重复机制说明。

调整随机筛选规则时必须：

1. 保持“一次点击至多一次萌娘百科请求”，不得为补足候选静默追加网络请求；
2. 用组件相同的 `generator=random` 参数核验真实响应结构、体积、角色命中数和匿名化后的可用线索数；
3. 同时复核误收主题页与误杀普通角色的样本，敏感过滤宁可保守；
4. 不得保存远程图片 URL，也不得退回手工固定小样本池；
5. 更新 `reviewed_on`，运行契约测试、浏览器桩测试和至少一次真实 API 回归。

2026-08-03 的两组低频真实抽样各为 5 次请求、每次间隔 4 秒；聚合结果和局限记录在 `docs/moegirl-quiz-quality-audit-2026-08-03.json`，没有保存条目正文。可用以下显式 opt-in 工具按相同参数复核；它会真实发出 5 次 API 请求，不能放入普通测试或 CI：

```powershell
node tests/tools/audit-moegirl-quiz-live.mjs --run-live
```

## 无障碍与性能

- 线索容器可聚焦；出题成功后焦点移到线索，四个答案均为原生 `button`，结果和错误通过 `aria-live` 宣读。
- 组件无图片、无框架、无动画；明暗主题沿用全站变量，320/390/1280 px 不得横向溢出。
- 中英文界面完整，但当前官方实时题源只有中文导言；英文索引说明与开始前披露必须明确题目仍为中文。英文题源的实时可用性、历史备份题量与重新评估条件见 `docs/moegirl-quiz-english-source-audit-2026-08-04.md`。
- 无 JavaScript 时只显示说明，不显示无效开始按钮，也不连接萌娘百科。

相关验证：

```powershell
python -m pytest -q tests/test_moegirl_quiz_contracts.py
node --check assets/js/moegirl-quiz.js
npx playwright test tests/browser/moegirl-quiz.spec.mjs
```
