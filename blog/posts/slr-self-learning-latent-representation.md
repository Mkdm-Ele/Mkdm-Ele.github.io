# SLR  Self\-Learning Latent Representation

project:https://11chens\.github\.io/SLR/

paper:https://arxiv\.org/abs/2406\.04835

code:https://github\.com/11chens/SLR\-master

Conclusion:该方法仅利用本体感知数据，通过编码器自学习环境的潜在特征，实现了在复杂地形下的高性能运动控制





## 1 Abstract

人类可以在没有明确物理参数知识的情况下进行地形导航

本文认为：机器人输入的**特权信息**只是输入到神经网络中，并不是用于求解动态方程，所以这些特权信息可能不会提高基于神经网络的可解释性和有效性

所以，机器人应该能够自学潜在表征，而不是人类预先定义的表征









## 2 Related Works

基于RL的特权学习可以分为：

- 显式估计：根据特权信息直接拟合特定物理参数

- 隐式估计：拟合特权信息的潜在表示



观察历史记录来推断参数





## 3 Method

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmNmMDE2NTBkMjJmMmQwMzY3YWJiYTQ3NzMzMmM0MjhfMDg4MDdiYjgwZWY0MThlODRmZTg0NmE2YzYxMTQyMjhfSUQ6NzYzMjk1MDY5MjcyNjIyOTk3OV8xNzgwMjMyNjg2OjE3ODAzMTkwODZfVjM)

上面是slr的training framework

训练一个encoder，能够将观测转换成隐向量，其中这个隐向量通过critic的反向传播来更新，对于policy这条通路stop gradient

为了防止encoder学习到的特征是无意义的，设计了一个transition Model来强化encoder学习环境的动态规律

Trainsition model输入当前隐向量以及policy输出动作，预测出下一时刻的隐向量（先验），并且与实际的下一时刻隐向量进行区分，同时使得$z_{t+1}$与$z_{t+n} $进行区分，

$\mathcal{L}_{\text{trip}}(z_{t+1}, \tilde{z}_{t+1}, z_{t+n}) = \max \left( \| z_{t+1} - \tilde{z}_{t+1} \|_2^2 - \| z_{t+1} - z_{t+n} \|_2^2 + m, 0 \right), \quad \text{s.t.} \quad n \neq 1 \quad $

也就是说：

- 下一个obs的隐向量$z_{t+1}$作为anchor

- 当前的历史记录作为positive\(因为$\tilde{z}_{t+1}$是根据当前的状态预测出来的\)

- 随机采样的隐向量作为negative





使得：

**1 预测的下一时刻状态接近于当前时刻状态，鼓励了平滑的表征演化**

2 encoder编码隐向量尽量准确

3 不同时刻的状态能够相互区分







