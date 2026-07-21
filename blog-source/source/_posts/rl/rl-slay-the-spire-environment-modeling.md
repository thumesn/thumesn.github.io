---
layout: post
title: RL 解决杀戮尖塔（一）：大致回忆研究过程
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
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-01.png" alt="图 1：RL 解决杀戮尖塔（一）">
  <figcaption>图 1：RL 解决杀戮尖塔（一）</figcaption>
</figure>

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

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-02.png" alt="图 2：RL 解决杀戮尖塔（一）">
  <figcaption>图 2：RL 解决杀戮尖塔（一）</figcaption>
</figure>

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

对应实验中最后保留下来的主要参数如下：

```python
config = {
    # 环境：先固定在一个足够小的问题上，避免先被全量杀戮尖塔的状态空间淹没。
    "encounter": "FIXED_SLIMES_WEAK",
    "deck": "Ironclad starter deck",
    "observation_mode": "abs_hp_legacy",
    "obs_dim": 155,

    # reward：不再做最大战损归一化，当前回合真实损失多少 HP 就扣多少。
    # 额外给一个很小的 step penalty，避免无意义拖长战斗。
    "reward": "-step_hp_loss - 0.01",

    # 动作：只对当前 legal candidates 打分，而不是输出固定 115 维动作头。
    "action_encoding": "card_ref_effect_v1",
    "action_feature_dim": 32,
    "max_candidates": 32,

    # 网络。
    "state_encoder": "semantic_pool",
    "hidden_dim": 256,
    "action_hidden_dim": 128,

    # DQN/DDQN。
    "gamma": 0.999,
    "batch_size": 128,
    "replay_capacity": 200_000,
    "learning_rate": 3e-4,
    "learning_starts": 1_000,
    "train_every": 4,
    "target_update_every": 500,

    # 探索。这里后面发现 replay 太小和 epsilon 下降太快都会让策略卡在次优动作上。
    "num_envs": 32,
    "epsilon_start": 0.3,
    "epsilon_end": 0.05,
    "epsilon_decay_steps": 100_000,

    # 后续有效的关键补丁：用搜索挖出来的同状态 better/worse action pair 做 ranking loss。
    "counterfactual_loss_weight": 1.0,
    "counterfactual_margin": 1.0,
}
```

为了避免只是在一个参数上碰运气，中间做过的测试大致如下：

```python
experiments = [
    {
        "name": "PPO + token transformer + card relation prior",
        "setup": {
            "gamma": 0.99,
            "gae_lambda": 0.95,
            "reward_mode": "step",
            "encounter_pool": "weak",
        },
        "result": "mean_hp_loss 约 3.92，max_hp_loss 17，能赢但细节决策差",
    },
    {
        "name": "固定动作头 DQN",
        "setup": "直接输出固定 115 个动作 Q",
        "result": "动作和手牌槽/目标槽绑定太重，迁移性差，放弃",
    },
    {
        "name": "candidate-action DQN",
        "setup": "输入 obs + legal candidate action feature，输出 Q(s, legal_action)",
        "result": "成为后续主线",
    },
    {
        "name": "动作编码消融",
        "tested": ["slot_hash_v1", "semantic_effect_v1", "semantic_effect_v2", "card_ref_effect_v1"],
        "result": "semantic effect 容易描述出当前不存在的卡牌组合，最后改成引用真实手牌槽的 card_ref_effect_v1",
    },
    {
        "name": "observation 消融",
        "tested": ["143-dim legacy", "155-dim abs_hp_legacy", "455-dim pile-slot detailed"],
        "result": "155 维最稳定；455 维完整牌堆槽位反而更难收敛，mean_hp_loss 约 3.12，max 17",
    },
    {
        "name": "gamma 消融",
        "tested": [0.9, 0.999, 1.0],
        "result": "0.9 延迟信用不足，1.0 价值不稳定且容易拖长，0.999 最稳",
    },
    {
        "name": "reward 消融",
        "tested": [
            "按战损 reward",
            "hp loss 归到对应损失回合",
            "战损绝对值：损失 6 HP 就 reward -= 6",
            "每步 -0.01",
            "搜索成功奖励/失败惩罚",
            "过度防御惩罚",
        ],
        "result": "最后保留 -step_hp_loss - 0.01，不再直接绑定搜索 baseline",
    },
    {
        "name": "探索与 replay",
        "tested": ["replay 扩到 200k", "epsilon decay 拉长", "32 env 并行采样"],
        "result": "有帮助，但单靠探索仍然不能稳定解决细粒度动作排序",
    },
    {
        "name": "TD(lambda) / GAE-like 回传",
        "tested": [0.0, 0.5, 0.9, 1.0],
        "result": "没有解决问题，说明核心瓶颈不是简单的多步回传长度",
    },
    {
        "name": "turn-level / oracle search",
        "fix": "搜索必须累计每一步 hp_loss，不能用 start_hp - final_hp，否则 Ironclad 战后回血会掩盖真实战损",
        "result": "oracle mean_hp_loss = 0.1523，max_hp_loss = 11；所以当前 max 11 不是策略 bug",
    },
    {
        "name": "counterfactual ranking loss",
        "method": "沿当前 policy 轨迹挖状态，对同一状态枚举动作，用搜索生成 better/worse action pair",
        "result": "最终 best mean_hp_loss = 0.3711，max_hp_loss = 11，policy_gap_mean = 0.21875，policy_gap_max = 2",
    },
]
```

搜索算法在这里不是为了在线控制，而是作为一个小环境里的 oracle baseline：给定一个 deterministic seed，把这一局的战斗搜索到尽量低的总战损，然后用它判断 RL 策略到底差在哪里。

```python
def search_one_episode(seed, config):
    """Turn-level pruned search。

    目标：minimize total_hp_loss。

    注意这里累计的是每一步真实 hp_loss，而不是 start_hp - final_hp。
    如果用 start_hp - final_hp，Ironclad 战后回血会把真实战损抹掉，搜索结果会偏乐观。
    """
    env = reset_env(seed)

    # priority queue 里的 cost 就是当前累计战损。
    queue = PriorityQueue()
    queue.push(cost=0, env=env, trajectory=[])

    # best_cost 用 canonical state key 去重：同一个状态只保留更低战损路径。
    best_cost = {state_key(env): 0}
    best_terminal = None

    while queue and not hit_expansion_limit():
        cost, env, trajectory = queue.pop_min_cost()

        if best_terminal is not None and cost >= best_terminal.cost:
            continue
        if cost > best_cost.get(state_key(env), float("inf")):
            continue
        if env.done:
            if env.won:
                best_terminal = min_by_cost(best_terminal, (cost, env, trajectory))
            continue

        # 核心：不是一层层展开 primitive action，而是枚举“本回合结束后的状态”。
        # 一个 turn outcome 可以包含若干次打牌，最后以 end_turn 或战斗结束收尾。
        turn_outcomes = enumerate_turn_outcomes(env, base_hp_loss=cost, base_trajectory=trajectory)

        # 每回合只保留评分靠前的一批 outcome，控制搜索规模。
        for child_cost, child_env, child_trajectory in topk(turn_outcomes, config.turn_beam_width):
            if best_terminal is not None and child_cost >= best_terminal.cost:
                continue

            key = state_key(child_env)
            if child_cost >= best_cost.get(key, float("inf")):
                continue

            best_cost[key] = child_cost
            queue.push(cost=child_cost, env=child_env, trajectory=child_trajectory)

    return best_terminal


def enumerate_turn_outcomes(env, base_hp_loss, base_trajectory):
    """枚举从当前状态开始，本回合所有有意义的动作序列。"""
    stack = [(copy(env), base_hp_loss, base_trajectory)]
    outcomes = []
    seen_inside_turn = set()

    while stack and len(outcomes) < TURN_MAX_SEQUENCES:
        current, hp_loss, trajectory = stack.pop()

        # 回合内去重，避免同一状态由等价动作顺序反复到达。
        key = state_key(current)
        if key in seen_inside_turn:
            continue
        seen_inside_turn.add(key)

        if current.done:
            outcomes.append((hp_loss, current, trajectory))
            continue

        actions = legal_actions(current)
        actions = dedupe_equivalent_actions(current, actions)
        actions = sort_by_card_priority(current, actions)
        actions = actions[:MAX_ACTIONS_PER_NODE]

        # 早停剪枝：如果还有攻击牌可打，或者当前已经没有受伤威胁，通常不展开过早 end_turn。
        # 这不是严格证明，只是为了让搜索能在小环境里跑得动。
        if should_prune_early_end_turn(current):
            actions = [a for a in actions if a != END_TURN]

        for action in actions:
            child = copy(current)
            _, _, _, _, info = child.step(action)

            # 关键修正：每一步损失都加到当前路径上。
            child_hp_loss = hp_loss + info["hp_loss"]
            child_trajectory = trajectory + [action_label(current, action)]

            if action == END_TURN or child.done:
                outcomes.append((child_hp_loss, child, child_trajectory))
            else:
                stack.append((child, child_hp_loss, child_trajectory))

    return rank_and_dedupe_turn_outcomes(outcomes)
```

作为一个可行的比较对象。理论最优或者接近最优算法。

## 结果

在初始混合的弱怪池下，很难接近搜索的结果。特别是部分有很高战损
<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-03.png" alt="图 3：测试结果">
  <figcaption>图 3：测试结果</figcaption>
</figure>

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-04.png" alt="图 4：测试战损分布">
  <figcaption>图 4：测试战损分布</figcaption>
</figure>

<figure class="post-figure">
  <img src="/img/posts/rl/rl-slay-the-spire-environment-modeling-fig-05.png" alt="图 5：训练reward 函数">
  <figcaption>图 5：训练reward 函数</figcaption>
</figure>

这里是东西做完的补充，所以会有点简略。


