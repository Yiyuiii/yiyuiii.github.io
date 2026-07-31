# 《了解游泳》封面记录

## 最终选择

- 选择日期：2026-07-30
- 最终选择：A「蛙泳练习」
- 选择理由：照片表现普通泳池中的蛙泳动作，与文章从怕水到平蛙入门的个人学习范围一致；不使用竞技赛场或宣传照。
- 生产文件：`assets/posts/202307232000/cover-breaststroke-square.webp`
- 尺寸：640 × 640
- SHA-256：`625afdeed0ea79ba667a285b893b7b4dfab6ec46d97d81c65e3007dba3d35b6a`

## 来源与权利

- 作品：[Swimming.breaststroke.arp.750pix](https://commons.wikimedia.org/wiki/File:Swimming.breaststroke.arp.750pix.jpg)
- 摄影：Adrian Pingstone（Wikimedia Commons 用户 `Arpingstone`）
- 场景：2003 年 7 月，英国 Devon 的 Brixham 一家酒店泳池
- 原图尺寸：750 × 536
- 原图 SHA-256：`85d67ce6692e00e4cb3babc34f5a0fb36c45ae6f60fdbc96fde9a67520683435`
- 权利状态：作者将作品在全球范围释入公有领域；在法律不允许完整释入公有领域的地区，作者允许任何人不附条件地将其用于任何目的

文件页和权利声明于 2026-07-30 核对。正文仍保留可见的作品链接和摄影者姓名，方便读者追溯。

## 处理

使用仓库脚本执行确定性方形裁切：

```powershell
python scripts/prepare_post_cover.py `
  --input cover-source-breaststroke.jpg `
  --output cover-breaststroke-square.webp `
  --size 640 `
  --quality 82
```

- 裁切框：`[107, 0, 643, 536]`
- 焦点：`[0.5, 0.5]`
- 输出格式：640 × 640 WebP
- 输出大小：109,354 字节
- 输出 SHA-256：`625afdeed0ea79ba667a285b893b7b4dfab6ec46d97d81c65e3007dba3d35b6a`
