# 本地轻量挑战组件

三个挑战由“小玩意”单栏清单按需嵌入；组件自身不显示标题，条目标题和摘要由清单统一提供：

- `_includes/toy-color-challenge.liquid`：4×4 色差挑战；
- `_includes/toy-ten-second.liquid`：盲估十秒；
- `_includes/toy-reaction-time.liquid`：反应时间。

交互集中在 `assets/js/toy-challenges.js`。三个组件只处理当前页面中的一次会话，不发送网络请求，不读写 Cookie、Web Storage 或 IndexedDB，也没有排行榜。页面关闭、进入后台或承载组件的 `details` 被折叠时，正在进行的计时立即取消。

## 随机与计时接口

组件只接受宿主预先提供的 `globalThis.yiyuiiiToyRandom`：

```js
globalThis.yiyuiiiToyRandom.intInclusive(minimum, maximum)
globalThis.yiyuiiiToyRandom.uintBelow(maximum)
globalThis.yiyuiiiToyRandom.pick(entries)
```

色差挑战和反应时间在三个方法中任何一个缺失时显示双语不可用说明并隐藏控件；不得另写随机实现或降级到非安全随机源。色差题目的色相、饱和度、亮度、不同格位置及明暗方向都通过这一接口选取；反应时间等待为闭区间 1500–4000 毫秒。盲估十秒不需要随机数，因此不受随机接口是否存在影响。

计时只在用户操作和信号触发时读取 `performance.now()`。盲估十秒不显示实时计时；反应时间以信号实际呈现时刻为起点，避免后台调度延迟被计入成绩。

## 状态与无障碍

- 色差挑战使用 16 个原生按钮；连续答对两题升一级，共简单、适中、困难三档。它明确声明不是色觉检查或医学评估。
- 盲估十秒具有开始、停止和立即重来操作。
- 反应时间在等待阶段保留可点击按钮，以识别过早点击。
- 状态只在一次明确状态转换后写入 `aria-live="polite"`，没有逐帧或实时计时播报。
- 三个挑战均使用原生按钮并保留键盘操作；没有动画，因此 `prefers-reduced-motion` 下不会产生额外运动。
- 无 JavaScript 时，`noscript` 说明功能需要本地脚本，而不是显示失效控件。

## 专项验证

```powershell
python -m pytest -q tests/test_toy_challenges_contracts.py
node --test tests/toy_challenges.logic.test.mjs
```

纯逻辑测试覆盖难度递进、色块生成、十秒计时和反应时间状态转换；Python 契约测试保护双语、渐进增强、无网络/存储以及隐藏取消边界。
