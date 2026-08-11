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
source_hash: ebb5ac6ad65549d5aa18976a2b65e8b8987c7bb780829ee9620ba216f9931726
aliases: []
categories:
- Board Games
tags:
- Gaia Project
- Board Games
from: null
math: true
thumbnail: /assets/posts/202404232233/cover-bgg-5194524-square.webp
article_cover:
  alt: An endgame Gaia Project map and scoring board
  caption: 'Cover image: [Game board Geodens vs Automa Firaks](https://boardgamegeek.com/image/5194524/gaia-project), image by BoardGameGeek user magic_erwt, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); square crop by this site.'
excerpt: This article develops an approximate way to quantify the different resources in Gaia Project as value, providing a basic macroscopic reference for planning a player's development.
description: An approximate common scale for Credits, Ore, Knowledge, Q.I.C., buildings, and victory points, then checked against faction exceptions to give experience-based planning a reproducible baseline.
revisions:
- date: '2024-04-23'
  note: Initial publication
- date: '2026-08-10'
  note: Standardized official building, resource, and technology-track terminology; separated rules concepts from the author's valuation model; and edited dense passages (with Codex assistance)
---

## Preface

This article develops an approximate common scale for resources and victory points in Gaia Project. It is intended as a baseline for comparing development choices across rounds.

Players begin with resources, use them to build buildings, receive further income, and eventually convert development into victory points. Track thresholds, map conditions, round scoring, and player interaction all change the realized return. The calculations below are therefore the author's valuation model. They do not alter the official rules and should be recalculated when the game state departs from the stated assumptions.

The terminology follows the [official Capstone Games rulebook](https://capstone-games.com/wp-content/uploads/2020/09/Gaia-Project-Rules-CG.0609sm2.pdf).

### Terms and Model Symbols

- **Buildings**: `M` = Mine, `TS` = Trading Station, `RL` = Research Lab, `AC` = Academy, and `PI` = Planetary Institute.
- **Resources**: `C` = Credits, `O` = Ore, `K` = Knowledge, and `Q` = Q.I.C.
- **Power and Power tokens**: Power is the amount spent on actions and conversions. Power tokens move among the three bowls or the Gaia area. “Charge” means moving Power tokens according to the official Power cycle.
- **Victory points**: “points” in calculation results means victory points unless stated otherwise.
- **Rounds**: `R1` through `R6` are the six rounds; `R0` denotes the model's initial-state reference value.
- **General resource point**: a custom unit used only in this article to compare unlike resources, with baselines of `1C = 1`, `1O = 3`, and `1Q = 4`; the value of `1K` is estimated later. It is not a component or official score.
- **Resource growth factor**: the multiplier used to estimate how resources carried forward generate more resources in later rounds.
- **Resource return rate**: output divided by the resources committed to a building or action under the model's assumptions.
- **Technology tracks**: Terraforming, Navigation, Artificial Intelligence, Gaia Project, Economy, and Science follow the official names.

The following sections use these symbols consistently. `Q.I.C.` actions refer to shared actions whose official costs are paid in Q.I.C.

## General Relationship Between Resources and Points

Following the Power-action exchange ratios, use `1C = 1`, `1O = 3`, and `1Q = 4` general resource points. The later Knowledge calculation assigns `1K` a provisional value. This common unit supports the comparisons below.

### Resource Growth Factor

Buildings and technology-track advances turn current resources into later income. The model first estimates a round-to-round growth factor and then uses it in the later calculations.

Starting assets are 4M, 15C, 8O, 4K, and 1Q. The 4M are valued at 32 general resource points, giving $32+15+8 \times 3+4 \times 2+1 \times 4=83$ in total.

Approximate the endgame board as `2AC + 2RL + 3TS + 8M`, plus 12 technology-track spaces valued as `48K`. These require $6 \times 5+3 \times 14+2 \times 28+2 \times 52+48 \times 2=328$ general resource points. A representative qualifying score is approximately 180 victory points.

Across five growth intervals, the model combines 328 points of developed resources with 180 victory points, for a total comparable value of 508. The implied resource growth factor is $\sqrt[5]{508/83}=1.4$ per round.

This calculation is deliberately coarse. Building an `M` gives a useful upper reference: 5 general resource points create 3 points of income. Assets worth 5 in `Rn` are therefore worth 8 in `R(n+1)`, giving an upper reference near 1.6.

### Endgame Resource Scoring Rate

Under the preceding assumptions, 508 points of total comparable value correspond to 180 victory points. The endgame resource scoring rate is therefore $180/508=0.35$.

### Point Value of Resources

With the resource growth factor set to 1.4, 1 general resource point in `R1` can become $1.4^5=5.4$ by the end of `R6`.

After applying the endgame scoring rate, each general resource point held in `R1` is worth about 1.9 victory points by the end of the game.

| Round | R0 | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resources | 7.6 | 5.4 | 3.8 | 2.7 | 2.0 | 1.4 | 1 |
| Victory-point estimate | 2.63 | 1.88 | 1.34 | 0.96 | 0.69 | 0.49 | 0.35 |
| Charge 1 |  | 0.94 | 0.67 | 0.48 | 0.35 | 0.25 | 0.18 |
| Charge 2 |  | 0.88 | 0.34 | **-0.04** | **-0.31** | **-0.51** | **-0.65** |
| Charge 3 |  | 0.82 | 0.00 | -0.56 | -0.66 | -1.26 | -1.47 |
| Charge 4 |  | 0.76 | **-0.32** |  |  |  |  |

This table gives a practical charging rule. Early in the game, upgrading high-value buildings near several opponents can justify larger charges. From `R3` onward, accept only small charges to control the victory-point cost.

## Value of Q.I.C. Cubes: Q

Q derives most of its value from Q.I.C. actions. Near the end of the game, the model uses `1Q = 4` victory points.

In addition, because early resources have extremely high conversion value, the 3 resource points represented by `1O = 3` are worth more than 4 points in both `R1` and `R2`. The early-game value of Q can therefore be estimated as roughly equal to the value of O.

The model therefore favors using Q to extend expansion range early, then shifting toward scoring Q.I.C. actions after `R3`.

## Value of Knowledge: K

Knowledge produces threshold-based returns because it advances technology tracks in `4K` steps. Its value comes from the rewards, access, and scoring enabled by each advance.

Advancing four spaces awards 8 victory points. Advancing five spaces awards 12 victory points plus roughly 12 more from the top-space reward. Since many routes stop short of the top, the model assigns each 1K an additional 0.5–1 victory point.

**Economy track**: 2.5, 3.5, 1.5, 4.5

The Economy track suggests that 4K can produce 3 points of income, so each 1K has a resource return rate of 0.75. At an average conversion efficiency of 0.4, 1K is equivalent to approximately 1.9 general resource points.

**Artificial Intelligence track**: 1Q, 1Q, 2Q, 2Q

The Artificial Intelligence track gives 1Q immediately for an early 4K advance, or an average of 1.5Q for later advances. Completing the track yields about 6 general resource points per 4K step, so 1K is worth approximately 1.5 general resource points.

On raw income, an early Artificial Intelligence advance returns less than an Economy advance. Range, Q.I.C. actions, and advanced technology may still justify it.

**Terraforming track**: 2O, blank, blank, blank, 2O

This is approximately a one-time conversion of `4K → 2O`, so each 1K is worth 1.5 general resource points. Under the same assumptions, the first Terraforming advance gives a higher immediate return than completing the Artificial Intelligence track.

The top of the Terraforming track is also highly valuable, so completing it early can be considered.

**Science track**: 1K

This is a loop in which `4K` produces K. Economy and Science often compete for the same advances, and the model values `1K ≈ 1.5–2` general resource points. Economy therefore gives the stronger direct income return.

**Navigation track**: 1Q, Navigation 2, 1Q, Navigation 3

Reaching Navigation 2 for 8K or Navigation 3 for 16K saves Q that would otherwise be spent to extend expansion range.

Compared with the Artificial Intelligence track:

- Ending at Navigation 2 costs `8K + 1Q`. It pays off when the extra range saves more than `1Q`.
- Ending at Navigation 3 costs `16K + 2Q`. It pays off when the extra range saves more than `4Q`.

Navigation usually produces the higher practical return when range directly opens expansion.

Overall, the model converts `1K ≈ 1.9` general resource points on the Economy track and approximately 1.5 on the other tracks. The extra 0.5–1 victory point per K can be ignored for `R1`–`R2` planning and counted as roughly 1 general resource point after `R3`.

When Knowledge is available, high-return options include reaching the second or fourth Economy space early, taking the first Terraforming advance early, and advancing Science after `R3`. Expansion access and advanced-technology plans still determine the final order.

## Comparing Building Returns

The common resource unit allows the model to compare the resource return rate of each building.

| Base building | M | TS | RL | AC | PI |
| --- | --- | --- | --- | --- | --- |
| Base cost | 2C1O | 3C2O | 5C3O | 6C6O | 6C4O |
| Equivalent cost | 5 | 9 | 14 | 24 | 18 |
| Resource output | 1O | 3~5C | 1K+~7 | 2K+~7 | 1 Power token + 4 Power (2) + ability (6) |
| Equivalent output | 3 | 4 | 9 | 18 | 8 |
| Resource return rate from no building | **0.60** | 0.29 | 0.32 | 0.35 | 0.25 |
| Resource return rate from M |  | 0.11 | 0.26 | **0.32** | 0.19 |
| Resource return rate from TS |  |  | **0.36** | **0.37** | 0.22 |
| Resource return rate from RL |  |  |  | **0.38** |  |

Under the model, M gives the highest direct return. AC follows slightly ahead of RL, while TS has the lowest standalone return because its value depends heavily on later upgrades, discounts, and positioning.

### Returns from M

M has the highest direct return in the table, but Terraforming and range costs can reduce the value of expansion.

| Terraforming cost | 1O | 2O | 3O |
| --- | --- | --- | --- |
| Incremental resources | 3 | 6 | 9 |
| Resource return rate | 0.38 | 0.27 | 0.21 |

Once the Terraforming cost exceeds `1O`, the resource return rate falls below upgrading an M to an AC.

The third M on the faction board also produces no income. Treating the third and fourth M together gives a resource return rate below 0.3. Their value then depends on whether they unlock further placements, scoring, range, or federation geometry.

## Faction Advantages and Strategies

Each faction has a different starting economy and Planetary Institute ability. The common scale above provides a baseline, while the calculations below retain the author's assumptions and estimates.

### Terrans

**Faction ability**: approximately 26.5 points in total.

1\) Begin one space up the Gaia Project track; the `R1` value of `4K` is approximately 15 points.

2\) Power tokens used for Gaiaforming return to bowl II. If one Gaiaformer sends 6 tokens to the Gaia area each round, this ability produces 3 general resource points of income. Assuming at least one Gaia Project per round, the `R2`–`R6` value is $3 \times (1.34+0.96+0.69+0.49+0.35)=11.49$ victory points.

**Planetary Institute**: each Power token used for Gaiaforming converts into 1 general resource point. Six tokens per round yield 6 points of income. Matching the modeled resource return rate of an RL would require 8, so the PI has a slightly lower direct return under these assumptions.

**Recommendation**: prioritize expansion and an AC. A PI opening can stabilize a resource-constrained position, followed by completing Navigation and Gaia Project when the map supports that route.

### Lantids

**Faction ability**: the faction starts with `2C` less than the baseline, worth approximately −4 points, and may build an M on another player's building.

The ability opens inexpensive expansion routes and charging positions, allowing several M to be placed early. Its value depends on other players' placement.

**Planetary Institute**: gain `2K` when building an M on another player's building. The model reaches break-even with two such placements in the same round or three in the following round.

The model favors an early PI followed by M expansion. Advancing Economy helps convert the additional K into resources while expansion remains available. Map geometry and technology still constrain the route, so its return varies sharply by game.

### Ambas

**Faction ability**: begin one space up the Navigation track, worth approximately 15 points.

**Planetary Institute**: swap the positions of an M and the PI. Building it in `R3–R4` can enable one or two additional federations, valued at approximately 20 points. An early federation also realizes the immediate resources on its federation token. The modeled return rises with consecutive federation actions; three federations in successive rounds is roughly the threshold at which the PI outperforms the other buildings.

To use both advantages, Ambas can expand before `R3`, build the PI in `R3–R4`, and turn that footprint into federations. Navigation 2 followed by higher Terraforming supports this sequence, with limited early room for Economy.

### Taklons

**Faction ability**: the Brainstone charges as 1 Power and is spent as 3 Power. Its value depends on the number of charging opportunities. Counting each charge as double resources gives approximately 20 general resource points, or about 20 victory points on average.

**Planetary Institute**: charging Power produces Power tokens. The new tokens can replace federation satellites or contribute to the satellite endgame scoring.

The model treats charging before `R5` as a positive return. Taklons can turn those resources into expansion, Economy advances, an RL, or an AC, depending on the available conversions.

### Firaks

**Faction ability**: begin with 1K income, worth approximately 12 points.

**Planetary Institute**: downgrade an RL to a TS and advance one technology track. The model treats the action as spending 14 general resource points for `8K + 1` technology tile, giving a net gain above 8 points.

The PI action provides the main modeled advantage. Building the PI early and triggering it once per round captures that value. Whether a TS or RL remains on the board matters less than whether the resulting resources can be spent efficiently.

Economy gives the highest modeled return on the K produced by the PI action and supplies resources to repeat it. An expansion track can follow. Early Science reduces the efficiency with which this model converts Knowledge into resources and victory points.

### Bescods

**Faction ability**: produce 1K less each round, then advance one space for free on a technology track tied for the lowest position. With effective development, this is approximately equivalent to 4K of production. The 3K production from R1 through R6 is worth $6 \times (1.88+1.34+0.96+0.69+0.49+0.35)=34.26$ points.

**Planetary Institute**: buildings on home-type planets gain 1 federation power value. If that enables one additional federation, the model assigns it 12 points.

**Faction board**: the AC and PI upgrade paths are swapped, and the TS and RL incomes exchange positions. Applying the article's model gives this table:

| Base building | M | TS | RL | PI | AC |
| --- | --- | --- | --- | --- | --- |
| Base cost | 2C1O | 3C2O | 5C3O | 6C4O | 6C6O |
| Equivalent cost | 5 | 9 | 14 | 18 | 24 |
| Resource output | 1O | 1K | 3~5C+~7 | 2 Power tokens + 4 Power (2) + ability (12 points) | 2K+~7 |
| Equivalent output | 3 | 2 | 11 | 18 | 11 |
| Resource return rate from no building | **0.60** | 0.14 | **0.39** | **0.39** | 0.29 |
| Resource return rate from M |  | -0.11 | **0.35** | **0.37** | 0.24 |

Under these assumptions, keeping a TS has a low resource return, while an RL returns more than an AC. An expansion route supported by three RLs therefore has a high resource ceiling. Round scoring, technology tiles, and available actions can change the choice.

The PI's return depends on its federation power value. The benefit is realized when it enables an immediate federation and ultimately produces one additional federation token. The immediate resources on that token also belong in the calculation.

**R1 opening**: modeled income returns satisfy `AC + 2M ≥ RL + 2M = 2RL`. If resources allow, `RL + 4/5M` has the highest ceiling.

- **RL opening**: upgrading from an M through to an AC is expensive, so early K income and technology-track advances develop slowly. Expansion or one Gaia Project advance usually carries the route. Building a third RL before R4 can overflow C and weaken the resources or action tempo needed to contest advanced technology tiles.
- **Knowledge AC opening**: 4K of income supports expansion, Gaia Project, or Economy routes. Its early resource return is lower and its ceiling remains limited. Compared with an RL opening that completes two tracks, each additional completed track from a Knowledge AC opening makes the faction ability worth about 4 more points. A Science route therefore carries roughly 10 points of faction compensation.

### Xenos

**Faction ability**:

1\) Begin one space up the Artificial Intelligence track, worth approximately 15 points.

2\) Begin with one additional M. Including expansion's additional costs, the estimate is $5 \times 2.63+?=15$ points; the question mark records map-dependent value outside the fixed calculation.

**Planetary Institute**: 4 Power + 1Q equals about 6 points of production. Forming federations with 6 Power is approximated as half an additional federation, worth about 6 points. The building converts economy into victory points and usually fits the late game.

### Gleens

**Faction ability**:

1\) Begin one space up the Navigation track, worth approximately 15 points.

2\) Score +2 points for colonizing green planets, worth approximately 6–16 points.

**Planetary Institute**: 4 Power + 1O equals about 5 points of production. Its federation token is valued at 7 points of immediate resources, and access to an additional advanced technology tile is valued at approximately 10 points. Spending $(18-7)=11$ resources for $(5-3)=2$ production gives a low resource return rate, so the PI usually serves as a late-game scoring building.

Gleens can score strongly from their faction ability, while their inability to spend Q to extend range constrains expansion. If Navigation 2 is insufficient, the Gaia Project track can trigger about 10 more points from the ability. The right AC can also exchange a small amount of production for expansion capacity, and the two routes can be combined.

An early right AC reduces K income and makes it difficult to support both Economy and higher Terraforming. Pairing it with one Gaia Project advance creates an additional expansion route.

### Ivits

**Faction ability**:

1\) Begin with the PI. The income changes from 2O to 4 Power + 1Q. Total modeled output is similar, while federation power value increases by 1 and enables earlier federations.

2\) Each round, a Space Station adds 1 federation power value. Across the game this can add 7 power and enable one more federation, valued at approximately 18 points from the R1 reward of 7 points plus 6C.

Ivits can form more federations and use an R1 federation reward immediately. Two additional M in reserve also support efficient resource conversion. These advantages drive their early strength.

### Hadsch Hallas

**Faction ability**: approximately 32 points in total. The initial Economy advance is worth about 15 points, and the additional 3C income is worth about 17.

**Planetary Institute**: spend C as Power for resource conversions. Early use balances the resource mix; later use converts C into Q that can score efficiently. The model treats this as improved resource composition and assigns no additional resource creation.

Hadsch Hallas already have a strong starting economy, so the PI usually receives low priority. Their high C income balances the C shortage created by O-heavy expansion. Placing four M in the first two rounds generally creates a leading economy.

### Geodens

**Faction ability**: begin one space up the Terraforming track, worth approximately 15 points.

**Planetary Institute**: gain 3K for every new planet type colonized.

The model treats the PI ability as round income. Colonizing two new planet types in the construction round, or three by the following round, usually covers the upgrade cost.

The return depends on the map's distribution of planet types. An early PI needs successive colonies of different types; without suitable targets, expansion stalls.

A later PI produces K for fewer rounds, but it may also trigger fewer times, leaving the resource return rate similar. The construction round should therefore be chosen from the remaining colonizable planet types.

### Bal T'aks

**Faction ability**: begin one space up the Gaia Project track, worth approximately 15 points. Gaiaformers can be converted into Q.

**Planetary Institute**: unlock the Navigation track so it can be advanced.

The faction ability turns the Gaia Project track into an income sequence of `1Q / — / 1Q / 1Q`. Completing it yields 12 points of modeled output, equal to Economy. Early Q often has a value close to O, and gaining 3Q can still leave a C shortage, so Economy usually provides the stronger direct income.

Under this model, the usual priority among the three income tracks is Economy > Gaia Project > Science.

Completing Gaia Project as the second track maintains income while opening Gaia Planet expansion. Opponents have fewer ways to block this route.

Bal T'aks usually place the PI at low priority. In many positions, Gaia Project and Artificial Intelligence together can supply the needed range without Navigation.

### Itars

**Faction ability**: begin with +1O and receive 1 Power token each round; sacrificed Power tokens enter the Gaia area. With one token valued at 3 general resource points, the estimate is $3 \times 1.88 + 5 \times 2.63=18.79$ points.

**Planetary Institute**: during the Gaia phase, exchange four Power tokens in the Gaia area for one Q.I.C. action costing 4Q; the exchange may be repeated. The model values one early action at about 7 production delayed by one round. With a resource growth factor of 1.4, four tokens are worth about 12.5 general resource points. Upgrading from M through to PI costs 27 points, while processing eight tokens in R1 converts to about 25. Later token sources commonly cost about 2 points per token, so the model estimates a PI growth factor well above 1.4.

**Faction board**: the Knowledge AC produces 1 additional K.

The PI has the highest resource return rate in this model. Itars often upgrade it in R1, move eight or twelve tokens into the Gaia area, then expand or build the Knowledge AC. Before adding an RL after the Knowledge AC, confirm that a suitable technology tile remains available.

### Nevlas

**Faction ability**: 15 points.

1\) Begin one space up the Science track, worth approximately 15 points.

2\) Move one Power token from bowl III to the Gaia area to gain 1K, converting 2 Power into 1K.

**Planetary Institute**: Power tokens count as 2 Power when spent.

**Faction board**: RL produces 2 Power.

Nevlas can develop around the PI or around their faction ability, and their resource structure is broadly balanced.

With the PI, charging can provide about 20 points of modeled value. Some of the PI's resources replace existing benefits, and both abilities use the same Power tokens, so their values cannot simply be added.

Without the PI, Nevlas can repeatedly convert 2 Power into 1K. Gaining about 4K from Power in R1 is roughly 8 points of additional return. An early Economy advance converts that K into resources efficiently.
