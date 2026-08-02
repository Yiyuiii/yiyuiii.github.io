# 本地随机生成器维护说明

“随机密码”和“随机数字”嵌在“小玩意”页的单栏折叠清单中。可见条目标题、简述和搜索关键词维护在 `_data/toys.yml`；表单文案维护在 `_data/toy_generators.yml`；组件分别位于 `_includes/toy-random-password.liquid` 与 `_includes/toy-random-number.liquid`，共享 `assets/js/toy-random.js` 和 `assets/js/toy-generators.js`。

## 随机源

`assets/js/toy-random.js` 只使用浏览器 `crypto.getRandomValues()`，并提供冻结的 `globalThis.yiyuiiiToyRandom`：

```js
uintBelow(maximum)
intInclusive(minimum, maximum)
pick(entries)
```

32 位和 53 位范围都使用拒绝采样，不能改成直接取模或 `Math.random`。浏览器缺少安全随机源时，密码和数字生成按钮必须停用并显示本地化说明；不得静默降级到弱随机数、服务端接口或外部生成站。

## 随机密码

- 默认 20 位，可选 8–128 位；默认启用小写、大写、数字、常用符号并排除容易混淆的字符。
- 每个候选字符串都从所选字符全集等概率抽取；若没有覆盖每个已启用字符组，就整串重抽。因此最终结果是在“覆盖全部已选字符组”条件下的均匀分布，不用固定位置强塞字符后再洗牌。
- 少于 16 位只显示偏短提示，不虚构熵值或安全等级。生成结果默认隐藏，可临时显示或复制。
- 密码只存在于当前表单字段，不发送、不写 Cookie、Web Storage、IndexedDB 或日志。真实账户仍建议使用可信密码管理器保存。

## 随机数字

- 最小值和最大值都是 JavaScript 安全整数，范围为闭区间；一次生成 1–100 个结果。
- 普通模式逐项均匀抽取；“结果不重复”使用 Floyd 无放回采样，再做一次无偏 Fisher–Yates 洗牌，避免未排序结果仍带有构造顺序。数量超过区间容量时明确报错，不通过重试循环碰运气。
- 可选排序；硬币、D6、D20 只负责填写范围，不保存选择，也不自动生成。
- 复制失败时选中完整结果，交给用户手动复制。

## 交互与验证

两个生成器使用原生表单提交：聚焦输入框后按 Enter 与点击“生成”效果一致；状态通过 `aria-live="polite"` 更新。展开和折叠由外层原生 `details` 负责。JavaScript 未执行时只显示本地化说明，不呈现貌似可用、实际无响应的控件；安全随机源不可用时则显示错误并停用生成按钮。组件不请求网络、不加载第三方脚本、不记录生成历史。

```powershell
python -m pytest -q tests/test_toy_generators_contracts.py tests/test_toys_contracts.py
node --check assets/js/toy-random.js
node --check assets/js/toy-generators.js
node --test tests/toy_random.logic.test.mjs
npx playwright test tests/browser/toy-interactions-round2.spec.mjs
```
