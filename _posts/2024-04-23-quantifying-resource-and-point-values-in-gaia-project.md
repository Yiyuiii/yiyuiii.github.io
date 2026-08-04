---
title: Quantifying Resource and Point Values in Gaia Project
uid: '202404232233'
author: Yiyu Chen
date: 2024-04-23 20:00:00 +0800
lang: en
permalink: /en/posts/gaia-project-resource-and-point-value-analysis/
translation_key: post-202404232233
translation_url: /posts/盖亚计划-资源-分值量化计算思路/
translation_source: _posts/2024-04-23-《盖亚计划》资源-分值量化计算思路.md
translation_status: current
source_hash: c9500c7a03c435614956f65cb6e6521cb26bf8b389edaa0661eeed6cc0b07548
aliases: []
categories:
- Board Games
tags:
- Gaia Project
- Board Games
from: null
math: true
mermaid: true
thumbnail: /assets/posts/202404232233/cover-bgg-5194524-square.webp
article_cover:
  alt: An endgame Gaia Project map and scoring board
  caption: 'Cover image: [Game board Geodens vs Automa Firaks](https://boardgamegeek.com/image/5194524/gaia-project), image by BoardGameGeek user magic_erwt, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); square crop by this site.'
excerpt: This article develops an approximate way to quantify the different resources in Gaia Project as value, providing a basic macroscopic reference for planning a player's development.
description: An approximate common scale for credits, ore, knowledge, QIC, buildings, and endgame points, then checked against faction exceptions to give experience-based planning a reproducible baseline.
---

## Preface

This article develops an approximate way to quantify the different resources in the board game Gaia Project as value, providing a basic macroscopic reference for planning a player's development.

Players begin Gaia Project with a certain amount of resources and construct buildings. Those buildings produce more resources each round, and the resources are ultimately converted into victory points in various ways. Resource value is therefore generated through an iterative process across rounds. Because that process is affected by stepwise returns and interaction among players, it cannot be quantified uniformly; this article uses approximate calculations to derive a number of conclusions.

### Terms

Buildings: M = Mine, TC = Trading Station, RL = Research Lab, AC = Academy, and SH = Planetary Institute.

Resources: C = Credits, O = Ore, Q = Q.I.C., and K = Knowledge.

TN: T1 means round 1, T6 means round 6, and so on.

QIC: the shared actions costing 2, 3, or 4 Q.

The following sections calculate, in turn, how efficiently resources convert into points.

## General Relationship Between Resources and Points

Following the Power-action exchange ratios, count each c as 1 point of general-purpose resources, each o as 3 points, each q as 4 points, and—based on the later calculations—each k as 2 points. This provides the basis for calculating the relationship between endgame resources and points.

### Resource Conversion Rate per Round

Because resources placed on the board can generate more resources, first calculate the conversion rate between rounds. It is the foundation for the later calculations.

Starting resources are 4m, 15c, 8o, 4k, and 1q. The 4m are equivalent to 32 resources, giving a total of $32+15+8 \times 3+4 \times 2+1 \times 4=83$ resources.

Approximate the endgame board as 2ac, 2rl, 3tc, and 8m, plus 12 technology-track spaces = 48k. These require $6 \times 5+3 \times 14+2 \times 28+2 \times 52+48 \times 2=328$ resources. A qualifying endgame score is approximately 180 points.

In other words, the initial 83 resources become 328 resources plus 180 points through five rounds of conversion. If the 8 points for 2q are treated as 1 resource per point, 83 resources become 508 resources, producing a per-round resource conversion rate of $\sqrt[5]{508/83}=1.4$.

This calculation contains many approximations, but the result is intuitively reasonable. The upper bound for the resource conversion rate is building an m: 5 points are exchanged for 3 points of production, so TN's 5 becomes 8 in TN+1 because the 5 points on the board continue to produce income as an m. The upper bound is therefore about 1.6.

### Endgame Resource-to-Point Conversion Ratio

Not every resource is converted directly into points. Under the previous assumptions, 508 endgame resources produce 180 points, giving an endgame resource-to-point conversion ratio of $180/508=0.35$.

### Point Value of Resources

With the per-round resource conversion rate set to 1.4, 1 resource in T1 can become $1.4^5=5.4$ resources by the end of T6.

Converted into points, each resource in T1 scores 1.9 points on average by the end of the game, a substantial return.

| Round | T0 | T1 | T2 | T3 | T4 | T5 | T6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resources | 7.6 | 5.4 | 3.8 | 2.7 | 2.0 | 1.4 | 1 |
| Points | 2.63 | 1.88 | 1.34 | 0.96 | 0.69 | 0.49 | 0.35 |
| Charge 1 |  | 0.94 | 0.67 | 0.48 | 0.35 | 0.25 | 0.18 |
| Charge 2 |  | 0.88 | 0.34 | **-0.04** | **-0.31** | **-0.51** | **-0.65** |
| Charge 3 |  | 0.82 | 0.00 | -0.56 | -0.66 | -1.26 | -1.47 |
| Charge 4 |  | 0.76 | **-0.32** |  |  |  |  |

This gives a **general rule for charging Power**: early in the game, upgrade high-value buildings among clusters of other players whenever possible; after T3, using m to pick up small Power charges is one path to higher resource returns.

## Value of Q.I.C. Cubes: Q

Q derives most of its value from Q.I.C. actions. At the end of the game, it can be approximated as 1Q = 4 points.

In addition, because early resources have extremely high conversion value, the 3 resource points represented by 1O are worth more than 4 points in both T1 and T2. The early-game value of Q can therefore be estimated as roughly equal to the value of O.

Strategically, I recommend using Q for expansion early in the game and waiting until after T3 to spend it on Q.I.C. point-scoring actions.

## Value of Knowledge: K

The returns from Knowledge are stepwise overall. Knowledge is used only to advance on technology tracks, so its return is expressed entirely through track rewards. Each track space corresponds to 4k.

In addition, advancing 4 spaces awards 8 points, while 5 spaces awards 12 points plus roughly 12 points from the top-space reward. Because not every route reaches the top, approximate each 1k as carrying an additional 0.5–1 point.

**Economy track**: 2.5, 3.5, 1.5, 4.5

The Economy track suggests that 4k can produce an income of 3 resources, giving each 1k a resource conversion ratio of 0.75. With an average resource conversion efficiency of 0.4, 1k is equivalent to approximately 1.9 resources.

**Q.I.C. track**: 1Q, 1Q, 2Q, 2Q

The Q.I.C. track suggests that 4k can bring 1Q of immediate resources early, or an average of 1.5Q later. Completing the track yields about 6 resource points, so 1k is worth approximately 1.5 resources.

Advancing on the Q.I.C. track early is therefore inferior to the Economy track unless it serves a strategic purpose.

**Terraforming track**: 2O, blank, blank, blank, 2O

This is essentially a one-time conversion of 4k into 2O of immediate resources, making each 1k worth 1.5 resources. On this basis, advancing one space on the Terraforming track early is better than completing the Q.I.C. track.

The top of the Terraforming track is also highly valuable, so completing it early can be considered.

**Research track**: 1K

This is a closed loop in which 4k produces k. Because the Economy and Research tracks generally cannot be advanced side by side, and 1k is worth approximately 1.5–2 resources, the Research track's production is comprehensively weaker than the Economy track.

**Navigation track**: 1Q, Navigation 2, 1Q, Navigation 3

The 2 Navigation for 8k or 3 Navigation for 16k saves the Q that would otherwise have to be spent to extend expansion range.

Compared with the Q.I.C. track: if the game ends at Navigation 2, 8k and 1Q leaves a shortfall of 1Q, so Navigation 2 is profitable if it saves more than 1Q. If the game ends at Navigation 3, 16k and 2Q leaves a shortfall of 4Q, so Navigation 3 is profitable if it saves more than 4Q. In general, Navigation tends to be more profitable.

Overall, 1k converts to approximately 1.9 resources on the Economy track and approximately 1.5 resources on the other tracks. The additional value of 0.5–1 point can be converted using the preceding table: it can be ignored in T1 and T2, while after T3 it is worth approximately 1 resource.

When Knowledge is available to spare, high-return actions include reaching the second or fourth space of the Economy track early, advancing one space on the Terraforming track early, and advancing the Research track after T3. The specific track order should, of course, be driven more by expansion and advanced-tech planning.

## Comparing Returns from Buildings

With the unified resource conversions above, the per-round resource conversion rates of each building can be compared to obtain a priority order.

| Base building | M | TC | RL | AC | SH |
| --- | --- | --- | --- | --- | --- |
| Base cost | 2C1O | 3C2O | 5C3O | 6C6O | 6C4O |
| Equivalent cost | 5 | 9 | 14 | 24 | 18 |
| Resource output | 1O | 3~5C | 1K+~7 | 2K+~7 | 1 token+4 Power (2)+ability (6) |
| Equivalent output | 3 | 4 | 9 | 18 | 8 |
| Conversion rate from empty space | **0.60** | 0.29 | 0.32 | 0.35 | 0.25 |
| Conversion rate from m |  | 0.11 | 0.26 | **0.32** | 0.19 |
| Conversion rate from tc |  |  | **0.36** | **0.37** | 0.22 |
| Conversion rate from rl |  |  |  | **0.38** |  |

The table indicates that M is generally the best option, with value far above that of the other buildings. AC comes next, slightly ahead of RL. TC itself provides no additional resource production and therefore receives the lowest priority.

### Returns from Building M

Although m has the highest building return in the table above, it often carries additional construction costs, so expansion is not always profitable.

| Terraforming cost | 1O | 2O | 3O |
| --- | --- | --- | --- |
| Incremental resources | 3 | 6 | 9 |
| Resource conversion rate | 0.38 | 0.27 | 0.21 |

Once the Terraforming cost exceeds 1o, the resource conversion rate is already lower than building an ac from an m.

In addition, the third m on the faction board produces no resources. The third and fourth m can be considered together as having a conversion rate below 0.3. At that point, building an m is not necessarily more profitable than other buildings unless it immediately enables more m placements.

## Faction Advantages and Strategies

Each faction begins with different production and has a different Planetary Institute advantage. The resource analysis above can nevertheless be used as a common framework, producing several broad strategic deductions for reference.

### Terrans

**Talent**: approximately 26.5 points in total.

1\) Begin one space up the Gaia Project track; the 4k in T1 is valued at approximately 15 points.

2\) Power tokens used for Gaiaforming return to bowl II. Assuming that one Gaiaformer sends 6 tokens to the Gaia area per round, the talent produces 3 resources of income each round. Terrans generally Gaiaform at least one planet per round, giving 3 resources in each round from T2 through T6, worth $3 \times (1.34+0.96+0.69+0.49+0.35)=11.49$ points in total.

**Planetary Institute**: each Power token used for Gaiaforming produces 1 resource. With one Gaiaformer sending 6 tokens per round, the institute produces 6 resources per round. It would need to produce 8 resources per round to match an RL's resource conversion rate, so it is a slightly unprofitable building.

**Recommendation**: prioritize expansion and building an AC. Under resource pressure, a Planetary Institute opening is an option, followed by taking both the Navigation and Gaia Project tracks to the top.

### Lantids

**Talent**: −2C, worth approximately −4 points. They may build an m on another player's building.

The talent provides no obvious resource advantage, but it makes it easy for Lantids to obtain inexpensive expansion routes and positions for charging Power, allowing many m to be placed early.

**Planetary Institute**: gain 2k when building an m on another player's building. It breaks even if two m are built in the same round or three in the following round, and is generally very profitable.

The Lantids' ability is a major advantage, and they are also the faction whose starting resources were reduced most heavily by the designers. A Planetary Institute plus m expansion is generally recommended as the opening. To make full use of the k it produces, advance the Economy track while protecting expansion. Lantid expansion routes are still heavily constrained by technology, however, so the faction is not strong in every game.

### Ambas

**Talent**: begin one space up the Navigation track, worth approximately 15 points.

**Planetary Institute**: swap the positions of an m and the SH. Building it in T3–T4 can enable 1–2 additional federations, worth approximately 20 points. Forming a federation early can also be understood as the institute producing the resources on the federation token. The more successive federations are created with the institute, the higher its equivalent return; forming three federations in consecutive rounds is approximately the point at which it becomes more profitable than other buildings.

To make full use of both talent and institute, Ambas should expand rapidly before T3, then build the institute in T3–T4 and use the expansion footprint to form federations quickly. Their ideal track order is therefore Navigation 2 followed by high Terraforming, leaving little room to advance the Economy track early.

### Taklons

**Talent**: the Brainstone charges as 1 Power and is spent as 3 Power. Its value depends on the number of charges and varies greatly among games. Counting each charge as double resources gives approximately 20 resource points, or 20 points on average.

**Planetary Institute**: charging Power produces Power tokens. It has no explicit resource return, but can replenish satellites used for federations or help contest the satellite endgame scoring.

Overall, charging Power is reliably profitable for Taklons before T5. Their objective is to charge as much Power as possible, use those resources to generate output, and snowball. Expansion, the Economy track, and building RL or AC are all viable options.

### Firaks

**Talent**: begin with 1k income, worth approximately 12 points.

**Planetary Institute**: downgrade an RL to a TC and advance one technology track. The action can be understood simply as spending 14 resources for 8k plus one tile, a net gain of 8 or more resources.

Firaks lose value on the faction board, so their strength lies in the institute ability. The best development route is therefore to build the institute early and ensure that the ability triggers once each round. Keeping a TC or an RL on the board makes little difference; the main issue is whether all resources can be used efficiently.

To use the k produced by the institute ability efficiently while ensuring enough resources to activate it, Firaks should first advance the Economy track for the highest k conversion rate and additional resources, then advance an expansion track for further resource conversion and a way to turn resources into points. Advancing the Research track early is not recommended because it can lower the conversion rate from Knowledge into resources and points.

### Bescods

**Talent**: produce 1k less, but advance one space for free each round on a track tied for the lowest position. With good operation, this is approximately equivalent to 4k of production. The 3k production from T1 through T6 is worth $6 \times (1.88+1.34+0.96+0.69+0.49+0.35)=34.26$ points.

**Planetary Institute**: buildings on the home planet gain +1 power value. If that enables one additional federation, it can be counted simply as 12 points.

**Faction board**: the AC and SH routes are swapped, as are the incomes of TC and RL. Recalculate the building return table:

| Base building | M | TC | RL | SH | AC |
| --- | --- | --- | --- | --- | --- |
| Base cost | 2C1O | 3C2O | 5C3O | 6C4O | 6C6O |
| Equivalent cost | 5 | 9 | 14 | 18 | 24 |
| Resource output | 1O | 1K | 3~5C+~7 | 2 tokens+4 Power (2)+ability (12 points) | 2K+~7 |
| Equivalent output | 3 | 2 | 11 | 18 | 11 |
| Conversion rate from empty space | **0.60** | 0.14 | **0.39** | **0.39** | 0.29 |
| Conversion rate from m |  | -0.11 | **0.35** | **0.37** | 0.24 |

The conclusion from the table is that Bescods should never leave a TC on the board, while RL decisively outperforms AC. An expansion-focused Bescods strategy with 3 RL therefore produces the most resources.

The institute has a high conversion rate, but is profitable only if a federation can be formed immediately and the ability leads to one additional federation. The resources from forming a federation in that round can be treated as substantial output and must be calculated carefully.

**T1 opening**: income returns satisfy AC+2m ≥ RL+2m = 2RL. If resources allow, RL+4/5m is the opening with the highest ceiling.

- With an **RL opening**, upgrading from m to AC is too expensive for Bescods. They generally cannot upgrade to AC early, leading to slow k income and very few track advances, so development is limited to expansion or a one-Gaiaformer route. With an **RL opening**, avoid building a third RL before T4 whenever possible: c will overflow, while resource or action tempo may fall behind in the competition for advanced-tech tiles.
- A **Knowledge AC opening** reaches 4k of income and can freely choose expansion, Gaia Project, or Economy as the development route. Its starting resource conversion rate is nevertheless inferior to those of other factions, so its ceiling is not high. Compared with the two completed tracks typical of an RL opening, every additional completed track from a **Knowledge AC** opening is equivalent to the faction talent producing 4 points. A Research-track route therefore carries roughly 10 points of faction compensation.

### Xenos

**Talent**:

1\) Begin one space up the Q.I.C. track, worth approximately 15 points.

2\) Begin with one additional M. Including the extra cost of expansion, it is worth approximately $5 \times 2.63+?=15$ points.

**Planetary Institute**: 4 Power + 1Q = 6 points of production; spending 6 Power to form federations counts as half an additional federation, approximately 6 points. It is a building that sacrifices economy for points and is suitable for the late game.

### Gleens

**Talent**:

1\) Begin one space up the Navigation track, worth approximately 15 points.

2\) Score +2 points for colonizing green planets, worth approximately 6–16 points.

**Planetary Institute**: 4 Power + 1O = 5 points of production. Its federation token is worth 7 points of immediate resources, and its extra ability to advance an advanced-technology track is valued at approximately 10 points. Spending $(18-7)=11$ resources for $(5-3)=2$ production has a very low conversion rate, so this remains a late-game building focused more on points.

Although the Gleens' talent scores highly, their inability to spend q to extend range makes their expansion easy to constrain. If Navigation 2 limits expansion, consider the Gaia Project track to score 10 more talent points, or additionally build the right AC and trade a small amount of production value for expansion capacity.

When the right AC is built early, Gleens produce very little k and often lack the capacity to advance the Economy or high Terraforming tracks later. I therefore recommend pairing the right AC with one space on the Gaia Project track and expanding when the opportunity arises.

### Ivits

**Talent**:

1\) Begin with SH. The production changes from 2O to 4 Power + 1Q; output is unchanged, but the building has +1 power value and can form federations earlier.

2\) Each round, a Space Station adds +1 building power. Across the game this gives +7 building power, enabling one additional federation, worth approximately 18 points when valued as the 7 points and 6c of T1 resources.

Ivits naturally form more federations and can form one in T1 to use its resources fully. Compared with other factions, they also keep two more m in reserve for efficient resource conversion. This is the core of their strength.

### Hadsch Hallas

**Talent**: approximately 32 points in total. Begin one space up the Economy track, worth approximately 15 points; begin with 3c income, worth approximately 17 points.

**Planetary Institute**: spend c as Power points for resource conversions. Early in the game, it can balance resources and increase utilization; later, it can convert c into q, which is easier to turn into points and therefore improves scoring efficiency. Overall, however, it does not increase the total amount of resources.

Hadsch Hallas are a faction with a strong talent, and I do not recommend building their institute. Their high c income balances the shortage of c created by expanding with a lot of o. If they can place four m in the first two rounds, they have essentially secured first or second place.

### Geodens

**Talent**: begin one space up the Terraforming track, worth approximately 15 points.

**Planetary Institute**: gain 3k for every new planet type colonized.

The institute ability looks like an immediate return but is more appropriately treated as round income. It breaks even if two m are built in the same round or three in the following round.

Geodens depend heavily on terrain. If the institute is built first, a chain of adjacent terrain must be terraformable to obtain its return; otherwise, building it first is not recommended because expansion will stall.

If the institute is built later and produces less k, its round income—and therefore its resource conversion rate—may nevertheless be the same. On that basis, a later institute is entirely acceptable, although the faction has already lost some points through its talent.

### Bal T'aks

**Talent**: begin one space up the Gaia Project track, worth approximately 15 points. Gaiaformers can be converted into q.

**Planetary Institute**: Navigation can now be upgraded.

The talent turns the Gaia Project track into a production track of 1Q, blank, 1Q, 1Q. Completing it yields 12, the same as the Economy track. Early Q is often worth the same as O, however, and 3Q still creates a shortage of C, so the Gaia Project track is inferior to the Economy track as a source of production.

Priority among the three production tracks: Economy > Gaia Project > Research.

The advantage of completing the Gaia Project track second is that it maintains production while allowing Gaiaforming to obtain expansion terrain. It is difficult for opponents to disrupt and provides a very stable expansion route.

Bal T'aks should not upgrade to SH. In most situations, the Gaia Project and Q.I.C. tracks can completely replace the Navigation track.

### Itars

**Talent**: +1O, 1 power-token income, and spent Power tokens enter the Gaia area. With 1 token estimated at 3 resources, the talent is worth $3 \times 1.88 + 5 \times 2.63=18.79$ points.

**Planetary Institute**: during the Gaia phase, exchange four Power tokens in the Gaia area for one 4q action, repeatable multiple times. Early in the game, one such action is approximately 7 production delayed by one round, so four Power tokens convert to 12.5 resources using the 1.4 per-round conversion rate. Upgrading from m to sh costs 27 resources, while using the SH action with eight tokens in T1 converts to 25 resources. Replenishing Power tokens later through various channels—generally 1 Power token = 2 resources—also gives a high return, so I estimate the SH resource conversion rate to be far above 1.4.

**Faction board**: the Knowledge AC produces 1 additional k.

SH is the Itars' building with the highest resource conversion rate. They generally upgrade to the institute in T1, move eight or twelve tokens into Gaia, then expand or build the Knowledge AC. If the Knowledge AC is built, constructing RL afterward is not recommended because there may not be enough tech tiles available.

### Nevlas

**Talent**: 15 points.

1\) Begin one space up the Research track, worth approximately 15 points.

2\) Move one Power token from bowl III to the Gaia area to gain 1 Knowledge, converting 2 Power into 1k.

**Planetary Institute**: Power tokens count as 2 Power when spent.

**Faction board**: rl produces 2 Power.

Nevlas have two routes and are, overall, a balanced faction.

When building SH, they become a smaller version of the Taklons. Although charging Power can provide approximately 20 points, the institute gives up some resources for nothing, and its ability conflicts with the faction talent. The route is playable, but inferior to Taklons.

Without SH, Nevlas rely on converting 2 Power into 1k for their faction advantage. In T1, for example, Power can provide roughly 4k, about 8 points of additional return. In that case, I still recommend advancing the Economy track early to convert k production into resources efficiently.
