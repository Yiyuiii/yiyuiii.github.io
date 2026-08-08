---
title: A Practical Guide to Reliable Reinforcement Learning Experiments
uid: "202109170000"
author: Yiyu Chen
date: 2021-09-17 00:00:00 +0800
lang: en
permalink: /en/posts/reinforcement-learning-issues/
translation_key: post-202109170000
translation_url: /posts/强化学习问题随笔/
categories: [Reinforcement Learning]
tags: [Reinforcement Learning, Meta-Reinforcement Learning, Representation Learning]
math: true
thumbnail: /assets/posts/202109170000/cover-reinforcement-learning-diagram-square.webp
article_cover:
  alt: "A typical reinforcement-learning agent–environment loop"
  caption: >-
    Cover diagram: [Reinforcement learning diagram](https://commons.wikimedia.org/wiki/File:Reinforcement_learning_diagram.svg) by Wikimedia Commons user Megajuice, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); square layout prepared for this site.
excerpt: Reinforcement learning experiments often fail because the task, hidden context, training distribution, episode boundary, or evaluation protocol is wrong before the optimizer is.
description: >-
  A reproducible RL workflow spanning environment contracts, Gymnasium semantics, open task distributions, visual pre-training, method choice, reward, replay, debugging, and uncertainty reporting.
revisions:
  - date: "2021-09-17"
    note: Initial draft
  - date: "2026-08-08"
    note: Re-researched and rewritten by GPT-5.6 Sol, merging historical Obsidian notes on open-world RL and pre-trained perception into a reliability-focused guide to task specification, implementation, debugging, and evaluation
---

Reinforcement learning (RL) experiments often fail because the task, hidden context, training distribution, episode boundary, data pipeline, or evaluation protocol is wrong before the optimizer is. This article merges the existing evergreen tutorial with two historical Obsidian notes on open-world RL, meta-RL, and pre-trained perception, then rechecks the combined claims against primary sources. It focuses on reasoning and tests that remain useful across libraries; tool links were last verified on 2026-08-08.

## Define the experimental contract before the algorithm {#define-the-contract-before-the-algorithm}

DQN, SAC, PPO, model-based methods, offline RL, and meta-RL are solution routes. The algorithm optimizes a formal return, while the research goal may be safety, completion time, generalization, sample cost, or several conflicting objectives. When reward, metrics, and resource budgets are not connected, successful training may only mean successful optimization of the wrong proxy.

I freeze a one-page experimental contract before implementing an algorithm:

| Part | Question that must be answered |
| --- | --- |
| Decision process | What are the observation, action, reward, termination, time scale, and sources of randomness? |
| Task distribution | How are training, validation, and test tasks generated, and which factors are deliberately held out? |
| Resource budget | How do environment steps, real interactions, wall-clock time, compute, and tuning trials count? |
| Evaluation unit | Is an episode, task, seed, or complete training run the independent unit? |
| Baselines | Which methods represent random behavior, a strong task-specific solution, adjacent work, and an idealized upper bound? |
| Failure policy | How are crashes, timeouts, invalid actions, numerical errors, and missing results handled? |

This contract separates “the program runs” from “the conclusion is supported.” It also gives every later algorithm choice an explicit constraint to answer instead of letting method popularity set the agenda.

## Specify the decision problem first

### MDP, POMDP, and what the agent can observe

A Markov decision process (MDP) is commonly written as $(\mathcal{S}, \mathcal{A}, P, R, \gamma)$. At time $t$, the environment is in state $S_t$, the agent chooses $A_t$, and the environment draws the next state and reward from its transition process. The discounted return is

$$
G_t = \sum_{k=0}^{\infty} \gamma^k R_{t+k+1}.
$$

The Markov property is a claim about a chosen state representation: conditional on that representation and the action, the distribution of the next state and reward no longer depends on earlier history. It is not the claim that “the neural network receives the latest sensor reading.” The observation delivered to the agent may or may not be a Markov state. If a camera frame hides velocity, a delayed actuator depends on earlier commands, or an opponent has private information, the observation is generally only a partial view of the state. The problem is then better described as a partially observable MDP (POMDP).

Before selecting an algorithm, write down:

1. the observation available at decision time, including units and bounds;
2. the action space and any feasibility constraints;
3. the transition timing—when an action takes effect and when its consequence is observed;
4. the reward and the real-world objective it is intended to represent;
5. terminal states, external cutoffs, and the discount or finite horizon.

If the latest observation is insufficient, add a justified history window, recurrent state, state estimator, or belief representation. Do not expect a larger feed-forward network to reconstruct information that was never observed.

The standard foundation remains Sutton and Barto’s [*Reinforcement Learning: An Introduction*](https://mitpress.mit.edu/9780262039246/reinforcement-learning/). Its definitions are more durable than framework-specific tutorials.

### State may hide the task {#state-may-hide-the-task}

The vector emitted by an environment is not automatically a sufficient state. If the same observation requires different actions under hidden rules, goals, or dynamics, the agent faces partial observability. Meta-RL makes this problem explicit: an agent must infer the current task from limited interaction and then control accordingly. [PEARL](https://proceedings.mlr.press/v97/rakelly19a.html) separates task inference from control and represents uncertainty with a probabilistic context variable. The broader lesson is that a task representation should explain why the same observation calls for another behavior in this task, rather than merely compressing a trajectory.

Offline data can also entangle task identity with the collection policy. If one task happens to be collected by a stronger behavior policy, an encoder may mistake “these trajectories look better” for task identity. [Robust Task Representations](https://proceedings.mlr.press/v162/yuan22a.html) directly studies this task–behavior-policy confounding and representation robustness when behavior-policy distributions change at test time.

State and task representations therefore need at least three counterfactual checks:

1. **Same task, different behavior policies:** does the representation remain close, and can the policy still adapt?
2. **Different tasks, similar trajectory quality:** can it separate factors that genuinely change optimal behavior?
3. **Shuffled history or context:** is the performance change caused by task information, temporal information, or merely data volume?

Without those checks, clusters in a two-dimensional projection show that an encoder formed groups; they do not by themselves prove that it “learned the task.”

### Episode boundaries are part of the model

There are two different reasons a rollout can stop:

- **Termination:** the MDP reaches a terminal condition, such as success, failure, or a finite-horizon endpoint included in the task definition.
- **Truncation:** data collection stops for a reason outside the MDP, such as a wrapper’s time limit, a simulator interruption, or an external safety monitor that deliberately ends collection outside the task definition. If crossing a safety bound is itself a task-defined failure, that event is a termination instead.

This distinction changes a bootstrapped target. For a one-step value target,

$$
y_t = R_{t+1} + \gamma \left(1-\mathbb{1}[\text{terminated}_t]\right)V(S_{t+1}).
$$

An external truncation normally resets the environment but does not by itself erase the continuation value. Conversely, a time limit that is genuinely part of a finite-horizon MDP is a termination; the remaining time must be represented in the observation if it affects the transition dynamics. The [Gymnasium time-limit tutorial](https://gymnasium.farama.org/tutorials/gymnasium_basics/handling_time_limits/) gives the current operational distinction.

## Implement the environment contract

### Use the current Gymnasium API deliberately

The current [Gymnasium `Env` interface](https://gymnasium.farama.org/api/env/) separates reset information, termination, and truncation:

```python
observation, info = env.reset(seed=seed)

while True:
    action = policy(observation)
    next_observation, reward, terminated, truncated, info = env.step(action)

    replay.add(
        observation,
        action,
        reward,
        next_observation,
        terminated,
        truncated,
    )

    if terminated or truncated:
        observation, info = env.reset()
    else:
        observation = next_observation
```

Store `terminated` and `truncated` separately unless the learning code has already converted them into an explicit bootstrap mask. Collapsing both into an old `done` flag is a common way to bias value targets.

### Test semantics before learning

A random policy should be able to run thousands of steps without invalid observations, illegal rewards, or inconsistent episode statistics. Add tests for:

- observation shape, dtype, finiteness, units, and declared bounds;
- action clipping or rejection and every boundary action;
- deterministic transitions under a fixed simulator state when determinism is expected;
- reward decomposition and cumulative return on a hand-computed trajectory;
- every termination and truncation path;
- wrapper order, because wrappers may alter observations, rewards, and episode length;
- vectorized environments, especially per-worker reset and final-observation handling.

An environment checker can catch interface errors, but it cannot decide whether the reward describes the intended task. Keep a tiny deterministic environment with a known solution as a regression test for the learning code.

## Define the distribution beyond a fixed task {#open-task-distributions-change-evaluation}

A single fixed level can show whether an agent memorizes one solution but says little about transferable capability. Open-world and procedurally generated environments shift the object of study to a task distribution: goals, maps, opponents, resources, rule combinations, and horizons vary, and training cannot enumerate every future case.

The [XLand open-ended learning work](https://arxiv.org/abs/2107.12808) treats the universe of tasks as part of the research object and notes that progress itself becomes difficult to measure across many incomparable tasks. [Procgen](https://proceedings.mlr.press/v119/cobbe20a.html) uses procedurally generated levels to separate training efficiency from generalization to unseen levels. Together they show why an open task setting cannot be summarized by average return on the training distribution.

An interpretable protocol first decomposes the task space into axes, then defines hold-outs:

- **compositional hold-out:** skills A and B appear in training but never in their test combination;
- **parameter extrapolation:** speed, scale, noise, or terrain lies outside the training range;
- **rule shift:** observations look familiar while the objective or dynamics change;
- **horizon shift:** local skills stay fixed but the dependency chain becomes longer;
- **behavior-policy shift:** the collection distribution changes for offline or meta-learning data.

Evaluation should report training-distribution, interpolation, genuinely held-out composition, and diagnostic-probe results separately. If the task generator evolves during training, preserve its version and sampling weights; otherwise “more open” is an adjective that cannot be reproduced.

### A long horizon is more than a larger discount factor {#long-horizon-is-more-than-gamma}

Long-range planning combines delayed reward, sparse successful behavior chains, effects of early actions that surface much later, and high-level goals that invoke several low-level skills. Increasing the discount factor changes return weighting but does not create discoverable subgoals or reliable memory.

I divide long-horizon capability into three tests:

1. **Skill layer:** can navigation, interaction, evasion, or resource collection be completed in isolation?
2. **Composition layer:** when two known skills appear in a new order, at which interface does failure occur?
3. **Planning layer:** with sparse intermediate reward, can the agent preserve a goal, recover from failure, and choose an alternative route?

Hierarchical policies, memory models, world models, and sequence modeling may all help, but they address different bottlenecks. Horizon truncation, shuffled history, provided or removed subgoals, and substituted low-level skills are useful ablations; without them, “the model is larger” can be mistaken for “the model plans.”

## Choose learning or evaluation methods from constraints

Algorithm names should come after the data-generating process. Action type narrows the options, but interaction cost, parallelism, partial observability, safety constraints, and the availability of logged data often matter more.

| Situation | Reasonable starting method | Main cost or risk |
| --- | --- | --- |
| Small, known finite MDP | Dynamic programming or tabular temporal-difference methods | State-space growth |
| Discrete actions with an online simulator and reusable transitions | Value-based off-policy methods such as the DQN family | Exploration and value overestimation; replay assumptions |
| Continuous actions where environment steps are expensive | Off-policy actor–critic methods such as SAC or TD3 | More coupled components and sensitivity to scale |
| Many parallel simulators and a simple, well-tested baseline | On-policy policy-gradient methods such as PPO | Discards old policy data and can require many interactions |
| A fixed log, with the goal of learning a new policy | Offline RL methods matched to the data coverage and deployment constraints | Distribution shift and poor action coverage cannot be repaired by optimization alone |
| A fixed log, with the goal of evaluating an existing policy | Off-policy evaluation matched to assumptions about behavior policies and coverage | Unsupported actions and unknown propensities can make the estimate unidentifiable or high-variance |
| A trustworthy model is available or can be learned and validated | Planning or model-based RL | Model bias compounds along imagined rollouts |

The table is an engineering starting heuristic, not a theorem or leaderboard. Primary entry points include the original work on [DQN](https://doi.org/10.1038/nature14236), [TD3](https://proceedings.mlr.press/v80/fujimoto18a.html), [SAC](https://proceedings.mlr.press/v80/haarnoja18b.html), and [PPO](https://arxiv.org/abs/1707.06347), plus an [offline RL tutorial and review](https://arxiv.org/abs/2005.01643) and a primary example of [doubly robust off-policy evaluation](https://proceedings.mlr.press/v48/jiang16.html). Their assumptions and experimental protocols matter more than their names. The [Stable-Baselines3 algorithm guide](https://stable-baselines3.readthedocs.io/en/master/guide/rl_tips.html) is a dated implementation-oriented cross-check for action-space support, not a universal ranking. Start with one mature baseline and a budget small enough to debug. Only add recurrence, value-distribution modelling, prioritized replay, auxiliary losses, or model learning after a simpler system establishes a trustworthy signal.

On-policy and off-policy describe how updates relate to the policy that generated the data. On-policy methods limit reuse to data close to the current policy. Off-policy methods can reuse older data, usually improving sample efficiency, but must manage mismatch between the behavior distribution and the current target. Neither label implies that one family is always more stable or more accurate.

## Design rewards and scales as part of the experiment

### Optimize the intended outcome, not a convenient proxy

A dense reward can make credit assignment easier, but it is not automatically better. Every shaping term changes what is easy to optimize and may open a shortcut. [Reward hacking](https://arxiv.org/abs/1606.06565) is the general failure mode in which the agent scores well under the written objective without accomplishing the designer’s intent.

Use this process:

1. define success metrics that are not all reused as training rewards;
2. test the reward on hand-designed good, bad, stalled, and adversarial trajectories;
3. log every reward component separately;
4. inspect high-return trajectories rather than trusting a scalar curve;
5. evaluate under environment variations that make known shortcuts fail;
6. when violations are unacceptable, use explicit constraints or runtime protections—such as action masks, safety shields, constrained optimization, or independent monitors—and do not rely on one soft reward penalty.

Potential-based shaping has a specific policy-invariance result under its assumptions. A shaping term of the form

$$
F(s,a,s') = \gamma\Phi(s') - \Phi(s)
$$

can preserve optimal policies while altering learning signals; arbitrary progress bonuses do not inherit that guarantee. The guarantee also requires consistent treatment of episode boundaries: finite episodic implementations commonly set the terminal-state potential to zero, while an external truncation must not be silently treated as a terminal state. See [Ng, Harada, and Russell’s reward-transformation paper](https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf).

### Make observation, action, and reward scales explicit

Many common function approximators and optimization configurations are harder to train when feature scales differ by many orders of magnitude. Record preprocessing as part of the environment contract:

- standardize unbounded continuous observations using statistics collected only from training data;
- represent categorical variables deliberately instead of treating arbitrary integer IDs as distances;
- expose continuous policy actions on a simple symmetric range when possible, then transform them to actuator units;
- keep clipping visible and count how often it occurs;
- log raw task return even when the learner uses normalized or scaled rewards.

Changing reward scale, discount, or action transformation can change optimization and sometimes the effective objective. These are experiment parameters, not invisible cleanup.

### Architecture rules are conditional

There is no general rule that convolution, pooling, or batch normalization is unsuitable for RL. Choose inductive biases from the observation and training distribution:

- convolution is useful when local spatial structure is meaningful;
- pooling helps when the discarded location detail is genuinely irrelevant, but hurts tasks requiring precise coordinates;
- batch normalization can be awkward when samples are correlated, replay data mix policies, batches are small, or acting and learning statistics differ; it can still work when statistics and train/evaluation modes are controlled;
- recurrent or attention-based models help only when the supplied history contains information needed to resolve partial observability.

“Orthogonal initialization,” not “orthogonal normalization,” is one possible parameter initialization. It is an implementation choice, not a convergence guarantee. Whenever the architecture changes, compare it under the same environment steps, preprocessing, optimizer budget, and seed protocol.

### Visual pre-training is a transfer hypothesis to measure {#pretraining-is-a-transfer-hypothesis}

Learning control from pixels can spend much of the interaction budget on perception. A pre-trained encoder may reduce that cost, but pre-training is not one treatment and does not guarantee cross-domain value. [Pre-trained Vision Models for Control](https://proceedings.mlr.press/v162/parisi22a.html) compares pre-training methods, augmentation, and feature levels across several control domains; [ATC](https://proceedings.mlr.press/v139/stooke21a.html) decouples representation learning from policy learning and examines frozen encoders, multi-task data, and temporal contrastive objectives; the broader [VC-1 embodied-task evaluation](https://openreview.net/forum?id=6qLzQeFGio) is another reminder that a representation with strong average performance need not be best for every downstream task.

A minimum pre-training experiment compares the following under the same budget:

| Condition | How the encoder is obtained | How it changes during RL | Main identification target |
| --- | --- | --- | --- |
| From scratch | Random initialization | End-to-end with the policy | What current-task data alone can learn |
| Frozen pre-training | External or multi-task data | Fully frozen | Whether a ready-made representation is directly usable |
| Fine-tuned pre-training | The same pre-trained checkpoint | All or selected layers update | Whether adaptation repairs domain mismatch |
| Frozen and online feature fusion | A pre-trained branch plus a task branch | Independent or partially updated branches | Whether general perception and task information complement one another |

All four should share the policy algorithm, environment-step budget, action inputs, seeds, and evaluation tasks. Beyond final return, report early sample efficiency, wall-clock and memory cost, out-of-domain tasks, task-inference stability, and sensitivity to feature level. Freezing, augmentation, batch composition, and non-stationary data interact, so an encoder name alone is not evidence that transfer worked.

## Treat replay as a changing dataset

Replay is useful only for algorithms whose update supports off-policy data. A buffer is not automatically better when it is larger. Capacity trades off:

- **coverage:** retaining rare outcomes and different parts of the state space;
- **freshness:** avoiding domination by behavior from policies that are no longer relevant;
- **memory and throughput:** storing images or long sequences may become the bottleneck;
- **sequence integrity:** recurrent methods may need contiguous segments and burn-in rather than isolated transitions.

Measure the age distribution, reward or terminal-event frequencies, and sampling ratio. If the environment or task changes, version the data or clear the buffer; otherwise the learner may silently mix incompatible transition processes.

Prioritized experience replay (PER) samples transitions using a priority such as temporal-difference error and applies importance weights to reduce sampling bias. The original [PER paper](https://arxiv.org/abs/1511.05952) presents this as a full replay scheme, not a technique restricted to early training. PER may improve learning efficiency, but noisy rewards, outliers, stale priorities, and reduced diversity can make a high error a poor proxy for usefulness. Compare against uniform replay, log effective sample weights, and tune priority strength rather than assuming PER is beneficial.

## Separate training, selection, and evaluation

A training curve is diagnostic evidence, not a final estimate. Maintain at least three roles:

1. **training environments** collect updates and fit normalization statistics;
2. **validation environments** choose checkpoints and hyperparameters;
3. **test environments** are used only for the final reported comparison.

Keep wrappers and task definitions equivalent where intended, but do not share mutable normalization statistics or replay data with evaluation. Decide before running whether evaluation uses deterministic actions, samples from a stochastic policy, or reports both; the choice depends on the deployed policy, not on whichever result is larger.

An evaluation report should include:

- environment and wrapper versions, code revision, hardware, and numerical settings;
- the number of environment interactions and other material compute budgets;
- independent training seeds, not just many episodes from one trained policy;
- per-seed returns and episode lengths, failures, constraint violations, and task-specific metrics;
- a predefined checkpoint-selection rule and baseline implementations under the same budget;
- interval estimates or bootstrap uncertainty, not only the best seed or mean.

[Deep Reinforcement Learning that Matters](https://arxiv.org/abs/1709.06560) documents how implementation and reporting choices change conclusions. [Deep RL at the Edge of the Statistical Precipice](https://arxiv.org/abs/2108.13264) shows why point estimates from a few runs are fragile and motivates interval estimates, performance profiles, and robust aggregate metrics. PyTorch also warns that exact reproducibility is not guaranteed across releases, platforms, or CPU and GPU execution; its [reproducibility notes](https://docs.pytorch.org/docs/stable/notes/randomness) explain how to control random sources and request deterministic algorithms when the debugging benefit justifies the performance cost.

## Debug in layers

When learning fails, change one layer at a time:

1. **Environment:** replay a hand-authored trajectory and verify every observation, reward component, boundary, and metric.
2. **Data:** inspect sampled batches, bootstrap masks, action ranges, sequence boundaries, and replay age.
3. **Loss:** test targets on small tensors; check broadcasting, detached target networks, signs, reductions, and importance weights.
4. **Optimization:** log gradient and parameter norms, NaNs, clipping frequency, entropy or exploration noise, and update-to-data ratio.
5. **Learning signal:** solve a bandit or tiny deterministic MDP, then a standard small environment, before the full task.
6. **Evaluation:** run random, constant-action, scripted, and previous-policy baselines through exactly the same evaluator.

PyTorch provides [`gradcheck`](https://docs.pytorch.org/docs/stable/generated/torch.autograd.gradcheck.html), [autograd anomaly detection](https://docs.pytorch.org/docs/stable/autograd.html#debugging-and-anomaly-detection), and [`torch.profiler`](https://docs.pytorch.org/docs/stable/profiler.html). Use assertions and structured logs for durable diagnostics; Python’s `print()` is still useful for a narrow local probe, but it is not an experiment record.

## Evaluate self-play as a population

Self-play makes the data distribution move because every policy update changes part of the environment. Evaluating only against the latest opponent can hide forgetting and cycles. A simple “higher policy beats lower policy” ladder assumes transitivity, but many games admit rock–paper–scissors-style relations: $A$ beats $B$, $B$ beats $C$, and $C$ beats $A$.

Use a payoff matrix across current and historical checkpoints, fixed scripted opponents, and independently trained populations. Report role or side asymmetry, exploitability when it can be computed, and performance against withheld opponents. Sample opponents from a population or mixture so that training does not overfit one moving target. [Alpha-Rank](https://arxiv.org/abs/1903.01373) is one research example of population-level evaluation for multi-agent interactions. AlphaZero is an important example of successful self-play in perfect-information zero-sum games, but its result does not make naive latest-policy self-play universal; see the [AlphaZero paper](https://arxiv.org/abs/1712.01815).

## Use libraries as replaceable instruments

As of 2026-08-08, useful entry points include:

- [Gymnasium](https://gymnasium.farama.org/) for environment interfaces and wrappers;
- [PyTorch](https://docs.pytorch.org/docs/stable/) for differentiable models, optimization, and diagnostics;
- [Stable-Baselines3](https://stable-baselines3.readthedocs.io/en/master/) for compact reference implementations and experiment utilities;
- [RLlib](https://docs.ray.io/en/latest/rllib/) for distributed sampling and multi-agent workloads;
- [ElegantRL](https://github.com/AI4Finance-Foundation/ElegantRL) as another implementation source to inspect rather than a permanent default.

Record the exact package versions and verify behavior against their tests and documentation. A library can provide a correct interface and still leave task semantics, reward validity, hyperparameter budgets, and statistical claims to the experimenter. The lasting workflow is therefore: specify the process, test the environment, establish a simple baseline, inspect the data, separate evaluation, quantify uncertainty, and only then add algorithmic complexity.

## A research checklist {#a-research-checklist}

Before believing an RL curve, confirm that:

- [ ] task, state, hidden context, and evaluation metrics are defined separately;
- [ ] generation and hold-out rules for training, validation, and test tasks are reproducible;
- [ ] termination, truncation, and bootstrap-mask semantics have been tested on a hand-built trajectory;
- [ ] long-horizon difficulty is decomposed into skill, composition, and planning rather than only changing the discount factor;
- [ ] a pre-trained encoder has budget-matched from-scratch, frozen, fine-tuned, or fusion controls;
- [ ] reward shaping has not changed the real objective without a check;
- [ ] replay capacity, sampling, age, and behavior distribution are recorded rather than only buffer size;
- [ ] baselines include random behavior, a strong task-specific method, and adjacent research routes;
- [ ] curves, failures, and uncertainty are retained for every task and seed;
- [ ] each central claim has an ablation or distribution shift capable of falsifying it.

This checklist does not choose the algorithm for the next study. It does something more basic: before an algorithm name appears, it makes the question clear enough; after a curve appears, it keeps the conclusion open to interrogation.
