# MathJax 本地化说明

## 决策

本站固定使用 MathJax 3.2.2，并将当前 TeX/MathML → CHTML 组合运行时及其完整 CHTML WOFF 字体集放在同源目录。上游目录名虽为 `woff-v2`，文件本体使用 WOFF 格式。公式页不再向 MathJax CDN 发出请求，因此浏览器回归和线上公式渲染都不依赖第三方网络可用性。

三种方案的取舍如下：

| 方案 | 可靠性 | 仓库增量 | 浏览器缓存与网络 | 结论 |
| --- | --- | ---: | --- | --- |
| 双 CDN | 两个供应商同时故障的概率较低，但仍受 DNS、跨域、地区网络及 CDN 缓存影响 | 约 0 | 可复用公共 URL 的浏览器缓存收益如今有限；首次公式页仍需站外连接 | 不满足离线、确定性回归目标 |
| 仅本地运行时 | 运行时可靠，但字体仍可成为独立站外故障点；若保留 CDN 字体便不算完整本地化 | 约 1.17 MB | 首次加载运行时与本站同源，字体仍跨域 | 改了一半，收益不闭合 |
| 本地运行时 + 字体 | 公式所需资产均随同一 Pages 部署发布，可用一次构建和断网站外请求测试共同验证 | 1,532,337 B（25 个文件） | 运行时版本路径内容不可变，具体缓存时长由 Pages 响应头决定；23 个字体共 347,972 B，浏览器按实际字形需要请求，并非每页全部下载 | 采用 |

运行时本体 1,173,007 B（本地 gzip 实测 265,983 B）；23 个 CHTML 字体共 347,972 B；许可文件 11,358 B。仓库没有提交 npm 包其余约 22.6 MB 的输入、SVG、语音、源码映射和示例文件。

## 来源、许可与完整性

- 包：`mathjax@3.2.2`
- npm tarball：`https://registry.npmjs.org/mathjax/-/mathjax-3.2.2.tgz`
- npm 发布完整性：`sha512-Bt+SSVU8eBG27zChVewOicYs7Xsdt40qm4+UpHyX7k0/O9NliPc+x77k1/FEsPsjKPZGJvtRZM1vO+geW0OhGw==`
- 上游仓库：`https://github.com/mathjax/MathJax`
- 许可：Apache License 2.0；原文保存在 `assets/vendor/mathjax/3.2.2/LICENSE`
- `tex-mml-chtml.min.js` SHA-256：`300480069078b5892d2363a2b65e2dfbbf30fe5c80f83edbfecf4610fd093862`
- 对应 SRI：`sha256-MASABpB4tYktI2Oitl4t+78w/lyA+D7b/s9GEP0JOGI=`

这些文件来自上游发布包，未作内容修改。版本路径和 SRI 由 `_config.yml` 管理；字体路径在加载运行时前显式写入 `window.MathJax.chtml.fontURL`。

## 验证与维护

`tests/test_mathjax_local_contracts.py` 固定运行时哈希、字体数量与总字节数，并禁止配置重新引入 CDN。`tests/browser/math-rendering-round3.spec.mjs` 会阻断所有站外 HTTP(S) 请求，检查 16 个中英文公式页的数量、可见性、MathJax 错误与残留分隔符，还会确认运行时和实际字体请求均来自本站。

升级版本时必须从新的官方 npm 发布包重新提取同一范围的文件，更新版本目录、配置、许可与哈希，再完成生产构建和上述断网浏览器测试。不要直接覆盖现有版本目录，也不要提交整个 npm 包或 `node_modules`。
