# SEA\-Nav

project：https://11chens\.github\.io/sea\-nav/

paper：https://arxiv\.org/abs/2603\.09460v1

code：https://github\.com/11chens/SEA\-Nav\-Code

Conclusion：通过一个可微分的安全机制shield来修正动作，使用2D liDAR进行感知，实现在复杂环境里面的敏捷 \+ 防撞的navigation，采用分层的方式，actor输出的是速度command，输入到底层locomotion来产生动作（底层locomotion使用Dynamic Locomotion in the Mit Cheetah 3 Through Convex Model\-Predictive Control 这个MPC的控制器）



复现Readme：

注意：按照项目中提供的readme会报错：

ModuleNotFoundError: No module named \&\#39;rsl\_rl\.env\&\#39;

经过核查，发现sea\-nav提供的rsl\_rl库是v1\.0\.2版本，但是里面没有env这个文件夹，需要先git clone一个rsl\_rl库，复制这个库到sea\-nav里面的rsl\_rl库，然后安装sea\-nav里面的rsl\_rl库（不要安装你git clone的rsl\_rl库）



## 0 Installation

### 0\.1 Environment Setup

Create a new Python virtual environment with Python 3\.8:

```Bash
conda create -n sea_nav python=3.8
conda activate sea_nav
```



### 0\.2 Install Isaac Gym

- Download and install Isaac Gym Preview 4 from [NVIDIA Developer](https://developer.nvidia.com/isaac-gym)\.

- Install the python package:

```Bash
cd isaacgym/python && pip install -e .
```



### 0\.3 Install rsl\_rl \(PPO implementation\)

```Bash
git clone https://github.com/leggedrobotics/rsl_rl
cd rsl_rl
git checkout v1.0.2
cd rsl_rl

cp -r env ~/Workspace/code/SEA-Nav-Code/training/rsl_rl/rsl_rl/

cd ~/Workspace/code/SEA-Nav-Code/training/rsl_rl
pip install -e .
```



### 0\.4  Install legged\_gym

- Clone this repository

- Install the package:

```Bash
cd training/legged_gym && pip install -e .
```



除此之外还需要：

```Python
pip install numpy==1.21
pip install tensorboard
```





### 0\.5 Training

To start training in headless mode:

```Bash
python training/legged_gym/legged_gym/scripts/train.py --headless
```



### 0\.6 Testing

To visualize and test a trained policy:

```Bash
python training/legged_gym/legged_gym/scripts/play.py
```











## 1 Abstract

为了探明在RL中的安全边界应该怎么得到，recent work提出了很多安全控制方法，比如VO，CBF\(Control Barrier Functions\) 。但是这些现有的方法存在以下问题：

- 作为后处理过滤器的时候影响了端到端的信用分配，也就是牺牲了强化学习模型端到端的学习能力，没有真正内化了安全意识

- 面对多重约束的时候无法保证稳定性，导致了振荡和保守的“freezing”现象 \.e\.g:机器人左右全都有障碍物，为了保证绝对安全，直接不动了





主要实现了：

- 在复杂的密集环境中的高难度敏捷避障

- 首次做到了分钟级别的训练时间，只需要几十分钟就能够进行训练好然后部署



主要有三个核心部件：

- **自适应碰撞状态初始化ACSI**：是一种基于curriculum引导的临界状态重播策略。当机器人发生碰撞的时候，不会将其直接重置到起点，而是有概率地将机器人重新放置在碰撞前的高风险局部区域，使得机器人能够重复练习极限状态下的避障，迅速积累高价值的经验

- **端到端自适应LSE\-CBF安全层**：这个安全层不是一个神经网络，而是基于控制障碍函数的解析型数学投影层，**作为Actor网络的后处理步骤**    其输入分别为：

    - Actor网络的输出的速度指令和动态的安全增益参数$\alpha_t$

    - 来自环境的安全几何映射：融合了41根离散激光雷达射线后计算出的全局平滑安全裕度h\(x\)以及空间梯度（李导数）

    输出为：经过数学投影修正后的最终安全速度指令

    安全层的输出不是策略网络的输入，也不是强化学习的环境奖励，而是通过损失函数深度参与了强化学习的梯度更新：比如惩罚标称动作与最终安全动作之间的差异（MSE）

- **运动学动作正则化**：为了防止策略网络生成具有破坏性的动作指令，或者不平滑的动作指令，加入了正则化损失函数，增强了指令的安全性











## 3 Method

### 3\.A 关键挑战

- 稠密环境的探索挑战：保证碰撞和到达奖励取得平衡，主要使用ACSI解决，延长关键但是稀疏经验的学习时间

- 安全的RL约束：不能只在测试的时候加上安全限制后处理，而应该在训练过程中塑造导航方案，使用自适应多约束CBF的可微分障碍层这个actor后处理层解决

- 机器人的动力学限制：高速急转弯可能导致不安全，通过动作的正则化缓解





### 3\.B pipeline

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MWI2OTRlY2E3MTY3NWE1MDkwODAwZGI2MWQ3MjE4NWFfN2IwYTdiYjMzOThhMmIyZDIzYTMxNTU2ZGE1M2JkMzFfSUQ6NzYzMDY3MDYxMTY5ODU1MTc1N18xNzc5ODc4MzU3OjE3Nzk5NjQ3NTdfVjM)



机器狗得到obs  $\rightarrow  $  将10帧的历史观测（LiDAR数据 \+ 本体观测）进行encode，变成一个特征向量，然后与当前的观测通过backbone网络进行融合  $\rightarrow  $ 

- 观测给到alpha head\(一个多层感知机回归头\)，输出自适应增益系数alpha衡量动作应该采取什么程度的安全系数  

- 观测给到actor网络输出没有安全限制的动作，实际上是一个速度command\[v\_x,v\_y,omega\_z\]

- 观测给到critic网络，预测value，用于后续的强化学习

$\rightarrow  $ alpha和action经过LSE\-CBF shield，输出filered action，即被过滤后的安全动作，实际上是一个速度command

$\rightarrow  $ action和value经过PPO进行网络参数更新



注意：

- 这个LSE\-CBF shield不是简单的后过滤，其本身是可微的，所以可以在强化学习的过程中进行更新，输出安全动作

- 强化学习损失：PPO loss，sheild loss，正则化loss





细节：

- 架构内的所有网络\(包括encoder，backbone，actor，alpha head，critic\)全都是MLP组成的



### 3\.C  ACSI Adaptive collision\-state Initialization

自适应碰撞重放机制：一旦发生碰撞，环境不会立即重置为初始状态，而是提取碰撞前短时间内的历史状态，并且**以一定的概率**将机器人重置到碰撞前的局部高风险区域，保留当时的姿态和速度



curriculum设置为：基于成功率reset，随着reach概率增加，reset概率值也会动态增加

$P_{reset} = P_{min}  + (P_{max} -P_{min})\cdot clip(L_{goal},0,1)$

**在训练的早期，使得robot优先向目标前进，在后期则提高在高风险区域的极限避障能力，从而实现了避障与导航到达目标的balance**







### 3\.D 可微分自适应 LSE\-CBF Layer

本项目的安全性是由这个完全可微分的多约束CBF层提供的



下面使用的h\(x\)表示衡量机器人是否安全，离危险有多近的数值指标（越大就越安全），可以认为是“安全裕度”，x表示当前的状态



背景：使用激光雷达，41条离散射线测量到41个距离，如果$h(x) = \min_i h_i(x) $  ，这种取最小值的方法会造成不可微，在约束条件切换的时候造成梯度跳跃，比如在狭窄的走廊中：原来离左边0\.5m，离右边0\.51m，突然变成离左边0\.51m，离右边0\.5m，造成了空间梯度反转180°



solution：使用下面的安全函数：

$h(x) = -\frac{1}{k} \ln \left( \sum_{i=1}^{N} \exp(-k \cdot h_i(x)) \right) \quad  $

- k \&gt; 0，是一个平滑系数





接下来需要通过CBF层调整Actor网络的原始动作$\bar{u}(x)$，确保机器人始终处于安全状态

怎么衡量是否处于安全状态？ \-\-\&gt;  满足前向不变性条件$\dot{h}(x,u) \geq  -\alpha h(x) $

定性理解前向不变性条件：

- 当 h\(x\) 很大时（离障碍物很远）：条件很宽松，*h*˙\(*x*\) 可以是负的，意味着允许机器人朝障碍物走去。

- 当 h\(x\)接近 0 时（快撞到障碍物了）： −αh\(x\)接近 0，条件变为 h˙\(x\)≥0  。这意味着 h\(x\) 不能继续变小了，机器人必须停止靠近或开始远离。



所以就变成了下面的规划问题：如何在满足前向不变性条件的前提下，使得输出的安全动作与输入的原始动作差异最小

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWQ4ZGQ0MDdkOTc2Zjg4ZjlhY2I0NTJlMmU0ZjM0MzFfNTVkOTg3YTM0MGU4MmRjMjk1NGJhNWNmMGE4MGMwMDBfSUQ6NzYzMzA0MzcxMzA5NDQ4NzIzOV8xNzc5ODc4MzU3OjE3Nzk5NjQ3NTdfVjM)







最终解为：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGEzNWRmNjNiYzg2NDY0MTYzNWU4NDZlNTAzNWUwYzdfMmZiNGJmY2E4NWFlNDIzMjk4MjYwN2FjOGI0ODBkOTlfSUQ6NzYzMzA0MzYzMDQ2NjQ1MjY2OV8xNzc5ODc4MzU3OjE3Nzk5NjQ3NTdfVjM)













## 基础知识补充

### CBF

CBF即Control Barrier Function控制障碍函数

CBF是一种数学工具，用来定义系统的“安全集”











