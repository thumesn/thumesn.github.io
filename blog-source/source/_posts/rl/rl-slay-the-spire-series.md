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
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01-5.png" alt="图 1：RL 解决杀戮尖塔2：从环境开始重新考虑">
  <figcaption>多一个辅助头结果</figcaption>
</figure>
还是和baseline 差别很大

## 回放

存在的问题其实是因为好的经验回放不够 最终采用了DQfD；加入标准的内容多次回放。
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-series-fig-01-6.png" alt="DQfD">
  <figcaption>DQfD</figcaption>
</figure>

## 总结

• 环境

  当前训练的是自写的快速打牌环境：

  SimpleStarterWeakEnv
  backend: PythonFastCombatEnv
  角色: Ironclad
  初始卡组: 5 Strike + 4 Defend + 1 Bash
  最大回合: 20
  reward_mode: battle_loss
  reward: 每步 -实际损失 HP

  敌人只来自 weak pool：

  SHRINKER_BEETLE_WEAK      单怪，HP 38-40
  FUZZY_WURM_CRAWLER_WEAK   单怪，HP 55-57
  NIBBITS_WEAK              单怪，HP 42-46
  SLIMES_WEAK               3 怪，小/中史莱姆

  训练 seed 从 20260719 递增。
  demo teacher seed 从 20440719 递增。
  固定 eval seed 是：

  20590719..20590750

  环境输入输出

  环境输入：

  action_id

  动作空间是固定离散动作：

  - 0: end turn
  - play card without target
  - play card with target
  - potion action 预留

  环境输出：

  obs
  reward
  terminated
  truncated
  info

  其中 info 包含：

  action_mask
  hp_loss
  won
  summary

  summary 包括玩家 HP、能量、手牌、牌堆、敌人 HP/block/intent。

  网络输入输出

  使用 token observation，不是 flat vector。

  状态 token 包括：

  - player token：HP、block、energy、turn、incoming damage 等
  - card tokens：hand / draw / discard / exhaust 中的牌
  - enemy tokens：monster id、HP、block、intent、alive/targetable
  - effect tokens：power/status/relic-like effects
  - pile tokens：draw/discard/exhaust 聚合
  - candidate action tokens：每个合法/非法动作的候选表示

  网络结构：

  state tokens -> Transformer encoder
  candidate action tokens -> cross attention over state tokens
  dueling Q head -> Q(s, action)
  aux heads -> 一步后果预测

  网络输出：

  Q(s, action_1)
  Q(s, action_2)
  ...
  Q(s, end_turn)

  以及辅助输出：

  damage
  block_gain
  energy_after
  target_hp_after
  player_block_after
  forced_end_hp_loss
  status_delta
  trigger flags
  legal

  训练方法

  核心是 Dueling DQN + Monte Carlo return target：

  G = 0
  for transition in reversed(episode):
      G = reward + gamma * G
      transition.return_target = G

  没有再用 bootstrap TD target，当前 Q 直接拟合 episode return-to-go。

  额外方法：

  - transition auxiliary loss：预测一步执行结果
  - turn-level teacher demo
  - DQfD-style demo replay
  - teacher CE loss
  - teacher large-margin loss
  - online elite replay：训练中发现低战损/刷新 best 的胜利轨迹永久放进 demo replay
  - 固定 seed eval

  当前固定 eval run：

  checkpoint_step_330000.pt
  W&B: https://wandb.ai/thumesnn/sts2/runs/rp3exwff

  主要结果

  固定 eval seed 20590719..20590750，原始环境：

  模型 step 330000:
    mean HP loss = 3.4375
    max HP loss  = 11
    win rate     = 1.0

  turn-level baseline:
    mean HP loss = 3.65625
    max HP loss  = 11
    win rate     = 1.0

  所以在原始 weak pool 上，模型已经略好于当前 turn-level greedy baseline。

  泛化测试 1：怪物 HP scale

  0.75x: model 1.34, baseline 1.44
  1.00x: model 3.44, baseline 3.66
  1.25x: model 8.13, baseline 5.94
  1.50x: model 11.88, baseline 10.19
  2.00x: model 27.47, baseline 25.13

  结论：训练分布附近能泛化；怪物变厚后明显退化，说明跨回合击杀节奏泛化不足。

  泛化测试 2：两张 Strike 升级成 9 伤害

  model mean HP loss    = 1.625
  baseline mean HP loss = 1.34375
  diff = +0.28125
  win rate = 1.0

  结论：模型能利用更高伤害，战损明显下降，但不如同环境下的 turn-level baseline，说明“升级牌改变击杀线”的泛化不完全。

  当前判断

  输入信息基本够，aux head 也不是坏的：

  damage MAE 正常环境约 0.55 HP
  升级 Strike OOD 约 0.96 HP
  legal accuracy 约 0.999

  主要问题不是环境看不到信息，而是：

  Q head / teacher target / 跨回合 credit assignment

  尤其是怪物 HP 变厚或牌伤害变化后，Bash、Defend、Strike 的跨回合排序不够稳。
