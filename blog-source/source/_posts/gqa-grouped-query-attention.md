---
title: GQA（Grouped Query Attention）技术拆解
date: 2026-03-03 22:00:00
categories:
  - 技术
  - LLM
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

## 模型架构
1. 分组投影：将查询头分为 G 组，每组共享一套 K/V 头。
- 公式：假设总共有 H 个 Query 头，分成 G 组，每组有 H/G 个 Query 头共享同一套 K/V 头。
$Q_g=XW^{g}_{q},K_{g}=XW^{g}_{k},V_{g}=XW^{g}_{v}$
其中 $W^{g}_{q}, W^{g}_{k}, W^{g}_{v}$ 分别是第 g 组的查询、键和值的权重矩阵。其中每个 $Q_{g}$ 包含 $H/G$ 个 Query 头，$K_{g}$ 和 $V_{g}$ 则是对应的 Key 和 Value 头。每组共享同一套 K/V 头。

2. 注意力计算：每组 Query 头分别与对应的 K/V 头计算注意力。
- 公式：对于第 g 组的 Query 头，计算注意力输出为
$$\text{Attention}_g(Q_g, K_g, V_g) = \text{softmax}\left(\frac{Q_g K_g^T}{\sqrt{d_k}}\right)V_g$$
最终的输出是所有组的注意力输出的拼接或加权输出

3. 输出融合：将各组的注意力输出进行融合，得到最终的注意力输出。
$Z = Concat(\text{Attention}_1, \text{Attention}_2, ..., \text{Attention}_G)W_{O}$

