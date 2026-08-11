---
title: Quantifying Resource and Point Values in Age of Innovation
uid: '202510112233'
author: Yiyu Chen
date: 2025-10-11 20:00:00 +0800
lang: en
permalink: /en/posts/age-of-innovation-resource-and-point-value-analysis/
translation_key: post-202510112233
translation_url: /posts/大创造时代-资源-分值量化计算思路/
translation_source: _posts/2025-10-11-《大创造时代》资源-分值量化计算思路.md
translation_status: current
source_hash: 9c48043b3f83d1799f753438cf20b1e88268cdeb5295a349c1df0d9e7adc4c3b
aliases: []
categories:
- Board Games
tags:
- Age of Innovation
- Board Games
from: null
math: true
thumbnail: /assets/posts/202510112233/cover-bgg-7712310-square.webp
article_cover:
  alt: The end of a five-player game of Age of Innovation
  caption: 'Cover image: [Five player game.](https://boardgamegeek.com/image/7712310/age-of-innovation), image by BoardGameGeek user Hipopotam, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/); square crop by this site, with the derivative cover distributed under the same license.'
excerpt: This article attempts to convert the different resources in Age of Innovation onto a common scale and uses a cross-round iterative model to compare their practical value during a game.
description: A cross-round valuation of Coins, Tools, Books, Scholars, Discipline advancement, Shipping, and buildings, placing exchanges and future income on one scale for medium- and long-term planning.
revisions:
- date: '2025-10-11'
  note: Initial draft
- date: '2026-07-30'
  note: Reorganized the original text and added the official game positioning and version note while preserving the original valuation and calculation conventions (revised with ChatGPT; notation corrected with Kimi)
- date: '2026-08-10'
  note: Standardized official terms for Discipline advancement, Competency tiles, and Round Score tiles; removed repetitive judgments and clarified the model's scope
- date: '2026-08-11'
  note: Aligned all 14 conversion code blocks with the prose column and applied the compact width consistently
---

## Preface

*Age of Innovation: A Terra Mystica Game* is a standalone game set in the Terra Mystica world. In terms of mechanisms familiar to players, it can also be understood as a substantial reworking of Terra Mystica. Its development flow has much in common with Gaia Project, so the approach to quantifying resources can be carried across the two games.

Resources can produce further returns across rounds, while scoring windows, action order, and player interaction change those returns. This article converts different resources to an approximate common scale and compares their value within a game. Official rules are identified explicitly; all other return judgments and rankings come from this model.

> **Source note | Positioning of the game**
>
> The [official Feuerland Spiele page](https://www.feuerland-spiele.de/spiele/age-of-innovation/) defines it as a standalone game in the Terra Mystica world. The [official Capstone Games rulebook](https://capstone-games.com/cdn/shop/files/AoI_rules_EN_V1-1_reduced.pdf?v=10451577216657094607) lists the buildings, resources, Competency tiles, and Book actions discussed in this article.
{: .article-evidence}

### Notation

This article retains the older abbreviations I used for Terra Mystica and Gaia Project. In this game, they correspond to:

- Buildings: `M` = Workshop, `TC` = Guild, `RL` = School, `AC` = University, and `SH` = Palace.
- Resource formulas: `c` = Coins, `o` = Tools, `b` = Books, `p` = Scholars, and `k` = one level of advancement in any Discipline on the Science display. The original draft called `p` priests and `k` the cult track; the rest of this article consistently uses Scholars and Discipline advancement.
- Rounds: `T1` means round 1, `T6` means round 6, and so on.

The code blocks retain compact bilingual notation. The labels 资源, 分, 魔力, 铲, 航, and 桥 mean resources, points, Power, Spades, Shipping, and Bridges.

## Converting Resources

### Coins and Tools: c & o

Using the exchange ratio of Power actions establishes these baseline units:

```text
1c = 1 点通用资源
1o = 3 点通用资源
```
{: .article-prose .article-conversion}

These are only the baseline units used for the comparisons that follow.

<span id="science-display-k"></span>

### Discipline Advancement: k

The Science display contains four Discipline tracks. This article uses `1k` for advancing one level in any Discipline. A total of 12k can bring 8 Power and 8 points; reaching 9k can produce 3c or 3 points; and each advance can also bring a one-time return of roughly 1–1.5 resources from its destination.

Using a T4 arrival at 9k followed by the 3-point reward gives:

```text
1k = 1.5 资源 + 1.4 分
```
{: .article-prose .article-conversion}

### Books: b

Books derive their value mainly from two uses.

#### Innovations

Innovations—the original draft called them “advanced tiles”—are the main outlet for Books. Taking an Innovation worth roughly 18 points for 5, 6, or 7 Books gives:

```text
1b = 3.6 分
```
{: .article-prose .article-conversion}

#### Book Actions

Surplus Books can be spent on Book actions. The official rules provide the following actions; any Coins or points to the right of the equals signs are valuations from this article's model:

- 1b = 5 Power = 2.5c;
- 1b = 2k = 3c + 2.8 points;
- 2b = 6c, so 1b = 3c;
- 2b = 3c + 2o = 9c, so 1b = 4.5c;
- 2b = 2/4/6/8 points, so 1b = 1–4 points;
- 3b = 3 Spades; because the Spades are normally used early, this can be valued as 1b = 3o = 9c.

The actions most likely to produce a positive return are:

1. 3b = 3 Spades, so 1b = 9c;
2. 1b = 2k, so 1b = 3c + 2.8 points;
3. 2b = upgrade a TC, so 1b = 4.5c.

Considering all these uses, each Book can be valued at 5 points of general-purpose resources. Exchanging 1b for 5 Power provides the fallback. A Book returns more when its free Spades or Discipline advancement can be used fully; exchanging 3b for 3 Spades reaches its highest value when all three Spades can be used promptly.

Late in the game, once the conditions for scoring 6b are in place, splitting those 6b across ordinary Book actions usually falls below the model’s scoring baseline.

> **Source note | Book actions**
>
> Page 23 of the official English rulebook lists six Book actions: exchange 1 Book for 5 Power; advance 2 levels on the Science display for 1 Book; take 6 Coins for 2 Books; upgrade a Workshop to a Guild for free for 2 Books; score 2 points per Guild for 2 Books; and perform Terraform and Build with 3 free Spades for 3 Books.
{: .article-evidence}

### Scholars: p

Combining Power conversion with the types of buildings that produce them, each Scholar is valued roughly at 5 points of general-purpose resources.

Scholars also have two broad uses.

<span id="science-display"></span>

#### Discipline Advancement

Sending a Scholar can advance 3/2/1k. The three spaces are valued as:

```text
p = 4.5/3/1.5 资源 + 4.2/2.8/1.4 分
```
{: .article-prose .article-conversion}

Early in the game, Scholars can pair with Round Score tiles to contest 3k; 2k is more suitable later. When spending a Scholar for Discipline advancement provides the valuation basis, each k can alternatively count as 2 resources.

#### Upgrading Shipping and Terraforming

Shipping and Terraforming primarily act as functional hard thresholds that must be unlocked at specific times. Their value is difficult to express accurately in resources alone, so these upgrades should first serve the overall development plan for the game.

## Baseline Position

### Starting Resources

This article selects one concrete starting setup as its baseline:

- Faction: using the Goblins, 12c + 1o + 2k = 19;
- Terrain: using Wasteland, 15c + 4o + 2b = 37;
- General starting resources: 2M + 2o + 4 Power, equivalent under this framework to 2×5 + 2×3 + 4×0.5 = 18 (each starting Workshop is valued at 5 resources, and each Power at 0.5);
- Per-round income: 1o plus 6c from a Competency tile, for a total of 9.

The first three static components total 74. After including the 9 resources produced at the start of T1, the model uses 83 resources as the starting point of the first round's Action phase, followed by another 9 resources of income in each subsequent round.

### Endgame Resources

The valuation target is this endgame position:

```text
9M 2TC 3RL 1SH 1AC 3航 3铲 4p 3桥 24k
```
{: .article-prose .article-conversion}

On the common scale, it expands to:

```text
9×5  2×14  3×28  32  23  3×9  3×13  4×5  3×3  24×2
```
{: .article-prose .article-conversion}

The total is 355 resources.

### Endgame Score

At the time, I used the game performance of high-scoring player [Sertuy](https://boardgamearena.com/player?id=92094455) as a reference and treated 205 points as an experiential anchor for a player who develops reasonably and contests first place. This number serves the approximate model below; it is not a fixed winning threshold for every player count, map, and setup.

## Iterative Resource Conversion Rate

The model approximately maps 83 resources in T1, plus 9 resources of continuing income in each round, through five cross-round conversions into 355 resources and 205 points in T6.

Let each point of resources become `x` resource points after one round of iteration while also producing `y` points. The resource side satisfies:

$$
83x^5 + 9(x^4 + x^3 + x^2 + x + 1) = 355
$$

Solving gives the iterative resource conversion rate:

$$
x \approx 1.27
$$

Within this experiential model, I further take:

$$
y \approx 0.19
$$

Each resource point therefore iterates into about 1.27 resources plus 0.19 points per round. One resource in T1 can become 3.3 resources and 1.62 points by T6, making the cross-round value of early resources quite substantial.

| Round | T1 | T2 | T3 | T4 | T5 | T6 |
| --- | --- | --- | --- | --- | --- | --- |
| Resources | 1 | 1.27 | 1.61 | 2.04 | 2.60 | 3.30 |
| Points | 0 | 0.19 | 0.43 | 0.74 | 1.12 | 1.62 |

Under the same model, the endgame resources and net points from charging Power can be written as:

| Round | T1 | T2 | T3 | T4 | T5 | T6 |
| --- | --- | --- | --- | --- | --- | --- |
| Charge 1 | 1.65+0.81 | 1.30+0.56 | 1.02+0.37 | 0.81+0.21 | 0.63+0.10 | 0.5+0 |
| Charge 2 | 3.30+0.62 | 2.60+0.12 | 2.04-0.26 | **1.61-0.57** |  |  |
| Charge 3 | 4.95+0.43 | 3.90-0.32 | **3.06-0.89** | **2.42-1.35** |  |  |
| Charge 4 | 6.60+0.24 | 5.20-0.76 | **4.08-1.52** |  |  |  |

The table uses an endgame fallback conversion of 5 general-purpose resources for 1 point. The official rules allow “5 Coins = 1 point” at game end. While buildings, Competency tiles, Book actions, or Round Score windows remain, resources usually have a higher conversion rate.

To estimate the practical value of converting resources into points during the game, this article uses a T6 opportunity that converts 2o + 3c into 3 points. With 1o = 3c, this is equivalent to 3c = 1 point. The result is:

```text
T1 的 1c 约等于 T6 的 2.72 分
```
{: .article-prose .article-conversion}

This conversion represents only the model’s marginal value for in-game comparisons.

The resulting rule is to upgrade high-value buildings near other players in T1–T2, then accept only small Power charges with a clear use in T4–T6. T3 is a transition round; judge it from the charge size, its immediate use, and the table’s net point value.

## Comparing Returns from Buildings

With a common resource scale and cross-round conversion relationship, the resource conversion rates of different buildings can be compared. Equivalent costs, equivalent outputs, and conversion rates in the table all follow the framework above.

| Base building | M | TC | RL | AC | SH |
| --- | --- | --- | --- | --- | --- |
| Base cost | 2c1o | 3c2o | 5c3o-3k | 8c5o-3k | 6c4o |
| Equivalent cost | 5 | 9 | 14-6 | 23-6 | 18 |
| Resource output | 1o | 2.5~3c | 1p+1o1k | 10+1o1k+5c | 4 Power+1o1k |
| Equivalent output | 3 | 2.5 | 10 | 20 | 7 |
| Upgrade conversion rate | 0.60 | **-0.06** | 0.54 | 0.43 | 0.25 |
| Conversion rate when upgrading from M | - | -0.06 | 0.30 | 0.37 | 0.15 |

Under this valuation, low-cost M and RL structures have positive early returns. AC supports taking an Innovation. TC’s immediate early conversion rate falls below the baseline.

Large buildings are important to the endgame structure, so they should still be considered at an appropriate time even when their immediate conversion rates are not high.

### Spades

| Cost to expand with M | 1o | 2o | 3o |
| --- | --- | --- | --- |
| Equivalent cost | 8 | 11 | 14 |
| Upgrade conversion rate | 0.38 | 0.27 | 0.21 |

Under this model, even expanding with an M that requires only 2o has a lower resource conversion rate than building an AC.

## Strength Analysis

<span id="ability-tiles"></span>

### Competency Tiles

In general, choosing resource production in T1 and T2, then gradually shifting toward points from T3 onward, produces relatively high returns under this model. Actual expansion can be constrained by terrain, distance, and Action-phase timing, so resource balance and expansion planning must still be considered together.

#### 2c + 3-Point Income

Use 2c + 3-point income as the baseline for comparing Competency tiles.

#### 1o + 1k Income

```text
1o + 1k = 4.5c + 1.4 分
```
{: .article-prose .article-conversion}

Compared with 2c + 3-point income, the break-even value of 2.5c = 1.6 points lies approximately in T3–T4:

```text
T1：1o + 1k 收入 ≥ 2c + 3 分收入
T2–T6：2c + 3 分收入 > 1o + 1k 收入
```
{: .article-prose .article-conversion}

#### 1b + 1-Power Income

```text
1b + 1 魔力 = 5.5c
```
{: .article-prose .article-conversion}

Compared with 1o + 1k income, the break-even value of 1c = 1.4 points lies approximately in T3:

```text
T1：1b + 1 魔力收入 ≥ 1o + 1k 收入
T2–T6：1o + 1k 收入 > 1b + 1 魔力收入
```
{: .article-prose .article-conversion}

#### 4-Power Action

```text
4 魔力 = 2c；当轮再产出 2c
```
{: .article-prose .article-conversion}

Under this article's framework, its return is lower than 1o + 1k income. It remains useful when Power must be replenished or another synergy applies.

#### Double Spade

```text
即时 6o = 18c；T1 终局估值 = 59.47c + 29.18 分
即时 4o = 12c；T1 终局估值 = 39.65c + 19.60 分
T1 的 1o + 1k 收入终局估值 = 38.40c + 18.19 分
T1 的 1b + 1 魔力收入终局估值 = 46.93c + 13.67 分
```
{: .article-prose .article-conversion}

Double Spade gains a few more points in the model. Early play rarely needs two consecutive terrain transformations, so its practical advantage over persistent-income tiles is smaller than the numerical gap.

#### Summary

Among resource-income Competency tiles, the T1 model ranking is:

```text
1b + 1 魔力收入 ≥ 1o + 1k 收入 ≥ 2c + 3 分收入
```
{: .article-prose .article-conversion}

Double Spade is also viable. The T1 differences among these Competency tiles are small; after T1, prioritize 2c + 3-point income.

Tools, Discipline advancement, Books, and Power all have strongly stage-dependent values, so the final choice must still serve the development plan for the whole game.

> **Source note | Competency tiles and Round Score tiles**
>
> Page 24 of the official English rulebook lists the Competency tiles and Round Score tiles compared here. The rules specify only the resources and points they provide; their relative strength in different rounds is a result of this article's model.
{: .article-evidence}

### Book Actions

#### 1b = 5 Power

3 points = 2.5c roughly meets the model’s baseline from T1 through T3 and falls below it in T4–T6.

#### 1b = 2k

3 points = 3c + 2.8 points. As long as enough Books remain to acquire an Innovation, this is a good choice in any round.

#### 2b = 6c

3 points = 3c roughly meets the baseline from T1 through T4 and falls below it in T5–T6.

#### 2b = Upgrade TC

3 points = 4.5c roughly meets the baseline from T1 through T4 and falls below it in T5–T6.

#### 2b = Points per TC

3 points = 1–4 points; consider it when there are at least three TCs.

#### 3b = 3 Spades

Early in the game, value this as 1b = 3o = 9c, well above the baseline. Late in the game, approximate it as 3 points = 1o = 3c; it falls below the baseline in T5–T6.

### Faction

#### Moles

The analysis below preserves the Mole faction board and valuation framework used by the original draft:

The 1o = 2-point exchange can consume resources needed for early development. Under direct point conversion alone, 3c = 2 points reaches this model’s baseline in T5–T6.

Early Moles primarily gain the function of 1 Shipping. Their faction ability usually scores fewer than 10 points late in the game, so crossing distance thresholds remains its main value.

When an M Round Score tile appears in T5 or T6, pair it with the M-scoring Competency tile and build many Workshops in one round. Early development can focus on compact School construction while maintaining Tool income.

> **Version note | Moles**
>
> In September 2024, Feuerland Spiele released an [official faction adjustment](https://www.feuerland-spiele.de/fileadmin/game/Age_of_Innovation/AoI_Aenderung_09_24.pdf), which was incorporated beginning with v1.2. In the revised Moles, the jumping score became `2 + X`, where `X` is the number of other players. This section therefore preserves historical analysis under the old-version model and should not be treated directly as a current v1.2 faction guide.
{: .article-evidence}

## Conclusion

This quantitative method places Coins, Tools, Books, Scholars, Discipline advancement, and action opportunities on one temporary scale. Resources gained early and invested promptly have more opportunities to appreciate across later rounds.

Actual games also depend on staged rewards, map position, player interaction, and functional thresholds. These numbers can check the resource scale and timing of a development plan; building and Competency-tile order still depend on the faction, map, and current action windows.
