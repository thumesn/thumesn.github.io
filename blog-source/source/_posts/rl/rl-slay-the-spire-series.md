---
layout: post
title: RL 解决杀戮尖塔2：从环境开始重新考虑
date: 2026-07-20 20:16:21
tags:
  - Reinforcement Learning
  - RL
  - Slay the Spire
  - Game AI
categories:
  - 技术
  - 强化学习
  - 杀戮尖塔
---

## 环境问题考虑

现在的环境observation 肯定是不够的，对于排队和弃牌堆没有刻画；同时对于怪物的ai，严格来说也应该会有一个大致记忆；对于特殊效果考虑编码。

问题就是序列过大导致状态空间有点过大了，纯探索的话，难以探索到最优轨迹，也难以收敛到最优轨迹。

### 状态空间
  - player: 13 维，含绝对 HP、block、energy、powers、incoming enemy damage。
      - hand: 10 张牌，每张 16 维，含类型、目标、exhaust/draw/vulnerable 等信息。
      - piles_and_next_draw: 981 维，含 draw/discard/exhaust 三牌堆 size、tracked counts、ordered slots、next draw summary。
      - enemies: 5 个敌人，每个 23 维，含 HP、block、buff/debuff、intent one-hot、intent damage/hits/block/strength/slimed/shrink 等效果


## 直接进行训练  
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01.png" alt="训练结果">
  <figcaption>训练结果</figcaption>
</figure>


使用搜索 + qlearning 的方式进行，环境搜索各种情况

## 动作空间新设计

考虑到具体的效果，和泛化性质，决定使用encoder 编码后进一步训练。直接的训练效果如下

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01-1.png" alt="训练分布">
  <figcaption>训练分布</figcaption>
</figure>

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-02.png" alt="训练曲线">
  <figcaption>训练曲线</figcaption>
</figure>

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-03.png" alt="reward曲线">
  <figcaption>reward曲线</figcaption>
</figure>

是不是encoder 编码不够好呢，进行校验任务冻结mlp检验

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01.png" alt="冻结检验">
  <figcaption>冻结检验</figcaption>
</figure>

辅助纳入校验：无效
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01-3.png" alt="图 1：RL 解决杀戮尖塔2：从环境开始重新考虑">
  <figcaption>图 1：RL 解决杀戮尖塔2：从环境开始重新考虑</figcaption>
</figure>

探索可能过少 从20k 改动50k，把 return 逐步改为整体结果,还是无法降低到 搜索的水平
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01-4.png" alt="reward曲线">
  <figcaption>reward曲线</figcaption>
</figure>

新增了 forced_end_hp_loss 辅助目标：

  对每个 state + candidate_action：
  先模拟执行 action
  再强制 END_TURN
  记录真实掉血
