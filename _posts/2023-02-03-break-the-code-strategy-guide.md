---
title: Break the Code Strategy Guide
uid: '202302032000'
author: Yiyu Chen
date: 2023-02-03 20:00:00 +0800
lang: en
permalink: /en/posts/break-the-code-strategy-guide/
translation_key: post-202302032000
translation_url: /posts/逻辑对决桌游攻略/
translation_source: _posts/2023-02-03-逻辑对决桌游攻略.md
translation_status: current
source_hash: 5c948b86b4e404d0d46da6fb214f3901dc62d836eb8d6dfcb7ad223a50b0353d
thumbnail: /assets/posts/202302032000/cover-bgg-7205453-square.webp
article_cover:
  alt: Number tiles, screens, and deduction sheets from Break the Code
  caption: 'Cover image: [Codebreaking Components](https://boardgamegeek.com/image/7205453/break-the-code), photographed/uploaded by BoardGameGeek user dizziedobsession, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); square crop by this site.'
aliases: []
categories:
- Board Games
tags:
- Break the Code
- Board Games
from: null
math: true
excerpt: By February 2023, I had played nearly 500 games of Break the Code on BGA. This guide organizes the practical approach I had developed at the time around numerical deduction, the value of questions, and endgame offense and defense.
description: Drawn from nearly 500 BGA games, this guide treats questions as candidate-set partitions and connects them to deduction, turn order, and endgame play, so the method transfers beyond fixed rankings.
revisions:
- date: '2023-02-03'
  note: Initial draft
- date: '2026-07-29'
  note: Corrected rules, worked examples, and descriptions of information value; rebuilt Example 2.1 with reproducible enumeration; and separated rules, computed results, and personal experience (with ChatGPT assistance)
- date: '2026-07-30'
  note: Corrected the spelling of Elo and removed an unused Mermaid load (with Kimi assistance)
- date: '2026-07-31'
  note: Replaced the old cover whose licensing had not been resolved with a traceably licensed photograph of the actual game components, and tightened the square crop (with Codex assistance)
---

**Break the Code** is a two-to-four-player logic-deduction board game with simple rules, an easy learning curve, and considerable depth. In a two-player game, each player tries to identify the opponent's five tiles; with three or four players, everyone tries to identify the unallocated code in the center. By asking about numbers, colors, positions, and adjacency relationships, players progressively eliminate impossible arrangements.

By February 2023, I had played nearly 500 games on BGA, with an Elo rating of about 350, and had at one point ranked in the world's top 100. That was the personal status I recorded at the time. I have no publicly verifiable historical snapshot, and it does not represent my current ranking. After that many games, I felt that I had broadly grasped the game's lines of deduction, offense, and defense without losing my interest in starting another one, so I wrote this guide.

This article does not restate the rules from the beginning. It is better suited to readers who already know the game and want to improve their win rate. New players can first consult the [official English rulebook from IELLO](https://iellogames.com/wp-content/uploads/2019/08/Break-the-Code_Rulebook_EN_Light.pdf) or the [BGA game help](https://en.doc.boardgamearena.com/Gamehelpbreakthecode).

> **Rules basis | Tile order and BGA rules used in this article**
>
> The physical game contains 20 tiles. Codes are ordered from the smallest number to the largest; when both a black and a white tile of the same number appear, the black tile is placed to the left of the white tile. In the BGA version, players may guess only during their own turn. An incorrect guess in a two-player game does not end the game for that player, whereas a player who guesses incorrectly with three or more players is eliminated. After someone guesses correctly, the remaining players in the same round still complete their turns, so joint winners are possible. All worked examples in this article use these rules.
{: .article-evidence}

The discussion below continues to treat winning as the objective and proceeds through three levels: numerical deduction, question selection, and endgame offense and defense. Unless otherwise specified, claims that something is “better” or “worse” are experiential judgments based on the games described above, not proven universal theorems.

To keep the candidate-code literals identical to the source article, the listings below retain the Chinese color labels 白, 黑, and 绿; they mean white, black, and green respectively.

## I. Numerical Deduction: The Foundation for Winning

Numerical deduction is the basic skill required to identify a code first. If the available information already determines the answer but you fail to complete the deduction on your turn, you have effectively given the opponent one extra round.

### 1.1 Deduction Process

The most basic process begins with your own hand and the answers on the table, repeatedly turning known information into new constraints. Points that usually deserve particular attention include:

- the sum of the numbers in certain positions;
- the number or color at a particular position;
- the number of tiles of a color and the sum of their numbers;
- structures such as adjacent tiles of the same color, consecutive adjacent numbers, and pairs;
- elimination relationships created by the tiles in your own hand.

The common methods are not especially mysterious: combine related information, eliminate possibilities, introduce unknowns, and perform finite enumeration. When there is too much information, writing the constraints as candidate sets is often more reliable than repeatedly trying to retain everything in your head.

**Example 1.1: Three-player game**

- Your hand: black 0, black 4, green 5, white 8, black 9;
- Opponent 1's answers: consecutive numbers are `(a,b)(c,d)`; the sum of white numbers is 7; the sum of all numbers is 15; there is no 6; the sum of black numbers is 8;
- Opponent 2's answers: the difference between the largest and smallest number is 7; the sum of white numbers is 18; there are 2 black tiles; there is no 6; `a=b=2`.

First combine the relationships among the answers. Opponent 1's total of 15 can already be derived from the white sum of 7 and black sum of 8; what actually keeps narrowing the candidates is the consecutive-edge pattern and “no 6.” For Opponent 2, `a=b=2` fixes the opening pair of 2s, while the largest–smallest difference of 7 fixes the last tile at 9. Enumerating after adding the color sums, the number of black tiles, and the physical tiles removed by your own hand gives Opponent 1 a unique code:

`白0、黑1、白3、白4、黑7`

Opponent 2 has two possibilities:

- `黑2、白2、黑3、白7、白9`;
- `黑2、白2、白7、黑8、白9`.

The two opponents' candidates cannot be selected independently, because the same physical tile cannot appear in both hands. Solving them jointly leaves only two legal complete deals. Subtracting your own tiles and both opponents' tiles from the 20 physical tiles then leaves two possibilities for the center code:

- `白1、黑3、绿5、黑6、白6`;
- `白1、绿5、黑6、白6、黑8`.

Tile order requires special attention here: a code must be written in ascending numerical order, with black to the left of white when the values are equal. Candidate records should always follow this rule; otherwise, the same set of tiles may be misread as different codes.

### 1.2 Extreme-Hand Assumptions

When an answer falls near the extreme end of its possible range, first asking “what is the most extreme legal hand?” can often shrink the candidate set quickly.

**Example 1.2: Two-player game**

- Your hand: green 5, white 6, white 7, black 8, white 9;
- Opponent's number sum: 35.

After removing your own tiles, the largest number combination available to the opponent is strongly constrained. Complete enumeration gives only one legal code:

`绿5、黑6、黑7、白8、黑9`

**Example 1.3: Two-player game**

- Your hand is the same as above;
- Opponent's number sum: 34.

Only two legal codes remain:

- `黑4、黑6、黑7、白8、黑9`;
- `白4、黑6、黑7、白8、黑9`.

I also prioritize checking several kinds of extreme answers: a very small sum among the leftmost two or three tiles, a very large sum among the rightmost two or three, a color-number sum close to the edge of its range, or a largest–smallest difference near its limit. These are useful places to look for a breakthrough, but they are not guaranteed to work in every candidate set.

### 1.3 Enumeration: A Heavy Sword Needs No Edge

Many deduction techniques that look different on the surface are, underneath, ways of eliminating candidates that violate constraints. The value of mental calculation is that structure and experience let you skip most impossible cases. Once only a few candidates remain, straightforward enumeration is often the most reliable method.

**Example 1.4: Three-player game**

- Your hand: black 0, white 0, black 1, white 2, black 4;
- Opponent 1: no adjacent tiles share a color; consecutive numbers are `(b,c,d)`; the sum of the rightmost three tiles is 20; the sum of the leftmost three is 14;
- Opponent 2: consecutive numbers are `(c,d)`; the sum of white numbers is 20; the sum of the leftmost three is 17; the number of pairs is 1.

First write Opponent 1's numbers as:

`(a,b,b+1,b+2,e)`

The sums of the leftmost and rightmost three tiles give:

$$
a+b+(b+1)=14
$$

$$
(b+1)+(b+2)+e=20
$$

Subtracting the two equations gives $e=a+4$. Together with the sorted order, $a\leq b$ and $b+2\leq a+4$, so only $b=a,a+1,a+2$ need to be checked:

- If $b=a$, then $3a=13$, which has no integer solution;
- If $b=a+1$, then `a,b` would also be consecutive, contradicting the known consecutive segment;
- If $b=a+2$, the solution is $a=3$.

Opponent 1's numbers are therefore `3、5、6、7、7`. Combining this with the color constraints and Opponent 2's answers, complete enumeration produces one unique visible deal:

- Opponent 1: `黑3、绿5、白6、黑7、白7`;
- Opponent 2: `白3、黑6、白8、黑9、白9`;
- Center code: `白1、黑2、白4、绿5、黑8`.

Examples of this kind are well suited to using algebra to find the skeleton first and then finishing with the remaining tiles and color constraints. There is no need to force every step into a single mental calculation.

### 1.4 Additional Information in Opponent Behavior

Beyond public answers, an opponent's choices and guesses may also provide information. Because such information depends on behavioral assumptions, however, it is less reliable than constraints supplied directly by the rules.

For question selection, the observations I often used at the time were:

- Early in a game, most players tend to select questions with generally high information value, so the choice itself offers little evidence;
- When the candidate questions look similar, which one an opponent selects may reflect their private hand and the current gap in their deductions;
- An opponent who voluntarily selects a question that appears weak may sometimes be avoiding revealing their own information, but they may also simply judge it differently or have failed to calculate it fully.

For guessing behavior, rule facts must be separated from assumptions about whether the opponent is rational:

- In a two-player game, an incorrect guess does not eliminate the player. The physical rules require the guesser to state all five tiles, but this article makes no untested claim about precisely how much the BGA interface reveals to the opponent;
- A correct guess means the opponent's private information was sufficient to support some answer, but it becomes an additional constraint only if one assumes that the opponent did not guess randomly;
- An opponent who does not guess may still have several candidates, or may simply not have finished calculating. The absence of a guess should not normally be given too much meaning.

**Example 1.5: Two-player game**

- Your hand: black 0, black 1, black 3, white 3, black 7;
- Opponent's answers: the sum of white numbers is 20; the sum of the middle three is 12; the sum of the rightmost three is 19; the sum of the leftmost three is 5;
- Information the opponent knows about your hand: adjacent tiles of the same color are `(a,b,c)`; the sum of black numbers is 11; the sum of all numbers is 14;
- The opponent, who acts earlier in turn order, has guessed correctly.

Based only on the public answers, the opponent's hand still has two candidates:

- `白0、白1、白4、白7、白8`;
- `白1、黑2、白2、白8、白9`.

Now add one behavioral assumption: the opponent guessed only after reducing their own candidates to a unique solution, rather than taking a chance among several candidates. Under that assumption, the first hand cannot determine my code uniquely, while the second can. The hand can therefore be narrowed further to:

`白1、黑2、白2、白8、白9`

This is not an unconditional logical conclusion. It is an inference from “rules information + a model of opponent behavior.” The stronger the opponent, and the less often they make probabilistic guesses, the more credible this information usually becomes.

## II. Question Selection, Offense, and Defense

My practical impression is that, with reasonable question selection and smooth basic deduction, a typical game requires roughly three to five questions to determine the code. Three high-value answers are sometimes sufficient; weaker answers may require more than five; and an extreme answer can occasionally reduce the candidates directly to one, as in Example 1.2.

This range is only an observation from my games, not a number of rounds guaranteed by the rules.

### 2.1 General Value of Questions

#### 2.1.1 Color Information and Numerical Information

I usually begin by dividing questions roughly into color questions and number questions. Apart from “sum of black numbers” and “sum of white numbers,” which carry both color and numerical information, many questions advance mainly one side.

If you ask in succession for the total number sum and the sums of the leftmost and rightmost three tiles, the numbers may become clear while the colors remain ambiguous. Conversely, asking only about adjacent tiles of the same color, the number of white tiles, and the number of black tiles may reveal the color structure without determining the numbers.

In my experience, numbers usually require more constraints, while colors can sometimes be recovered from your own hand and the remaining tiles. I therefore often allocated only one direct color question among three or four questions, although the exact proportion should depend on the hand and candidate set.

Among color-related questions:

- A color count tells you only “how many” and usually cannot determine positions directly;
- Adjacent tiles of the same color provide local structure and are very useful when they hit;
- The sum of black or white numbers constrains both colors and numbers, making these some of the questions I watched most closely at the time.

Number questions depend more heavily on combinations:

- The sum of all numbers covers all five tiles and usually provides a more comprehensive global constraint than the sum of only three;
- Once the sum of all numbers is known, the sum of the middle three and the largest–smallest difference become strongly related;
- The value of consecutive-adjacency questions varies greatly: they sometimes determine the structure directly and sometimes provide almost no help;
- A number-position question works best together with other constraints; when the number is present, its position also implies inequalities to the left and right;
- The counts of odd and even tiles, the number of pairs, and whether the middle tile is 5 or more versus 4 or less are generally coarse partitions, but may still strike the key distinction in a particular candidate set.

#### 2.1.2 Treating a Question as a Partition of the Candidate Set

View the remaining candidates as a set. Asking a question partitions that set into groups by the possible answers. The quality of a question cannot be judged simply from “how many groups it creates”: if one group is large and all the others small, the answer will still fall into the large group most of the time.

A more practical metric is the expected number of remaining candidates. If the answer groups have sizes $n_1,n_2,\ldots,n_k$ and there are currently $N$ equally weighted candidates, then:

$$
\mathbb{E}[N_{\text{remain}}]=\frac{\sum_i n_i^2}{N}
$$

Information entropy can also measure the answer distribution. Both are more reliable than merely counting answer categories, but they remain one-step metrics. They do not automatically incorporate color recovery, later questions, guessing order, or information leaked to opponents.

To provide a common baseline for this kind of judgment, I enumerated every five-tile combination from the complete set. The 20 physical tiles form 15,504 five-tile combinations. Treating the two visually identical green 5s as one tile face gives 12,444 distinct visible codes. Before adding your own hand or any historical answers, the total number sum has 38 answer categories; the sums of the leftmost, middle, and rightmost three have 23, 24, and 23 respectively; the sums of black and white numbers each have 35; consecutive adjacency and same-color adjacency each have at most 16 edge patterns; the largest–smallest difference has 8 categories; a color count or parity count has 6; and the position of a fixed number has 3–10 depending on the number. More categories do not necessarily make a question better in actual play, because the groups are not equal in size.

From this perspective, the common questions can be understood approximately as follows:

- Total number sum, black-number sum, and white-number sum: the wide answer ranges generally divide candidates finely;
- Sums of the leftmost, middle, and rightmost three: the full-set baseline has 23–24 answer categories, but this shrinks substantially in a particular candidate set;
- Adjacency questions: five tiles have four adjacent edges, so there are at most $2^4=16$ patterns. All 16 appear in the complete-set baseline, although the regions have unequal sizes;
- Number position: the number of answer categories varies with the number. Zero and 9 have the fewest, while 2–7 have the most. The “number absent” region is usually large;
- Largest–smallest difference: values range from 2 to 9, giving 8 categories;
- Color counts and parity counts: values range from 0 to 5, giving 6 categories;
- Number of pairs: values range from 0 to 2, giving 3 categories;
- “Middle tile is 5 or more versus 4 or less”: only 2 categories, making it a very coarse binary partition.

#### 2.1.3 Personal Experience Rating as of 2023

The table below preserves the question-selection intuition I had developed after roughly 500 games. It is not an objective, universal ranking by information value: your own hand, answers already received, ability to recover colors, and the offensive or defensive relationship all change the practical value of a question.

| Personal rating | Questions |
| :--: | :-- |
| T0 | Sum of white numbers; sum of black numbers |
| T0.5 | Adjacent tiles of the same color |
| T1 | Sum of all numbers |
| T2 | Sum of leftmost three; sum of middle three; sum of rightmost three; consecutive adjacent numbers; largest–smallest difference |
| T3 | Number position; number of white tiles; number of black tiles |
| T4 | Number of odd tiles; number of even tiles; number of pairs; middle tile is 5 or more versus 4 or less |

In the complete-set enumeration, the answer entropy for the total number sum is approximately 4.56 bits, while the black- or white-number sum is approximately 4.50 bits. This supports the claim that sum questions generally partition candidates finely, but does not by itself prove the practical order in the table. Once the game reaches an endgame, inspect the current candidate set directly instead of mechanically selecting from T0 downward.

### 2.2 Selecting a Question

**High general information value does not guarantee a large contribution in the current position. Ultimately, the better question is the one that improves your expected game outcome.**

In a completely rational simplified model, the results of a decision can be written as $p_\text{胜}$, $p_\text{平}$, and $p_\text{负}$—respectively the probabilities of a win, tie, and loss—whose sum is 1. Near the endgame, when candidate sets are smaller, enumerating whether each answer lets you identify the code is often more feasible than applying a global rating.

Probability calculations contain another easily missed detail: after shuffling, equal probability belongs to deals of physical tiles, not necessarily to the “visible codes” obtained after merging color and number. The two green 5s look identical but are distinct physical tiles. If both may remain in the unknown region, the same visible code can carry different weight.

**Example 2.1: Two-player game**

- Your hand: green 5, black 8, white 8, black 9, white 9;
- Information about the opponent: the total number sum is 10; the sum of white numbers is 5.

Because you have already taken one green 5, only the other remains among the physical tiles. Each visible code below corresponds to exactly one physical deal. There are 10 opponent codes satisfying the conditions, and they happen to be equally weighted under the physical-deal prior:

1. `黑0、黑1、白1、黑4、白4`
2. `黑0、黑1、白2、白3、黑4`
3. `黑0、黑2、白2、黑3、白3`
4. `黑0、白0、白1、白4、绿5`
5. `黑0、白0、白2、白3、绿5`
6. `黑0、白1、黑2、黑3、白4`
7. `白0、黑1、白1、黑4、白4`
8. `白0、黑1、白2、白3、黑4`
9. `白0、黑2、白2、黑3、白3`
10. `白0、白1、黑2、黑3、白4`

Compare three questions:

- **Number of even tiles**: all 10 candidates answer 3, so the candidate set is not partitioned and the expected remainder is still 10;
- **Number of black tiles**: the answer groups have sizes 2, 4, and 4, giving an expected remaining candidate count of $(2^2+4^2+4^2)/10=3.6$;
- **Position of the number 1**: the answer groups have sizes 1, 2, 3, and 4, giving an expected remaining candidate count of $(1^2+2^2+3^2+4^2)/10=3.0$.

In this particular position, asking for the position of 1 is therefore better than asking for the number of black tiles, while asking for the number of even tiles contributes nothing. An expected remainder of 3 is only the weighted average over all answer branches; it does not mean that every possible answer uniquely determines the code.

### 2.3 Offense and Defense in Question Selection

Selecting only the question that is easiest for your own deduction is not necessarily the best strategy.

As an extreme example, a color-number-sum question may look very attractive to you, but leaving “sum of all numbers” to the opponent might let them immediately recognize that your hand is close to `7、8、8、9、9`. Proactively taking the total-sum question may then be more important than maximizing your own one-step information gain.

It is difficult to quantify every question in an actual game. At the time, I usually looked two or three steps ahead: what I wanted to learn, what the opponent most needed, and how much the current question would reveal. I then decided whether to attack or defend.

This is especially important in a four-player game. Under the BGA rules, the player asking a question must answer it as well. Everyone hears the same set of public answers, but each player has a different private hand and candidate set, so the marginal information gained is not the same. The ideal question is not the one with the abstractly largest “total information,” but the one whose net return is more favorable to you relative to the target opponent. Asking for the position of 5 when you do not hold a 5 may indeed reduce your own exposure, for example, but whether it is worth doing still depends on the other players' candidate sets.

## III. Global Offense and Defense

The previous sections discussed deduction and question selection separately. Near the endgame, the two become directly coupled: a question may let you determine the answer while also supplying an opponent with their final missing piece.

### 3.1 Endgame Choices

#### 3.1.1 Endgame Questions Must Account for Turn Order

In the endgame of a three- or four-player game, suppose Question A lets both you and an opponent acting later determine the answer, while Question B leaves both of you uncertain. Question A is not necessarily better.

When acting first, Question A may turn a position in which you had a chance to tie into one where the later player can follow your correct guess. When acting later, Question A may similarly give other players in the same round a winning opportunity that you could otherwise have kept for yourself. Because BGA lets all remaining players finish the round after someone guesses correctly, seating and same-round resolution must be included in the decision.

#### 3.1.2 Guess or Ask Another Question

An incorrect guess does not eliminate a player in a two-player game, so immediately guessing in a two-candidate position at least creates a chance to hit on the current turn. That does not guarantee a higher eventual win rate than asking a question:

- An incorrect guess may reveal important information to the opponent;
- If the opponent is still far from the answer and some question both narrows your candidates and does not obviously help them, asking may be safer;
- A probabilistic guess on the current turn becomes more urgent when the opponent is likely to determine the answer on their next turn.

The physical rules require the guesser to state the complete arrangement of colors and numbers. This article makes no unsupported inference about the precise BGA interface display for an incorrect guess.

In a three- or four-player game, an incorrect guess immediately eliminates the player, so those acting later are often more inclined to ask a question and avoid directly losing their eligibility in the game. “Ask another question” does not mean “at least tie,” however: other players may already have enough information, and the question may happen to complete their answer.

### 3.2 First- and Later-Player Strategy

My personal feeling is that acting later is often more comfortable. With the same number of questions answered, the later player can also observe whether the first player chooses to guess and whether that guess is correct, then adjust their own risk preference. Such behavioral information has value, but it is not a fixed win-rate advantage conferred by the rules.

A later player also has a slightly wicked option: use the pace of their actions to make the first player think they already know a great deal, pressuring that player into an early probabilistic guess.

The first player's most direct initiative is to take, from the opening, questions that better fit their own hand or that they are especially unwilling to leave to the opponent. The first player needs to compare both sides' information progress more actively and decide whether to accept guessing risk early when the later player appears close to completing the deduction.

## IV. Limits of Psychological Tactics

Which questions an opponent selects, when they guess, and how quickly they act may all reveal information they possess. The discussions in Example 1.5, endgame choices, and first- versus later-player strategy already cover the most common uses of these clues: first construct the candidate set under the rules, then use behavioral judgment to adjust candidate priority or the timing of your own guess.

These clues depend on assumptions about an opponent's level, habits, and motives, so their evidential strength is lower than facts visible on the tiles. When candidate differences are clear, prefer verifiable constraints. Psychological judgment is suitable as secondary evidence only when multiple candidates explain all public information. An opponent may also create deliberate misdirection, so behavioral clues are better used to decide “which candidate to check first” or “when to take a risk” than to eliminate legal answers from nothing.

The whole article can be compressed into one sentence: maintain an accurate candidate set first, then choose the question that improves the game outcome, and finally use turn order and opponent behavior as corrections. Rules and enumeration define the boundary; personal experience helps rank the options. The two should not be conflated.

## Rules and Further Reading

For checking tile order, guesses, and multiplayer resolution, start with these public sources:

- [IELLO: Official English rulebook for Break the Code](https://iellogames.com/wp-content/uploads/2019/08/Break-the-Code_Rulebook_EN_Light.pdf)
- [Board Game Arena: Break the Code game help](https://en.doc.boardgamearena.com/Gamehelpbreakthecode)
- [Board Game Arena: Release and licensing announcement](https://en.boardgamearena.com/news?id=623)
