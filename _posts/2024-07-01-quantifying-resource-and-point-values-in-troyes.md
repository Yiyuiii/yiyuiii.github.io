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
source_hash: f5ed80dc7a43c93d23eb662f21157bc812d23063954236b419e4eadbc6b438b7
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
excerpt: In Troyes, players' actions depend on random die values. The mechanism for buying other players' dice turns what would have been highly random individual output into a shared public supply, balancing randomness and strategy in a novel way.
description: A shared value framework for influence, events, dice, activity cards, and money that shows how the common dice pool changes prices across systems—context that isolated card reviews cannot supply.
---

## Preface

In Troyes, players' actions depend on random die values. The mechanism for buying other players' dice turns what would have been highly random individual output into a shared public supply, balancing randomness and strategy in a novel way.

After playing two games of Troyes, I had an intuition that its scoring returns could be approximated with a simple quantitative model. This article records that process.

Because this is a point-scoring game, we can work backward from victory points to estimate the returns on each resource.

## Influence

Spending 1 Influence to reroll a die gives an expected result of 3.5 pips. Rerolling a 1 is optimal, so the expected gain is 2.5 pips.

Spending 4 Influence reliably lets you flip up to 3 dice. Flipping each die from 1 to 6 is optimal, for an expected gain of 15 pips, or 3.75 pips per Influence on average.

Because both accumulating 4 Influence and maximizing its return are difficult, I provisionally value 1 Influence at 3 pips.

Note that making full use of Influence requires keeping a corresponding number of your own dice available.

## Resolving Events

Event cards provide the most direct conversion from pips to victory points.

Each cube costs 2–4 pips of dice and grants 1 Influence. An event card that requires 2 pips per cube therefore cannot lose value.

### Returns from Event Cards

Suppose you spend the minimum needed to secure first place:

$4 \times 2=8$ pips securely yields $2+1=3$ points plus 4 Influence, so 8 pips = 3 points + 12 pips;

$2 \times 4=8$ or $3 \times 3=9$ pips securely yields $3+1=4$ points plus 2 or 3 Influence, so 9 pips = 4 points + 9 pips;

$3 \times 4=12$ pips securely yields $4+1=5$ points plus 3 Influence, so 12 pips = 5 points + 9 pips.

We can see that event cards with smaller denominators grant more Influence and therefore offer higher returns.

If instead you pay the full cost to complete an event card:

$7 \times 2=14$ pips yields $2+1=3$ points plus 7 Influence, so 14 pips = 3 points + 21 pips;

$4 \times 4=16$ or $5 \times 3=15$ pips yields $3+1=4$ points plus 4–5 Influence, so 15 pips = 4 points + 12–15 pips.

Taking second place costs 2–4 pips and yields 1–2 points plus 1 Influence, which is roughly equivalent to getting 1–2 points for free.

These returns show that paying the full cost to finish an event card gives a return similar to taking second place. When enough event cards are available, the optimal choice is therefore to avoid helping another player secure first place at minimum cost and instead clear an event card alone.

My suggested strategy is to prepare to clear event cards by yourself and simply ensure that every event card you have already invested in can be completed.

In addition, because actions on event cards fully repay their cost, their return depends on the maximum number of red pips a player can obtain.

## Using Dice

Buying dice: using cost-effective combinations as the reference, paying 2–4 coins for 4–6 pips is always worth doing. After you pay someone to buy a die, other players may later pay you to buy yours, so there is no need to be overly concerned about the money.

Dealing with black dice: based on the value of Influence above, fighting a black die worth 3 pips or less is profitable; otherwise it loses value.

Cathedral: 1–3 pips = 1 Influence + 1 point, while 4–6 pips = 2 Influence + 1 point. The first placement in each row grants another 2 points, so that first placement is worth 3 points and later placements are worth 1 point.

Citizens: if obtaining a citizen costs 2 Influence, the die produced by that citizen is equivalent to a per-round return of 2–4 coins. I therefore suggest using low-value dice to adjust your citizens' positions, displace another player's citizen, or acquire a citizen for an Activity-card space you plan to use later.

Converting to money: the standard action converts 2 yellow pips into 1 coin. It is a very poor action and should not be used as a basis for valuation.

## Activity Cards

Activity cards provide many high-value actions and strongly affect the conversion between resources and value over the course of a game. A space on an Activity card returns 2 Influence plus 2–6 coins, equivalent to 1–3 points; it is roughly value-neutral, so I do not repeat it in every calculation below.

(White 1) Monk: 3 white pips = 3a yellow pips − a white pips. The return is 2a−3 pips, although producing yellow pips requires a yellow card to make use of them.

(White 2) Templar: 3 white pips = 2a red pips − a white pips. The return is a−3 pips. This card does not generate much value, but its strength is that it can use as many as 12 red pips to secure first place on an event card.

(White 3) Procession: 4 white pips = 2 points. This is a low-efficiency finishing action for the end of the game.

(Red 1) Archer: 2 red pips = a $\frac{2}{3}$ chance of placing a cube, approximately 4 pips. On event cards with a denominator of 3 or more, this produces nearly twice the normal return.

(Red 2) Mercenary: 2 red pips = 3 coins, a severe loss.

(Red 3) Captain: 4 red pips = x points. A return of 3 points is relatively acceptable, and the card is very strong when you are the only player using red dice.

(Yellow 1) Miller: 4 yellow pips = 4 or more coins. Six coins is relatively acceptable, but repeatedly generating money has limited use, and it does not help if the money is only going toward buying dice.

(Yellow 2) Goldsmith: 3 yellow pips = +5 red pips, an exceptionally efficient conversion.

(Yellow 3) Artisan: 4 yellow pips + 3 coins = 2 points, an extremely inefficient finishing action for the end of the game.

## Money

Money is mainly used to take spaces on Activity cards, buy dice, convert points through advanced yellow cards, and score Character cards.

Taking Activity-card spaces has mediocre conversion efficiency; buying dice and scoring Character cards are necessary actions; and converting money into points through advanced yellow cards is a severe loss. Money therefore functions more as a constraint on which actions are available than as a primary way to generate points.
