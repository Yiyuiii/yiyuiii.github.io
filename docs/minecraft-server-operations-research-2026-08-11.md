# Minecraft Java 服务器运维随笔调研与证据审计

## 文档定位

- 调研日期：2026-08-11
- 目标文章：`_posts/2026-08-08-Minecraft服务器的最小运维闭环.md` 及其英文版
- 目标读者：在 Linux 上维护朋友间小型 Minecraft Java Edition 服务器、愿意理解故障与恢复边界的维护者
- 文章范围：Vanilla、Paper、Fabric、Forge／NeoForge 等单实例服务端共有的运维不变量；命令示例以 systemd 管理的 Linux 服务为主
- 范围外：Bedrock Dedicated Server、Realms、大型公共网络的代理集群、高可用、多租户隔离、DDoS 清洗、商业合规与完整安全响应

本文档保存事实来源、同类材料覆盖情况、核心推导和失效边界。公开随笔只保留读者完成决策所需的压缩版本。

## 原稿问题审计

原稿覆盖了 Java 兼容、专用账户、systemd、防火墙、配置差异、备份、更新和监控，方向基本正确。质量瓶颈来自以下缺口：

1. 没有先定义服务的状态模型，读者无法理解世界目录为何只能有一个写入者、升级为何可能不可逆、同盘快照为何不能替代备份。
2. 兼容性清单只列四层，没有覆盖 Java 可执行文件、启动参数、安装器／加载器、插件依赖、来源与哈希的证据含义。
3. systemd 示例没有解释停止超时、重启限流、沙箱兼容性和 JVM JIT 边界；`SuccessExitStatus=143` 容易把 shell 退出码与直接进程收到的信号混为一谈。
4. 网络段落没有分开可达性、账户认证、玩家白名单、管理员权限和插件代码权限。
5. 备份段落要求恢复，却没有用恢复点目标（RPO）和恢复时间目标（RTO）反推频率、保留与演练，也没有区分一致性、完整性和可玩性。
6. 性能段落只有 CPU／内存／磁盘信号，没有解释 20 TPS、50 ms/tick、MSPT、主线程、堆外内存、真实负载和剖析窗口。
7. 更新步骤没有把“换回旧二进制”与“恢复升级前世界状态”分开；没有明确自动更新、降级和双进程写同一世界的失败模式。
8. 故障处理没有证据采集顺序、症状树、停止条件和只在隔离副本上试错的规则。
9. 普通安装教程、面板、容器和运维工具的覆盖边界没有比较，读者无法判断本文的独特价值。

## 同类资料覆盖情况

这些资料用于比较问题覆盖范围。技术结论仍回到相应项目或标准的一手文档。

| 资料 | 擅长回答 | 仍需补足 |
|---|---|---|
| [Minecraft 官方服务端下载页](https://www.minecraft.net/en-us/download/server)与[官方安装帮助](https://help.minecraft.net/hc/en-us/articles/360058525452-How-to-Setup-a-Minecraft-Java-Edition-Server) | 下载、首次启动、EULA 入口 | 长期状态、恢复、容量、升级与故障证据 |
| [Paper 管理文档](https://docs.papermc.io/paper/admin/) | Paper 的版本、配置、更新、剖析与故障定位 | 跨服务端实现的运维模型和恢复目标 |
| [Fabric 服务端安装资料](https://wiki.fabricmc.net/player:tutorials:install_server)与[NeoForge 服务端资料](https://docs.neoforged.net/user/docs/server/) | 加载器、Java 和启动脚本的实现差异 | 通用的访问边界、恢复验收和变更控制 |
| [LinuxGSM 命令文档](https://docs.linuxgsm.com/commands) | 启停、更新、备份、监控的统一入口 | 自动动作是否产生一致备份、是否通过恢复、自动更新是否符合模组兼容边界 |
| [itzg/minecraft-server](https://docker-minecraft-server.readthedocs.io/) | 容器化参数、服务端类型和版本自动化 | 镜像标签、数据卷、回滚点和恢复证据之间的长期契约 |
| [Minecraft Wiki 的服务器维护教程](https://minecraft.wiki/w/Tutorial:Server_maintenance) | 常见维护任务与世界级修复线索 | 来源分层、状态不变量、OS 沙箱与可量化验收 |

比较结果：已有材料通常分别解决“怎样启动某个实现”或“某个工具怎样执行动作”。新稿应集中解决“动作何时成立、失败后如何证明能恢复、不同实现下哪些不变量不变”。

## 核心运行模型

将单实例 Minecraft Java 服务器建模为四组对象：

| 对象 | 例子 | 主要风险 |
|---|---|---|
| 可执行依赖 | Java、服务端构建、加载器、模组、插件、数据包 | 版本漂移、来源污染、运行时不兼容 |
| 配置与身份 | 启动参数、`server.properties`、权限、玩家白名单、密钥 | 默认值漂移、越权、秘密泄露 |
| 可变状态 | 世界、玩家数据、进度、统计、插件／模组数据 | 并发写入、格式迁移、损坏、误删 |
| 运行证据 | 日志、版本清单、备份记录、恢复报告、性能剖析 | 成功错觉、无法复现、事后无证据 |

由此得到四个长期不变量：

1. **单写者**：任一时刻只有一个获准的服务端进程写入一份生产世界；测试、恢复和升级副本使用独立目录与独立网络入口。
2. **可复现**：版本清单能把指定的依赖、配置和私有状态组合成同一服务；“最新版本”或浮动标签不能承担此职责。
3. **可恢复**：备份只有在隔离环境完成启动、进入世界、读取关键状态、写入并再次读取后才获得可恢复证据。
4. **可观测**：每个指标或告警都对应一个明确判断；进程存在不等于玩家路径可用，TPS 正常不等于没有尖峰，归档成功不等于世界可恢复。

## 主张—证据矩阵

| 文章主张 | 一手证据 | 写作边界 |
|---|---|---|
| Java 版本必须跟随精确游戏与服务端实现 | [Paper Getting Started](https://docs.papermc.io/paper/getting-started/)、[NeoForge Java 版本表](https://docs.neoforged.net/user/docs/)、[Fabric 服务端安装](https://wiki.fabricmc.net/player:tutorials:install_server) | 不把“最新版 Java”写成通用答案；不把模组开发 JDK 要求直接当成生产服务端运行要求 |
| 插件属于与服务端同权限执行的代码 | [Paper 添加插件](https://docs.papermc.io/paper/adding-plugins/)明确说明插件对服务器和主机具有不受限访问 | 结论可推广到同进程加载的扩展代码；具体加载机制仍按实现文档 |
| systemd 长期服务适合 `Restart=on-failure`，并受启动频率限制 | [systemd.service(5)](https://manpages.ubuntu.com/manpages/noble/man5/systemd.service.5.html) | 正常 `systemctl stop` 不会触发重启；包装脚本的退出状态必须实测 |
| systemd 可限制写路径和权限提升 | [systemd.exec(5)](https://manpages.ubuntu.com/manpages/noble/man5/systemd.exec.5.html) | 沙箱选项逐项在真实模组／插件栈上验证；安全评分不证明应用本身安全 |
| `MemoryDenyWriteExecute` 不适合直接套给 JVM | [systemd.exec(5)](https://manpages.ubuntu.com/manpages/noble/man5/systemd.exec.5.html)说明该项与 JIT 等运行时动态代码生成不兼容 | 新稿明确解释为何示例省略此项 |
| 防火墙应同时考虑 IPv4 与 IPv6，且管理面和游戏面分开 | [Ubuntu 防火墙文档](https://documentation.ubuntu.com/server/how-to/security/firewalls/)；[Velocity 后端安全](https://docs.papermc.io/velocity/security/) | 不把端口转发、DNS、游戏白名单或代理转发秘密单独写成完整访问控制 |
| RPO 与 RTO 应先于备份频率和恢复流程 | [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)及 NIST 的 [RPO](https://csrc.nist.gov/glossary/term/recovery_point_objective)、[RTO](https://csrc.nist.gov/glossary/term/recovery_time_objective)词条 | 将企业术语压缩为玩家能理解的“最多丢多少进度／多久恢复可玩” |
| 备份应跨故障域并定期验证恢复 | [CISA #StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide) | 小型服务器不机械照搬企业制度，保留离线／不可变副本和恢复演练原则 |
| 世界被新版本打开后，旧 JAR 不构成可靠回滚 | [Paper Basic Troubleshooting](https://docs.papermc.io/paper/basic-troubleshooting/)说明世界会在加载时升级且不支持降级 | 跨实现采用保守规则：回滚恢复升级前状态，不让旧实现打开已迁移世界 |
| 更新不应替换运行中的 JAR，也不宜无人值守自动安装 | [Paper Updating](https://docs.papermc.io/paper/updating/) | 更新提醒可自动化；生产切换和兼容验收保留人工批准 |
| 20 TPS 对应每 tick 50 ms，故障剖析要在问题发生时运行 | [Paper Commands](https://docs.papermc.io/paper/reference/commands/)与[Paper Profiling](https://docs.papermc.io/paper/profiling/) | 50 ms 是游戏循环预算；文章不把单个平均值写成通用服务等级目标 |
| `-Xmx` 只约束 Java 堆，进程还会使用本机内存 | [OpenJDK NMT 说明](https://openjdk.org/jeps/8354416)与 [Oracle Java 26 诊断工具](https://docs.oracle.com/en/java/javase/26/troubleshoot/diagnostic-tools.html) | NMT 有开销，只在有明确诊断问题时启用；容量规划同时观察 RSS、GC 和系统余量 |
| 视距和模拟距离会改变工作量与玩法 | [Paper `server.properties` 参考](https://docs.papermc.io/paper/reference/server-properties/) | 不把降低参数包装成无代价优化；修改后同时验收性能和玩法语义 |

## systemd 示例的设计选择

新稿示例采用以下保守边界：

- `Restart=on-failure` 配合 `StartLimitIntervalSec`／`StartLimitBurst`，避免无限崩溃循环。
- `TimeoutStopSec` 明确留给世界保存，实际值按最慢一次正常停止测量后调整。
- `NoNewPrivileges`、`PrivateTmp`、`PrivateDevices`、`ProtectSystem=strict`、`ProtectHome`、内核保护、空 capability 集合和写路径白名单作为候选基线。
- 保留 `AF_UNIX`、`AF_INET`、`AF_INET6`，满足本机解析／IPC 与双栈网络；其它地址族默认不开放。
- 不写 `SuccessExitStatus=143`。systemd 对直接进程的退出信号和 shell 的 `128 + signal` 退出码采用不同表示，包装脚本必须按实际状态决定。
- 不启用 `MemoryDenyWriteExecute`，因为 JVM JIT 需要运行时生成可执行代码。
- 不承诺示例适配每个加载器。Forge／NeoForge 的生成脚本、参数文件和类路径必须原样进入版本清单并另行验证。

## 性能与容量的验证设计

文章不提供“几 GB 内存可带多少人”的固定表。决定容量的输入包含游戏版本、服务端实现、模组／插件、已生成区块、模拟距离、实体与红石负载、存储延迟、玩家行为和后台任务。

建议固定五类场景后比较同口径窗口：

1. 冷启动并加载已有世界；
2. 预期峰值玩家在已探索区活动；
3. 多名玩家同时生成新区块；
4. 典型农场、红石、实体与关键模组同时运行；
5. 保存、备份或其它后台 I/O 与在线负载重叠。

记录 MSPT 分布／尖峰、TPS、主线程热点、进程 RSS、堆使用、GC、逐线程 CPU、磁盘余量、I/O 延迟、世界增长和网络延迟。Paper 场景在问题实际发生时使用 spark；其它实现使用其明确支持的剖析器。每次只改变一个可解释因素，并同时检查玩法语义。

## 备份与恢复的验证设计

备份流程应从两个读者问题开始：

- RPO：服务器或主机故障后，最多能接受丢失多少游戏进度？
- RTO：从空目录或替代主机恢复到玩家可加入，最多能等待多久？

最低恢复证据包含：

1. 使用停服后的稳定状态，或所用服务端明确支持的保存／快照流程；
2. 世界、玩家与扩展数据、配置、权限、精确依赖、启动说明和校验信息完整；
3. 至少一份副本不与原主机、原磁盘和持续在线凭据共享同一故障；
4. 在隔离目录、不同端口或 loopback 上启动；
5. 普通玩家账户检查出生点、已知区块、背包／末影箱、进度、权限与关键扩展数据；
6. 产生一次新状态，正常停止、再次启动并确认该状态仍存在；
7. 记录恢复耗时、选择的备份代次、异常和下一次修正。

归档哈希只能证明字节后来没有偏离所记录值，不能证明下载来源可信、世界语义正确或所有文件来自同一保存时点。

## 升级与回滚状态机

升级按以下状态推进：

1. **计划**：读取游戏、服务端、加载器与扩展发布说明，建立新版本清单和退出条件。
2. **演练**：从已验证备份复制隔离实例，用独立目录和网络入口启动，不写生产世界。
3. **验收**：检查启动日志、数据迁移、普通玩家路径、关键扩展和同口径性能。
4. **冻结**：安排维护窗口，正常停止生产实例并生成升级前一致性备份。
5. **切换**：新版本只接管升级副本／恢复出的世界，确认旧进程已经停止。
6. **观察**：保留旧依赖和升级前备份，持续检查预先写下的退出条件。
7. **收口或回滚**：通过后更新基线；失败时停止新版本并恢复升级前世界与旧依赖。

“旧 JAR + 已被新版本迁移的世界”不进入回滚路径。

## 失效与复核边界

以下事实会变化，未来修订必须重新核对：

- Minecraft 当前版本、服务端下载地址和许可／使用准则；
- Paper、Fabric、Forge、NeoForge 的 Java 版本表、启动参数和目录结构；
- Paper 的 profiler、命令、默认配置与迁移行为；
- systemd 指令在目标发行版中的支持版本；
- Ubuntu 防火墙前端和默认双栈行为；
- 容器镜像、面板、托管服务的更新与备份语义。

以下结构应作为文章常青主干：

- 单写者、可复现、可恢复、可观测四个不变量；
- 信任边界、管理面与游戏面的分离；
- RPO／RTO、跨故障域副本和恢复演练；
- 先隔离演练、再生产切换、按状态恢复的升级方法；
- 在真实问题窗口采证、一次只改一个因素的故障诊断方法。

## 公开稿验收

- 中英文标题、摘要、章节、表格、代码、链接、锚点和修订日期对应。
- 保留原始发布日期、`uid` 与永久链接；增加 2026-08-11 全面重写记录。
- 动态事实均带具体项目的一手链接，并明确复核日期或版本依赖。
- 命令示例不含作者实际端口、地址、账户、UUID、路径或凭据。
- 不把哈希、快照、容器、面板、白名单、VPN、自动重启或成功退出码单独描述为完整安全／恢复方案。
- 运行翻译哈希、生产内容检查、站点构建与浏览器门禁。
