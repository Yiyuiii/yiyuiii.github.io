---
title: Quantifying Resource and Point Values in Troyes
uid: '202407012233'
author: Yiyu Chen
date: 2024-07-01 20:00:00 +0800
lang: en
permalink: /en/posts/troyes-resource-and-point-value-analysis/
translation_key: post-202407012233
translation_url: /posts/特鲁瓦-资源-分值量化分析攻略/
translation_source: _posts/2024-07-01-《特鲁瓦》资源-分值量化分析攻略.md
translation_status: current
source_hash: 9456658c92fb78843d49c198815f04112af68f0f4273b7b4863a9211500b8e78
aliases: []
categories:
- Board Games
tags:
- Troyes
- Board Games
from: null
math: true
thumbnail: /assets/posts/202407012233/cover-bgg-1091724-square.webp
article_cover:
  alt: A four-player game of Troyes
  caption: 'Cover image: [Overview of the board. 4 player game.](https://boardgamegeek.com/image/1091724/troyes), photographed by BoardGameGeek user verminose, [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/); square crop by this site.'
excerpt: In Troyes, actions depend on random die values. Buying other players’ dice turns each round’s dice pool into a shared market and gives every random result an actionable price.
description: A shared value framework for influence, events, dice, activity cards, and money that shows how the common dice pool changes prices across systems—context that isolated card reviews cannot supply.
revisions:
- date: '2024-07-01'
  note: First published
- date: '2026-08-10'
  note: Standardized official component and action terms, separated the valuation steps, and removed repetitive judgments while preserving the original two-game experience, formulas, and strategy conclusions
---

## Preface

Actions in *Troyes* depend on die values. Because players may buy one another’s dice, the dice rolled each round form a shared market. Pricing brings each random result into every player’s decision space.

After two games, I tried to work backward from victory points (VP) and estimate the value of resources and actions. This article preserves that valuation process. The numbers compare choices within a game; they are neither official prices nor a stable optimal strategy.

I use the rulebook’s terms throughout: die values are measured in pips, the currency is deniers, the city cards are Activity cards, and the wooden figures are citizens.

> **Source note | Rules terminology**
>
> The [official Pearl Games page](https://pearlgames.be/boardgame/troyes/) provides the base-game rulebook. Influence, Activity cards, Events, citizens, the Cathedral, and deniers below refer to rulebook components or actions. Every conversion and strategy judgment belongs to the author’s model.
{: .article-evidence}

## Influence

Spending 1 Influence rerolls one die. The new result has an expected value of 3.5. Rerolling a 1 therefore adds 2.5 pips in expectation.

Spending 4 Influence flips up to 3 of your dice. Flipping three 1s to 6s adds 15 pips, or 3.75 pips per Influence.

Accumulating 4 Influence while retaining three low dice is restrictive. I therefore use the midpoint estimate of 1 Influence to 3 pips.

Flipping applies only to your own dice, so plans that rely on it must retain enough personal dice.

<span id="resolving-events"></span>

## Events

Combating Events directly converts pips into VP and Influence. Placing one cube usually costs 2–4 pips and immediately gains 1 Influence. Under this model, the Influence alone covers the cost of a 2-pip cube.

### Returns from Event Cards

For the minimum investment that secures first place, the original estimates are:

- $4 \times 2=8$ pips gains $2+1=3$ VP and 4 Influence, so 8 pips = 3 VP + 12 pips;
- $2 \times 4=8$ or $3 \times 3=9$ pips gains $3+1=4$ VP and 2–3 Influence, approximated as 9 pips = 4 VP + 9 pips;
- $3 \times 4=12$ pips gains $4+1=5$ VP and 3 Influence, so 12 pips = 5 VP + 9 pips.

Events with a lower pip cost per cube usually allow more cubes for the same input and therefore return more Influence.

For completing an Event alone:

- $7 \times 2=14$ pips gains $2+1=3$ VP and 7 Influence, so 14 pips = 3 VP + 21 pips;
- $4 \times 4=16$ or $5 \times 3=15$ pips gains $3+1=4$ VP and 4–5 Influence, approximated as 15 pips = 4 VP + 12–15 pips.

Second place usually costs 2–4 pips and gains 1–2 VP plus 1 Influence. The Influence roughly repays the pip cost, leaving about 1–2 VP of net value.

Under these estimates, completing an Event alone and taking second place offer similar marginal returns. With several Events available, prioritize finishing those in which you have already invested and limit opportunities for another player to secure first place cheaply. Available red pips cap the total return of this plan.

## Using Dice

- **Buying dice:** common efficient purchases spend 2–4 deniers for 4–6 pips. Other players may later buy your dice and return part of that money. Keep enough deniers for the rest of the round.
- **Combating black dice:** with 1 Influence valued at about 3 pips, eliminating a black die of value 3 or less has a positive modeled return. A higher die needs another reward to justify its cost.
- **Building the Cathedral:** 1–3 pips gains 1 Influence and 1 VP; 4–6 pips gains 2 Influence and 1 VP. The first placement on each level gains another 2 VP, for 3 VP in total; later placements gain 1 VP.
- **Placing citizens:** spending 2 Influence adds a citizen to your personal supply. Its die can replace a purchase costing 2–4 deniers every round. Low dice are useful for repositioning a citizen in a principal building, expelling an opponent’s citizen, or preparing a citizen for a future Activity card.
- **Agriculture:** the standard action converts 2 yellow pips into 1 denier. This rate is well below the common alternatives, so it does not establish the model’s baseline.

<span id="功能牌"></span>

## Activity Cards

Activity cards change the conversion among pips, deniers, and VP. Placing a citizen on a card usually gains 2 Influence and 2–6 deniers. The original model values this one-time return at 1–3 VP and omits it from the card calculations below.

- **(White 1) Monk:** 3 white pips = 3a yellow pips − a white pips, a net gain of 2a−3 pips. The additional yellow pips need another yellow Activity card as an outlet.
- **(White 2) Templar:** 3 white pips = 2a red pips − a white pips, a net gain of a−3 pips. Its main value is concentrating as many as 12 red pips for first place on an Event.
- **(White 3) Procession:** 4 white pips = 2 VP. It converts otherwise unused endgame dice directly into points.
- **(Red 1) Archer:** 2 red pips have a $\frac{2}{3}$ chance to place 1 cube, approximated here as 4 pips. On an Event that costs at least 3 pips per cube, its rate approaches twice the basic placement rate.
- **(Red 2) Mercenary:** 2 red pips = 3 deniers, below the model’s common conversion baseline.
- **(Red 3) Captain:** 4 red pips = x VP. A 3-VP result is acceptable, and exclusive access to many red dice raises its ceiling.
- **(Yellow 1) Miller:** 4 yellow pips = at least 4 deniers. Six deniers is acceptable, provided the money still has a useful outlet.
- **(Yellow 2) Goldsmith:** 3 yellow pips = 5 additional red pips, a high conversion rate.
- **(Yellow 3) Artisan:** 4 yellow pips + 3 deniers = 2 VP. It can clear resources that have no further endgame use.

<span id="money"></span>

## Deniers

Deniers place citizens on Activity cards, buy dice, and satisfy Activity-card and Character-card scoring conditions. Activity-card placement has limited immediate efficiency, while dice purchases and Character scoring require cash reserves. The model therefore treats deniers as an action threshold and spends them where they can still produce pips or VP.
