---
title: Reinforcement Learning Issues
author: Yiyu Chen
date: 2021-09-17 00:00:00 +0800
categories: [Blogging, Reinforcement Learning]
tags: [Reinforcement Learning]
math: True
excerpt: This article is about Reinforcement Learning issues. 
---

This article takes notes of Reinforcement Learning issues I've seen. Continuously updated.

### Learning

I suggest in the following order:

1. Python (or other language)
2. PyTorch (or other Deep Learning package)
3. Deep Supervised Learning (e.g. MNIST handwriting recognize)
4. Tabular Reinforcement Learning (e.g. Q-Learning, TD($\lambda$))
5. Deep Q-Learning (e.g. DQN, D3QN)
6. Policy Gradient methods (e.g. DDPG, SAC, PPO, TD3)
7. Advanced works (e.g. AlphaGo, MuZero, Agent57)

#### Python

[菜鸟教程](https://www.runoob.com/python3/python3-tutorial.html) (Chinese)

#### Multi-Armed Bandit

[The Multi-Armed Bandit Problem and Its Solutions, LiLian Weng](https://lilianweng.github.io/lil-log/2018/01/23/the-multi-armed-bandit-problem-and-its-solutions.html)

#### Deep Reinforcement Learning

[A (Long) Peek into Reinforcement Learning, LiLian Weng](https://lilianweng.github.io/lil-log/2018/02/19/a-long-peek-into-reinforcement-learning.html)

[Policy Gradient Algorithms, LiLian Weng](https://lilianweng.github.io/lil-log/2018/04/08/policy-gradient-algorithms.html)

#### Advanced works

[MuZero, 知乎](https://zhuanlan.zhihu.com/p/206735209) (Chinese)

### Existing Kits

#### RLlib

<https://docs.ray.io/en/master/rllib.html>

- The popular all-round open-source library
- Takes time to learn

#### ElegentRL

<https://github.com/AI4Finance-Foundation/ElegantRL>

- A lightweight and scalable open-source library
- Easy to learn
- Developing and improving

### Environment

Generally an Environment class is deriving **gym.Env**, and following the interface definitions.

Generally the **computational costs** of Environment centers at CPU.

### State

#### Representation

Many popular CNN structure doesn't fit Reinforcement Learning, including

- Batch Norm
- Shift-invariance operations, e.g. pooling

and sometimes needs

- Orthogonal normalization at the output layer for deep layers
- Low Learning Rate or freezing parameters for increasing number of parameters

### Replay Buffer

Replay Buffer should be as large as possible to **describe the Environment and Policy**.

While Replay Buffer couldn't be large enough, try lower the Learning Rate.

#### Priority Experience Replay (PER)

Priority Experience Replay will result in data **distribution shift** for Deep Network, and this has great impact on performance when Rewards are dense. Generally we use PER in early training stage.

As an improvement, try **Self Imitation Learning**.

### Self-Play

#### How to evaluate a policy with baseline unavailable?

One idea: manage a baseline policy set composed by policies in history.

1. Record history policies during training.
2. Grade policies by 'domination'. That is, higher level policies suppress lowers.
3. Draw policies from each level to form the baseline policy set.

### Testing Methods

Reinforcement Learning methods are more complicated than supervised ones. When BUGs arise, it's often clueless to continue. Here are some advices:

- **From easy to hard.** For examples, build D3QN via DQN, or build hard Env via basic Env, or test RL methods on simple environments such as 'gridworld', 'cartpole', or modify RL methods base on a mature work.
- Write **test for each module** in the method such as Replay Buffer.
- **Learn more** about RL, PyTorch/Tensorflow, Python, etc.

#### Tools

- PyCharm profiler
- memory_profiler, line_profiler
- Breakpoints
- Print()

