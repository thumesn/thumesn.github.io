---
title: GQA（Grouped Query Attention）技术拆解
date: 2026-03-03 22:00:00
categories:
  - 技术笔记
  - 架构拆解
tags:
  - GQA
  - Attention
  - LLM
---

这篇文章聚焦 GQA（Grouped Query Attention）的核心动机、实现方式和工程价值。

## 为什么会有 GQA

标准 Multi-Head Attention 在推理阶段需要缓存大量 KV，模型越大、上下文越长，KV Cache 压力越高。

GQA 的核心目标是：在尽量少损失效果的前提下，降低 KV Cache 和带宽开销。

## 核心思想

GQA 把多个 Query Head 共享到同一组 Key/Value Head 上：

- Query 头数保持较高，维持表达能力
- Key/Value 头数减少，降低缓存和访存开销

可以理解为：用更少的 K/V “服务”更多的 Q。

## 与 MHA / MQA 的关系

1. MHA：每个 Q 头对应独立 K/V 头，开销最大。
2. MQA：所有 Q 头共享同一组 K/V，开销最小但表达可能受限。
3. GQA：介于两者之间，在效果与成本之间做折中。

## 工程收益

常见收益方向：

- 更小的 KV Cache 占用
- 更低推理延迟（尤其长上下文）
- 更高吞吐（服务侧更明显）

## 实战建议

1. 先在你的主任务集上做 A/B，对比质量与吞吐。
2. 不只看平均指标，关注长上下文和高并发下表现。
3. 结合量化与缓存策略，GQA 的收益通常更明显。

## 小结

GQA 不是“免费午餐”，但在大模型线上推理里往往是很实用的中间解法。
