# 首页标志日期来源

## 语义与边界

首页用分类型“标志日期”作为 25 条内容的排序依据。三类日期语义不同，页面会明确说明；它们都不表示最近修订、最近 push、最近获得 Star、最近进入本站或最近由本站整理的时间。

- 随笔取 front matter 的初稿日：有 `revisions` 时取 `revisions[0].date`，否则取 `date`。两种语言必须相同。
- 项目取当前公开 GitHub 仓库 API 的 `created_at`，并换算为 `Asia/Hong_Kong` 自然日。GitHub API 不提供公开／私有可见性变更历史，因此它是当前公开仓库可统一核验的最早仓库标记，不额外声称仓库从创建瞬间起始终公开。
- 论文取最早权威公开记录：预印本 v1、在线优先、出版社 published 字段或正式论文集公开记录。
- 当前所有条目都有到日证据，精度均为 `day`。将来若只能证实年份，应保存 `precision: year` 并只显示年份，不得用 `YYYY-01-01` 代填。

## 随笔（11）

| 稳定 ID | 标志日期 | 来源 |
|---|---:|---|
| `writing:202109160000` | 2021-09-16 | 中英文文章 front matter `date` |
| `writing:202109170000` | 2021-09-17 | 中英文文章 front matter `date` |
| `writing:202208142347` | 2022-08-14 | 中英文文章 front matter `date` |
| `writing:202208171838` | 2022-08-17 | 中英文文章 front matter `date` |
| `writing:202211110000` | 2022-11-11 | 中英文 `revisions[0].date`，且等于文章 `date` |
| `writing:202301162233` | 2023-01-28 | 中英文文章 front matter `date`；UID 与文件名只作稳定身份／路径，不用于推算日期 |
| `writing:202302032000` | 2023-02-03 | 中英文 `revisions[0].date`，且等于文章 `date` |
| `writing:202307232000` | 2023-07-23 | 中英文文章 front matter `date` |
| `writing:202404232233` | 2024-04-23 | 中英文文章 front matter `date` |
| `writing:202407012233` | 2024-07-01 | 中英文文章 front matter `date` |
| `writing:202510112233` | 2025-10-11 | 中英文 `revisions[0].date`，且等于文章 `date` |

## 项目（6）

项目值保存在 `_data/project_repositories.yml`；`scripts/sync_projects.py` 会在 CI 中重新读取同一 API 字段并核对香港日期。

| 稳定 ID | GitHub `created_at` | 香港标志日期 | 证据 |
|---|---:|---:|---|
| `project:Yiyuiii/codex-cc-tools` | 2026-05-22T04:13:17Z | 2026-05-22 | `https://api.github.com/repos/Yiyuiii/codex-cc-tools` |
| `project:Yiyuiii/HDBO-B` | 2023-05-30T02:59:18Z | 2023-05-30 | `https://api.github.com/repos/Yiyuiii/HDBO-B` |
| `project:Yiyuiii/nonebot-plugin-moegoe` | 2022-08-20T14:39:04Z | 2022-08-20 | `https://api.github.com/repos/Yiyuiii/nonebot-plugin-moegoe` |
| `project:Yiyuiii/simple_asr_llm_tts` | 2025-03-15T10:45:24Z | 2025-03-15 | `https://api.github.com/repos/Yiyuiii/simple_asr_llm_tts` |
| `project:Yiyuiii/solver4turingmachine` | 2024-06-03T18:12:29Z | 2024-06-04 | `https://api.github.com/repos/Yiyuiii/solver4turingmachine` |
| `project:Yiyuiii/taco` | 2026-04-15T15:39:33Z | 2026-04-15 | `https://api.github.com/repos/Yiyuiii/taco` |

## 论文（8）

| 稳定 ID | 标志日期 | 权威来源与字段 |
|---|---:|---|
| `publication:hdbo-b-ijcnn-2025` | 2025-06-30 | Crossref DOI 记录 `published`：`https://api.crossref.org/works/10.1109/IJCNN64981.2025.11228765` |
| `publication:hdbo-survey-2025` | 2025-03-05 | 《软件学报》条目“在线发布日期”：`https://www.jos.org.cn/jos/article/abstract/7304` |
| `publication:trust-region-newton-ecai-2025` | 2025-08-25 | arXiv v1 submission date：`https://arxiv.org/abs/2508.18423v1` |
| `publication:meta-rl-survey-2024` | 2023-09-11 | 《软件学报》条目“在线发布日期”：`https://www.jos.org.cn/jos/article/abstract/7011` |
| `publication:supervised-dr-ppsn-2024` | 2024-09-07 | Springer “Published online”：`https://link.springer.com/chapter/10.1007/978-3-031-70068-2_22` |
| `publication:casil-aamas-2024` | 2023-09-28 | arXiv v1 提交日；题名、方法与六位作者对应正式 AAMAS 版本：`https://arxiv.org/abs/2309.16299` |
| `publication:radar-rl-2023` | 2023-08-03 | ZTE Communications 正式期刊 PDF “published online”：`https://www.zte.com.cn/content/dam/zte-site/res-www-zte-com-cn/mediares/magazine/publication/com_en/pdf/en202303-.pdf` |
| `publication:tild-aamas-2023` | 2023-05-30 | AAMAS 2023 官方新闻“Proceedings now available”：`https://www.ifaamas.org/AAMAS/aamas2023/news.html` |

## 当前排序结果

按标志日期降序、同日稳定 ID 升序，当前“近期内容”前 8 条依次为：`codex-cc-tools`、`taco`、《大创造时代》随笔、Newton trust-region 论文、HDBO-B 论文、`simple_asr_llm_tts`、高维贝叶斯优化综述、PPSN 降维论文。推荐候选必须排除这 8 个身份；后续修订不会把旧随笔重新推入这里。
