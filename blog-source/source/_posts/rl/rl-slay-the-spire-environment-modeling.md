---
layout: post
title: RL 解决杀戮尖塔（一）
date: 2026-07-20 20:18:00
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

这篇是 “RL 解决杀戮尖塔” 专题的第一篇，也是强化学习真正开始折腾的第一个工作。

## 起点：环境

第一步先找一个合理的强化学习环境，这里就选择上网找了一个一般用于杀戮尖塔的环境https://github.com/zhiyue/sts2-rl-agent

但是存在的问题是，环境的做法是直接对照效果写的，会有很多隐藏问题，包括版本不够新。于是选择用dll 反编译+和原始环境对照，重点是对照随机数的设计等部分。这里首先只对齐了 seed 0 -100 选择随机合理的选项。很多分歧，修复到目前为止，没有必要完全实现 相同的环境，目的能够达到就可以。速度方面，和游戏dll 通信大致时间为
![图 1：RL 解决杀戮尖塔（一）](/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-01.png)

一开始的想法大概是直接利用生成的反编译C# 但是发现C#本身速度也很慢，于是还是选择 dll 对照+python 环境后续训练中会避免太复杂的困难的问题。然后直接使用默认的编码+PPO 开始训练。

环境的细节说明：

 [0:10]    玩家状态
  [10:60]   手牌，10 个槽位 * 5
  [60:66]   牌堆摘要
  [66:131]  敌人，5 个槽位 * 13

  玩家状态 10 维

  0  current_hp / max_hp
  1  block / 50
  2  energy / 10
  3  max_energy / 10
  4  strength / 20
  5  dexterity / 20
  6  vulnerable / 20
  7  weak / 20
  8  frail / 20
  9  artifact / 20

  每个手牌槽 5 维

  card_id_norm
  cost / 5
  base_damage / 50
  base_block / 50
  is_attack

  一共 10 个槽，不存在的槽全 0。

  牌堆摘要 6 维

  draw_pile_size / 20
  discard_pile_size / 20
  exhaust_pile_size / 20
  0
  0
  0

  注意这里没有具体牌堆内容，也没有抽牌概率，只是数量。

  每个敌人槽 13 维

  is_alive
  current_hp / max_hp
  block / 50
  intent_attack
  intent_multi_attack
  intent_defend
  intent_buff
  intent_debuff
  intent_damage / 30
  intent_hits / 5
  vulnerable / 10
  weak / 10
  strength / 10

  一共最多 5 个敌人槽，不存在的槽全 0。

## 初始环节：痴心妄想

既然有环境了 直接上ppo 开始训练 先直接训练战斗 ppo + transformer encoder + 弱怪池
输入
```python
  player_features:        [B, 20]

  state_card_ids:         [B, 70]
  state_card_features:    [B, 70, 16]
  state_card_mask:        [B, 70]
  state_card_zones:       [B, 70]
  state_card_positions:   [B, 70]

  enemy_ids:              [B, 5]
  enemy_features:         [B, 5, 18]
  enemy_mask:             [B, 5]

  action_card_ids:        [B, 115]
  action_target_enemy_ids:[B, 115]
  action_target_slots:    [B, 115]
  action_target_mask:     [B, 115]
  action_features:        [B, 115, 34]
  action_mask:            [B, 115]
```
或者采用 attention 添加几个编码器，或者分层强化学习等结论：

![图 2：RL 解决杀戮尖塔（一）](/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-02.png)

相比于搜索算法平均只有3左右的战损（弱怪初始卡） rl 无论怎么训练都是4左右 而且分布不合理，详细分析轨迹，甚至学不会 bash-> strike 


经过很多次调整 这里就不记录初始阶段很多实验了。先确认这是一个不简单的问题，然后从环境和算法重新开始叙述。

## 算法选择

因为问题本身其实包含了不确定性 所以还是从 弱怪池 初始卡组开始。离散动作 最自然的算法是 dual-dqn（TODO）

