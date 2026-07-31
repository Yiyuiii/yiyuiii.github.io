---
layout: page
title: Research
permalink: /research/
description: The formal research threads behind some of the tools, benchmarks, and experiments.
nav: true
nav_order: 4
published: false
---

My research is organized around a common question: **how can an intelligent
system make better decisions when interaction is costly, the task changes, and
the evaluator is imperfect?**

## Decision-making and reinforcement learning

I am interested in reusable decision-making: policies and representations that
transfer across tasks instead of solving each environment from scratch. This
includes reinforcement and imitation learning, meta-learning, constrained
optimization, and the practical evaluation of learned strategies.

Current questions include:

- how to identify which knowledge is truly transferable across tasks;
- how to combine priors, demonstrations, and online feedback;
- how to evaluate long-horizon behavior without hiding failure modes inside a
  single aggregate score.

## High-dimensional Bayesian optimization

Bayesian optimization is attractive when evaluations are expensive, but many
methods become difficult to compare or trust as dimensionality grows. My work
includes benchmark design, supervised dimension reduction, and trust-region
methods for high-dimensional black-box optimization.

[HDBO-B](https://github.com/Yiyuiii/HDBO-B) provides a common testbed of
hand-designed functions, realistic tasks, and baseline algorithms. Related work
studies when dimension reduction helps and how second-order information can
improve trust-region search.

## LLM agents and evaluation

I build tools for LLM-based software agents and study the surrounding
**harness**: task decomposition, skills, tool routing, independent review, and
evaluation over long-running changes. The goal is not only to make an agent
produce code, but to make its work inspectable, reproducible, and meaningfully
testable.

This direction also motivates work on Code Agent benchmarks and simulation
environments in which failures can be attributed to specific capabilities
rather than a vague end-to-end score.

## Simulation and interactive systems

I am exploring reusable Gym-style environments, strategy visualizations, and
small interactive tools. Quantitative board-game analysis is a useful
side-domain: it turns complex rules into explicit models of value, timing,
risk, and opponent response.

See [Projects]({{ '/projects/' | relative_url }}) for implementations and
[Writing]({{ '/blog/' | relative_url }}) for longer analyses.
