# 本地轻量挑战组件

三个挑战由“小玩意”单栏清单按需嵌入；组件自身不显示标题，条目标题和摘要由清单统一提供：

- `_includes/toy-color-challenge.liquid`：4×4、25 级色差挑战；
- `_includes/toy-ten-second.liquid`：盲估十秒；
- `_includes/toy-reaction-time.liquid`：反应时间。

色差运行时位于 `assets/js/toy-color-challenge.js`；两项计时状态机位于 `assets/js/toy-challenges.js`，本机历史、统计和 SVG 位于 `assets/js/toy-challenge-history.js`。三个挑战都不发送网络请求、Cookie 或用户标识，没有在线排名。色差不持久化；两项计时只使用本文列出的两个精确 `localStorage` 键。

## 随机与计时接口

色差和反应时间只接受宿主预先提供的安全随机接口：

```js
globalThis.yiyuiiiToyRandom.intInclusive(minimum, maximum)
globalThis.yiyuiiiToyRandom.uintBelow(maximum)
globalThis.yiyuiiiToyRandom.pick(entries)
```

三个方法任一缺失时，对应随机挑战显示双语不可用说明并隐藏控件；不得另写随机实现或降级到 `Math.random()`。盲估十秒不需要随机数。

计时只在用户操作和信号触发时读取 `performance.now()`。盲估十秒不显示实时计时；反应信号通过可取消的 `requestAnimationFrame` 呈现，并以该帧的时间为起点。页面进入后台、离开页面或外层 `details` 折叠时，进行中的计时、timeout 和待执行帧都立即取消，取消不会写入历史。

## 色差挑战

- 难度为 `1/25..25/25`，默认从 `9/25` 开始。
- 每题答对 `+1`、答错 `-1`，总分无上下界；每三题结算，答对至少两题升一级，否则降一级。
- `1/25` 固定使用整数 sRGB 黑白端点；`25/25` 只让中高亮中性色的红或蓝通道相差一个整数码值。
- 中间级用几何递减的 `ΔE_OK` 目标；最终写入 CSS 的整数 RGB 必须反算后落在本级互不重叠的实际区间。
- `2..20/25` 在 OKLab 中构造后量化复核；`21..24/25` 从整数 RGB 邻域搜索；所有搜索有界并具有自动复算的确定性回退。
- 在最高级完成正分三题组后进入单码极限无尽模式，继续记录极限组数但不伪造更小色差；负分组退回一级。
- 在最低级完成负分组继续黑白基础练习，积分仍可继续变负；不得把结果解释为色觉或医学判断。
- 四项核心统计常显，答题总数、正确率、连对、最高等级和上下界纪录位于折叠的次级统计中。只有结果摘要使用 `aria-live`。

## 计时历史、统计与隐私

唯一允许的键：

```text
yiyuiii.toy.ten-second.v1
yiyuiii.toy.reaction-time.v1
```

载荷只保存版本、整数毫秒成绩、清空后累计完成数和反应时间抢跑数；不保存时间戳、路径、语言、设备、输入方式或用户标识。每项最多保留最近 100 次完成成绩，写入只发生在有效完成、抢跑和确认清空时。损坏、未知版本或存储异常会退回当前页面内存，不影响挑战本身，并显示“仅本次打开有效”。清空只删除本挑战的精确键，不得使用 `localStorage.clear()`。

- 盲估统计以 `实际耗时 - 10 秒` 为带符号误差，文字同时给出最佳绝对误差、中位绝对误差和整体偏早/偏晚倾向。
- 反应时间统计给出最佳值、中位数、最近五个有效成绩中位数、抢跑数与抢跑率；低于 100 ms 或高于 3000 ms 的成绩保留但不进入趋势。
- 两图均使用原生 SVG，最多 100 个点；满五个有效成绩后显示最近五次滚动中位数。异常值以空心形状表示，图具有双语 `<title>/<desc>`，逐项数据同时提供在可键盘展开的表格中。
- 清空必须二次确认；删除持久化副本失败时要与成功清空或初始内存模式明确区分。

## 无障碍与渐进增强

- 三个挑战都使用原生按钮并保留键盘操作；答案同时使用文字、符号和轮廓，不只依赖红绿颜色。
- 统计区域本身不设 `aria-live`；只让单次结果或清空状态播报一次。
- SVG 点不进入 Tab 顺序，完整记录表提供等价数据；图表在 320 px 视口内不得造成页面横向滚动。
- 无 JavaScript 时，`noscript` 说明功能需要本地脚本，而不是显示失效控件。

## 专项验证

```powershell
python -m pytest -q tests/test_toy_challenges_contracts.py tests/test_toy_color_challenge_round5.py
node --test tests/toy_challenges.logic.test.mjs tests/toy_challenge_history.logic.test.mjs tests/toy_color_challenge.logic.test.mjs
```

浏览器回归还必须覆盖负分与三题升降、本机历史的精确键写入、刷新恢复、损坏或禁用存储、清空隔离、SVG 无障碍、暗色和 320 px 布局。
