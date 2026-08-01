# 主分支正式目录整理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 master 当前树整理为只包含正式站点源码、维护工具、结构化生产资产来源和已批准决策文档的可构建仓库，并以未合并 PR 交付。

**Architecture:** 保持 Jekyll 原生目录不动，以 docs/asset-provenance.yml 取代完整内容修订档案，用独立契约测试保护 11 个当前封面及其许可；历史材料只从当前树移除，仍由提交 0cd7357、未压缩 40a013 原站和已验证冷备份恢复。所有实现发生在仓库外 cleanup worktree，正式 master clone 不切分支、不写文件。

**Tech Stack:** Jekyll 4.4.1、Ruby 3.3.5、Python 3.12、pytest、PyYAML、Pillow、Node.js、Playwright、GitHub Actions、GitHub CLI、Kimi Code CLI。

---

## 执行上下文

- 设计依据：docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md
- 正式 clone：D:\Codes\yiyuiii.github.io\master
- 实施 worktree：D:\Codes\yiyuiii.github.io-cleanup-formal-tree
- 分支：cleanup/formalize-repository
- 基线提交：0cd73576339203377e8c82fc1944b644b9a64ea9
- 基线 Actions run：30605824068
- 基线 site-preview artifact：8783555188，未过期
- 基线测试：182 passed
- 禁止纳入提交：D:\Codes\yiyuiii.github.io\original-40a013、D:\Codes\yiyuiii.github.io\archives

## 文件职责映射

**新增**

- docs/asset-provenance.yml：11 个当前文章缩略图的来源、许可、处理方式、尺寸和 SHA-256 单一清单。
- tests/test_asset_provenance.py：清单与 _posts、assets/posts、可见署名之间的一致性契约。
- AGENTS.md：项目级记忆入口、当前事实、用户长期要求和关键文档索引。

**修改**

- tests/test_writing_contracts.py：移除对旧稿、AI 审阅稿、原始封面源图和一次性脚本的依赖，保留当前内容行为测试。
- tests/test_source_contracts.py：把实际使用的两个 favicon 固定为当前生产集合。
- README.md：替换主题遗留说明，成为正式项目入口。
- docs/content-editing.md：把“在 master 复制完整修订稿”改为 Git/worktree 与生产来源清单流程。

**删除**

- docs/content-revisions：68 个历史过程文件。
- docs/content-covers：2 个已完成候选台账。
- assets/img/favicons/android-chrome-192x192.png
- assets/img/favicons/apple-touch-icon.png
- assets/img/favicons/browserconfig.xml
- assets/img/favicons/favicon-16x16.png
- assets/img/favicons/favicon-32x32.png
- assets/img/favicons/mstile-150x150.png
- assets/img/favicons/safari-pinned-tab.svg
- assets/img/favicons/site.webmanifest

保留 assets/img/favicons/favicon.ico 和 assets/img/favicons/android-chrome-256x256.png；前者由 head 明确引用，后者用于头像、Open Graph 和 404 页面。

### Task 1: 固定基线与隔离保护

**Files:**
- Inspect only: D:\Codes\yiyuiii.github.io\master
- Inspect only: D:\Codes\yiyuiii.github.io\archives\manifests\post-completion-verification.txt
- Inspect only: D:\Codes\yiyuiii.github.io-cleanup-formal-tree

- [ ] **Step 1: 确认正式 clone 未改变**

Run:

~~~powershell
git -C D:\Codes\yiyuiii.github.io\master status --short --branch
git -C D:\Codes\yiyuiii.github.io\master rev-parse HEAD
git -C D:\Codes\yiyuiii.github.io\master rev-parse origin/master
~~~

Expected:

~~~text
## master...origin/master
0cd73576339203377e8c82fc1944b644b9a64ea9
0cd73576339203377e8c82fc1944b644b9a64ea9
~~~

- [ ] **Step 2: 确认 cleanup worktree 分支和父提交**

Run:

~~~powershell
git status --short --branch
git merge-base HEAD origin/master
git log --oneline --decorate -2
~~~

Expected: 当前分支为 cleanup/formalize-repository；merge-base 为 0cd7357；只有已批准设计和本计划领先 origin/master。

- [ ] **Step 3: 重跑 Python 基线**

Run:

~~~powershell
python -m pytest -q
~~~

Expected: `182 passed`。

- [ ] **Step 4: 记录待移除目录的精确基线**

Run:

~~~powershell
$revisionFiles = @(git ls-files docs/content-revisions)
$coverFiles = @(git ls-files docs/content-covers)
"REVISION_FILES=$($revisionFiles.Count)"
"COVER_LEDGER_FILES=$($coverFiles.Count)"
git ls-tree -r -l HEAD docs/content-revisions docs/content-covers
~~~

Expected: `REVISION_FILES=68`、`COVER_LEDGER_FILES=2`。

- [ ] **Step 5: 复核冷备份与历史恢复入口**

Run:

~~~powershell
(Get-FileHash -Algorithm SHA256 D:\Codes\yiyuiii.github.io\archives\workspace-before-consolidation-20260731.tar.gz).Hash
git cat-file -e 0cd7357:docs/content-revisions/2021-09-16-building-a-personal-github-page/original-2021-09-16.md
if ($LASTEXITCODE -ne 0) { throw "0cd7357 history object is unavailable" }
~~~

Expected SHA-256:

~~~text
6E7CF00480B4036818165910C537271594771764577A21FF698C786D1BD87C0E
~~~

### Task 2: 以 TDD 建立生产封面来源契约

**Files:**
- Create: tests/test_asset_provenance.py
- Create: docs/asset-provenance.yml
- Read: _posts/*.md
- Read: assets/posts/**/cover-*.webp

- [ ] **Step 1: 写入失败的来源清单契约测试**

Create tests/test_asset_provenance.py with this complete content:

~~~python
import hashlib
from pathlib import Path, PurePosixPath

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PROVENANCE = ROOT / "docs" / "asset-provenance.yml"
REQUIRED_KEYS = {
    "asset",
    "post",
    "origin_type",
    "source_url",
    "author",
    "license",
    "license_url",
    "transform",
    "sha256",
    "dimensions",
    "attribution",
}


def frontmatter(path):
    source = path.read_text(encoding="utf-8")
    return yaml.safe_load(source.split("---", 2)[1])


def published_posts():
    return [
        path
        for path in sorted((ROOT / "_posts").glob("*.md"))
        if frontmatter(path).get("published") is not False
    ]


def records():
    document = yaml.safe_load(PROVENANCE.read_text(encoding="utf-8"))
    assert set(document) == {"version", "covers"}
    assert document["version"] == 1
    assert isinstance(document["covers"], list)
    return document["covers"]


def test_every_published_post_thumbnail_has_one_provenance_record():
    posts = published_posts()
    covers = records()
    by_post = {record["post"]: record for record in covers}

    assert len(posts) == 11
    assert len(covers) == len(posts)
    assert len(by_post) == len(covers)

    for post in posts:
        relative_post = post.relative_to(ROOT).as_posix()
        data = frontmatter(post)
        thumbnail = data.get("thumbnail")

        assert isinstance(thumbnail, str) and thumbnail.startswith(
            "/assets/posts/"
        ), relative_post
        assert relative_post in by_post
        assert by_post[relative_post]["asset"] == thumbnail.lstrip("/")
        assert (ROOT / thumbnail.lstrip("/")).is_file()


def test_provenance_schema_hashes_and_dimensions_match_production_assets():
    covers = records()
    assets = [record["asset"] for record in covers]

    assert len(set(assets)) == len(assets)
    for record in covers:
        assert REQUIRED_KEYS <= set(record), record
        assert record["origin_type"] in {
            "self-produced",
            "external",
            "generated",
        }
        assert PurePosixPath(record["asset"]).parts[:2] == ("assets", "posts")
        assert PurePosixPath(record["post"]).parts[0] == "_posts"
        assert isinstance(record["transform"], str) and record["transform"].strip()
        assert isinstance(record["attribution"], str) and record[
            "attribution"
        ].strip()
        assert isinstance(record["dimensions"], list)
        assert len(record["dimensions"]) == 2
        assert all(
            isinstance(value, int) and value > 0
            for value in record["dimensions"]
        )

        asset = ROOT / record["asset"]
        assert hashlib.sha256(asset.read_bytes()).hexdigest() == record["sha256"]
        with Image.open(asset) as image:
            assert image.format == "WEBP"
            assert list(image.size) == record["dimensions"]

        if record["origin_type"] == "external":
            for key in ("source_url", "author", "license", "license_url"):
                assert isinstance(record[key], str) and record[key].strip()
            assert record["source_url"].startswith("https://")
            assert record["license_url"].startswith("https://")
        elif record["origin_type"] == "self-produced":
            assert record["source_url"] is None
            assert record["license"] == "project-owned"
            assert record["license_url"] is None
        else:
            assert record["source_url"] is None
            assert record["license"] == "project-use-rights"
            assert record["license_url"] is None
            for key in (
                "generator",
                "generated_at",
                "source_description",
                "purpose",
                "prompt",
                "approval",
            ):
                assert isinstance(record.get(key), str)
                assert record[key].strip()
            assert isinstance(record.get("reference_inputs"), list)
            assert record["reference_inputs"]
            assert all(
                isinstance(value, str) and value.strip()
                for value in record["reference_inputs"]
            )


def test_external_cover_rights_are_visible_in_the_production_post():
    for record in records():
        if record["origin_type"] != "external":
            continue

        source = (ROOT / record["post"]).read_text(encoding="utf-8")
        assert record["source_url"] in source
        assert record["attribution"] in source
        assert record["license"] in source
        assert (
            record["license_url"] == record["source_url"]
            or record["license_url"] in source
        )
~~~

- [ ] **Step 2: 运行新测试并确认因清单缺失而失败**

Run:

~~~powershell
python -m pytest tests/test_asset_provenance.py -q
~~~

Expected: 3 failures，首个根因为 docs/asset-provenance.yml 不存在。

- [ ] **Step 3: 写入 11 条正式来源记录**

Create docs/asset-provenance.yml with this complete content:

~~~yaml
version: 1
covers:
  - asset: "assets/posts/202109160000/cover-homepage-2026-07-30.webp"
    post: "_posts/2021-09-16-build a personal github page.md"
    origin_type: "self-produced"
    source_url: null
    author: "Yiyu Chen"
    license: "project-owned"
    license_url: null
    transform: "A 640 × 640 screenshot of this site's Chinese writing index, copied unchanged into production."
    sha256: "80de76f63298f7e5b914a53e53e9233f9b8fbd3829691bc2f8447d95053ef71b"
    dimensions: [640, 640]
    attribution: "screenshot and site content by the author"

  - asset: "assets/posts/202109170000/cover-reinforcement-learning-diagram-square.webp"
    post: "_posts/2021-09-17-reinforcement learning issues.md"
    origin_type: "external"
    source_url: "https://commons.wikimedia.org/wiki/File:Reinforcement_learning_diagram.svg"
    author: "Wikimedia Commons user Megajuice"
    license: "CC0 1.0"
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/"
    transform: "Placed the 960 × 928 transparent preview on a light square canvas, resized to 640 × 640, and exported as WebP without changing labels."
    sha256: "a4c2961865207299e43a205d125a28e055456662c641b6b756d75eb68a9d532e"
    dimensions: [640, 640]
    attribution: "Wikimedia Commons user Megajuice"

  - asset: "assets/posts/202208142347/cover-cloud-console-2026-07-30.webp"
    post: "_posts/2022-08-14-云服务器折腾随笔.md"
    origin_type: "self-produced"
    source_url: null
    author: "Yiyu Chen with Codex"
    license: "project-owned"
    license_url: null
    transform: "A locally code-drawn 720 × 720 generic cloud-console illustration with fictional data; no third-party interface assets."
    sha256: "c1cbcce997663247009967199e4e89d55a5e84a1be39459ac8a76a6ef9b1f8fc"
    dimensions: [720, 720]
    attribution: "云服务器实例控制台示意（自制）"

  - asset: "assets/posts/202208171838/cover-site-avatar-ascii-square.webp"
    post: "_posts/2022-08-17-制作一张匹配形状的字符画.md"
    origin_type: "self-produced"
    source_url: null
    author: "Yiyu Chen"
    license: "project-owned"
    license_url: null
    source_asset: "assets/img/favicons/android-chrome-256x256.png"
    transform: "Derived the site-owned 256 × 256 avatar into an ASCII shape-matching image on a 640 × 640 light canvas."
    sha256: "5ccd61775fc75b81937c10042b6d437ab8d6a837524e59839855ed900055fee7"
    dimensions: [640, 640]
    attribution: "头像与结果均为本站自有内容"

  - asset: "assets/posts/202211110000/cover-generated-2026-07-29.webp"
    post: "_posts/2022-11-11-装机记录.md"
    origin_type: "generated"
    source_url: null
    author: "Generated under Yiyu Chen's direction"
    license: "project-use-rights"
    license_url: null
    generator: "OpenAI image_gen via Codex"
    generated_at: "2026-07-29"
    source_description: "AI-original generation; no third-party network image was used."
    reference_inputs:
      - "Two alternatives generated in the same session were used only as composition, texture, palette, and PC-building atmosphere references."
    purpose: "Square writing-index cover; not a photograph or factual record of the 2022 PC build."
    approval: "Approved by the user on 2026-07-29 with the reply 'ok，继续吧' before site integration."
    prompt: |-
      将输入图片仅作为质感、配色和装机现场氛围参考，重新生成一张真正独立的正方形 1:1 单幅图片，用作中文个人博客文章《装机记录》的封面。不要保留输入图的双栏结构，不要拼图、候选对照或接触表。

      画面主体是一台正在组装中的黑色中塔或紧凑型中塔台式机机箱，采用略高的三分之四视角，可综合参考输入图右侧清楚的“装机进行中”视角与左侧完整的机箱轮廓。整台机箱及其完整轮廓必须全部收进正方形画面，四周保留适量呼吸空间；侧板已取下，既能看清完整机箱外形，也能看见内部硬件。内部应真实、比例正确地呈现 mATX/ATX 主板、CPU 风冷散热器、内存、双风扇显卡、电源、机箱风扇与少量尚在整理的线缆。体现“装机进行中”而非成品广告：旁边自然放一把螺丝刀、少量分类放好的螺丝和简洁理线工具，但不要把零件平铺成主角。

      场景是温暖的珍珠灰色家庭工作台，柔和自然日光，低饱和中性色为主，金属与玻璃表面可有非常克制的紫水晶色和翡翠色微弱反光，呼应网站的宝石色审美，但不要炫目 RGB、不要赛博霓虹灯带。整体简洁、安静、可信，像个人真实记录而非商业产品摄影；细节清楚，缩成首页方形缩略图时仍能一眼认出是完整机箱装机。

      不要人物或手，不要文字、字母、品牌 logo、产品标签、水印；不要竖幅构图，不要裁掉机箱边缘，不要零件散落平铺，不要畸形硬件，不要双图、拼贴、接触表或分割线。
    transform: "Generated as an original 1254 × 1254 square illustration, then resized to 1024 × 1024 and exported as WebP quality 86; it is not evidence of the 2022 build."
    sha256: "08edfd8d77d2e78306916fa25008d90b044ed10d3dc97359570f2666092b11f3"
    dimensions: [1024, 1024]
    attribution: "AI-generated index illustration; not a photograph of the 2022 build."

  - asset: "assets/posts/202301162233/cover-bgg-2898488-square.webp"
    post: "_posts/2023-01-18-四季物语量化分析攻略.md"
    origin_type: "external"
    source_url: "https://boardgamegeek.com/image/2898488/seasons"
    author: "BoardGameGeek user dodecalouise"
    license: "CC0 1.0"
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/"
    transform: "Cropped the source from (320, 0) to (2240, 1920), resized to 1024 × 1024 with Lanczos, and exported as WebP quality 82."
    sha256: "2138cd3f99ff0c877a336a20be98190496b7d17b2dca252a731601bb0f5ee714"
    dimensions: [1024, 1024]
    attribution: "BoardGameGeek 用户 dodecalouise"

  - asset: "assets/posts/202302032000/cover-bgg-7205453-square.webp"
    post: "_posts/2023-02-03-逻辑对决桌游攻略.md"
    origin_type: "external"
    source_url: "https://boardgamegeek.com/image/7205453/break-the-code"
    author: "BoardGameGeek user dizziedobsession"
    license: "CC0 1.0"
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/"
    transform: "Cropped the source from (100, 20) to (920, 840), resized to 1024 × 1024 with Lanczos, and exported as WebP quality 82."
    sha256: "fde95f4357dc8028f609e16a8d15e94017bd4080280d122b312e6099d60d44aa"
    dimensions: [1024, 1024]
    attribution: "BoardGameGeek 用户 dizziedobsession"

  - asset: "assets/posts/202307232000/cover-breaststroke-square.webp"
    post: "_posts/2023-07-23-了解游泳.md"
    origin_type: "external"
    source_url: "https://commons.wikimedia.org/wiki/File:Swimming.breaststroke.arp.750pix.jpg"
    author: "Adrian Pingstone"
    license: "公有领域"
    license_url: "https://commons.wikimedia.org/wiki/File:Swimming.breaststroke.arp.750pix.jpg"
    transform: "Cropped the 750 × 536 source with box [107, 0, 643, 536], resized to 640 × 640, and exported as WebP quality 82."
    sha256: "625afdeed0ea79ba667a285b893b7b4dfab6ec46d97d81c65e3007dba3d35b6a"
    dimensions: [640, 640]
    attribution: "Adrian Pingstone"

  - asset: "assets/posts/202404232233/cover-bgg-5194524-square.webp"
    post: "_posts/2024-04-23-《盖亚计划》资源-分值量化计算思路.md"
    origin_type: "external"
    source_url: "https://boardgamegeek.com/image/5194524/gaia-project"
    author: "BoardGameGeek user magic_erwt"
    license: "CC0 1.0"
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/"
    transform: "Cropped the source from (128, 0) to (896, 768), resized to 1024 × 1024 with Lanczos, and exported as WebP quality 82."
    sha256: "f63895aa3977d0c5bebd97dd661d4b28428acd61d1bbc450c4cf81b7d2bc91de"
    dimensions: [1024, 1024]
    attribution: "BoardGameGeek 用户 magic_erwt"

  - asset: "assets/posts/202407012233/cover-bgg-1091724-square.webp"
    post: "_posts/2024-07-01-《特鲁瓦》资源-分值量化分析攻略.md"
    origin_type: "external"
    source_url: "https://boardgamegeek.com/image/1091724/troyes"
    author: "BoardGameGeek user verminose"
    license: "CC BY-NC 3.0"
    license_url: "https://creativecommons.org/licenses/by-nc/3.0/"
    transform: "Cropped the source from (250, 0) to (1250, 1000), resized to 1024 × 1024 with Lanczos, and exported as WebP quality 82."
    sha256: "cfddd3759235ac570455d46aa984d884935a8c3346b10855f0f0cd64cf639462"
    dimensions: [1024, 1024]
    attribution: "BoardGameGeek 用户 verminose"

  - asset: "assets/posts/202510112233/cover-bgg-7712310-square.webp"
    post: "_posts/2025-10-11-《大创造时代》资源-分值量化计算思路.md"
    origin_type: "external"
    source_url: "https://boardgamegeek.com/image/7712310/age-of-innovation"
    author: "BoardGameGeek user Hipopotam"
    license: "CC BY-SA 3.0"
    license_url: "https://creativecommons.org/licenses/by-sa/3.0/"
    transform: "Cropped the source from (473, 0) to (3311, 2838), resized to 1024 × 1024 with Lanczos, and exported as WebP quality 82 under the same CC BY-SA 3.0 terms."
    sha256: "c6e4afcf62b37df698f5858326805f8713f8017b676003c404d7e8b40d943dd0"
    dimensions: [1024, 1024]
    attribution: "BoardGameGeek 用户 Hipopotam"
~~~

- [ ] **Step 4: 运行来源契约测试并确认通过**

Run:

~~~powershell
python -m pytest tests/test_asset_provenance.py -q
~~~

Expected: `3 passed`。

- [ ] **Step 5: 提交生产来源契约**

Run:

~~~powershell
git add docs/asset-provenance.yml tests/test_asset_provenance.py
git diff --cached --check
git commit -m "test: 固化生产封面来源契约"
~~~

### Task 3: 移除历史快照型测试依赖

**Files:**
- Modify: tests/test_writing_contracts.py:1-43
- Modify: tests/test_writing_contracts.py:166-915
- Test: tests/test_writing_contracts.py
- Modify/Test: tests/test_asset_provenance.py

本任务处理设计中识别出的七处历史过程依赖：重写一处装机记录测试，使它只验证当前生产行为；完整删除另外六个只能由过程快照支撑的测试函数。生产封面覆盖并未减少，而是转交给 Task 2 新增的结构化来源契约。

执行中质量审查修订：不恢复快照比较；新增 `test_age_of_innovation_keeps_reviewed_production_conclusions`，保护当前文章的关键公式、限定说明和证据标记；扩展 provenance 的正文封面用途检查，其中装机生成图仅因非空 `purpose` 明确包含 `writing-index cover` 而豁免。因此 writing tests 为 14、provenance tests 为 3、Task 3 联合测试为 17，最终全量预期为 180。这落实了设计中“不以减少测试数量为目标”的要求。

- [ ] **Step 1: 先证明新来源契约覆盖当前封面**

Run:

~~~powershell
python -m pytest tests/test_asset_provenance.py tests/test_writing_contracts.py::test_every_post_now_has_a_local_thumbnail -q
~~~

Expected: `4 passed`。

- [ ] **Step 2: 将装机记录测试改为只验证当前生产行为**

Replace the current test_installation_post_uses_structured_revisions_and_optional_evidence_notes function with:

~~~python
def test_installation_post_uses_structured_revisions_and_optional_evidence_notes():
    path = ROOT / "_posts" / "2022-11-11-装机记录.md"
    source = path.read_text(encoding="utf-8")
    data = frontmatter(path)
    body = source.split("---", 2)[2]

    assert data["revisions"] == [
        {"date": "2022-11-11", "note": "初稿"},
        {
            "date": "2026-07-29",
            "note": (
                "补充资料来源，校正硬件型号、成本及部分技术表述；"
                "保留 2022 年视角（ChatGPT 协助）"
            ),
        },
        {
            "date": "2026-07-30",
            "note": "校正刷新率收益与烤机结温两处表述（Kimi 协助）",
        },
    ]
    assert "2022.11.11：初稿" not in body
    assert "2026.07.29：ChatGPT 修订" not in body
    assert body.count("{: .article-evidence}") == 11
~~~

- [ ] **Step 3: 删除六个完全依赖过程档案的测试定义**

Delete each complete function, from its `def` line through the line before the next top-level `def`:

~~~text
test_logic_duel_post_preserves_revisions_and_uses_selected_bgg_cover
test_troyes_original_and_approved_cover_are_preserved
test_selected_board_game_covers_and_revisions_are_preserved
test_cloud_server_cover_preserves_the_original_article
test_final_cover_batch_preserves_the_four_original_articles
test_age_of_innovation_snapshots_and_production_contract
~~~

Keep test_installation_post_uses_the_approved_lightweight_cover, test_every_post_now_has_a_local_thumbnail, and test_article_navigation_uses_native_dialog_and_progressive_scroll_tracking.

- [ ] **Step 4: 删除只被上述旧测试使用的导入和辅助函数**

The beginning of tests/test_writing_contracts.py must become exactly:

~~~python
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    source = path.read_text(encoding="utf-8")
    return yaml.safe_load(source.split("---", 2)[1])
~~~

This removes `hashlib`, `PIL.Image`, `without_retired_blog_category`, `assert_only_retired_blog_category_changes`, and `assert_only_cover_changes`.

- [ ] **Step 5: 证明测试不再依赖过程档案**

Run:

~~~powershell
rg -n "content-revisions|cover-source|cover-approved|original-|chatgpt-|kimi-" tests/test_writing_contracts.py
~~~

Expected: no matches，exit code 1。

- [ ] **Step 6: 运行写作与来源契约**

Run:

~~~powershell
python -m pytest tests/test_writing_contracts.py tests/test_asset_provenance.py -q
~~~

Expected: `17 passed`。

- [ ] **Step 7: 提交测试去耦**

Run:

~~~powershell
git add tests/test_writing_contracts.py
git diff --cached --check
git commit -m "test: 从历史快照解耦写作契约"
~~~

### Task 4: 以 TDD 删除无入边 favicon 集合

**Files:**
- Modify: tests/test_source_contracts.py:104-110
- Delete: eight favicon files listed in the file map
- Keep: assets/img/favicons/favicon.ico
- Keep: assets/img/favicons/android-chrome-256x256.png

- [ ] **Step 1: 检查仓库入边与精确锁定的主题源码**

先扫描 tracked 源码；结果只允许出现候选集合内部的两条引用：`browserconfig.xml -> mstile-150x150.png` 与 `site.webmanifest -> android-chrome-192x192.png`。任何来自候选集合之外的匹配都阻止删除。

~~~powershell
$candidatePattern = "android-chrome-192|apple-touch-icon|browserconfig|favicon-16x16|favicon-32x32|mstile-150x150|safari-pinned-tab|site\.webmanifest"
$repoHits = @(git grep -n -E $candidatePattern -- ':!docs/superpowers/**')
if ($LASTEXITCODE -ne 0) { throw "Expected candidate-internal references were not found" }
$repoHits
$hitFiles = @($repoHits | ForEach-Object { ($_ -split ":", 2)[0] } | Sort-Object -Unique)
$expectedHitFiles = @(
  "assets/img/favicons/browserconfig.xml",
  "assets/img/favicons/site.webmanifest"
)
if (@(Compare-Object $expectedHitFiles $hitFiles).Count -ne 0) {
  throw "A deletion candidate has an unexpected tracked source reference"
}
~~~

Expected: only `assets/img/favicons/browserconfig.xml` and `assets/img/favicons/site.webmanifest` match；它们都属于即将整体删除的候选连通分量。

然后从 RubyGems 下载 `Gemfile` 以精确约束 `= 1.0.11` 固定的 `al_folio_core`，校验官方包 SHA-256 后展开并扫描主题源码：

~~~powershell
$ErrorActionPreference = "Stop"
$themeAudit = Join-Path $env:TEMP ("al-folio-core-1.0.11-audit-" + [guid]::NewGuid().ToString("N"))
$outer = Join-Path $themeAudit "outer"
$theme = Join-Path $themeAudit "theme"
New-Item -ItemType Directory -Path $outer,$theme | Out-Null
$gem = Join-Path $themeAudit "al_folio_core-1.0.11.gem"
Invoke-WebRequest -UseBasicParsing -Uri "https://rubygems.org/downloads/al_folio_core-1.0.11.gem" -OutFile $gem
if ((Get-FileHash -Algorithm SHA256 $gem).Hash -ne "0792345EDE34AF0E685F575520FB8C588FDB8F0207A6A743CC7760D880E49871") {
  throw "Unexpected al_folio_core package"
}
tar -xf $gem -C $outer
tar -xzf (Join-Path $outer "data.tar.gz") -C $theme
rg -n $candidatePattern $theme
if ($LASTEXITCODE -ne 1) { throw "Pinned theme source references a deletion candidate" }
~~~

Expected: no candidate reference in the exact pinned theme source. The package SHA comes from the RubyGems version API and was independently verified while writing this plan.

- [ ] **Step 2: 检查当前 master 的真实生产构建和线上 head**

本机没有 Ruby，因此删除前的权威生产构建证据使用 `origin/master` 提交 `0cd7357` 已通过的 GitHub Actions `site-preview` 工件（run `30605824068`）。先下载工件，再排除 favicon 候选目录自身，扫描所有生成页面和资源是否存在入边：

~~~powershell
$baselineArtifact = Join-Path $env:TEMP ("yiyuiii-baseline-site-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $baselineArtifact | Out-Null
gh run download 30605824068 --name site-preview --dir $baselineArtifact
rg -n $candidatePattern $baselineArtifact --glob '!**/assets/img/favicons/**'
if ($LASTEXITCODE -ne 1) { throw "Production artifact references a deletion candidate" }

$response = Invoke-WebRequest -UseBasicParsing -Uri "https://yiyuiii.github.io/" -Headers @{"Cache-Control"="no-cache"}
$head = [regex]::Match($response.Content, "(?is)<head.*?</head>").Value
$head | Select-String -Pattern "favicon|manifest|browserconfig|apple-touch|mask-icon|mstile" -AllMatches
~~~

Expected: build artifact在 favicon 目录外无候选引用；线上 head 只直接引用 `assets/img/favicons/favicon.ico` 和 `assets/img/favicons/android-chrome-256x256.png`，没有 manifest、browserconfig、apple-touch、mask-icon、mstile 或 16/32/192 图标引用。

- [ ] **Step 3: 写入失败的精确 favicon 集合测试**

Replace test_head_allows_only_the_used_cdn_fonts_and_declares_a_real_favicon with:

~~~python
def test_head_allows_only_used_cdn_fonts_and_production_favicons():
    head = text("_includes/head.liquid")
    favicon_dir = ROOT / "assets" / "img" / "favicons"
    tracked_favicons = {
        path.name for path in favicon_dir.iterdir() if path.is_file()
    }

    assert "font-src 'self' data: https://cdn.jsdelivr.net;" in head
    assert "font-src 'self' data: https:;" not in head
    assert "'/assets/img/favicons/favicon.ico'" in head
    assert 'rel="icon"' in head
    assert tracked_favicons == {
        "android-chrome-256x256.png",
        "favicon.ico",
    }
~~~

- [ ] **Step 4: 运行测试并确认它列出多余文件**

Run:

~~~powershell
python -m pytest tests/test_source_contracts.py::test_head_allows_only_used_cdn_fonts_and_production_favicons -q
~~~

Expected: FAIL，差异只包含计划删除的八个文件。

- [ ] **Step 5: 删除精确候选集合**

Run from the cleanup worktree root:

~~~powershell
$unusedFavicons = @(
  "assets/img/favicons/android-chrome-192x192.png",
  "assets/img/favicons/apple-touch-icon.png",
  "assets/img/favicons/browserconfig.xml",
  "assets/img/favicons/favicon-16x16.png",
  "assets/img/favicons/favicon-32x32.png",
  "assets/img/favicons/mstile-150x150.png",
  "assets/img/favicons/safari-pinned-tab.svg",
  "assets/img/favicons/site.webmanifest"
)
git rm -- $unusedFavicons
~~~

- [ ] **Step 6: 运行精确测试和引用扫描**

Run:

~~~powershell
python -m pytest tests/test_source_contracts.py::test_head_allows_only_used_cdn_fonts_and_production_favicons -q
rg -n "android-chrome-192|apple-touch-icon|browserconfig|favicon-16x16|favicon-32x32|mstile-150x150|safari-pinned-tab|site\.webmanifest" . --glob "!docs/superpowers/**"
~~~

Expected: test passes；引用扫描无匹配。

- [ ] **Step 7: 提交 favicon 清理**

Run:

~~~powershell
git add tests/test_source_contracts.py
git diff --cached --check
git commit -m "chore: 删除未引用的 favicon 变体"
~~~

### Task 5: 建立正式项目入口与维护规则

**Files:**
- Create: AGENTS.md
- Replace: README.md
- Modify: docs/content-editing.md:228-251

- [ ] **Step 1: 重写 README.md**

Replace README.md with:

~~~~markdown
# yiyuiii.github.io

Yiyu Chen 的双语个人站点，发布随笔、公开项目与合作论文。站点使用 Jekyll 构建，由 GitHub Actions 验证并部署。

## 目录

- _posts：当前正式文章。
- _pages、_layouts、_includes、_plugins：页面、布局、组件与本站插件。
- _data：关于页、项目、论文、界面文字与旧 URL 契约。
- assets：当前生产样式、脚本、favicon 和文章媒体。
- scripts：项目同步、翻译检查、封面处理与构建产物检查。
- tests：源码、数据、构建结果与浏览器回归。
- docs/content-editing.md：内容维护流程。
- docs/asset-provenance.yml：当前文章封面的来源、许可与哈希。
- docs/superpowers：已批准的设计与实施计划。

完整历史稿、AI 审阅稿、封面候选和原始大图不保存在 master 当前树；Git 历史负责版本恢复，当前生产资源的法律与处理信息由 asset-provenance.yml 维护。

## 验证

~~~powershell
pip install -r scripts/requirements.txt
python -m pytest -q
python scripts/translation_guard.py --check --production
$env:JEKYLL_ENV = "production"
bundle exec jekyll build --trace
Remove-Item Env:\JEKYLL_ENV
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
npm ci
npm run test:browser
~~~

Ruby production build 使用 Ruby 3.3.5 与 Jekyll 4.4.1；精确 CI 流程见 .github/workflows/deploy.yml。

Playwright 默认连接 http://localhost:62091；运行 npm run test:browser 前应先在该地址提供刚构建的 _site，或通过 SITE_URL 指向等价预览。

## 部署

Pull request 只执行验证并上传 site-preview。只有 master 的 push 在验证通过后部署 _site；不要直接把生成目录提交到 master。

## 许可

站点代码与仓库整体许可见 LICENSE。文章封面可能采用不同许可，逐项以 docs/asset-provenance.yml 和文章中的可见署名为准。
~~~~

- [ ] **Step 2: 新增项目级 AGENTS.md**

Create AGENTS.md with:

~~~~markdown
# 项目 AI 记忆

## 用户原始要求

- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站归档，必须保留用于后续对比。
- D:\Codes\yiyuiii.github.io\master 应保持为与 GitHub master 一致的唯一正式 clone；功能工作使用仓库外临时 worktree，不直接修改 master。
- GitHub 主分支当前树应正式、精简、可构建、可维护；历史过程档案不应和生产源码混放。
- original-40a013 与 archives 不得进入站点提交。
- 当前外部审阅渠道只有 Ark Coding Plan 和本地 Kimi；Anthropic 来源永久不可用，DeepSeek API 暂不可用。
- 对用户交流和审阅材料使用中文。

## 当前事实状态

- 站点使用 Jekyll 4.4.1、Ruby 3.3.5、Python 3.12 与 Node/Playwright。
- GitHub Actions 工作流为 .github/workflows/deploy.yml；PR 构建只验证和上传 site-preview，master push 才部署。
- _posts 保存当前文章；docs/asset-provenance.yml 保存当前文章封面的来源、许可、处理与 SHA-256。
- _data/legacy_urls.yml、scripts/check_legacy_urls.py 与浏览器测试共同保护旧 URL。
- docs 已由 _config.yml 排除，不会生成公开页面。

## 常用验证

~~~powershell
python -m pytest -q
python scripts/sync_projects.py
python scripts/translation_guard.py --check --production
bundle exec jekyll build --trace
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
npm ci
npm run test:browser
~~~

## 关键文档

- 内容维护：docs/content-editing.md
- 生产封面来源：docs/asset-provenance.yml
- 目录整理设计：docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md
- 目录整理实施计划：docs/superpowers/plans/2026-08-01-formalize-repository-tree.md

## AI 历史总结

- 2026-07-31：本地根目录已整理为 master、original-40a013、archives 三个职责清楚的入口；冷备份及原站均已校验。该条是历史总结，继续工作前应以实际文件与 manifests 复核。
- 2026-08-01：用户批准方案 B，将完整修订稿、AI 审阅稿、封面候选与源图移出 master 当前树，并以结构化生产来源清单保留必要证据。该条是设计决策摘要，精确边界以已批准设计为准。
~~~~

- [ ] **Step 3: 替换 content-editing 的历史快照流程**

In docs/content-editing.md, replace the complete section beginning `### 保留多轮修订稿` and ending immediately before `## GitHub 仓库` with:

~~~~markdown
### 使用 Git 保留多轮修订

master 当前树只保存正式文章，不复制完整旧稿、AI 审阅稿或候选稿。需要多轮修改时：

1. 从最新 master 创建独立分支或临时 worktree。
2. 修改前先提交或记录基准提交；不要在 docs 下复制整篇文章。
3. 在 _posts 中实施经批准的当前稿，每一轮用独立 Git 提交标记边界。
4. 使用 git diff 比较任意提交；需要恢复时从 Git 历史读取旧版本。
5. 只把具有长期维护价值的结构化事实保留在当前树。

比较文章前后版本：

~~~powershell
git diff <基准提交>..<当前提交> -- "_posts/<文章文件>.md"
~~~

文章封面使用 docs/asset-provenance.yml 作为单一生产来源清单。更换封面时必须同步更新：

- asset 与 post 路径。
- 来源页面、作者、许可与许可链接。
- 裁切、缩放、格式转换或生成说明。
- 当前生产文件的 dimensions 与 sha256。
- 正文中需要公开显示的来源或署名。

计算当前文件 SHA-256：

~~~powershell
(Get-FileHash -Algorithm SHA256 "assets/posts/<目录>/<封面文件>").Hash.ToLowerInvariant()
~~~

当前生产使用的生成图必须在 docs/asset-provenance.yml 保存生成日期、生成器、完整提示词、参考输入边界、用途和批准状态。未采用候选的原图、生成源和提示词只在确有长期法律或再生成需求时进入专门资产库；不要默认放进站点 master。
~~~~

- [ ] **Step 4: 检查文档结构与失效引用**

Run:

~~~powershell
rg -n "docs/content-revisions|docs/content-covers|chatgpt-|kimi-2026|cover-approved" README.md docs/content-editing.md AGENTS.md
python -m pytest tests/test_source_contracts.py tests/test_writing_contracts.py tests/test_asset_provenance.py -q
~~~

Expected: reference scan has no matches；tests pass。

- [ ] **Step 5: 提交正式维护文档**

Run:

~~~powershell
git add README.md AGENTS.md docs/content-editing.md
git diff --cached --check
git commit -m "docs: 建立正式项目维护入口"
~~~

### Task 6: 从当前树移除历史过程档案

**Files:**
- Delete: docs/content-revisions/**
- Delete: docs/content-covers/**
- Preserve: docs/content-editing.md
- Preserve: docs/asset-provenance.yml
- Preserve: docs/superpowers/**

- [ ] **Step 1: 再次执行删除前守卫**

Run:

~~~powershell
$worktree = (Resolve-Path ".").Path
if (-not [StringComparer]::OrdinalIgnoreCase.Equals($worktree, "D:\Codes\yiyuiii.github.io-cleanup-formal-tree")) {
  throw "Unexpected worktree: $worktree"
}
$revisionFiles = @(git ls-files docs/content-revisions)
$coverFiles = @(git ls-files docs/content-covers)
if ($revisionFiles.Count -ne 68 -or $coverFiles.Count -ne 2) {
  throw "Unexpected archive scope"
}
git cat-file -e 0cd7357:docs/content-revisions/2021-09-16-building-a-personal-github-page/original-2021-09-16.md
if ($LASTEXITCODE -ne 0) { throw "Git recovery object missing" }
$archiveHash = (Get-FileHash -Algorithm SHA256 D:\Codes\yiyuiii.github.io\archives\workspace-before-consolidation-20260731.tar.gz).Hash
if ($archiveHash -ne "6E7CF00480B4036818165910C537271594771764577A21FF698C786D1BD87C0E") {
  throw "Cold archive hash mismatch"
}
~~~

Expected: no output and no exception。

- [ ] **Step 2: 删除两个精确 tracked 目录**

Run:

~~~powershell
git rm -r -- docs/content-revisions docs/content-covers
~~~

This is a recoverable Git deletion of two previously verified paths. Do not use a wildcard and do not touch D:\Codes\yiyuiii.github.io\archives or original-40a013.

- [ ] **Step 3: 验证没有活跃依赖**

Run:

~~~powershell
rg -n "docs/content-revisions|docs/content-covers" . --glob "!docs/superpowers/**" --glob "!AGENTS.md"
~~~

Expected: no matches，exit code 1。

- [ ] **Step 4: 运行完整 Python 回归**

Run:

~~~powershell
python -m pytest -q
~~~

Expected: `180 passed`。

- [ ] **Step 5: 验证目标 tree 数量和体积**

Run:

~~~powershell
$workingTracked = @(git ls-files)
"TRACKED_FILES=$($workingTracked.Count)"
$bytes = 0
foreach ($file in $workingTracked) {
  $bytes += (Get-Item -LiteralPath $file).Length
}
"TRACKED_MIB=$([math]::Round($bytes / 1MB, 3))"
~~~

Expected after all planned additions and deletions: 133 tracked files and less than 16 MiB. The count is `206 baseline + 2 approved design/plan documents + 3 new production-contract files - 70 process files - 8 favicon files = 133`. If the count differs, list the exact added/deleted paths and reconcile them against this plan before committing.

- [ ] **Step 6: 提交过程档案删除**

Run:

~~~powershell
git diff --cached --check
git commit -m "chore: 从正式树移除内容修订档案"
~~~

The previous git rm already staged the exact deletions.

### Task 7: 本地全量验证与 Kimi 外审

**Files:**
- Inspect: all changed files
- Inspect: .github/workflows/deploy.yml
- No planned source edits unless a verified review issue is found

- [ ] **Step 1: 运行全量 Python 测试**

Run:

~~~powershell
python -m pytest -q
~~~

Expected: `180 passed`。

- [ ] **Step 2: 运行翻译生产检查**

Run:

~~~powershell
python scripts/translation_guard.py --check --production
~~~

Expected: exit code 0 and no file changes。

- [ ] **Step 3: 使用当前 GitHub 身份运行项目同步校验**

Run:

~~~powershell
$env:GITHUB_TOKEN = gh auth token
try {
  python scripts/sync_projects.py
  if ($LASTEXITCODE -ne 0) { throw "Project sync failed" }
}
finally {
  Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue
}
~~~

Expected: exit code 0；_data/project_cache.yml remains unchanged。

- [ ] **Step 4: 运行 Git 完整性与范围检查**

Run:

~~~powershell
git diff --check origin/master...HEAD
git fsck --full
git status --short --branch
git diff --stat origin/master...HEAD
git diff --name-status origin/master...HEAD
~~~

Expected: fsck and diff check pass；worktree clean；changes only match the design and this plan。

- [ ] **Step 5: 确认正式 clone 和仓库外归档未改变**

Run:

~~~powershell
git -C D:\Codes\yiyuiii.github.io\master status --short --branch
git -C D:\Codes\yiyuiii.github.io\master rev-parse HEAD
(Get-FileHash -Algorithm SHA256 D:\Codes\yiyuiii.github.io\archives\workspace-before-consolidation-20260731.tar.gz).Hash
~~~

Expected: master clean at 0cd7357；archive SHA-256 remains 6E7CF00480B4036818165910C537271594771764577A21FF698C786D1BD87C0E。

- [ ] **Step 6: 让 Kimi 只读审阅最终 diff、测试覆盖和残留冗余**

Run:

~~~powershell
kimi -p "只读审阅当前 cleanup/formalize-repository 分支相对 origin/master 的最终 diff。绝对不要修改、创建、删除文件，不要写 Git 或远端。核对已批准设计 docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md 与实施计划 docs/superpowers/plans/2026-08-01-formalize-repository-tree.md，重点检查：历史过程目录是否完整退出当前树；11 个生产封面来源、许可、哈希与正文署名是否闭合；测试是否被削弱；favicon 删除是否有隐藏引用；README、AGENTS、content-editing 是否与现实一致；original-40a013 和 archives 是否未进入 diff。按严重度列出可执行问题；若无实质问题明确写 PASS。用中文，限 1200 字。"
~~~

Expected: PASS or a finite list of evidence-backed issues。

- [ ] **Step 7: 裁决外审意见**

If Kimi reports a substantive issue, invoke superpowers:receiving-code-review before editing. For every finding:

1. Reproduce it with an exact local command.
2. Accept and patch only findings supported by repository evidence.
3. Record rejected findings and the contradicting evidence for the PR body.
4. Rerun the narrow affected test, then Steps 1-6.
5. Commit any accepted corrections with a focused message.

Do not invoke Anthropic or DeepSeek. Ark Coding Plan is optional and is not a completion condition.

### Task 8: 推送分支、创建未合并 PR 并验证真实构建

**Files:**
- Remote branch: cleanup/formalize-repository
- Draft PR against: master
- Temporary artifacts: under $env:TEMP only

- [ ] **Step 1: 调用 GitHub 发布技能并确认提交范围**

Invoke github:yeet. Confirm that:

- the current branch is cleanup/formalize-repository;
- all intended changes are committed;
- no original-40a013 or archives path is present;
- the destination is a draft PR against master;
- no merge action is authorized.

- [ ] **Step 2: 推送 cleanup 分支**

Run:

~~~powershell
git push -u origin cleanup/formalize-repository
~~~

Expected: branch created or fast-forwarded without force。

- [ ] **Step 3: 创建 draft PR**

Create a draft PR titled `清理主分支过程档案并正式化目录结构` with these body sections:

~~~text
- 背景：40a013 原站和整理前工作区已有校验归档，本 PR 只整理 master 当前树。
- 目录变化：移除 70 个过程文件和 8 个无入边 favicon；新增 11 条生产封面来源清单。
- 测试变化：历史快照存在性断言改为生产路径、许可、SHA-256、尺寸与正文署名契约。
- 自动验证：Python、翻译、项目同步、Jekyll、站点、旧 URL、Playwright、Git fsck。
- 外审：Kimi 结论及 Codex 的接受、修正或证据反驳。
- 恢复：提交 0cd7357、original-40a013、冷备份 SHA-256。
- 明确状态：PR 保持未合并，等待用户审阅。
~~~

Expected: PR URL returned；state is OPEN and isDraft is true。

If the GitHub publishing skill cannot create the PR after the branch push, use the explicit equivalent and re-check state:

~~~powershell
gh pr create --draft --base master --head cleanup/formalize-repository --title "清理主分支过程档案并正式化目录结构" --body-file $prBodyFile
gh pr view --json url,state,isDraft,baseRefName,headRefName
~~~

Expected: `state` is `OPEN`, `isDraft` is `true`, base is `master`, and head is `cleanup/formalize-repository`.

- [ ] **Step 4: 等待 GitHub Actions**

Run:

~~~powershell
gh pr checks --watch --fail-fast
~~~

Expected: build job passes；deploy job is skipped for pull_request。

- [ ] **Step 5: 定位 PR run 与两个 site-preview 工件**

Run:

~~~powershell
$headSha = (git rev-parse HEAD).Trim()
$runs = gh run list --workflow deploy.yml --branch cleanup/formalize-repository --event pull_request --limit 5 --json databaseId,headSha,status,conclusion | ConvertFrom-Json
$prRun = $runs | Where-Object { $_.headSha -eq $headSha } | Select-Object -First 1
if (-not $prRun -or $prRun.conclusion -ne "success") { throw "Successful PR run not found" }
"PR_RUN_ID=$($prRun.databaseId)"
gh api repos/Yiyuiii/yiyuiii.github.io/actions/runs/30605824068/artifacts --jq ".artifacts[] | [.id,.name,.expired] | @tsv"
gh api "repos/Yiyuiii/yiyuiii.github.io/actions/runs/$($prRun.databaseId)/artifacts" --jq ".artifacts[] | [.id,.name,.expired] | @tsv"
~~~

Expected: both runs have a non-expired site-preview artifact。

- [ ] **Step 6: 下载基线和 PR 构建产物到隔离临时目录**

Run:

~~~powershell
$artifactRoot = Join-Path $env:TEMP "yiyuiii-formal-tree-$headSha"
if (Test-Path -LiteralPath $artifactRoot) { throw "Artifact target already exists: $artifactRoot" }
$baselineSite = Join-Path $artifactRoot "baseline"
$prSite = Join-Path $artifactRoot "pr"
New-Item -ItemType Directory -Path $baselineSite,$prSite | Out-Null
gh run download 30605824068 --name site-preview --dir $baselineSite
gh run download $prRun.databaseId --name site-preview --dir $prSite
~~~

Expected: both directories contain index.html。

- [ ] **Step 7: 比较公开文件集合和共同文件哈希**

Run:

~~~powershell
$baselinePaths = Get-ChildItem -LiteralPath $baselineSite -Recurse -File | ForEach-Object {
  $_.FullName.Substring($baselineSite.Length + 1).Replace("\", "/")
}
$prPaths = Get-ChildItem -LiteralPath $prSite -Recurse -File | ForEach-Object {
  $_.FullName.Substring($prSite.Length + 1).Replace("\", "/")
}
$pathDiff = Compare-Object $baselinePaths $prPaths
$pathDiff | Sort-Object InputObject | Format-Table -AutoSize
$baselineOnly = @($pathDiff | Where-Object SideIndicator -eq "<=" | ForEach-Object { $_.InputObject })
$prOnly = @($pathDiff | Where-Object SideIndicator -eq "=>" | ForEach-Object { $_.InputObject })
$expectedBaselineOnly = @(
  "assets/img/favicons/android-chrome-192x192-1400.webp",
  "assets/img/favicons/android-chrome-192x192-480.webp",
  "assets/img/favicons/android-chrome-192x192-800.webp",
  "assets/img/favicons/android-chrome-192x192.png",
  "assets/img/favicons/apple-touch-icon-1400.webp",
  "assets/img/favicons/apple-touch-icon-480.webp",
  "assets/img/favicons/apple-touch-icon-800.webp",
  "assets/img/favicons/apple-touch-icon.png",
  "assets/img/favicons/browserconfig.xml",
  "assets/img/favicons/favicon-16x16-1400.webp",
  "assets/img/favicons/favicon-16x16-480.webp",
  "assets/img/favicons/favicon-16x16-800.webp",
  "assets/img/favicons/favicon-16x16.png",
  "assets/img/favicons/favicon-32x32-1400.webp",
  "assets/img/favicons/favicon-32x32-480.webp",
  "assets/img/favicons/favicon-32x32-800.webp",
  "assets/img/favicons/favicon-32x32.png",
  "assets/img/favicons/mstile-150x150-1400.webp",
  "assets/img/favicons/mstile-150x150-480.webp",
  "assets/img/favicons/mstile-150x150-800.webp",
  "assets/img/favicons/mstile-150x150.png",
  "assets/img/favicons/safari-pinned-tab.svg",
  "assets/img/favicons/site.webmanifest"
)
if ($prOnly.Count -ne 0 -or @(Compare-Object $expectedBaselineOnly $baselineOnly).Count -ne 0) {
  throw "Unexpected production artifact path difference"
}
~~~

Expected: the guard passes. There are no PR-only paths, and the 23 baseline-only paths are exactly the eight deleted source assets plus 15 WebP variants that Jekyll image tooling generated for the five deleted PNG files.

Then compare hashes of every common file:

~~~powershell
$common = $baselinePaths | Where-Object { $prPaths -contains $_ }
$contentDiff = foreach ($relative in $common) {
  $before = (Get-FileHash -Algorithm SHA256 (Join-Path $baselineSite $relative)).Hash
  $after = (Get-FileHash -Algorithm SHA256 (Join-Path $prSite $relative)).Hash
  if ($before -ne $after) { $relative }
}
$contentDiff
~~~

Expected: no common-file hash differences. Any difference is a blocker until explained and approved.

- [ ] **Step 8: 对 PR 工件重跑站点与旧 URL 检查**

Run:

~~~powershell
python scripts/check_site.py --site $prSite
python scripts/check_legacy_urls.py --site $prSite
~~~

Expected: both commands pass。

- [ ] **Step 9: 对 PR 工件运行 Playwright**

Run:

~~~powershell
npm ci
$server = Start-Process -FilePath python -ArgumentList "-m","http.server","62091","--bind","127.0.0.1","--directory",$prSite -PassThru -WindowStyle Hidden
try {
  $env:SITE_URL = "http://127.0.0.1:62091"
  npm run test:browser
  if ($LASTEXITCODE -ne 0) { throw "Playwright failed" }
}
finally {
  Remove-Item Env:\SITE_URL -ErrorAction SilentlyContinue
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
~~~

Expected: all Playwright tests pass；server process is stopped。

- [ ] **Step 10: 更新 PR 证据并保持未合并**

Update the PR body or add one concise comment with:

- exact Python test count;
- translation and project sync results;
- PR run ID and artifact ID;
- path-set and common-hash comparison results;
- site, legacy URL and Playwright results;
- Kimi PASS or resolved findings;
- archive SHA-256 and master clone status.

Do not merge, enable auto-merge, delete the branch, or modify master.

### Task 9: 最终完成审计

**Files:**
- Inspect: cleanup worktree
- Inspect: formal master clone
- Inspect: GitHub PR

- [ ] **Step 1: 对照设计逐条核验成功标准**

Run:

~~~powershell
git status --short --branch
git ls-files docs/content-revisions docs/content-covers
git ls-files docs/asset-provenance.yml AGENTS.md README.md docs/content-editing.md
python -m pytest -q
git fsck --full
~~~

Expected: cleanup worktree clean；历史目录查询为空；正式文档存在；`180 passed`；fsck passes。

- [ ] **Step 2: 证明 master、original 和 archives 边界未破坏**

Run:

~~~powershell
git -C D:\Codes\yiyuiii.github.io\master status --short --branch
git -C D:\Codes\yiyuiii.github.io\master rev-parse HEAD
git -C D:\Codes\yiyuiii.github.io\master rev-parse origin/master
(Get-FileHash -Algorithm SHA256 D:\Codes\yiyuiii.github.io\archives\workspace-before-consolidation-20260731.tar.gz).Hash
~~~

Expected: master is clean and HEAD equals origin/master at 0cd7357 while PR is unmerged；archive hash unchanged。

- [ ] **Step 3: 证明 PR 仍未合并**

Run:

~~~powershell
gh pr view --json url,state,isDraft,mergeStateStatus,headRefName,baseRefName,statusCheckRollup
~~~

Expected: state OPEN，head cleanup/formalize-repository，base master，所有要求检查成功，未发生合并。

- [ ] **Step 4: 向用户提交中文审阅材料**

Report:

1. 更大目标当前推进到“cleanup PR 已创建且验证完成，等待人工合并判断”。
2. 本次删除、保留、新增和重写的精确范围。
3. 本地、Actions、构建工件、旧 URL、浏览器、Git 与外审证据。
4. 仍未完成的唯一事项是用户审阅和决定是否合并 PR。
5. PR 链接、设计、计划和必要证据链接。

Do not describe the goal as complete until all Task 9 evidence is current and the PR exists in the required unmerged state.
