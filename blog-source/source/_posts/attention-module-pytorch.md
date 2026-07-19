---
title: Attention 模块代码实现（PyTorch）
date: 2026-03-04 09:30:00
categories:
  - 技术
  - 代码
tags:
  - LLM
---

这篇文章放一个可直接复用的 Attention 模块实现，并和理论文对应。

- 对应原理文章：[Attention 全览：从 MHA 到 GQA、RoPE 与工程优化](/2026/03/03/attention-overview/)

## 最小可用实现

下面是一个标准的 Scaled Dot-Product Attention 模块，支持 mask。

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math
class ScaledDotProductAttention:
  def __init__(self,dropout):
      self.dropout = nn.Dropout(dropout)
      super().__init__()
  
  def forward(
    self,q,k,v,mask = None
  ):
  """
    q:(batch_size,num_heads,seq_len,d_model)
    k,v

  """

  scale = 1/math.sqrt(q.shape(-1)) # 长度
  scores = torch.matmul(q,k.transpose(-2,-1)) *scale
  # mask [B,1,L,L] 广播机制
  # 按照最后一个维度softmax
  # shape [B,H,L,L]
  if mask is not None:
    scores = scores.masked_fill(mask == 0,-1e9)
  attn_weights = F.softmax(scores,dim = -1)
  attn_weights = self.dropout(attn_weights)

  output = torch.matmul(attn_weights,value)

  return output,attn_weights

class MultiHeadAttention(nn.Module):

  def __init__(self,d_model,num_heads,dropout):
    super().__init__()

    assert d_model %num_heads ==0,"model 必须被整除"
    self.d_model = d_model
    self.num_heads = num_heads
    self.d_k = d_k


    self.W_q = nn.Linear(d_model,d_model)
    self.W_k = nn.Linear(d_model,d_model)
    self.W_v = nn.Linear(d_model,d_model)
    self.W_o = nn.Linear(d_model,d_model)

    self.attention = ScaleDotProductAttention(dropout=dropout)

    self.dropout = nn.Dropout(dropout)


def _split_heads(self,x):
  """"""

```

## 快速测试

```python
B, H, L, D = 2, 4, 8, 16
q = torch.randn(B, H, L, D)
k = torch.randn(B, H, L, D)
v = torch.randn(B, H, L, D)
mask = torch.ones(B, 1, L, L)

attn = ScaledDotProductAttention(dropout=0.1)
out, weights = attn(q, k, v, mask=mask)
print(out.shape, weights.shape)  # (2, 4, 8, 16) (2, 4, 8, 8)
```

## 常见坑

1. `mask` 维度不匹配导致广播错误。
2. `float("-inf")` 在低精度下可能出现数值问题，可按场景替换为较小常数。
3. 推理时要结合 KV Cache，而不是每步重算全部历史。

## 下一步扩展

1. 把这个模块封装进 Multi-Head Attention。
2. 增加 causal mask 支持自回归生成。
3. 对接 FlashAttention 内核做性能优化。
