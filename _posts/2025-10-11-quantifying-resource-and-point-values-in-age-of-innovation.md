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
source_hash: 310082dcd71c2d8e33c685f728b6349568bd98628e19ba797feec8ad185fb81d
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
description: A cross-round valuation of coins, tools, books, scholars, science, navigation, and buildings, placing immediate exchanges and future production on one scale for medium- and long-term planning.
revisions:
- date: '2025-10-11'
  note: Initial draft
- date: '2026-07-30'
  note: Reorganized the original text and added the official game positioning and version note while preserving the original valuation and calculation conventions (revised with ChatGPT; notation corrected with Kimi)
---

## Preface

*Age of Innovation: A Terra Mystica Game* is a standalone game set in the Terra Mystica world. In terms of mechanisms familiar to players, it can also be understood as a substantial reworking of Terra Mystica. Its development flow has much in common with Gaia Project, so the approach to quantifying resources can be carried across the two games.

Resource values keep iterating from round to round while also being affected by staged rewards, action windows, and player interaction. They are difficult to describe precisely with a single formula. This article attempts to convert different resources onto an approximate common scale and then compare their practical value during a game. Unless a statement is explicitly identified as an official rule, terms such as “profitable,” “unprofitable,” and the relative rankings below refer to the results under this article's valuation framework, not fixed prices supplied by the game.

> **Source note | Positioning of the game**
>
> The [official Feuerland Spiele page](https://www.feuerland-spiele.de/spiele/age-of-innovation/) defines it as a standalone game in the Terra Mystica world. The [official Capstone Games rulebook](https://capstone-games.com/cdn/shop/files/AoI_rules_EN_V1-1_reduced.pdf?v=10451577216657094607) lists the buildings, resources, ability tiles, and Book actions discussed in this article.
{: .article-evidence}

### Notation

This article retains the older abbreviations I used for Terra Mystica and Gaia Project. In this game, they correspond to:

- Buildings: `M` = Workshop, `TC` = Guild, `RL` = School, `AC` = University, and `SH` = Palace.
- Resources: `C` = Coins, `O` = Tools, `B` = Books, `P` = Scholars (the original draft also called them priests), and `K` = spaces on the Science display (called the cult track in the original draft).
- Rounds: `T1` means round 1, `T6` means round 6, and so on.

Because literal formulas must stay identical across the bilingual pair, their Chinese labels are retained: 资源 means resources, 分 means points, 魔 means Power, 产 means income, 铲 means Spades, 航 means Shipping, and 桥 means Bridges. Each formula's surrounding English text also states its interpretation.

## Converting Resources

### Coins and Tools: C & O

Using the exchange ratio of Power actions, this article counts each Coin as 1 point of general-purpose resources and each Tool as 3 points:

```text
1c = 1 点通用资源
1o = 3 点通用资源
```
{: .article-prose .article-conversion}

This is only the baseline unit used for the comparisons that follow.

### Science Display: K

Returns from the Science display are relatively direct: 12k can bring 8 Power and 8 points; reaching 9k can produce 3c or 3 points; and each space on the display also brings a one-time return of roughly 1–1.5 resources in the corresponding round.

If reaching 9k in T4 and taking 3 points is used as the reference, the approximation can be written as:

```text
1k = 1.5 资源 + 1.4 分
```

In English, the retained formula values 1k as 1.5 resources plus 1.4 points.

### Books: B

Books derive their value mainly from two uses.

#### Innovations

Innovations—the original draft called them “advanced tiles”—are the main outlet for Books. Taking an Innovation worth roughly 18 points for 5, 6, or 7 Books gives the coarse estimate:

```text
1b = 3.6 分
```

That is, one Book is approximated as 3.6 points.

#### Book Actions

Surplus Books can be spent on Book actions. The official rules provide the following actions; any Coins or points to the right of the equals signs are valuations from this article's model:

- `1b = 5 魔 = 2.5c`
- `1b = 2k = 3c + 2.8 分`
- `2b = 6c`, so `1b = 3c`
- `2b = 3c2o = 9c`, so `1b = 4.5c`
- `2b = 2/4/6/8 分`, so `1b = 1–4 分`
- `3b = 3 铲`; because the Spades are normally used early, this can be valued as `1b = 3o = 9c`

The actions most likely to produce a positive return are:

1. `3b = 3 铲`, so `1b = 9c`
2. `1b = 2k`, so `1b = 3c + 2.8 分`
3. `2b = 升级 TC`, so `1b = 4.5c`

Considering all these uses together, each Book can be valued at 5 points of general-purpose resources. This does not conflict with the valuations of particular Book actions above: `1b = 5 魔` is only the fallback exchange. When free Spades or progress on the Science display can be used fully, a Book's practical return can be much higher. In particular, `3b = 3 铲` has very high practical value when all the free Spades can be used.

Late in the game, once the conditions for converting 6b into points are in place, breaking those 6b apart for ordinary Book actions is almost always a loss under this article's framework.

> **Source note | Book actions**
>
> Page 23 of the official English rulebook lists six Book actions: exchange 1 Book for 5 Power; advance 2 spaces on the Science display for 1 Book; take 6 Coins for 2 Books; upgrade a Workshop to a Guild for free for 2 Books; score 2 points per Guild for 2 Books; and perform Terraform and Build with 3 free Spades for 3 Books.
{: .article-evidence}

### Scholars: P

Combining Power conversion with the types of buildings that produce them, each Scholar is valued roughly at 5 points of general-purpose resources.

Scholars also have two broad uses.

#### Science Display

Sending a Scholar can advance `3/2/1k`, corresponding to:

```text
p = 4.5/3/1.5 资源 + 4.2/2.8/1.4 分
```

The three alternatives respectively provide 4.5, 3, or 1.5 resources plus 4.2, 2.8, or 1.4 points.

Early in the game, Scholars can therefore be paired with round rewards to contest the 3k space, while the 2k space is better left for later. When the advance gained by sacrificing a Scholar is used as the valuation basis, each k can alternatively be counted as 2 resources.

#### Upgrading Shipping and Terraforming

Shipping and Terraforming primarily act as functional hard thresholds that must be unlocked at specific times. Their value is difficult to express accurately in resources alone, so these upgrades should first serve the overall development plan for the game.

## Baseline Position

### Starting Resources

This article selects one concrete starting setup as its baseline:

- Faction: using the Goblins, `12c + 1o + 2k = 19`
- Terrain: using Wasteland, `15c + 4o + 2b = 37`
- General starting resources: `2m + 2o + 4 魔力`, equivalent under this framework to `2×5 + 2×3 + 4×0.5 = 18` (each of the two starting Workshops is valued at 5 resources, and each Power at 0.5)
- Per-round income: `1o + 特权片 6c = 9`

The first three static components total 74. After including the 9 resources produced at the start of T1, the model uses 83 resources as the starting point of the first round's Action phase, followed by another 9 resources of income in each subsequent round.

### Endgame Resources

The following endgame position serves as the valuation target:

```text
9m 2tc 3rl sh ac 3航 3铲 4p 3桥 24k
```

In this retained notation, 航 means Shipping upgrades, 铲 means Spades, and 桥 means Bridges.

Expanded on the common scale used here:

```text
9×5  2×14  3×28  32  23  3×9  3×13  4×5  3×3  24×2
```

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

Each resource point therefore iterates approximately into `1.27 资源 + 0.19 分` per round. One resource in T1 can become 3.3 resources and 1.62 points by T6, making the cross-round value of early resources quite substantial.

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

The table uses the endgame fallback conversion of 5 general-purpose resources for 1 point. The official rule “5 Coins = 1 point” is likewise only a poor endgame conversion and does not represent a resource's practical value during the game. As long as buildings, ability tiles, Book actions, or round-scoring windows remain available, resources can usually achieve a higher conversion rate.

To estimate the practical value of converting resources into points during the game, this article uses a T6 opportunity that can still convert `2o3c` into 3 points. With `1o = 3c`, this is equivalent to `3c = 1 分`, which gives:

```text
T1 的 1c ≈ T6 的 2.72 分
```

In English: one Coin in T1 is approximately equivalent to 2.72 points in T6.

This is not an official endgame conversion rule. It is the marginal value used by this article to compare opportunities during the game.

The resulting general rule for charging Power is to upgrade high-value buildings near other players whenever possible before T3, then take smaller Power charges after T3. This is one way to improve resource returns.

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

Under this valuation, building inexpensive M and RL early is profitable; AC can be built when an Innovation is needed. TC is a severe loss early in the game.

Large buildings are important to the endgame structure, so they should still be considered at an appropriate time even when their immediate conversion rates are not high.

### Spades

| Cost to expand with M | 1o | 2o | 3o |
| --- | --- | --- | --- |
| Equivalent cost | 8 | 11 | 14 |
| Upgrade conversion rate | 0.38 | 0.27 | 0.21 |

Under this model, even expanding with an M that requires only 2o has a lower resource conversion rate than building an AC.

## Strength Analysis

### Ability Tiles

In general, choosing resource production in T1 and T2, then gradually shifting toward points from T3 onward, produces relatively high returns under this model. Actual expansion can be constrained by terrain, distance, and Action-phase timing, so resource balance and expansion planning must still be considered together.

#### 2c and 3-Point Income

Use `2c + 3 分` as the baseline for comparisons among ability tiles.

#### 1o1k Income

```text
1o1k = 4.5c + 1.4 分
```

That is, the 1o1k income is valued as 4.5c plus 1.4 points.

Compared with `2c3 分产`, the break-even round for `2.5c = 1.6 分` lies approximately in T3–T4. This gives:

```text
T1：1o1k 产 ≥ 2c3 分产
T1 之后：2c3 分产 > 1o1k 产
```

In English: 1o1k income is at least as valuable as 2c plus 3-point income in T1; after T1, the 2c plus 3-point income is more valuable.

#### 1b and 1-Power Income

```text
1b1 魔 = 5.5c
```

That is, the income of 1b plus 1 Power is valued as 5.5c.

Compared with `1o1k 产`, the break-even round for `1c = 1.4 分` lies approximately in T3. This gives:

```text
T1：1b1 魔产 ≥ 1o1k 产
T1 之后：1o1k 产 > 1b1 魔产
```

In English: 1b plus 1-Power income is at least as valuable as 1o1k income in T1; after T1, 1o1k income is more valuable.

#### 4-Power Action

```text
4 魔 = 2c，并附带当回合产出 2c
```

The retained line says that 4 Power equals 2c and also produces another 2c in the same round.

Under this article's framework, it is strictly weaker than `1o1k 产` and is suitable only when Power must be replenished or an additional synergy can be created.

#### Double Spade

```text
即时 6o = 18c，T1 终局价值 = 59.47c + 29.18 分
即时 4o = 12c，T1 终局价值 = 39.65c + 19.60 分
T1 1o1k 产的终局价值 = 38.40c + 18.19 分
T1 1b1 魔产的终局价值 = 46.93c + 13.67 分
```

In English, the four lines give the T1 endgame values of an immediate 6o as 59.47c plus 29.18 points, an immediate 4o as 39.65c plus 19.60 points, 1o1k income as 38.40c plus 18.19 points, and 1b plus 1-Power income as 46.93c plus 13.67 points.

Double Spade theoretically gains a few more points, but using 4o to terraform two spaces in succession is not usually urgent early in the game. Its practical advantage over persistent-production tiles is therefore not as large as the numbers suggest.

#### Summary

Among resource-producing ability tiles, the T1 ranking is:

```text
1b1 魔产 ≥ 1o1k 产 ≥ 2c3 分产
```

That is, in T1, 1b plus 1-Power income ranks at least as high as 1o1k income, which in turn ranks at least as high as 2c plus 3-point income.

Double Spade is also an option, and the differences among these ability tiles in T1 are small. After T1, only `2c3 分产` should normally receive priority.

Tools, the Science display, Books, and Power all have strongly stage-dependent values, so the final choice must still serve the development plan for the whole game.

> **Source note | Ability tiles and round scoring**
>
> Page 24 of the official English rulebook lists the ability tiles and round-scoring tiles compared here. The rules specify only the resources and points they provide; their relative strength in different rounds is an analytical result of this article's model.
{: .article-evidence}

### Book Actions

#### 1b = 5 Power

`3 分 = 2.5c` can generally be exchanged in T1–T3 and becomes a slight loss after T4.

#### 1b = 2k

`3 分 = 3c + 2.8 分`. As long as enough Books remain to acquire an Innovation, this is a good choice in any round.

#### 2b = 6c

`3 分 = 3c` can generally be exchanged in T1–T4 and becomes a slight loss after T5.

#### 2b = Upgrade TC

`3 分 = 4.5c` can generally be exchanged in T1–T4 and becomes a slight loss after T5.

#### 2b = Points per TC

`3 分 = 1–4 分`; consider it when there are at least three TCs.

#### 3b = 3 Spades

Early in the game, this can be valued as `1b = 3o = 9c` and is highly profitable. Late in the game, it can instead be approximated as `3 分 = 1o = 3c`, becoming a slight loss after T5.

### Faction

#### Moles

The analysis below preserves the Mole faction board and valuation framework used by the original draft:

`1o = 2 分` can easily become a point-scoring trap. If only direct point conversion is considered, `3c = 2 分` does not become profitable until after T5.

The early-game Moles can therefore be treated essentially as having 1 Shipping. Their faction ability usually scores fewer than 10 points even late in the game, and its value is more functional than numerical.

A more advantageous use is to concentrate a large wave of Workshops in a single round when an M round-scoring tile appears in T5 or T6, paired with the M-scoring ability tile. The early game can accordingly focus on compact expansion through RL while also maintaining Tool income.

> **Version note | Moles**
>
> In September 2024, Feuerland Spiele released an [official faction adjustment](https://www.feuerland-spiele.de/fileadmin/game/Age_of_Innovation/AoI_Aenderung_09_24.pdf), which was incorporated beginning with v1.2. In the revised Moles, the jumping score became `2 + X`, where `X` is the number of other players. This section therefore preserves historical analysis under the old-version model and should not be treated directly as a current v1.2 faction guide.
{: .article-evidence}

## Conclusion

The purpose of this quantitative method is to place Coins, Tools, Books, Scholars, Science spaces, and action opportunities temporarily on one scale, making it easier to compare several candidate plans within a game. Its clearest implication is that resources obtained earlier, and put into development promptly, have more opportunities to keep appreciating over subsequent rounds.

Actual games still include staged rewards, map position, player interaction, and functional thresholds, so decisions should not be made mechanically from the tables alone. The numbers here are better suited to checking whether a development plan is broadly reasonable than to prescribing a single building or ability-tile order across factions and maps.
