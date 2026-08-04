# 萌娘百科英文题源审计（2026-08-04）

## 结论

英文萌娘百科历史上确实存在英文条目，但截至本次核查，没有找到同时满足“官方实时 API、稳定可访问、题量足够、许可清晰、可按现有一次请求协议随机出题”的英文题源。因此当前英文小玩意仍使用中文萌娘百科题目，并必须在索引说明和开始前披露中明确题目为中文；不得把历史备份固化为小题库。

这是 2026-08-04 的状态快照，不是英文站永久关闭的判断。未来接入前必须重新实测。

## 实测证据

1. 中文 Action API 的站点语言为 `zh`。给随机查询增加 `uselang=en` 只影响 MediaWiki 界面消息，不翻译条目内容；实测响应的 `title` 与 `extract` 仍为中文。
   - 站点信息：`https://zh.moegirl.org.cn/api.php?action=query&meta=siteinfo&siprop=general&format=json`
   - 随机导言复核：`https://zh.moegirl.org.cn/api.php?action=query&generator=random&grnnamespace=0&grnlimit=3&prop=extracts&exintro=1&explaintext=1&exlimit=3&uselang=en&format=json&formatversion=2`
2. `en.moegirl.org.cn` 仍可解析域名，但本次两轮读取根页面和 `api.php?action=query&meta=siteinfo...` 均在 20 至 25 秒内超时；一次 HEAD 只得到 `200`、空响应体。它目前不能承担浏览器端每轮出题的稳定实时依赖。
3. 社群在 2020 年建立了英文站公开备份：`https://github.com/ShizuhaAki/enmoegirl-backup`。截至本次核查，仓库只有 264 个 `main/` 主条目，最后一次 push 为 2021-06-09。对源码执行不区分大小写的 `character|protagonist|antagonist|mascot|virtual youtuber|vtuber|personification` 启发式筛选，只命中 154 个文件，其中还混有作品页，实际可用角色线索更少。
4. 该备份证明“历史上有英文内容”，但它不是实时随机 API，题量和新鲜度也不满足本项目禁止固定小白名单的既有边界。

## 未来重新评估条件

只有在以下条件同时成立时，才考虑让英文页使用英文题目：

- 英文站或其它获授权来源提供长期稳定、允许浏览器跨域调用的官方 API；
- 可用角色条目数量足以支持长期随机发现，而不是固定小样本；
- 文本许可、来源链接与署名方式可以逐题保留；
- 一次点击仍只产生一次题源请求，不引入静默补请求、跟踪或持久化；
- 为英文内容单独实现并实测角色识别、敏感过滤、别名遮蔽和匿名化规则；
- 完成真实响应的题量、误收、误杀、体积、限速和失败模式审计。

若改用英语维基百科、AniList 或其它第三方数据，功能就不再是同一套“萌娘百科条目猜猜”题源，必须先重新确认产品命名、数据许可、隐私披露和网络协议，不能只替换域名。
