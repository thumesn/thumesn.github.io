---
title: Qwen2.5 技术报告阅读笔记
date: 2026-03-03 21:00:00
categories:
  - 论文阅读
tags:
  - Qwen2.5
  - 论文阅读
  - LLM
---

这篇笔记记录我第一次系统阅读 **Qwen2.5 Technical Report** 的过程。

## 论文信息

- 标题：*Qwen2.5 Technical Report*
- 链接：[arXiv:2412.15115](https://arxiv.org/abs/2412.15115)
- 我关注的问题：Qwen2.5  的训练过程和一些之前没注意到的细节

## 小小细节

开源生态中 主要有 qwen 、llama 、mistral

qwen 2.5 turbo plus 为 moe 架构

数据集中在 知识变成和数学能力上。后训练有一百万的sft dpo grpo 都被使用到了

## 模型架构

### dense 模型
- [Attention 全览](/2026/03/03/attention-overview/)
- [GQA](/2026/03/03/gqa-grouped-query-attention/)
- [SwiGLU](/2026/03/03/swiglu-activation-notes/)
- [RoPE](/2026/03/03/rope-rotary-position-embedding/)
- [QKV Bias](/2026/03/03/qkv-bias-notes/)
- [RMSNorm](/2026/03/03/rmsnorm-notes/)


在 dense 模型上，Qwen2.5 仍然保留了 Transformer-based 主干结构。这里不展开细节，分别拆成独立文章，便于后续持续补充。


### Moe 模型

- [MoE Token 路由](/2026/03/03/moe-token-routing-notes/)

使用特殊的 MoE 层代替常规 FFN 层后，每个 token 不再激活全部专家，而是通过路由器选择少量专家参与计算。

### token

- 在报告里，token 规模扩到更高量级，是能力提升的重要基础。
- 控制 token 从 3 扩充到 22 后，工具调用与结构化能力也更容易做分工优化。

## 对齐训练流程

- [SFT（监督微调）](/2026/03/03/sft-supervised-finetuning-notes/)
- [DPO（直接偏好优化）](/2026/03/03/dpo-direct-preference-optimization-notes/)
- [PPO（策略优化）](/2026/03/03/ppo-policy-optimization-notes/)

## 最关键的三点更新

1. **预训练规模继续放大**：报告提到预训练 token 规模从约 `7T` 扩展到约 `18T`，数据覆盖和分布广度显著提升。
2. **对齐数据与流程加强**：指令数据规模扩展到百万级，并采用多阶段 SFT + 基于反馈的强化学习流程。
3. **产品化分层更清晰**：Max / Turbo / Plus 的定位区分明显，兼顾极致能力与推理成本。

## 训练与对齐流程理解

我把这份报告里的训练路线压缩成一个四步框架：

1. 大规模预训练打底（知识与语言能力）
2. 高质量指令样本做监督微调（行为格式化）
3. 偏好数据驱动强化学习（回答风格与稳定性）
4. 面向不同产品形态做策略与效率平衡（Max/Turbo/Plus）

这条路线的价值不在“某个单点技巧”，而在于把**能力**、**可控性**和**服务成本**放在同一体系里优化。

## 怎么读实验结论

报告在摘要层面给了几个关键信号（以下为作者报告结果）：

- Qwen2.5-Max 在公开基准上相较当时部分同规模或更大规模开源模型有竞争力。
- Qwen2.5-Turbo 与 Qwen2.5-Plus 分别对标不同成本档位，强调“性能/延迟/成本”的工程折中。

我自己的阅读策略是：先看趋势和方法论，再在实测中验证“是否适合我的任务”，而不是只看单一榜单名次。

## 启发与后续计划

1. 做模型评估时必须并行看三件事：能力上限、稳定性、单位成本。
2. 构建自己的“小型偏好数据集”很重要，能明显提升回答风格的一致性。
3. 下一步我会针对自己的中文技术写作任务，做一轮 Qwen2.5 与现有方案的 A/B 对比。

如果你也在做 LLM 工程化，建议从“任务目标 + 预算约束 + 可观测指标”这三点出发读报告，会更快抓住真正有用的信息。
