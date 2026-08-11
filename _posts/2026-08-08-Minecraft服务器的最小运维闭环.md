---
title: 状态型服务的运维方法：以 Minecraft Java 服务器为例
uid: '202608081000'
author: Yiyu Chen
date: 2026-08-08 10:00:00 +0800
lang: zh
permalink: /posts/Minecraft服务器的最小运维闭环/
translation_key: post-202608081000
translation_url: /en/posts/a-minimal-operations-loop-for-a-minecraft-server/
categories:
- 技术
tags:
- Minecraft
- 服务器运维
math: false
mermaid: false
thumbnail: /assets/posts/202608081000/cover-minecraft-operations-generated-square.webp
article_cover:
  alt: 监控、访问控制、备份与恢复围绕方块世界服务器组成运维闭环的概念图
  caption: 题图为 OpenAI image_gen 制作的 AI 生成概念图，仅作概念示意，并非事实记录。
excerpt: 真正需要长期维护的，是一份持续变化、会被新版本迁移、且必须由单一服务端进程写入的世界状态。
description: >-
  从单写者世界状态、版本清单和信任边界出发，推导小型 Minecraft Java 服务器的权限、容量、备份恢复、升级回滚、监控与排障，并给出可执行验收方法。
revisions:
- date: '2026-08-08'
  note: 根据个人部署记录重构，并以 Minecraft、Forge 与 Ubuntu 官方文档复核公开流程；由 GPT5.6 Sol 撰写
- date: '2026-08-10'
  note: 统一兼容性清单、服务管理器、冒烟测试和备份恢复术语，精简重复说明
- date: '2026-08-11'
  note: 重新调研并完全重写，以状态型服务模型重构版本、权限、容量、恢复、升级和排障方法；由 Codex（GPT-5）调研撰写
---

## 先看清要维护的对象 {#model-the-service}

[Minecraft 官方服务端页面](https://www.minecraft.net/en-us/download/server)足以带领维护者完成一次启动：取得 JAR，确认 Java 可用，阅读并接受 [EULA](https://www.minecraft.net/en-us/eula)，然后运行服务端。一次成功启动只证明当时的文件能够组合起来。长期运行还要面对依赖漂移、世界持续写入、扩展代码、网络暴露、主机故障和不可逆的数据迁移。

这篇文章面向 Linux 上由 systemd 管理、供朋友使用的单实例 Minecraft Java Edition 服务器。Paper 用于展示可观测性和更新边界；Vanilla、Fabric、Forge 与 NeoForge 需要替换为各自的启动脚本和兼容资料。大型公共服还要解决代理集群、DDoS 防护、多租户、审核与商业合规，这些内容不在本文范围内。

先把服务器拆成四类对象，后面的运维动作才有明确目标：

| 对象 | 典型内容 | 失控后的结果 |
|---|---|---|
| 可执行依赖 | Java、服务端构建、加载器、模组、插件、数据包 | 无法启动、行为变化、供应链风险 |
| 配置与身份 | 启动参数、`server.properties`、玩家白名单、管理员权限、凭据 | 默认值漂移、越权、私人信息泄露 |
| 可变状态 | 世界、玩家数据、进度、统计、模组／插件数据 | 丢档、格式迁移、并发写入损坏 |
| 运行证据 | 日志、版本清单、备份记录、恢复报告、性能剖析 | 无法解释故障，也无法证明恢复有效 |

其中，可变状态具有决定性约束：任一时刻只能有一个获准的服务端进程写入一份生产世界。测试服、恢复演练和升级副本必须使用独立目录与独立网络入口。容器、面板、文件系统快照和自动重启都不会改变这条单写者约束。

## 用四个不变量约束全部决策 {#four-invariants}

我现在用四个不变量判断服务器是否达到可维护状态：

| 不变量 | 可以接受的证据 | 常见的成功错觉 |
|---|---|---|
| 单写者 | 生产世界只有一个写进程；测试副本使用隔离目录和端口 | 两个实例指向同一世界，因为“其中一个只用来看看” |
| 可复现 | 精确版本、来源、哈希、Java、参数和配置能够重建同一实例 | 记住“用最新版”“大约 4 GB 内存”或只保存一个 JAR |
| 可恢复 | 备份已在空目录恢复，普通玩家完成读写并重启复查 | 归档任务退出码为零，或同一磁盘上存在快照 |
| 可观测 | 指标覆盖进程、游戏循环、玩家路径、容量和恢复状态，并各自触发明确动作 | 进程仍在、TPS 显示 20 或备份文件非空 |

运维动作应产生可复核产物。升级产生新版本清单和验收记录；备份产生跨故障域副本和恢复报告；告警产生一个可以执行的诊断分支。只有动作，没有产物，后续维护者仍要依赖记忆和猜测。

## 建立可复现的版本清单 {#compatibility-manifest}

兼容性来自一组精确组合。Paper 的[版本与 Java 要求](https://docs.papermc.io/paper/getting-started/)、NeoForge 的[用户指南](https://docs.neoforged.net/user/docs/)和 Fabric 的[服务端安装资料](https://wiki.fabricmc.net/player:tutorials:install_server)都按游戏版本区分 Java。它们也会随新游戏线更新。维护者因此要记录实际组合，并在每次升级时重新查阅对应版本文档。

最低版本清单应包含：

- 游戏精确版本，服务端实现与构建号；
- 加载器／安装器版本，以及它生成的启动脚本、参数文件和依赖目录；
- Java 可执行文件的绝对路径、发行版、主版本与完整 `java -version` 输出；
- 所有模组、插件、数据包及其依赖的名称、精确版本和官方项目页；
- 服务端文件和扩展 JAR 的 SHA-256；
- 完整启动命令、JVM 参数、操作系统与架构；
- 世界目录、扩展数据目录和经脱敏的配置差异；
- 清单创建时间、上一个可恢复版本和最近一次恢复演练。

下面的 YAML 只展示结构。尖括号字段必须由真实值替换，凭据、玩家 UUID、IP 地址和私人目录不进入公开仓库。

```yaml
schema: 1
created_at: 2026-08-11T09:30:00+08:00
minecraft: "<exact-game-version>"
server:
  implementation: "<vanilla-paper-fabric-forge-neoforge>"
  build: "<exact-build-or-loader-version>"
java:
  executable: "/absolute/path/to/java"
  version: "<full-java-version>"
launch:
  command: "<exact-command-or-generated-script>"
  jvm_args: ["-Xms2G", "-Xmx4G"]
content:
  - name: "<mod-or-plugin>"
    version: "<exact-version>"
    source: "<official-project-url>"
    sha256: "<sha256>"
state_roots: ["<world>", "<plugin-data>"]
```

哈希回答“这个文件后来是否改变”，无法回答“下载源是否可信”。正确顺序是先从 Mojang、服务端项目或扩展项目的正式入口取得文件，再记录来源和哈希。若上游提供签名或已发布摘要，还要单独核对。清单中的 JAR 属于私有运行资产，不应连同 Mojang 软件发布到公开仓库。

首次启动仍由维护者亲自阅读并接受许可。公共或收费服务器还要定期复核会变化的 [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines)。接受状态可以进入私有恢复包，脚本不应替维护者绕过这项决定。

## 划清信任边界，再决定接入方式 {#trust-and-network-boundaries}

Minecraft 的权限不止一层。普通玩家受游戏协议和命令权限约束；管理员可以修改世界与玩家；模组和插件在服务端进程内执行。Paper 的[插件安装文档](https://docs.papermc.io/paper/adding-plugins/)明确提醒，插件可以不受限制地访问服务器及其所在主机。操作系统最终只能看到一个 Java 进程，因此扩展代码拥有服务账户能够访问的全部资源。

| 主体 | 能影响什么 | 主要控制 |
|---|---|---|
| 未受信任玩家 | 游戏协议入口、聊天、可用命令和玩法机制 | 在线账户验证、玩家白名单、命令权限、服务端更新 |
| 管理员／面板账户 | 控制台、世界、玩家与配置 | 独立账户、最小授权、强认证、审计与及时撤权 |
| 模组／插件 | Java 进程、服务目录、网络和服务账户可读文件 | 可信来源、版本审阅、专用系统账户、文件系统沙箱 |
| 主机管理员／托管商 | 整个进程、内存、磁盘和备份 | 主机信任、系统更新、磁盘加密、供应商边界 |
| 备份操作者 | 历史世界、玩家身份、配置与秘密 | 加密、访问控制、离线或不可变副本、保留期限 |

朋友服通常有三种接入结构：

| 结构 | 游戏入口 | 管理入口 | 适用边界 |
|---|---|---|---|
| 局域网或私有 VPN | 只有受邀网络成员可达 | SSH／面板也留在私网 | 最容易缩小暴露面，适合固定朋友 |
| 直接公网 | 只把游戏端口开放给预期来源或所有玩家 | SSH、面板、RCON 等仍限制来源或留在 VPN | 需要同时处理主机防火墙、云安全组、IPv4／IPv6 和公网攻击 |
| 代理网络 | 玩家只连接代理，后端只接受代理流量 | 后端管理面保持私有 | 必须按代理实现配置安全转发、秘密和防火墙，属于独立架构 |

直接连接的小型私服应保留账户验证，并用玩家白名单限制受邀账户。Paper 的 [`server.properties` 参考](https://docs.papermc.io/paper/reference/server-properties/)分别说明了 `online-mode`、`white-list`、游戏端口、RCON 和状态入口的含义。`online-mode=false` 只应出现在已经按代理文档完成后端隔离和安全转发的结构中。Paper 的 [Velocity 安全文档](https://docs.papermc.io/velocity/security/)也强调，转发秘密不能替代防火墙。

网络配置按以下顺序收敛：

1. 先确定谁需要到达游戏端口、谁需要到达管理面；
2. 默认拒绝入站，再只开放必要的协议、端口和来源；
3. 同时检查云安全组、路由器、主机防火墙以及 IPv4／IPv6；
4. 从允许和不允许的网络各测试一次，保存规则快照；
5. 管理面凭据与玩家权限文件留在私有运行环境。

Ubuntu 的[防火墙文档](https://documentation.ubuntu.com/server/how-to/security/firewalls/)说明 `ufw` 同时面向 IPv4 与 IPv6。端口转发只创造可达性，DNS 只提供名称，玩家白名单只约束游戏登录；三者都不能单独承担主机访问控制。

## 让 systemd 管进程，让服务账户限制损害 {#service-management}

服务端使用禁止交互登录、没有 `sudo` 权限的专用系统账户。最简单的目录边界是让该账户只写实例目录；更严格的部署还会把 Java、服务端 JAR、模组／插件 JAR 交给维护账户管理，只把世界、日志和扩展数据目录留作可写。具体拆分要在真实加载器和扩展栈上验证。

下面是一份用于 Vanilla／Paper 风格直接 JAR 启动的 systemd 骨架。Java 路径、内存、目录、文件名和停止时间都是示例；Forge／NeoForge 等生成的脚本与参数文件应作为完整 `ExecStart` 进入清单。

```ini
[Unit]
Description=Minecraft Java server
After=network.target
StartLimitIntervalSec=5min
StartLimitBurst=3

[Service]
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=/srv/minecraft/instance
ExecStart=/usr/bin/java -Xms2G -Xmx4G -jar server.jar nogui
Restart=on-failure
RestartSec=10s
TimeoutStopSec=5min
UMask=0027

NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/minecraft/instance
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

这份骨架有四个需要实测的边界：

1. `Restart=on-failure` 会尝试恢复异常退出，人工执行 `systemctl stop` 不会立即把服务拉起；启动频率限制会阻止无限崩溃循环。[`systemd.service(5)`](https://manpages.ubuntu.com/manpages/noble/man5/systemd.service.5.html)给出了退出码、信号和重启条件的精确定义。
2. `TimeoutStopSec` 必须长于最慢一次正常保存。停止时要在日志中看到世界保存与退出完成；超时后 systemd 可能发送强制终止信号。
3. 不要机械复制 `SuccessExitStatus=143`。直接 Java 进程收到 `SIGTERM` 与 shell 包装脚本返回 143 是两种状态，实际启动链决定应该怎样解释退出。
4. 示例有意省略 `MemoryDenyWriteExecute`。[`systemd.exec(5)`](https://manpages.ubuntu.com/manpages/noble/man5/systemd.exec.5.html)说明它与 JIT 这类运行时生成代码的程序不兼容；JVM 正需要 JIT。

每增加一项沙箱限制，就在隔离实例启动、进入世界、运行关键扩展、正常保存和停止一次。部署后至少执行：

```console
sudo systemd-analyze verify /etc/systemd/system/minecraft.service
sudo systemd-analyze security minecraft.service
```

[`systemd-analyze security`](https://manpages.ubuntu.com/manpages/questing/man1/systemd-analyze.1.html)只评价 systemd 自己提供的沙箱选项。较低暴露分数不能证明插件可信、游戏权限正确或网络已经隔离。

## 容量规划从真实负载和 50 毫秒预算开始 {#capacity-and-tick-budget}

“多少内存能带多少人”缺少决定答案的变量：游戏和服务端版本、模组／插件、视距、模拟距离、已生成区块、实体、红石、存储延迟以及玩家行为都会改变负载。容量测试应固定一组真实场景，再比较同一口径的时间窗口。

| 场景 | 要观察的证据 | 它主要暴露什么 |
|---|---|---|
| 冷启动并载入已有世界 | 启动时间、日志、峰值内存、磁盘读取 | 依赖错误、数据迁移、缓存与存储瓶颈 |
| 峰值玩家留在已探索区域 | MSPT 分布、逐线程 CPU、网络延迟 | 稳态游戏循环与扩展负载 |
| 多名玩家同时探索新区块 | MSPT 尖峰、区块生成热点、磁盘写入 | 世界生成与主线程／工作线程压力 |
| 典型农场、红石、实体和关键扩展同时运行 | 剖析热点、实体／区块数量、玩法结果 | 真实玩法的计算成本与语义变化 |
| 保存或备份与在线负载重叠 | I/O 延迟、保存耗时、剩余空间、玩家路径 | 后台任务竞争和磁盘容量边界 |

Minecraft 的目标速率是 20 ticks per second（TPS），因此每 tick 的时间预算是 50 ms。Paper 的[命令参考](https://docs.papermc.io/paper/reference/commands/)也用 MSPT（milliseconds per tick）说明这一关系。TPS 常在健康时封顶为 20，平均 MSPT 又会隐藏尖峰；维护者应同时看分布、超过 50 ms 的比例和玩家实际感受。

Paper 1.21 起内置 spark，并在[剖析文档](https://docs.papermc.io/paper/profiling/)中要求问题正在发生时采样。一次有效诊断应覆盖能够复现卡顿的窗口，再从主线程、区块生成、实体、插件、垃圾回收和 I/O 热点解释因果。服务器恢复正常后才开始采样，得到的只能是正常状态。

内存也要分层观察：

- `-Xmx` 限制 Java 堆上限，不等于进程驻留内存（RSS）或容器总用量；
- JVM 还需要类元数据、JIT 代码缓存、线程栈、垃圾回收结构和本机内存；
- 操作系统需要页缓存，备份、压缩和诊断工具也会占用内存；
- [Oracle Java 诊断文档](https://docs.oracle.com/en/java/javase/26/troubleshoot/diagnostic-tools.html)提供 Native Memory Tracking（NMT），但启用它有性能开销，适合明确的本机内存问题。

总 CPU 使用率同样可能掩盖主线程饱和。先看逐线程证据和 profiler，再决定换 CPU、调整配置或处理扩展热点。盲目增加堆、定时重启或复制一整套 JVM 参数，只会改变症状。

视距与模拟距离会直接改变发送和 tick 的区块范围；[`server.properties` 文档](https://docs.papermc.io/paper/reference/server-properties/)给出了二者的不同含义。降低它们同时改变玩法体验，修改后要复测性能、农场、刷怪、视野和关键插件。

一轮可比较的容量实验遵循固定顺序：

1. 保存版本清单、默认配置和基线；
2. 用同一世界副本、玩家脚本和时间窗口复现问题；
3. 在问题发生时收集 MSPT、profiler、逐线程 CPU、RSS／堆／GC、I/O 与网络证据；
4. 一次只改变一个可解释因素；
5. 重复同一场景，同时比较性能和玩法语义；
6. 留出能够容纳世界增长、一次备份暂存、日志和必要诊断文件的磁盘余量。

最后一项应按绝对空间和增长速度计算。单独使用“磁盘还剩 10%”无法说明一个大世界、临时压缩文件或接近堆大小的诊断转储是否放得下。

## 备份从 RPO、RTO 和一致性恢复倒推 {#backup-and-restore}

[NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)提供了两个适合转成游戏语言的概念：[恢复点目标（RPO）](https://csrc.nist.gov/glossary/term/recovery_point_objective)回答“故障后最多丢多少进度”，[恢复时间目标（RTO）](https://csrc.nist.gov/glossary/term/recovery_time_objective)回答“多久必须恢复到可玩”。

| 决策问题 | 示例答案 | 推导出的要求 |
|---|---|---|
| 最多能丢多少进度？ | 两小时 | 最近一份成功且可取回的异机备份年龄必须小于两小时，并留出任务失败后的告警与重试时间 |
| 多久恢复可玩？ | 一小时 | 空目录恢复、依赖准备、世界校验、普通玩家验收和切换的实测总时间必须小于一小时 |
| 多久后才可能发现损坏？ | 一周 | 保留策略至少跨过该发现窗口，不能让短周期滚动备份提前覆盖所有健康代次 |

备份频率本身不能证明 RPO。一次任务失败、目标仓库不可达或归档停留在原磁盘上，都会让“每两小时备份”失去含义。监控应读取最近一份已完成、已复制到目标故障域并可校验的备份时间。

小型服务器最稳妥的一致性边界是计划停服：

1. 阻止新玩家进入并正常停止服务；
2. 从日志确认世界保存和进程退出完成；
3. 备份全部世界目录、玩家与扩展数据、配置、权限、版本清单、启动文件和必要依赖；
4. 生成归档清单、大小与校验信息；
5. 把至少一份副本放到原主机、原磁盘和持续在线凭据之外；
6. 启动服务并验证玩家路径。

在线备份只有在所用服务端、快照层和备份工具给出明确的保存／静默流程时才成立。服务仍在写入时直接压缩或复制目录，可能把不同保存时点的 region、玩家和扩展数据放进同一个归档。文件系统快照可以固定某一时点，仍需应用先把世界推进到一致状态。

[CISA 的恢复指南](https://www.cisa.gov/stopransomware/ransomware-guide)建议把关键备份离线或设为不可变，并定期验证可用性和完整性。朋友服可以采用更轻量的实现，但至少要让一次主机丢失、误删或服务账户被攻破无法同时删除全部副本。备份包含玩家身份、IP 日志、权限和可能的凭据，访问控制与加密等级应和生产数据一致。

恢复演练从“原主机已经丢失”开始：

1. 选择一个历史代次，在空目录或替代主机准备精确 Java 与依赖；
2. 校验归档字节，读取版本清单和恢复说明；
3. 只把恢复实例绑定到 loopback、私有网络或不同测试端口；
4. 启动后检查错误、缺失依赖、世界与扩展数据；
5. 用普通玩家账户进入已知区块，检查出生点、背包／末影箱、进度、权限和关键扩展功能；
6. 产生一项测试状态，正常停止、再次启动并确认它仍然存在；
7. 记录所用代次、总耗时、差异、失败点和修正负责人。

校验和只证明恢复出的字节与归档一致。玩家路径和重启复查才证明这组字节能够形成可玩的、可继续保存的服务器。

## 把升级做成一次有退出条件的迁移 {#staged-upgrades}

升级会同时改变可执行依赖和可变状态。Paper 的[更新文档](https://docs.papermc.io/paper/updating/)要求先备份、停止服务，再替换 JAR，并明确不建议无人值守自动安装更新。更新提醒可以自动化，生产切换需要维护者检查兼容性和日志。

| 阶段 | 允许的动作 | 进入下一阶段的证据 |
|---|---|---|
| 计划 | 阅读游戏、服务端、加载器、模组／插件发行说明；建立新清单 | 依赖闭合，客户端要求明确，退出条件已写下 |
| 演练 | 从已验证备份复制隔离实例，使用独立目录和网络入口启动 | 没有第二个进程写生产世界，启动日志完整 |
| 验收 | 普通账户检查登录、世界、权限、扩展、保存与同口径性能 | 冒烟测试和性能阈值通过，数据迁移已理解 |
| 冻结 | 安排维护窗口，停止生产实例，生成升级前一致性备份 | 生产写入停止，备份可读取且已登记 |
| 切换 | 让新版本接管升级副本／恢复出的世界 | 旧进程已停止，新实例使用唯一生产入口 |
| 观察 | 检查预先写下的退出条件，保留旧依赖和升级前备份 | 经过约定观察窗口，玩家路径和指标稳定 |
| 收口／回滚 | 更新基线，或停止新版本并恢复旧依赖与升级前世界 | 清单、恢复点、结果和问题记录完整 |

退出条件要在维护窗口前确定，例如：

- 启动未完成、关键错误持续出现或加载器报告缺失依赖；
- 关键模组／插件、权限或普通玩家路径失败；
- 世界迁移出现未知警告，区块、玩家数据或扩展状态异常；
- 同一负载下 MSPT、保存时间或内存显著越过预设阈值；
- 升级前备份无法校验或恢复路径无法执行。

Paper 的[基础排障文档](https://docs.papermc.io/paper/basic-troubleshooting/)说明，世界被新版本加载后会自动升级，并且不支持降级。因此，换回旧 JAR 只恢复了可执行文件。真正的回滚要同时恢复升级前世界状态、旧扩展和旧 Java 组合。任何旧实现都不应打开已经迁移的唯一世界副本。

补丁更新、加载器更新和单个插件更新也沿用同一状态机。变化范围较小会缩短演练，不能消除备份、单写者和退出条件。

## 监控必须能触发明确动作 {#actionable-observability}

小型服务器不需要庞大的监控平台，需要覆盖不同失败层的少量信号：

| 层 | 最小信号 | 告警后的第一个动作 |
|---|---|---|
| 进程 | systemd 状态、退出原因、连续重启次数 | 读取第一次失败的完整日志，判断是否已进入崩溃循环 |
| 容量 | 磁盘绝对余量与增长速度、RSS、堆／GC、逐线程 CPU、I/O 延迟 | 判断会先耗尽哪项资源，暂停会放大故障的后台任务 |
| 游戏循环 | MSPT 分布、超过 50 ms 的 tick、TPS、在线玩家和区块活动 | 在问题仍存在时启动实现支持的 profiler |
| 玩家路径 | 账户验证、加入、加载已知区块、普通权限、退出与重连 | 区分网络／认证故障与世界／扩展故障 |
| 持久性 | 最近异机备份、备份大小异常、最近恢复演练与实测 RTO | 立即把当前 RPO／RTO 标记为未满足并修复备份链 |
| 外部可达性 | 从服务器之外完成状态握手或真实连接 | 区分主机内部健康与公网／VPN 路径故障 |

systemd 的最小只读检查可以固定为：

```console
systemctl show minecraft -p ActiveState -p SubState -p ExecMainStatus -p NRestarts
journalctl -u minecraft -b --no-pager
```

进程检查适合自动化；真实玩家路径适合每次发布后执行，并可在有专用测试账户与安全凭据边界时做低频合成检查。监控账户只获得完成该路径所需的最低游戏权限。

性能告警应触发证据采集。Paper 的[剖析指南](https://docs.papermc.io/paper/profiling/)明确要求在问题发生时运行 profiler。自动重启可以缩短暂时故障，却会清除性能现场并掩盖重复根因；重启次数告警和速率限制应把反复失败交给维护者。

日志、crash report、profiler 链接和备份报告都可能含玩家名、插件列表、路径、IP 或主机信息。对外求助前先检查披露范围；生产监控也应设置合理的访问和保留期限。

## 用证据树排障，保留现场 {#evidence-first-troubleshooting}

故障发生后，先固定时间线和只读证据，再做改变。最低事件包包括：

- 当前时间与时区、最后一次确认正常的时间；
- 当前版本清单和最近一次变更；
- 从本次启动开始的 systemd 与服务端日志、crash report；
- 进程退出状态、重启次数、监听端口；
- 磁盘、内存、逐线程 CPU 和必要的 I/O 状态；
- 最近成功备份、最近恢复演练以及受影响玩家描述；
- 已经尝试的每项改变及结果。

以下命令只读取常见 Linux 现场，输出仍要按隐私边界保存：

```console
date --iso-8601=seconds
systemctl status minecraft --no-pager
journalctl -u minecraft -b --no-pager
df -h /srv/minecraft/instance
free -h
ss -lntp
```

按症状进入不同证据分支：

| 症状 | 先回答 | 有害的现场动作 |
|---|---|---|
| 无法启动 | 第一条因果错误是什么，实际 Java／构建／依赖是否等于清单？ | 同时替换 Java、JAR、模组和配置，直到错误变化 |
| 进程运行但玩家无法加入 | 端口是否监听，允许路径能否到达，账户验证与玩家白名单为何拒绝？ | 把 `online-mode` 关闭来绕过身份问题 |
| 延迟或卡顿 | MSPT 尖峰发生时哪个线程、插件、实体、区块或 I/O 占用时间？ | 先定时重启、增加堆或复制优化配置 |
| 内存高或被 OOM 杀死 | 堆使用、RSS、GC、本机内存和容器限制分别是多少？ | 只看 `-Xmx`，继续把它设到接近主机／容器上限 |
| 更新后世界或扩展异常 | 哪一步首次迁移状态，升级前恢复点是否可用？ | 让旧版本、修复工具或更多插件继续写唯一副本 |
| 疑似插件问题 | 日志是否指向插件，依赖关系怎样分组？ | 在生产世界随机删除一半文件并反复启动 |
| 磁盘耗尽 | 世界、日志、备份暂存和转储各增长多少？ | 删除 region、玩家数据或唯一备份来换空间 |
| 疑似入侵 | 哪些主机、账户、扩展和备份可能受影响？ | 在原环境直接恢复并继续使用旧凭据 |

Paper 的[排障资料](https://docs.papermc.io/paper/basic-troubleshooting/)建议在确认插件诱发问题后使用二分法。二分应在世界副本上进行，并把有依赖关系的插件放在同一组；每轮保持同一输入、只改变一个分组。这样得到的是可复现因果，而非一次偶然启动。

世界损坏、升级失败或疑似入侵时，先停止生产写入并保留事件副本。修复工具只作用于副本，恢复只从已验证、未受影响的备份进入隔离环境。原现场承担取证价值，不承担试错成本。

## 上线前完成一次验收演练 {#acceptance-drill}

部署完成后，用一组故障导向测试替代“我看进程还在”：

| 测试 | 通过证据 | 执行边界 |
|---|---|---|
| 冷启动 | 从停止状态启动，日志无未知错误，普通账户可加入 | 生产可执行 |
| 人工停止 | 正常保存后退出，并保持停止 | 生产可执行；记录最慢保存时间 |
| 异常退出与限流 | 在测试实例制造一次进程失败，确认有限重启和告警 | 只在隔离实例执行 |
| 网络边界 | 允许路径能加入，不允许路径不能触达游戏或管理面 | 避免锁断唯一管理会话，先准备带外恢复 |
| 玩家事务 | 加入、到达已知区块、执行普通命令、产生状态、重连后读回 | 使用最低权限测试账户 |
| 空目录恢复 | 取一份异机备份，从空目录恢复并通过玩家事务 | 使用独立目录与网络入口 |
| 峰值负载 | 真实场景下记录 MSPT、热点、RSS、I/O 与玩法结果 | 使用可重复世界副本或约定窗口 |
| 升级回滚 | 新版本在副本演练失败后，旧组合从升级前备份恢复 | 只在隔离实例执行 |

验收产物至少包括版本清单、脱敏配置差异、systemd 单元与检查结果、网络规则快照、备份清单、恢复报告、性能基线和升级记录。换一名维护者只阅读这些材料，也应能判断当前版本、恢复点、风险和下一步动作。

破坏性测试只在隔离实例运行。生产服的验收集中在正常启停、真实玩家路径、网络边界和只读证据。

## 容器和面板仍要服从同一套不变量 {#containers-and-panels}

容器或托管面板能够减少安装工作，不能代替运维判断。把它们映射回同一模型即可审计：

| 容器／面板概念 | 应保存的事实 | 需要验证的问题 |
|---|---|---|
| 镜像与模板 | 不可变版本或镜像 digest、Java、服务端构建、生成配置 | 浮动 `latest` 是否在重启时悄悄改变运行组合？ |
| 数据卷／文件管理器 | 世界、玩家、扩展数据和权限的唯一生产位置 | 是否会被两个实例同时挂载为可写？ |
| 重启策略 | 异常条件、退避、次数和告警 | 人工停止是否保持停止，崩溃循环是否保留证据？ |
| 一键备份 | 一致性方法、目标故障域、保留、加密与恢复报告 | 面板显示成功的归档能否从空实例恢复？ |
| 一键更新 | 新旧清单、维护窗口、验收和升级前恢复点 | 更新能否在副本演练，失败时是否恢复旧世界？ |
| 内存限制 | 容器上限、`-Xmx`、RSS、GC 与操作系统余量 | 上限是否给堆外内存和备份工具留下空间？ |

容器重建只重建可执行环境，数据卷仍可能已经损坏；面板快照只证明平台完成了一个动作；自动下载最新版会主动破坏可复现性。选择工具时，应优先确认它能否导出清单、隔离副本、保留多个恢复点、限制重启并支持真实恢复演练。

## 最终维护清单 {#maintenance-checklist}

**首次上线**

- [ ] 精确游戏、服务端、加载器、Java、扩展、来源与哈希已记录；
- [ ] EULA 由维护者阅读并接受，公开／收费边界已复核；
- [ ] 服务使用专用低权限账户，systemd 单元已校验并通过真实启停；
- [ ] 只有实例目录可写，新增沙箱限制已在完整扩展栈测试；
- [ ] 游戏入口和管理入口已分开，IPv4／IPv6 与云／主机规则均已检查；
- [ ] 直接连接保留账户验证，邀请服启用玩家白名单；
- [ ] RPO、RTO、备份目标和保留窗口已经写下；
- [ ] 至少一份备份位于另一故障域，并已完成空目录恢复；
- [ ] 普通玩家事务和峰值负载基线已经保存；
- [ ] 监控能够发现进程、容量、tick、玩家路径和备份失效。

**每次备份与恢复周期**

- [ ] 备份来自停止后的稳定状态，或经过文档支持的一致性流程；
- [ ] 世界、玩家、扩展数据、配置、权限、版本清单和启动资料均在范围内；
- [ ] 最近成功副本的年龄满足 RPO，目标仓库不共享原主机故障；
- [ ] 大小、文件清单和校验信息没有异常；
- [ ] 恢复演练完成普通玩家读写和再次启动；
- [ ] 实测恢复耗时满足 RTO，问题已进入下一轮修正。

**每次变更与升级**

- [ ] 变更目的、精确差异、兼容资料和退出条件已写下；
- [ ] 新组合先在独立世界副本和独立入口演练；
- [ ] 升级前一致性备份已经登记并可取回；
- [ ] 任一时刻只有一个进程写生产世界；
- [ ] 普通玩家路径、关键扩展、保存重启和同口径性能已通过；
- [ ] 自动重启没有掩盖重复失败，日志和 profiler 现场已保留；
- [ ] 回滚使用旧依赖加升级前世界，不把已迁移世界交给旧版本；
- [ ] 观察窗口结束后才更新基线和清理临时副本。

## 资料、适用范围与更新边界 {#sources-and-scope}

本文于 2026-08-11 重新调研。事实来源按用途分为：

- Mojang／Minecraft：[Java Edition 服务端下载](https://www.minecraft.net/en-us/download/server)、[EULA](https://www.minecraft.net/en-us/eula)与[使用准则](https://www.minecraft.net/en-us/usage-guidelines)；
- Paper：[入门与 Java 要求](https://docs.papermc.io/paper/getting-started/)、[服务端属性](https://docs.papermc.io/paper/reference/server-properties/)、[插件权限边界](https://docs.papermc.io/paper/adding-plugins/)、[更新](https://docs.papermc.io/paper/updating/)、[排障](https://docs.papermc.io/paper/basic-troubleshooting/)、[性能剖析](https://docs.papermc.io/paper/profiling/)与 [Velocity 后端安全](https://docs.papermc.io/velocity/security/)；
- 模组加载器：[Fabric 服务端安装](https://wiki.fabricmc.net/player:tutorials:install_server)与 [NeoForge 用户／服务端指南](https://docs.neoforged.net/user/docs/server/)；
- Linux 服务边界：[`systemd.service(5)`](https://manpages.ubuntu.com/manpages/noble/man5/systemd.service.5.html)、[`systemd.exec(5)`](https://manpages.ubuntu.com/manpages/noble/man5/systemd.exec.5.html)、[`systemd-analyze(1)`](https://manpages.ubuntu.com/manpages/questing/man1/systemd-analyze.1.html)与 [Ubuntu 防火墙文档](https://documentation.ubuntu.com/server/how-to/security/firewalls/)；
- 恢复方法：[NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)与 [CISA #StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide)；
- JVM 诊断：[Oracle Java 26 Diagnostic Tools](https://docs.oracle.com/en/java/javase/26/troubleshoot/diagnostic-tools.html)。

Java 版本表、服务端默认值、加载器脚本、政策和工具接口都具有时效性。执行任务时应打开目标版本的一手文档重新核对。单写者、可复现、可恢复、可观测以及先演练再迁移的结构，构成这篇文章的常青主干。

本文提供小型 Java Edition 服务器的运维方法，不构成法律意见、安全保证或大型公共网络的架构方案。涉及收费、公开品牌使用或广泛玩家接入时，应另行完成政策、隐私、审核、抗滥用和 DDoS 风险评估。
