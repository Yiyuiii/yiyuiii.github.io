# Apple 礼品码转相机可扫描卡片外部链接维护说明

## 用户目标与当前决定

用户于 2026-08-17 要求在“小玩意”中保留
`https://diax7.github.io/redeem-apple-gift-cards-without-typing/` 的入口，点击后直接前往上游页面。随后确认一般电脑缺少 `Scancardium_2.0.ttf`，并选择将它改成明确的外部链接，以避免本站托管或转发 Apple 私有框架字体。

第十二项继续位于“实用工具／Utilities”，可见名称为“Apple 礼品码转相机可扫描卡片（外部）／Apple gift code to camera-scannable card (external)”。它把功能描述为“将原本需要手动输入的文字礼品码转换成可供 Apple 设备摄像头扫描录入的卡片”，避免让人误解为读取实体礼品卡。入口是一张完整可点击的链接卡，不属于本站运行时组件。

## 公开行为与边界

- 中英文页面只输出一个固定 HTTPS 链接，目标为：
  `https://diax7.github.io/redeem-apple-gift-cards-without-typing/`。
- 标题与说明明确写出输入是文字礼品码，输出是 Apple 设备摄像头可扫描录入的卡片；本站入口本身不执行转换。
- 链接使用 `target="_blank"` 与 `rel="external noopener noreferrer"`，在新标签页打开，并阻止新页面取得本站窗口对象或收到 referrer。
- 可见标题、说明和行动标签都明确写出“外部／external”、托管者 `diax7` 和“新标签页／new tab”。
- 本站不使用 `iframe`，不预连接、不预取、不代理上游页面，也不引用其字体、样式、脚本或图片。
- 本站不会读取、接收、保存或记录礼品卡码。用户点击链接后已离开本站，上游页面的实时代码、隐私行为、可用性和许可由其维护者负责。
- 礼品卡码等同可消费凭证。不要把真实代码写入 Issue、聊天、截图、日志或任何不受信任的页面。

## 撤下的本站实现

早期候选曾包含本地字体选择、固定字体哈希、代码规范化和 SVG 扫码卡运行时。用户选择外部链接后，下列候选文件和映射已全部撤下：

- `_data/toy_apple_gift_card.yml`
- `_includes/toy-apple-gift-card.liquid`
- `assets/js/toy-apple-gift-card.js`
- `assets/js/toy-loader.js` 中对应的 token 与依赖
- `_includes/toy-index.liquid` 中对应的运行时清单项

仓库和构建产物不得包含 `Scancardium*.ttf`，也不得从本站页面自动请求该字体。

## 上游审计基线

选择外部链接时审计的上游源码基线为提交
`1f9eda96b5666b0a9a02f162b4a7fd90bc35b8d6`。上游声明礼品卡码在浏览器本地处理，但外部页面可以在未来自行更新；本站的测试只保证链接目标和本站边界，不能替上游持续背书。

来源：

- 上游页面：<https://diax7.github.io/redeem-apple-gift-cards-without-typing/>
- 上游固定源码：<https://github.com/diax7/redeem-apple-gift-cards-without-typing/tree/1f9eda96b5666b0a9a02f162b4a7fd90bc35b8d6>
- Apple 官方兑换步骤：<https://support.apple.com/118242>

## 验证

```powershell
python -m pytest -q tests/test_toy_apple_gift_card_contracts.py tests/test_toys_contracts.py tests/test_check_site.py
npx playwright test tests/browser/toy-apple-gift-card.spec.mjs tests/browser/toy-loading.spec.mjs
python scripts/validate.py --browser
```

浏览器回归在点击测试中拦截并替代上游响应，只验证“一次点击、新标签页、固定目标”。普通 CI 不依赖外部站点可达性；维护者需要时可显式运行 `python scripts/check_site.py --site _site --external-links` 检查当前外链。
