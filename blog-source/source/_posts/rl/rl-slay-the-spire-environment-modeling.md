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

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class CardRefCandidateD3QN(nn.Module):
    """给当前合法动作候选逐个打 Q 分数。

    这里不是固定输出 115 个动作头，而是输入一组 legal candidates：
      obs:        [B, 155]
      candidates: [B, C, 32]，C <= 32

    这样做的原因是动作本身依赖当前手牌和目标。候选动作只引用“第几张手牌/第几个敌人”，
    卡牌和敌人的具体状态从 obs 中取，避免凭空组合出当前不存在的卡牌动作。
    """

    def __init__(self, hidden_dim=256, action_hidden_dim=128):
        super().__init__()

        # obs = player(10) + hand(10*5) + deck_summary(18) + enemy(5*13) + abs_hp(12)
        self.player_encoder = mlp(12, 64, 64)   # 玩家基础状态 + 当前/最大 HP
        self.card_encoder = mlp(5, 64, 64)      # 每个手牌槽：id/cost/damage/block/is_attack
        self.deck_encoder = mlp(18, 64, 64)     # 牌堆摘要：数量、关键牌计数、下回合期望
        self.enemy_encoder = mlp(15, 64, 64)    # 敌人状态 + 当前/最大 HP

        # pooled hand = mean + max, pooled enemy = mean + max
        self.state_encoder = mlp(64 + 128 + 64 + 128, hidden_dim, hidden_dim)

        # candidates 的前 18 维是动作类型和 hand/target 引用；后 14 维是动作预览特征。
        self.preview_encoder = mlp(14, action_hidden_dim, action_hidden_dim)

        # 对每个候选动作输出一个 Q(s, a)。
        self.q_head = nn.Sequential(
            nn.Linear(hidden_dim + 64 + 64 + action_hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, obs, candidates):
        # candidates: [B, C, 32]
        state_hidden, card_emb, enemy_emb = self.encode_state(obs)

        # candidate action 编码：
        #   [0]      is_end_turn
        #   [1]      is_card
        #   [2:12]   hand_slot_onehot
        #   [12]     target_none
        #   [13:18]  target_slot_onehot
        #   [18:32]  damage/block/lethal/incoming 等动作预览
        hand_ref = candidates[:, :, 2:12]
        target_ref = candidates[:, :, 13:18]
        is_card = candidates[:, :, 1:2]

        # 关键设计：动作只是引用当前真实手牌和真实敌人。
        # selected_card / selected_enemy 会随 state 改变，不会产生“不存在的卡牌动作”。
        selected_card = torch.matmul(hand_ref, card_emb) * is_card       # [B, C, 64]
        selected_enemy = torch.matmul(target_ref, enemy_emb)             # [B, C, 64]
        selected_enemy = selected_enemy * target_ref.sum(-1, keepdim=True).clamp(max=1.0)

        preview = self.preview_encoder(candidates[:, :, 18:])            # [B, C, 128]
        state = state_hidden.unsqueeze(1).expand(-1, candidates.shape[1], -1)

        q = self.q_head(torch.cat([state, selected_card, selected_enemy, preview], dim=-1))
        return q.squeeze(-1)                                             # [B, C]

    def encode_state(self, obs):
        # 155 维 observation 的拆分。
        player_base = obs[:, 0:10]
        hand = obs[:, 10:60].reshape(-1, 10, 5)
        deck = obs[:, 60:78]
        enemy_base = obs[:, 78:143].reshape(-1, 5, 13)
        player_abs_hp = obs[:, 143:145]
        enemy_abs_hp = obs[:, 145:155].reshape(-1, 5, 2)

        player = torch.cat([player_base, player_abs_hp], dim=-1)         # [B, 12]
        enemy = torch.cat([enemy_base, enemy_abs_hp], dim=-1)            # [B, 5, 15]

        player_emb = self.player_encoder(player)                         # [B, 64]
        card_emb = self.card_encoder(hand)                                # [B, 10, 64]
        deck_emb = self.deck_encoder(deck)                                # [B, 64]
        enemy_emb = self.enemy_encoder(enemy)                             # [B, 5, 64]

        card_mask = hand[:, :, 0] > 0
        enemy_mask = enemy_base[:, :, 0] > 0
        card_pooled = masked_mean_max(card_emb, card_mask)                # [B, 128]
        enemy_pooled = masked_mean_max(enemy_emb, enemy_mask)             # [B, 128]

        state_hidden = self.state_encoder(
            torch.cat([player_emb, card_pooled, deck_emb, enemy_pooled], dim=-1)
        )                                                                # [B, 256]
        return state_hidden, card_emb, enemy_emb


def mlp(input_dim, hidden_dim, output_dim):
    return nn.Sequential(
        nn.Linear(input_dim, hidden_dim),
        nn.ReLU(),
        nn.Linear(hidden_dim, output_dim),
        nn.ReLU(),
    )


def masked_mean_max(x, mask):
    """对变长手牌/敌人槽做 mean+max pooling。"""
    mask_f = mask.float().unsqueeze(-1)
    mean = (x * mask_f).sum(dim=1) / mask_f.sum(dim=1).clamp_min(1.0)
    max_value = x.masked_fill(~mask.unsqueeze(-1), -1e9).max(dim=1).values
    max_value = torch.where(mask.any(dim=1, keepdim=True), max_value, torch.zeros_like(max_value))
    return torch.cat([mean, max_value], dim=-1)


def double_dqn_target(online, target, batch):
    """D3QN/DDQN 的 target 计算。

    replay 中保存的是 action_feature，而不是固定动作 id：
      obs, action_feature, reward, discount, next_obs, next_candidates, next_candidate_mask
    """
    chosen_q = online(batch.obs, batch.action_feature.unsqueeze(1)).squeeze(1)

    with torch.no_grad():
        # online 网络负责选择下一步动作。
        next_online_q = online(batch.next_obs, batch.next_candidates)
        next_online_q = next_online_q.masked_fill(~batch.next_candidate_mask, -1e9)
        next_action_index = next_online_q.argmax(dim=1)

        # target 网络负责估值，降低 max over Q 的过估计。
        next_target_q_all = target(batch.next_obs, batch.next_candidates)
        next_target_q = next_target_q_all.gather(1, next_action_index[:, None]).squeeze(1)

        expected_q = batch.reward + batch.discount * next_target_q

    loss = F.smooth_l1_loss(chosen_q, expected_q)
    return loss


```
