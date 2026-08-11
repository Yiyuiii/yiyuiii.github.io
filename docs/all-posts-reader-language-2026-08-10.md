# 全站随笔术语与阅读负担整理

## 用户原始要求

2026-08-10，用户要求按以下原则整理本站全部随笔：

1. 面向读者的文字使用单向逻辑，目标、事实、因果和结论各表达一次。
2. 术语和名词优先采用目标领域内已有共识、读者常用且定义稳定的称呼。
3. 同一概念在同一篇文章、同一双语文章组和相关系列文章中保持同一主称呼。
4. 首次出现时提供理解所需的中文名称、英文原名、缩写或别名；后文沿用最短且无歧义的称呼。
5. 删除装饰性同义替换、重复标签、无信息量修饰语和可省略的抽象名词。
6. 控制单句承载的关系数量；复杂内容按因果、时间、步骤或层级拆开。
7. 读者的注意力属于有限资源。文章应降低回看、术语切换、指代追踪和句法解析成本。

## 范围

- 纳入 `_posts` 当前全部 16 组、32 篇中英文随笔。
- 纳入题目、`description`、`excerpt`、题图替代文字与图注、正文、表格、资料说明和修订历史。
- 保留既有 `uid`、`translation_key`、发布日期、永久链接、图片目标、公式、代码、显式锚点和可核验事实。
- 《SETI》规则教学随笔属于本轮范围。
- 独立 worktree 中暂缓的 SETI 资源量化研究底稿不属于公开随笔，本轮不读取、不改写、不发布。
- 页面样式、小游戏、论文、项目介绍和个人介绍不进入本轮正文整理；验证需要的契约或维护文档可随事实同步更新。

## 术语决策方法

每组文章先确定目标读者和问题，再建立该组的最小术语表。术语按以下顺序选择：

1. 官方规则、标准、协议、软件文档或领域权威机构使用的正式名称；
2. 目标读者所在社群的稳定通行名称；
3. 能直接说明概念且歧义最少的普通词；
4. 作者自定义词只用于确有新概念的场景，并在首次出现时给出定义和适用边界。

同一英文术语在不同领域可能对应不同中文称呼，决策以当前文章的目标读者为准。领域内存在多个稳定称呼时，正文选一个主称呼，首次出现时说明必要别名。产品界面、游戏组件、协议字段、代码标识符和直接引文保持官方写法。

## 逐篇编辑流程

1. 识别原稿方向，先编辑原稿，再同步对应译文。
2. 提取标题、简介、章节标题和正文中的核心名词，记录主称呼、首次定义和需要删除的同义替换。
3. 逐段检查信息任务：一段说明一个连续问题，一句承载有限关系，代词具有明确先行词。
4. 保留作者亲历、原始数据、推导过程和结论边界；压缩元话语、重复结论和不增加信息的转折。
5. 中文采用领域通行译名和自然中文句法；英文采用自然领域英语，避免逐字映射中文结构。
6. 同步双语标题层级、表格、公式、代码、图片、链接、脚注、资料块和修订日期。
7. 重大可见整理在修订历史加入 2026-08-10 记录；仅有标点或个别用词变化时不新增公开修订项。
8. 每组完成后刷新译文 `source_hash`，运行翻译守卫并记录结果。

## 分批清单

| 批次 | UID | 中文文章 | 原稿方向 | 主要领域 | 状态 |
|---|---:|---|---|---|---|
| A | 202109160000 | GitHub Pages 建站 | 英文 | 静态站点与部署 | 完成 |
| A | 202109170000 | 可靠强化学习实验与工程指南 | 英文 | 强化学习 | 完成 |
| A | 202208142347 | 云服务器与部署架构 | 中文 | 云计算与运维 | 完成 |
| A | 202208171838 | 制作一张匹配形状的字符画 | 中文 | 图像处理与字符画 | 完成 |
| A | 202211110000 | 装机记录 | 中文 | PC 硬件与装机 | 完成 |
| A | 202307232000 | 了解游泳 | 中文 | 游泳教学与安全 | 完成 |
| A | 202608081000 | 状态型服务的运维方法：以 Minecraft Java 服务器为例 | 中文 | 游戏服务器运维 | 完成 |
| B | 202301162233 | 四季物语量化分析攻略 | 中文 | 桌游策略与量化 | 完成 |
| B | 202302032000 | 逻辑对决桌游攻略 | 中文 | 桌游逻辑推理 | 完成 |
| B | 202404232233 | 《盖亚计划》资源—分值量化计算思路 | 中文 | 桌游资源量化 | 完成 |
| B | 202407012233 | 《特鲁瓦》资源—分值量化分析攻略 | 中文 | 桌游资源量化 | 完成 |
| B | 202510112233 | 《大创造时代》资源—分值量化计算思路 | 中文 | 桌游资源量化 | 完成 |
| B | 202608021600 | 《SETI》桌游规则 | 中文 | 桌游规则教学 | 完成 |
| C | 202608081030 | 小厨房的最小系统 | 中文 | 家庭烹饪工作流 | 完成 |
| C | 202608081100 | 四种颜色的外套系统 | 中文 | 日常穿搭决策 | 完成 |
| C | 202608081130 | 与珍珠鸟建立信任 | 中文 | 动物行为与训练 | 完成 |

批次只用于控制审校顺序。全部文章采用同一验收标准。

## 已确定的主称呼

| UID | 中文主称呼 | 英文主称呼 | 已删除或收敛的替换说法 |
|---:|---|---|---|
| 202109160000 | 源文件、构建、构建产物、部署、发布、持续集成（CI） | source, build, artifact, deploy, publish, continuous integration (CI) | 把仓库、构建结果和线上站点混称为“页面” |
| 202109170000 | 马尔可夫决策过程（MDP）、部分可观测马尔可夫决策过程（POMDP）、回报、行为策略、经验回放、价值分布估计 | Markov decision process (MDP), partially observable Markov decision process (POMDP), return, behavior policy, replay, distributional value estimate | 模型式方法、回报／收益混用、经验池／回放混用，分布式计算与价值分布混淆 |
| 202208142347 | 域名系统（DNS）、虚拟专用服务器（VPS）、内容分发网络（CDN）、虚拟私有云（VPC）、网络地址转换（NAT）、访问控制列表（ACL）、恢复点目标（RPO）、恢复时间目标（RTO）、可观测性 | DNS, VPS, CDN, VPC, NAT, ACL, recovery point objective (RPO), recovery time objective (RTO), observability | 云主机／云服务器无边界切换、完整性锁定、把告警缩成日志筛选 |
| 202208171838 | 图像块、字形模板、均方误差（MSE）、直方图均衡 | image block, glyph template, mean squared error (MSE), histogram equalization | 字符块／小图块／模板图混用、把直方图均衡写成亮度加权 |
| 202211110000 | 台式机、显示器、显卡（GPU）、处理器（CPU）、固态硬盘（SSD）、压力测试、结温 | desktop, monitor, graphics processing unit (GPU), central processing unit (CPU), solid-state drive (SSD), stress test, junction temperature | 电脑／主机／机器无边界切换、无法核实的旧显卡型号后缀 |
| 202307232000 | 浮力、阻力、推进、训练辅助器材、救生设备 | buoyancy, drag, propulsion, training aids, lifesaving equipment | 浮具／救生器材混称、动作感觉与物理机制混述 |
| 202608081000 | 单写者、兼容性清单、信任边界、恢复点目标（RPO）、恢复时间目标（RTO）、每 tick 毫秒数（MSPT）、玩家路径、故障域、恢复演练 | single writer, compatibility manifest, trust boundary, recovery point objective (RPO), recovery time objective (RTO), milliseconds per tick (MSPT), player path, failure domain, restore drill | 把任务退出成功等同于可恢复、把旧 JAR 等同于回滚、把 `-Xmx` 等同于进程总内存、把开发环境要求当作运行要求 |
| 202301162233 | 能量、召唤等级（对应 Summoning gauge）、打出卡牌、晶化、水晶、声望点、季节指示物、游戏速度、反制牌、第一手候选 | Energy token, Summoning gauge, Summon, Transmute, Crystal, Prestige point, Season token, game speed, counter card, first-pick candidate | 时间流速、时间指示物、召唤上限／召唤槽漂移，血赚／强牌／万能牌等无条件评价 |
| 202302032000 | 密码牌、密码、个人密码、候选集、答案分支、实体发牌、比特（信息熵单位）；颜色记号 W／B／G | Cipher tile, code, private code, candidate set, answer branch, physical deal, bit; color notation W/B/G | 数字牌／密码数字混用、把中文颜色字当作公式变量、未定义的信息量单位 |
| 202404232233 | 建筑记号 M／TS／RL／AC／PI、资源记号 C／O／K／Q、魔力、魔力标记、科技轨道、通用资源点、资源增长倍率、从无建筑状态起算的资源回报率、胜利点（VP） | building symbols M/TS/RL/AC/PI, resource symbols C/O/K/Q, Power, Power token, tech track, general resource point, resource-growth multiplier, resource return rate from no building, victory point (VP) | 资源价值、增长倍率、回报和胜利点之间的主称呼漂移，“空地”误指累计建造路线的起点 |
| 202407012233 | 骰点、金钱、活动牌、市民 | pips, deniers, Activity cards, citizens | 骰子点数、钱、功能牌 |
| 202510112233 | 资源记号 c／o／b／p／k、建筑记号 M／TC／RL／AC／SH、学科推进 K、能力板块、轮次计分板块、每轮收入 | resource symbols c/o/b/p/k, building symbols M/TC/RL/AC/SH, Discipline advancement K, Competency tile, Round Score tile, per-round income | 同一公式中混用中文标签、能力板块／能力板混用 |
| 202608021600 | 外星生物版图、外星生物对手行动牌、发现位置、冗余位置、回合结束、轮次结束 | alien board, alien action card, discovery space, overflow area, end of turn, end of round | 特殊行动牌／物种专属行动牌／对手牌混用、发现位／冗余区、轮末 |
| 202608081030 | 做饭流程、基本任务、最小工具组合、反复问题、购买问题、基础／优先／备用／风味食材、清洁收尾、生食材、即食食物 | cooking process, basic tasks, minimum tool set, recurring problems, purchase questions, basic/priority/backup/flavor ingredients, cleanup, raw ingredients, ready-to-eat food | 能力闭环、摩擦、购买闸门、决策界面、复位、最低可启动状态 |
| 202608081100 | 外套、穿着用途、明度、版型、搭配、清洁与收纳 | outerwear piece, use, lightness, silhouette, pairing, cleaning and storage；颜色统一采用 American English | coat／garment／layer 作为总称，职责、合作、索引、空位、衣橱试算、收束色 |
| 202608081130 | 珍珠鸟（斑胸草雀）、应激反应、个体基线、刺激强度、退出路径、同伴情境、联结学习、逐步塑造、标记信号、食物奖励、分开的奖励位置、主动接近时间、泛化 | zebra finch, stress response, individual baseline, stimulus intensity, exit option, companion context, associative learning, shaping through successive approximations, marker signal, food reward, separated reward station, time to voluntary approach, generalization | 底层特点、刺激负荷、社会情境、分步塑形、资源点、把恢复距离称为奖励、故障诊断、五阶段协议 |

## 复核记录

- 三名 GPT-5.6 Sol 子智能体分别完成技术文章、核心桌游文章和后期桌游文章的首轮整理，并交换批次进行只读复核。
- 桌游术语优先核对官方规则材料；本轮重点复核了《四季物语》《逻辑对决》《特鲁瓦》和《SETI》的组件与行动名称。
- 根智能体结合交叉审阅结果统一处理双语语义、内容契约、首次定义、修订记录和全站术语边界。
- 外部只读审阅用于检查六篇生活随笔的术语和安全边界；命中项经根智能体复核后纳入正文。

## 完成记录

- 2026-08-10，16 组、32 篇随笔均完成题目、简介、题图说明、正文、表格、资料块和修订记录整理。
- 2026-08-11，《状态型服务的运维方法：以 Minecraft Java 服务器为例》完成重新调研与双语重写：用状态型服务模型统一版本、权限、容量、恢复、升级和排障，并把关键判断落实为可执行的验收与恢复演练；论断边界与来源矩阵见 `docs/minecraft-server-operations-research-2026-08-11.md`。
- 《四季物语》保留 94 张牌、原有估值、公式和案例；牌名、组件名与评价条件已统一。《大创造时代》保留 14 个公式代码块及其双语结构。
- GitHub Pages 工作流示例使用原样输出边界，避免 Jekyll 把 Actions 表达式解析为 Liquid。
- 双语翻译哈希、标题层级、表格、公式、代码、图片与链接由生产翻译守卫复核；正式发布前仍按 `docs/preview-workflow.md` 核对固定测试分支及产物源码标记。
- 最终 `python scripts/validate.py --browser` 通过全部 10 阶段：396 项 Python、77 项 JavaScript、6 个公开仓库、16 组双语内容、两类图片派生资源、production Jekyll 构建、站点契约、70 条旧 URL 和 169 项浏览器回归。

## 验收标准

### 逐组验收

- 核心概念具有稳定主称呼，首次定义足够，后文不无故换名。
- 标题、简介和章节标题使用正文中的主称呼。
- 专有名词、缩写、单位、变量、动作名和组件名与领域来源一致。
- 删除后不损失事实、因果、边界、步骤、证据或作者经验。
- 中英文语义、结构和修订日期对应；译文使用各自语言的自然领域表达。
- `python scripts/translation_guard.py --check --production` 通过。

### 全站验收

- 复核跨文章重复概念，例如“部署／发布”“备份／快照”“评估／测试”“资源价值／分值”“训练／驯化”等，按领域保留清楚边界。
- 扫描重复正反句式、装饰性近义替换、过长句、模糊代词和未定义缩写，并逐项人工判断。
- 运行 `git diff --check`、完整 Python／JavaScript／Jekyll／旧 URL／浏览器门禁。
- 推送固定测试分支 `preview/review`，核对远端 SHA、GitHub Actions run SHA 与 `site-preview` 源码标记。
- 更新统一 HTML 审阅稿，使用户可以按文章组查看改动重点和真实 GitHub 构建页面。

## 人工审阅材料

最终审阅稿按文章组说明：目标读者、固定术语、删减类型、保留的作者经验、重要语义变化、自动验证结果和需要用户判断的风格问题。普通用词和结构检查先由 Codex 完成，用户集中判断作者声音、专业深度与是否接受较大改写。

## 当前基线

- 工作树：`D:\Codes\yiyuiii.github.io-evergreen-rewrite-20260808`
- 分支：`content/evergreen-article-rewrite-20260808`
- 开工基线：`d820c75f0767fc672e3c11c6cde054f91e616d54`
- 远端测试分支：`preview/review`
- 正式 `master` 在本轮人工确认前保持不变。
