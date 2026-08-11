# 2026-08-11 依赖安全基线

本文记录 Python 开发依赖的真实版本、GitHub 告警失真原因、可复现安装方式和后续维护边界。动态告警数量仍需在 GitHub 当前状态中复核。

## 问题与证据

- GitHub 于 2026-08-11 仍列出 19 条 Pillow 告警，其中 13 条为高危、6 条为中危；全部指向 `scripts/requirements.txt`，告警最后更新时间停在 2026-08-07。
- 当时的 GitHub Dependency Graph 与 SBOM 仍把该清单解析为 Pillow 12.0.0。
- 正式 `master` 已从 2026-08-08 起固定 `Pillow==12.3.0`；2026-08-11 的正式 GitHub Actions 运行也明确安装 Pillow 12.3.0。
- 19 条公告给出的最高修复门槛为 12.3.0。当前构建环境已经覆盖这些修复，待 GitHub 重新解析清单后关闭旧告警。
- 分支依赖对比同时发现 pytest 8.4.2 受 [GHSA-6w46-j5rx-g56g](https://github.com/advisories/GHSA-6w46-j5rx-g56g) 影响，首个修复版本为 9.0.3。输入约束以 9.0.3 作为安全下限。
- Pillow 只用于本地与 CI 的图片读取、验证和派生资源生成。正式站点为静态文件，不向访问者提供 Python 图片处理入口。

## 清单结构

- `scripts/requirements.in` 保存五项跨平台直接依赖约束，并为 Windows 声明 `tzdata`。Windows 标准 Python 依靠该包载入 `Asia/Hong_Kong`；Linux 继续使用系统时区数据库。
- `scripts/requirements.txt` 使用 Python 3.12 与 `pip-tools==7.5.3` 生成，固定全部直接和传递依赖，并保存 PyPI 分发包 SHA-256。
- [GitHub Dependency Graph 的支持清单](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems)将 pip 静态分析入口列为标准文件名 `requirements.txt`。分支依赖对比已确认 `requirements-dev.txt` 不会生成新增依赖记录，因此锁文件沿用标准名称。[Dependabot 的 pip 与 pip-compile 说明](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#pip-and-pip-compile)支持维护 `.txt` 清单；本站继续按 `/scripts` 目录检查更新。
- CI 使用 `--require-hashes` 安装锁文件，随后运行 `pip check` 检查解析结果。
- Pillow 继续固定为 12.3.0，并与 `docs/asset-provenance.yml`、`_data/article_image_derivatives.yml` 和图片生成脚本的确定性契约保持一致。

## 更新方法

在 Python 3.12 环境中运行：

```powershell
python -m pip install "pip-tools==7.5.3"
$env:CUSTOM_COMPILE_COMMAND = "python -m piptools compile --strip-extras --generate-hashes --no-emit-index-url --no-emit-trusted-host --newline=LF --output-file=scripts/requirements.txt scripts/requirements.in"
python -m piptools compile --strip-extras --generate-hashes --index-url=https://pypi.org/simple --no-emit-index-url --no-emit-trusted-host --newline=LF --output-file=scripts/requirements.txt scripts/requirements.in
python -m pip install --require-hashes -r scripts/requirements.txt
python -m pip check
```

生成命令显式从公开 PyPI 解析版本和哈希，输出中不保存本机镜像、凭据或绝对路径。依赖变更必须同时提交输入清单与锁文件。

## Dependabot 边界

- `.github/dependabot.yml` 继续按月检查 `/scripts`，并使用 `increase-if-necessary`，只在当前约束无法容纳目标版本时提高约束。
- 清单变更进入默认分支后，GitHub 应重新解析依赖图。验收时检查 Dependabot 告警、Dependency Graph 和 SBOM 三处的 Pillow 版本。
- 旧告警在依赖图刷新前保持开放，不逐条手动忽略。
- 后续 Python 大版本升级和测试框架的主要版本升级使用独立 PR。本基线将 pytest 安全下限提升至 9.0.3，当前锁定 9.1.1，并保留完整回归证据。

## 验收

- `tests/test_python_dependency_contracts.py` 检查清单路径、直接约束、完整锁定版本、哈希、CI 安装命令、Dependabot 策略和 Pillow 图片契约。
- 全新 Python 3.12 环境必须能以 `--require-hashes` 完成安装，并由 `pip check` 返回 `No broken requirements found`。
- 发布前运行 `python scripts/validate.py --browser`，随后核对测试分支的源码 SHA 与 GitHub 产物标记。
