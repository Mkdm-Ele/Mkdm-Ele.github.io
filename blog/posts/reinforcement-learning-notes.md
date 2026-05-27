# 强化学习笔记

## **1 机器学习基础**

### **1\.1 线性模型**

#### **1\.1\.1线性回归**

**过拟合与正则化**

过拟合\(overfitting\)的表现：在训练集上的正确率较高，但是在测试集上的正确率较低，泛化能力不足

过拟合的原因：

- 模型过于复杂：模型“能力”远大于数据蕴含的真实规律

- 训练的数据量不足：数据太少，复杂模型容易从少量数据中学到以下不具代表性的“假规律”

- 训练数据中存在噪声

- 训练时间太长



当模型的参数量较大，但是训练数据不够多的情况下，常使用**正则化\(regularization\)**来缓解过拟合

**正则化的定义：为了防止过拟合来引入的“惩罚机制”，在损失函数中增加一个额外的“复杂度惩罚项”来约束模型的参数，使其倾向于简单**

原始的损失函数（Loss Function）只关心预测值与真实值的差距：
`Loss = Error\(y, ŷ\)`

加入正则化后，新的目标函数（Objective Function）变为：
`Objective = Loss \+ λ \* Regularization Term` （\\lambda是超参数）



**常见的正则化方法：**

1. **L1 正则化（Lasso）：**

    - 正则化项是模型权重参数 **w** 的 **L1 范数**（绝对值之和）： `λ \* Σ\|w\_i\|`

    - **特点：** 它倾向于产生**稀疏**的权重向量，即会将一些不重要的特征对应的权重直接压缩到0。因此L1正则化也常用于**特征选择**。

    - 使用这种正则化项的线性回归模型称为LASSO\(least absolute shrinkage and selection operator\)

2. **L2 正则化（Ridge / 权重衰减）：**

    - 正则化项是模型权重参数 **w** 的 **L2 范数**的平方（平方和）： `λ \* Σ\(w\_i\)²`

    - **特点：** 它倾向于让所有权重都趋近于0，但不会完全等于0，而是得到一个比较“平滑”的权重分布。这是最常用的一种正则化。

    - 使用这种正则化项的线性回归模型称为岭回归\(Rigde regression\)

3. **Dropout（主要用于神经网络）：**

    - 在训练过程中，随机地“丢弃”（暂时忽略）网络中的一部分神经元。每次训练批次中，网络结构都在动态变化，这可以防止神经元之间产生复杂的共适应关系，迫使每个神经元都能独立发挥作用，从而增强模型的鲁棒性。



### **1\.3 反向传播和梯度下降**

\(批量\)梯度下降（GD/BGD）:每次会计算整个训练集的梯度，计算量大，且在面对非凸问题时会陷在鞍点，不能达到局部最优

随机梯度下降（SGD）：抽取训练集中的一个样本，使用单个样本来计算梯度进行优化，缺点是梯度估计常常出现偏差，参数轨迹很“曲折”



## **2 蒙特卡洛**

### **2\.1 随机变量**

如果X是一个连续变量，那么h\(X\)关于变量X的期望是:

如果将h\(X\)换成一个二元函数g\(X,Y\)，那么对g\(X,Y\)关于变量X求期望就会消掉X，得到结果是Y的函数：

比如X取值范围是\[0,10\]，PDF是$p(x) = \frac{1}{5}xY$，那么g\(X,Y\)关于变量X的期望是

$\mathbb{E}_{X}[g(X, Y)] = \int_{0}^{10} g(x, Y) \cdot p(x) \, dx  = \int_{0}^{10} \frac{1}{5} x Y \cdot \frac{1}{10} \, dx  =Y$



### **2\.2 蒙特卡洛**

蒙特卡洛\(Monte Carlo\)是一大类随机算法的总称，他们通过随机样本来估算真实值

#### **2\.2\.4 近似期望\(Robbins\-Monro算法\)**

$\mathbb{E}_{X \sim p(\cdot)}[f(X)] == \int_\Omega p(x)f(x) dx$



其中$x \in \mathbb{R}^{d}$

与其他的近似定积分不一样，这里不是在$\Omega$均匀取样，而是**按照p\(x\)进行非均匀取样**，得到了$x_1,...,x_n$，求平均$q_n = \frac{1}{n}\sum_{i =1}^{n}f(x_i)$

返回$q_n$作为期望的估计值

#### **2\.2\.5 随机梯度**

使用蒙特卡洛可以理解一下随机梯度算法：

我们想**改变神经网络的参数**$\omega$**，从而使得损失函数的期望尽量小**

就变成了这样的一个优化问题：

$\min_{\omega}\mathbb{E}_{X\sim p(\cdot)}[L(X;\omega)]$



这个期望对\\omega来求梯度：

$g = \nabla _\omega \mathbb{E}_{X\sim p(\cdot)}[L(X;\omega)] = \mathbb{E}_{X\sim p(\cdot)}[\nabla_\omega L(X;\omega)] $



求到了这个梯度就可以进行梯度下降更新\\omega  \(\\alpha是学习率\)

$w \leftarrow \omega - \alpha \cdot g$



**Motivation：由于计算梯度g速度太慢，所以进行蒙特卡洛近似**

也就是根据概率密度函数p\(x\)进行随机抽样，得到了B个样本

然后对这B个样本计算得到的梯度求平均，得到$\tilde{g} = \frac{1}{B}\sum_{j=1}^B \nabla_\omega L(\tilde{x_j};\omega)$   称为随机梯度

使用这个随机梯度来下降更新\\omega





## **3 强化学习基本概念**

### **3\.1 马尔可夫决策过程**

**智能体（agent）:**强化学习的主体

**环境（environment）：**与智能体交互的对象

**马尔可夫决策过程（MDP Marcov Decision Process）：**强化学习的数学基础和建模工具，由状态空间，动作空间，状态转移函数，奖励函数，折扣因子组成

**状态（state）：**环境的状态 $\rightarrow$ 状态是做决策的依据

**状态空间（state space）：**所有可能存在状态的集合$\mathcal{S}$   可以是离散的可以是连续的，可以是有限集合可以是无限集合

**动作（action）：**agent基于当前state作出的决策

**动作空间（action space）:**$\mathcal{A}$ 

**奖励（reward）：**agent在执行一个动作以后，环境返回给智能体的一个数值

通常假设reward是当前状态s，当前动作a，下一个时刻状态$s^{\prime}$的函数 $r(s,a,s^\prime)$，我们**总是定义奖励函数是有界的**

**状态转移（state transiton）：**智能体从当前 t 时刻的状态 s 转移到下一个时刻状态为 s ′ 的过程 **强化学习通常假设状态转移是随机的，随机性来自环境**

**状态转移概率函数（state transition probability function）：**描述状态转移

$p_t(s^\prime | s,a) = \mathbb{P}(S_{t+1}^\prime = s^\prime | S_t = s,A_t =a )$



确定状态转移是随机状态转移的一个特例：即概率全部集中在一个状态$s^\prime$上面

通常假设状态转移概率函数是平稳的，不随时刻t改变



### **3\.2 策略**

policy：根据观测到的状态，如何做出决策，即如何从动作空间中选取一个动作。

强化学习的目的就是得到一个策略函数

**策略可以是确定性的，也可以是随机性的**



**随机策略：**



### **3\.5 价值函数**

动作价值函数：依赖于$s_t,a_t,\pi$

最优动作价值函数：依赖于$s_t,a_t$

状态价值函数：依赖于$s_t,\pi$            $V_\pi(s_t)$是$Q_\pi(s_t,A_t)$对$A_t$求期望得到的



## **4 DQN和Q学习**

### **4\.1 DQN\(Deep Q Network\)**

**Motivation**：最优动作价值函数$Q_\star(s_t,a_t)$ 有其重要意义：已知s\_t和a\_t的情况下，不管采用什么样的策略$\pi$，$U_t$的期望都不可能超过$Q_\star$       于是我们就想要近似学习出$Q_\star$    $\rightarrow$   DQN   深度Q网络

当我们知道$Q_\star$的时候就可以使用这个函数完成控制：

已知当前状态s，$Q_\star$可以对$\mathcal{A}$中的每一个动作进行评分，也就是已知s\_t和a\_t的情况下，不管采用什么样的策略$\pi$，$U_t$的期望都不可能超过$Q_\star$给出的这个评分（一个上界），我们根据这个上界选择最优的动作



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmNlNWI4NzQ5MGMwMWQzODEwZGI0YzhiMzI5MmVkOTZfMTY0OWM2OWQ1ZmM4ZDMyYTk4YWFjOGVmZTZmNTdhYmFfSUQ6NzYwNDMwNDg3Mzk0OTEzODEyMV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



注意

- DQN的输出是离散动作空间上的每隔动作的Q值（评分），动作空间的大小如果是$|\mathcal{A}| = 3$，那么输出的向量就是3维的向量，每一维都是一个标量评分

- 如果s是一个图片之类的输入状态，那么使用卷积网络进行特征提取；如果s是一个向量（比如一个机器人的各种传感器输入参数组成的向量），那么这里的卷积网络就换成了全连接层



### **4\.2 时间差分算法（TD）**

temporal difference

训练DQN最长用的算法就是TD算法

### **4\.3 用TD训练DQN**

#### **4\.3\.1 算法推导**



Motivation:   $Q(s_t,a_t;\omega)$这个网络是没有一个真实值来进行比较的，我们应该怎么得到loss function，进而进行梯度下降？

Solution：利用了TD算法，得到一个TD目标$\hat{y_t}$这个带有一定的真实成分的预测值，这样得到了loss function

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmQxYmRlMzA1ODgxOTNiNDVhOTI1NzQ4NzgzNmJiYjhfMzdlZmMzNzNjYjQwMjUzNGNhY2M1MjhkOGVmMWU1ZmZfSUQ6NzYwNDMxNDQ3NDUwNTQyNDA3M18xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)





这里留一个问题：在进行计算得到TD目标的过程中，我们进行了蒙特卡洛估计，其中对s\_\{t\+1\}进行了抽样，分布函数是状态转移函数的分布（$S_{t+1} \sim p(\cdot | s_t,a_t)$）  那么这里的状态转移函数的PDF是怎么求到的





#### **4\.3\.2 训练流程**

DQN的训练一般可以分为两个独立的部分：**收集训练数据 更新参数\\omega**

收集数据和更新参数可以同时进行：可以在智能体每执行一个动作以后就对\\omega进行几次更新；也可以是每完成一局游戏以后对\\omega进行几次更新

**收集训练数据：**我们提前定好策略：$\epsilon-greedy$  策略

这个算法带有随机性，在（1\-\\epsilon）这个概率里面，想要使得Q这个价值达到最大为标准来选择a动作

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWJhNzg0YjU2ZDIyZDcxODI0OWRjMzUyZDY2MGMzN2NfY2ZlMDE2YmViOTNhZTY2MWUzYjdjNDRkN2I3NWY5NDhfSUQ6NzYwNDMxNzc5NzEwNzM1NDgyN18xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

\&lt;在这里采用异策略，这里的行为策略和目标策略不同\&gt;

**更新参数**$\omega$:

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjNlZTllZmI0NjI0YWUxNWFjMTdhYjgyYjEyM2M5NGNfMDVhNTM3ODdhZGRhZGYzODFmMTZiZjQ4ZDdiMWJhMDRfSUQ6NzYwNDMxODMxMzk1ODYwODA5NF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



这个过程可以与7\.4 **策略学习**的训练过程来进行比较

**价值学习**的策略是间接产生的，通过价值函数Q来argmax来获取这个policy（价值函数就是return的期望值，相当于优化a，使得return的期望值最大）

而策略学习的策略就是直接产生的，直接拟合产生policy，目标是使得目标函数$J(\theta)$最大（这个目标函数是只依赖于策略的函数）





### **4\.4 Q学习算法**

TD算法包含：Q学习和SARSA，上面介绍的TD算法实际上是Q\-learning算法

Q\-learning的目标：学到最优动作价值函数Q\_\\star

SARSA的目标：学习动作价值函数Q\_\\pi





### **4\.5 同策略\(On\-policy\)与异策略\(Off\-policy\)**

行为策略：用来收集经验（观测的状态，动作，奖励）

目标策略：在这一章，目标策略就是DQN控制智能体：

$a_t = \mathop{\arg \max}_a Q(s_t,a;\omega)$



DQN控制智能体是一种确定的策略



同策略：相同的行为策略和目标策略

异策略：不同的行为策略和目标策略



在采集数据时使用的\\epsilon\-greedy算法与最终的目标策略不同，所以是异策略，采集数据的时候带有随机性的好处：见到更多的情形





Q\-learning 是最优动作价值函数的近似，不依赖于策略\\pi,所以可以使用异策略，使用经验回放，重复利用过时的经验

SARSA算法的目标是近似动作价值函数，Q\_\\pi与一个策略\\pi相对应，不同的策略会导致不同的Q\_\\pi ，所以不能使用经验回放





## **5 SARSA算法 State\-Action\-Reward\-State\-Action**

Q\-learning和SARSA算法都是TD算法

Q\-learning:学习最优动作价值函数

SARSA:学习动作价值函数

现在Q\_\\pi常常用于评价策略的好坏（critic），而不是直接控制智能体（直接控制动作a = argmaxQ）

SARSA：State\-Action\-Reward\-State\-Action  表示算法用到了一个五元组\(s\_t,a\_t,r\_t,s\_\{t\+1\},a\_\{t\+1\}\)



### **5\.1 表格形式的SARSA**

推导：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MjBkYmY0ODBmNDA0N2M0MmZiNGNiZWQ2OTIxMTRmMjFfNmY1YjQyZjNkNDVhNzllYmRkOTkzNjA4NjJiYzY5MDNfSUQ6NzYwNDMxODcxMTU3MTA5MDM4NV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)







训练流程：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NTFjNDhjMWU3ZGVkZDhjYjRkYzRkMzA1OTFjZTM5OWZfNTE2ODUxNDQxMzVmNzAyMGQ2YjY1ZjIzZGRkYTg1YjJfSUQ6NzYwNDMxODc3NDA1ODYzNDQyMF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)





### **5\.2 神经网络形式的SARSA**

价值网络：q\(s,a;\\omega\)来近似Q\_\\pi   

DQN：近似Q\_\\star

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZmU2MjdjNDQzMTg0YTY0OTgwZDFlNWY3ZGM4Y2NmYzNfY2M3ZDI5ZWJlNGEzODFmZDc1M2NiMDJjZjRjM2FlMzBfSUQ6NzYwNDMxODg2MDQ5MzM2MDA3MF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Mzg4M2EyYmY4YTdmNzdmZjgzMmY1YmE1YzA1YTViZWNfZDEzNTU1NmZjMzg4NDQ0MjdiZjc5MzBhMjczY2VmNDRfSUQ6NzYwNDMxODkyNTA2ODgxNTU3NF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)







### **5\.3 多步TD目标**

如果只使用一个$r_t$那么得到的$\hat{y_t}$叫做单步TD目标  

多步TD使用m个奖励

**多步TD相对单步的优势：**

- 更低的偏差：**多步可以看到未来几步的真实奖励，能够更早地将远期奖励传递回来**

- 更快的收敛速度

- 比蒙特卡洛\(MC\)的方法方差更小，稳定性更高（下面的5\.4\.1 蒙特卡洛里面有介绍）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NDZjYzZmMzgwYzJhYjdhNTdjNzM2ZTcwMDExYTU1MzFfNGViYjM4NTBhNmY4YTA0ZThlMGNjYjNhY2UyMzk5OTJfSUQ6NzYwNDMxOTA5NTE5Mzg5NzkzNl8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjY5ZmY0ODVkYTk3ODc0Zjc2N2M2OTZjYzdjZTRjOTBfYTNkM2ViNWQ2NzgxNDVhMDEyMmYwNmM2MGE5ZjI1MDJfSUQ6NzYwNDMxOTE1OTQ3MTYzOTUwMV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)













### **5\.4 蒙特卡洛和自举**

m=1时，多步TD目标就变成了单步TD目标

m = n\+t\-1时，多步TD目标就变成了实际观测到的回报u\_t



#### **5\.4\.1 蒙特卡洛**

在训练价值网络的时候，我们选择损失函数时，选择了TD目标与q\(s\_t,a\_t,\\omega\)两者差的平方作为损失函数

但是如果不选择TD目标，直接选择u\_t作为目标，这就叫做蒙特卡洛

蒙特卡洛可以保证无偏性（因为u\_t是$Q_\pi(s_t,a_t)$的无偏估计）但是方差大，导致收敛慢



#### **5\.4\.2 自举\(bootstrapping\)**

SARSA中的单步TD目标是：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NTMwNjNjZWQ4ZGQ2ZmYzNTgzMjI4NmJiYWM3NDIwYzFfZjFhNjAwMjY4Y2I0N2ZjOGUyMGQ2YzkxYzY5NDNmZDVfSUQ6NzYwNDMxOTQyMzMyMjg4NTMyNV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

其中的$q(s_{t+1},a_{t+1};\omega)$就是根据价值网络自己作出的估计去更新价值网络自己，这就是“自举”

自举的优势：方差小，导致收敛较快

自举的坏处：有偏差







## **6 价值学习高级技巧**

Motivation：要改善DQN的表现

6\.1 6\.2: 改进Q\-learning算法

6\.3 6\.4 :改进DQN的神经网络结构





### **6\.1 经验回放\(experience replay\)**

经验回放要注意：需要回放数组\(replay buffer\)中有足够多的四元组，才能进行经验回放更新DQN；

当数组中没有足够的四元组的时候，DQN就只需要与环境交互，不要更新参数

#### **6\.1\.1 经验回放的优点**

- 打破了序列的相关性：相邻的四元组有很强的相关性，但是经验回放是随机抽取一个四元组，所以随机抽取到的四元组之间是独立的

- 重复利用收集到的经验，可以使用更少的样本数量达到相同的表现



#### **6\.1\.2 经验回放的局限性**

经验回放不适用于同策略：

比如SARSA：就是要评估一个策略的好坏，不能在收集数据的时候使用这个策略，但是在实际使用的时候使用另外一个策略

#### **6\.1\.3 优先经验回放**





### **6\.2 高估问题及解决办法**

用Q\-learning训练出的DQN会高估真实的价值

原因：

- 自举产生偏差的传播（可能是低估可能是高估）

- 最大化导致TD目标高估真实价值



#### **6\.2\.4 使用目标网络**

目标网络（target network）可以切断自举，缓解DQN的高估

但是不能完全避免自举：原因是目标网络的参数依然与DQN相关

#### **6\.2\.5 双Q学习算法**

训练DQN有三种TD算法：原始Q学习，使用目标网络的Q学习，双Q学习（其中双Q学习是最好的）

双Q学习算法：在目标网络的基础上做改进，可以缓解最大化造成的高估

这个不等式：双Q学习前面使用的是DQN求出的最优动作，放在目标网络里面就不是最优的动作，所以有这个不等式

## **Importance Sampling 重要性采样**

参考文章：[https://zhuanlan\.zhihu\.com/p/41217212](https://zhuanlan.zhihu.com/p/41217212)    这篇文章里面的评论里面提到了：重要性采样的Motivation不是因为原始分布\\pi\(x\)未知，而是因为相同的样本量，用\\pi\(x\)分布进行采样的结果方差较大（就是采样得到的数据不稳定），用p\(x\)进行采样得到的方差较小，实际上我们是知道\\pi\(x\)的

但是也有可能是不知道原始分布的



## **7 策略梯度方法**

策略学习（policy\-based reinforcement learning）:通过求解一个优化问题，学出最优策略函数或者它的近似函数（比如策略网络）

策略梯度（Policy Gradient）方法就是基于策略学习的典型代表。**它的核心思想非常直观：如果某个动作导致了高奖励，我们就增加这个动作在未来被选中的概率；如果导致了低奖励（或者惩罚），就降低它的概率。**

### **7\.1 策略网络**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGRmZWI3NjQxNWY1NDk0YTczNjU1ODM3NDUyMTc3MzBfZmY5YTljMjQzNWVkNDU5MzJkMmVlZGQzZDM5OTRhN2JfSUQ6NzYwNDMxOTc4ODUxODM0NTk0OV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



最终输出的是动作的概率值



### **7\.2 策略学习的目标函数**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzNlODQ2NTA4MTA0OTAzOGNmYmUyYmU0YmM4YzBjYWZfNTQ0MzBmNjUzYTVhMjYyMjg1YWJjYjgwNDE5OTJjMDZfSUQ6NzYwNDMyMzkyOTk1NTg3OTg4OV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

这里的策略学习里面，要选择一个最优的策略，不是与一个真实的最优策略得到的结果进行比较得到损失函数，然后梯度下降（实际上我们也根本找不到一个真实的最优策略）

而是希望我们通过优化策略\\pi使得U\_t的期望值更大，于是我们就得到了目标函数J\(\\theta\)

这个目标函数J\(\\theta\) 我们希望越大越好，所以采用梯度上升



### **7\.3 策略梯度定理的证明**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGQwZjgzZGMyNjZmNDI5NDFlYWEzOGU0NWY4ZGRkNWNfNGFlMmFkNGRmZDk2OWFhZjVjZDU3NTc5YWQ0NmZmMmFfSUQ6NzYwNDMyNTYxNzg3MzYyMDE4N18xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

#### **7\.3\.3 近似策略梯度**

已知策略梯度定理：

$\nabla_\theta J(\theta) = \mathbb{E}_S[\mathbb{E}_{A \sim \pi(\cdot | S;\theta )}[Q_\pi(S,A)\cdot \nabla_\theta \ln\pi(A| S;\theta )]]$



problem：我们不知道S分布（PDF）是什么  $\rightarrow$  进行蒙特卡洛近似，从环境中观测到一个状态s，根据当前的策略网络（注意这里的策略网络的参数必须是最新的$\theta$）随机抽样出一个动作：

$a \sim \pi(\cdot | s; \theta)$



**上面实际上进行了两次抽样：**

- **从环境中抽样观测到一个值**

- **根据环境观测到的状态s，输入到随机的决策函数里面进行随机抽样，得到随机的动作**

也就是说，这里的蒙特卡洛估计进行了两次估计（也就是两次映射）到最终的抽样样本上面

这样就可以计算**随机梯度**：

$g(s,a;\theta) = Q_\pi (s,a) \cdot \nabla_\theta \ln\pi(a| s;\theta) $



problem：**不知道动作价值函数，所以计算不出来随机梯度**







### **7\.4 REINFORCE**

**Motivation：计算随机梯度时，由于不知道动作价值函数**$Q_{\pi}(s,a)$**，需要对动作价值函数做近似**，这里同样是使用蒙特卡洛近似



**重点：动作价值函数是return回报的期望，只需要将抽样实际观测得到的回报作为蒙特卡洛近似动作价值函数的结果即可**



**训练流程：**

如果当前的网络参数是$\theta_{now}$，REINFORCE要对这个参数进行更新

1 使用$\theta_{now}$这个网络控制智能体从头开始玩一局游戏，得到一条轨迹\(trajectory\):                 $s_1,a_1,r_1,...,s_n,a_n,r_n$


2 计算所有的回报: 
$u_t = \sum_{k = t}^ n \gamma ^{k-t} \cdot r_k ,\forall \space t= 1,...,n$ 




3 使用${(s_t,a_t)}_{t = 1}^n$作为数据，做反向传播 
$\nabla_\theta \ln\pi(a_t | s_t ; \theta_{now}), \forall \space t = 1,...,n$ 




4 进行随机梯度上升

$\theta_{new }  \leftarrow \theta_{now} + \beta \sum_{t = 1}^n \gamma ^{t-1} \cdot u_t \cdot \nabla _\theta \ln\pi(a_t|s_t;\theta_{now})$



### **7\.5 Actor\-Critic**

REINFORCE使用实际观测到的回报来近似Q\_\\pi ，**Actor\-Critic使用神经网络来近似**$Q_\pi$

#### **7\.5\.1 价值网络**

我们使用$q(s,a;\omega)$来近似动作价值函数$Q_\pi$

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Njk5YWQ3YzAwMmNkZjdlZmFlYTMzM2I3ZTk5YjIwNmVfZGMwMmY3MDczNzNmNTExYzg4NGU2YTZiNmVkNTRlYzhfSUQ6NzYwNDMyNjg3NzY2NjI4MjY3Nl8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



虽然说价值网络$q(s,a;\omega)$与DQN拥有相同的结构，但是两者意义不同，训练算法也不同

- 价值网络是对动作价值函数$Q_\pi(s,a)$的近似，DQN是对最优动作价值函数$Q_\star (s,a)$的近似

- 对价值网络的训练使用了SARSA算法，属于同策略，不能使用经验回放；DQN训练使用的是Q\-learning，属于异策略，可以使用经验回放



#### **7\.5\.3 训练流程**

要更新两个参数：$\theta_{now},\omega_{now}$

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWY1NjVmYzBjYzIyMTZkZjJmZmEwODNmMTRmOThlNTdfNjc4NDk1YzgwMjZhNDIxOTI3MWQxZThkODIzMTBmNmJfSUQ6NzYwNDMzMDUxMDYwODkyNzkyNV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)







## **8 带基线的策略梯度方法**

policy gradient with baseline

使用基线以后：REINFORCE $\rightarrow$ REINFORCE with baseline

actor\-critic $\rightarrow$ advantage actor\-critic\(A2C\)

### **8\.1 策略梯度中的基线**



#### **8\.1\.1 基线\(baseline\)**

对于不带基线的策略梯度定理：

$\nabla_\theta J(\theta) = \mathbb{E}_S[\mathbb{E}_{A \sim \pi(\cdot | S;\theta )}[Q_\pi(S,A)\cdot \nabla_\theta \ln\pi(A| S;\theta )]]$



可以这样理解：如果$U_t$也就是$Q_\pi(S,A)$比较大，那么就沿着$\nabla_\theta \ln\pi(A| S;\theta)$ 这个方向来“大力”更新参数，使得$J(\theta)$变大，反之没那么“大力”

带基线的策略梯度定理：

$\nabla_\theta J(\theta) = \mathbb{E}_S[\mathbb{E}_{A \sim \pi(\cdot | S;\theta )}[(Q_\pi(S,A)-b)\cdot \nabla_\theta \ln\pi(A| S;\theta )]]$



实际上就是加了个b，这个b是任意的函数，**只需要不依赖于动作A**



得到了随机梯度：

$g_b(s,a;\theta) = (Q_\pi(s,a)-b)\cdot \nabla_\theta \ln\pi(a| s;\theta )$



**引入Baseline的Motivation：上一章介绍了两种方法：Actor\-Critic和REINFORCE，都是去近似**$Q_\pi$**，但是这样近似得到的**$Q_\pi$**会有一个问题：这样估计虽然是无偏的，但是方差较大，导致采样效率低下，训练不稳定**



引入baseline得到的随机梯度是$\nabla_\theta J(\theta)$的无偏估计，如果这个随机梯度的方差也比较小，就是好的基线

直接给出结论：$b = V_\pi(s)$是很好的基线





**为什么**$b = V_\pi(s)$**是很好的基线**

想象你在状态 \( s \)，面临三个动作 \( a\_1, a\_2, a\_3 \)，它们的真实 \( Q \) 值分别是 10, 20, 30。那么平均表现 \( $V_\pi(s)$ \) 就是 20。

- **情况A：使用基线 \( b\(s\) = 0 \)**

    - 你的更新信号是 \( Q \) 值的绝对值：10, 20, 30。

    - 这些值在一个很大的范围（10到30）内波动。

- **情况B：使用基线 \( b\(s\) = V\_\\pi\(s\) = 20 \)**

    - 你的更新信号变成了**优势函数** \( A\(s, a\) = Q\(s, a\) \- V\(s\) \)：\-10, 0, \+10。

    - 这些值在一个更小、更集中的范围（\-10到\+10）内波动。

**核心思想**：\( V\_\\pi\(s\) \) 作为基线，提供了一个天然的“参考点”或“及格线”。它将被减数 \( G\_t \) 中心化，使得最终的更新信号 \( \(G\_t \- b\(s\)\) \) 围绕零波动，其**尺度（Scale）** 被显著缩小了。一个尺度更小的随机变量，其方差自然也更小。

引入基线使得梯度更新只关注相对的动作好坏，而不是所有动作的绝对奖励，这样降低了方差







#### **8\.1\.2 基线的直观解释**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NzU0MmM0OGYwNzU1ODkwZjM2OGRjZGE3NDA1OWEwNDZfMmM5YTU5ZmQ3MmYzN2UyOTFjZTMyYzcxNjVmOTVhZmVfSUQ6NzYwNDMzMDk4OTQ5Nzc2NDgzMF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)





我们在乎的是动作价值的相对大小而不是绝对大小，同样减去60，相对大小不发生改变

这也同样解释了为什么b不能依赖动作A：如果b依赖于动作，那么三个Q减去的b的值就不相同了





### **8\.2 带基线的REINFORCE算法**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YjQxZDQwMWUzYjQ5MWEwNmI0MDVlZDI0N2RhMGZjODJfZmYwZjYzMjUwYmIwZjFiNjQzMmY4NjY1YzI4OWNhOWNfSUQ6NzYwNDMzMTAzOTk0MjU5MzQ3N18xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)





其实就是：

- 还是把Q\_\\pi\(s,a\)近似为u\_t

- 使用一个价值网络v\(s;\\omega\)来近似V\_\\pi\(s\)这个状态价值函数

虽然有一个策略网络和一个价值网络，但是这种方法不是actor\-critic，因为价值网络没有起到评委的作用，目的只是为了降低方差，加速收敛

真正帮助策略网络改进参数\\theta的不是价值网络，而是实际观测到的回报u





#### **8\.2\.2 算法的推导**

训练策略网络：

使用“近似的”策略梯度上升   “近似”是因为随机梯度\\tilde\{g\}\(s\_t,a\_t;\\theta\)是\\nabla\_\\theta J\(\\theta\)的近似

训练价值网络：

使用regression回归方法（意思就是输入一个s\_t，输出一个V\_\\pi\(s\_t\)这个预测值）：V\_\\pi\(s\_t\) = \\mathbb\{E\}\[U\_t\|S\_t = s\_t\]，我们就使用u\_t作为真值




### **8\.3 Advantage Actor\-Critic（A2C）**

Q\_\\pi\-V\_\\pi被称为优势函数（advantage function）

所以基于上面公式的得到的方法就叫做 Advantage Actor\-Critic



#### **8\.3\.1 算法推导**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGZlYjU4ZWQ1OGU1YTI5MjIxNzA5MGJjMzYzZDgyZjRfMmUyODdhOTQ4N2ViNmFhOTc2OWUwNDdmODUxMDBlMjdfSUQ6NzYwNDMzMTE2NDUwNTE4MTQwNV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

**为什么**$\delta_t$**可以对策略网络进行评价？**

$-\delta_t = \hat{y}_t - v(s_t;\omega)=r_t + \gamma \cdot v(s_{t+1};\omega) - v(s_t ;\omega)$



$\tilde{g}(s_t,a_t;\theta) = -\delta_t \cdot \nabla \ln\pi(a_t| s_t;\theta)$



$\theta \leftarrow \theta + \beta \cdot \tilde{g}(s_t,a_t ; \theta )$



$v(s_t ;\omega)$**表示价值网络在t时刻对**$\mathbb{E}[U_t]$**的估计,此时agent还没执行动作**$a_t$

$\hat{y}_t$**表示价值网络在执行了**$a_t$**,得到了**$r_t$**和**$s_{t+1}$**以后，在t\+1时刻对于**$\mathbb{E}[U_t]$**的估计**

- $\hat{y}_t$ \&gt; $v(s_t;\omega)$的时候， 也就是说：执行了这个动作以后会使得$r_t$较大，$s_{t+1}$比较好，期望增加，说明这个策略比较好，随机梯度是正的

- 反之说明执行这个动作使得期望减小，这个策略不好，需要更新$\theta$

我们可将这个 $\hat{y}_t - v(s_t;\omega)$看成一个优势函数（Advantage Function）$A_t$，如果$A_t>0$那么说明这个动作是好的，否则就是坏的







#### **8\.3\.2 训练流程**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjhjMjRhYTM1MDE2Y2I0ZjJkYjcwMzViMDJiMWE4N2FfZDk5NGEzNmY0ZjYxZjczZmZmYmY3YWQ1ZDNlNTg3NzVfSUQ6NzYwNDMzMTI2MTM2NDM5MTEyNl8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)





## **9 策略学习高级技巧**



### **9\.1 Trust Region Policy Optimization（TRPO）**

置信域策略优化：与策略梯度方法相比，

- TRPO收敛曲线更稳定，不会剧烈波动，对学习率不敏感

- TRPO使用更少的经验就能够达到与策略梯度相同的表现



#### **9\.1\.1 置信域方法**



### **9\.2 熵正则（Entropy Regularization）**

对于一个离散的概率分布p = \[p\_1,p\_2,p\_3\]

$Entropy(p) = -\sum_{i = 1} ^3 p_i \cdot \ln p_i$



如果熵小说明：概率质量集中

熵大：随机性很大

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NmE2NjhlYjdlZGM2Mjg0MWUyYmQ1ZDEwNjhkMGNmMGVfN2QyMjJmMTFiMjhjMzM1MzE1ZGFhY2FkNDQ5MzM3NDZfSUQ6NzYwNDMzMTM5MDI3MTg4NDIyN18xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



我们希望**熵不能太小**，不能使得概率质量太集中，使得让其他的动作都可以被探索

Solution：将熵作为一个正则项，放在策略学习的目标函数里面

使用熵正则的策略学习可以写成这个最大化问题：

$\max_\theta J(\theta) + \lambda \cdot \mathbb{E}[H(S;\theta)]$



其中的正则项是一个熵：

$H(s;\theta) = Entropy [\pi(\cdot | s;\theta )] = -\sum_{a\in \mathcal{A}}\pi(a|s;\theta) \cdot \ln\pi(a|s;\theta)$



可以看到这一项只依赖于状态和参数\\theta,我们希望对于大多数的状态s，熵都会比较大，所以放在目标函数里面对\\theta进行优化





## **10 连续控制**

Motivation：以前讨论的动作空间都是离散的，如果想要实现连续控制，比如\\mathcal\{A\} = \[\-40\\degree,40\\degree\]这样一个连续集合

Solution：连续动作空间进行离散化 然后使用离散控制的方法 or 直接使用连续控制方法

### **10\.1 离散控制和连续控制的区别**

离散化：直接将连续的空间划分为离散的几个动作，然后还是实现了分类

Shortcommings：

- 当动作的自由度d增大时，网格上的点的数量会随着d指数增长，造成维度灾难

    - 举个例子：一个12维的连续动作空间，假设每一维只离散化成5种，那么5^12 = 244140625,这么多种种类进行分类肯定不好，更何况每一维的精度也完全不够



### **10\.2 确定策略梯度（DPG）**

常用的连续控制方法：DPG\(deterministic policy gradient\) 是一种**actor\-critic方法**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OGMyMzk1ODUyNmQ3OGQ5ZWY1MDJjZmJjMGY5NmZmM2FfZmZmM2ExYmUzNjJkMWRlZjhhZmJjNjhlYjk2NzA1ZGJfSUQ6NzU4MTMxODA4MDU1MjI0MjQwNF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

#### **10\.2\.1 策略网络和价值网络**

策略网络和之前的结构不太相同


之前章节中的策略网络：最终输出一个概率质量函数$\pi(a|s;\theta)$，还需要进行随机抽样才能得到$\mathcal{A}$中的具体动作

这里的确定策略网络：最终输出一个d维的向量动作$\mathbf{a}$，这是一个确定的动作

**确定策略可以看成是随机策略的一个特例：**



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=N2IwNzRmNmRlMjc5YzM4YTEzODE2ZjYyNjlmNzU3M2VfOWIxN2Y0ZDExMjg1MDY0ZGE3YWYzNTFiMWJmOTE4MTRfSUQ6NzU4MTMxODIxNzIwMjQ2OTgyMF8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



怎么理解这段话：首先：$\mu(s;\theta)$就表示一个确定性策略，$\pi(a|s;\theta)$就表示一个随机性策略

为了说明确定性策略和随机性策略之间的联系，举一个特殊的随机策略：多元正态高斯分布

可以看到$\pi(\mathbf{a}|s;\theta)$中的a是粗体的，也就是说a是一个向量，动作空间是多维的，假设每一维之间都是独立的，那么总的选择这个a的概率就是各维的概率连乘，每一维都是高斯分布概率密度

并且可以看到每一维的均值都是确定性动作，$\sigma_i$越大，探索性越强，当$\sigma_i$取0的时候，就变成了确定性分布







本节的价值网络的结构：（拟合的是$Q_\pi(s,a)$）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWE5YTk0OTZmOTVkYjE3YjJiODhmODAyYzUzMTEyNjJfZjhhYTMwMzQ4MmI2NWQ1ZjExYTNjNDAxMGNhOTgwYmJfSUQ6NzU4MTMxODQ4OTMwMzQ2ODk5OV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)

以前的离散空间的价值网络结构：（也是拟合$Q_\pi(s,a)$）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OWYwOWY2NDE2NzdjYTZjNWU2NmZiMzRhYTUzYmVkMDdfYmQwZmJlNDFmZWQ4ZTk5Yjg3MmIxNTc1MjA0Mzg3MGJfSUQ6NzU4MTMxODc0MDU1NDU2NjU4Nl8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



这两个价值网络都是用来近似$q(s,a;\omega)$的，与s，a都有关系

但是以前的网络：输入s，输出各个动作在这个状态下的价值（是一个向量）

现在的网络：输入s，a，将两个特征向量进行拼接，然后输入到FC里面得到这一个动作在s下面的价值（是一个实数）



#### **10\.2\.2 算法推导**

确定策略网络属于异策略方法：行为策略可以是任意的，目标策略就是**确定策略网络**$\mathbf{\mu}(s;\mathbf{\theta}_{now})$

行为策略可以是:

$\mathbf{a} = \pmb{\mu}(s;\pmb\theta_{old}) + \pmb\epsilon$

也就是加入噪声，并且使用过时的网络参数$\theta_{old}$

**off\-policy Benifits：**把收集经验和训练神经网络分割开，可以重复利用收集到的经验

训练策略网络时：使用抽取到的状态$s_j$  不使用a是因为收集数据时用的是过时的参数，老旧策略得到的动作对于更新策略网络没有参考价值

训练价值网络时：使用到抽取到的四元组的全部$s_j,a_j,r_j,s_{j+1}$

**确定策略梯度（DPG）**：

$g_j = \nabla _\theta \mu(s_j;\theta) \cdot \nabla _a q(s_j,\hat{a_j},\omega) $



其中$\hat{a_j} = \mu(s_j;\theta)$

### **10\.3 深入分析DPG**



### **10\.5 随机高斯策略**

上面是使用确定策略网络来解决连续控制问题

本节的策略网络是随机的，是高斯分布，也可以用来解决连续控制问题（PPO就是随机的策略网络）

#### **10\.5\.1 基本思路**

以动作空间维数是1来举例子：

接下来使用神经网络来拟合\\mu\(s\),\\sigma\(s\)，也就是\\mu\(s;\\theta\),\\sigma\(s;\\theta\)

但是在实践中我们一般不是直接近似sigma，而是近似\\ln\\sigma^2作为神经网络\\rho\(s;\\theta\)来预测方差的对数

输入状态s，输出两个值：\\mu\(s;\\theta\),\\rho\(s;\\theta\)（都是标量）

得到了方差和均值的预测值，然后从正态分布中做随机抽样：a \\sim \\mathcal\{N\}\(\\hat\{\\mu\},\\hat\{\\sigma\}^2\)，然后智能体执行动作a



#### **10\.5\.2 随机高斯策略网络**

从上一节中进行扩展：弱国动作空间是d维的，两个输出全部都是d维向量

策略网络：

$\pi(\mathbf{a} |s;\theta) = \prod_{i=1}^d \frac{1}{ \sqrt{2\pi \cdot \exp[\rho_i(s;\theta)]}} \cdot  \exp(-\frac{[a_i-\mu_i(s;\theta)]^2}{2 \cdot \exp[\rho_i(s;\theta)]})$



实际上我们使用论文均值网络和方差对数网络，加上抽样这个过程就是辅助网络f\(s,\\mathbf\{a\};\\theta\)



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGM3NDBmNTMxNDhjNzE3ODI3NWNiNzVlZGQxNDcxMGVfM2VhNzc4YjZlNmFlNTNjZGY1ZTVhNTBlMzljYmIyZGFfSUQ6NzYwNDMzMTcwNzY4ODgxNTU1N18xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



辅助网络和策略网络有关系如下：

$f(s,\mathbf{a};\theta) = \ln\pi(\mathbf{a}|s;\theta) + Constant$



#### **10\.5\.3 策略梯度**

策略梯度：

$g = Q_\pi(s,\mathbf{a})\cdot \nabla_\theta \ln\pi(\mathbf{a}|s ;\theta) =  Q_\pi(s,\mathbf{a})\cdot \nabla _\theta f(s,\mathbf{a};\theta)$



可以看到：先根据当前状态预测均值和方差，然后每一维根据对应的均值和方差进行抽样，抽出d个动作组成动作向量，**接着使用这个抽样得到的动作向量进行评分（价值函数Q\_\\pi\(s,\\mathbf\{a\}\)）**，这样策略梯度就计算出来了

**Problem：**我们根本不知道动作价值函数，需要神经网络进行拟合 or 蒙特卡洛估计（REINFORCE）

注意：REINFORCE是on\-policy，不能使用replay\-buffer





## **11 对状态的不完全观测**

### **11\.1 不完全观测问题**

Motivation：因为有时不可能观测到全局的状态，所以：使用观测o\_t代替s\_t，然后使用\\pi\(a\_t\|o\_t;\\theta\)来进行决策但是效果不好

Solution: 所以应当记忆过去的所有观测，将过去的观测作为决策的依据：

$o_{1:t} = [o_1,...o_t]$



$\pi(a_t| o_{1:t};\theta)$



Problem : 观测的尺寸会随着t增长，但是卷积层和FC全部都要求输入的尺度不能变

Solution：引入循环神经网络RNN



### **11\.2 循环神经网络RNN**

RNN由循环层和其他种类的层组成

RNN的Advantage：

- 可以将一个任意长度的序列映射为一个特征向量

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjllODZhOGYwYzU1YTI0MzMxOGRkYzczOWQ3YWQyYzNfZjk1NDQ0YmI3MmM3NzQyYWY1ODE2ZTEwODExMmE5NGNfSUQ6NzYwNDMzMTgzNTc0NDgxNjM1Nl8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)



### **11\.3 RNN作为策略网络**



## **12  模仿学习**

Imitation learning ：不是强化学习，而是强化学习的一种替代品

两者目的相同：学习策略网络，从而控制agent

两者原理不同：模仿学习向人类专家学习，使得策略网络作出的决策与人类专家相同；强化学习使得return最大化



### **12\.1 行为克隆 behavior cloning**



## **20 PPO: Proximal Policy Optimization 近端策略优化**

参考文章：[https://zhuanlan\.zhihu\.com/p/1911110735150416080](https://zhuanlan.zhihu.com/p/1911110735150416080)



Proximal：近端的，表示在更新策略时，采取小步慢走的保守策略，确保新策略和旧策略不会相差太远

### **20\.1 Motivation：**

- 策略梯度方法在更新策略的时候，步长（学习率）的选择非常重要：

    - 步长太小：学习太慢，效率低下

    - 步长太大：策略可能会剧烈变化，出现灾难性的性能下降

- 为了解决策略梯度不稳定问题，提出了TRPO方法，求每次策略更新，必须保证新策略和旧策略之间的差异在一个“信赖域”以内

    - 保证了每次都可以提升策略性能，并且不会出现灾难性的性能下降

    - 缺点：实现复杂，计算复杂，不能使用Pytorch的自动微分

而PPO可以实现：保持TRPO稳定性的同时，简化实现难度，可以使用一阶优化器进行训练\(e\.g\. Adam\)

### **20\.2 策略修剪（Clipping）**

策略比率Probability Ratio: 

$r_t(\theta) = \frac{\pi_\theta(a_t| s_t)}{\pi_{\theta{old}}(a_t|s_t)}$



$\theta$是**正在优化的策略参数**，$\theta_{old}$是**收集数据时使用的策略参数**

- 如果$r_t(\theta)$\&gt;1 ，说明新策略更倾向于采取$a_t$ 。

- 如果$r_t(\theta)$\&lt;1 ，说明新策略更不倾向于采取$a_t$ 。

- 如果 $r_t(\theta)=1$，说明新旧策略对$a_t$的偏好程度一样。



#### **20\.2\.1 Clipping机制：**

引入一个剪裁项，保证$r_t(\theta)$不能超过预设的范围$[1-\epsilon,1+\epsilon]$，$\epsilon$是一个超参数

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjNjMjdmNTBkMGYwZTkyN2RiNGIzZDFlZTA2NjM4YzBfMmI2ODU4NmFhYWFlMTg3NDkyNmE1OThjYTViZjc4ODdfSUQ6NzYwNDMzMjA0MTY1MTUyMjc0MV8xNzc5ODc4NTE1OjE3Nzk5NjQ5MTVfVjM)





注意：这个目标函数是越大越好

可以看一下 8\.2 A2C的内容

总结：

- $A_t>0$时，PPO目标函数鼓励$r_t(\theta)$增大，但会限制其上限在$1+\epsilon$

- $A_t<0$时，PPO目标函数鼓励$r_t(\theta)$减小，但会限制其上限在$1-\epsilon$



如果A\_t\&gt; 0 那么说明这个动作比平均水平要好，希望通过优化\\theta来增加这个动作的概率，也就是提高r\_t\(\\theta\)，从而使得目标函数的值增大

弱国A\_t\&lt;0那么说明这个动作比平均水平要差，希望通过优化\\theta来减小这个动作的概率，也就是减小r\_t\(\\theta\)，从而使得目标函数的值还是增大



### **20\.3 优势函数**

继续理解一下A\_\\pi\(s,a\) = Q\_\\pi\(s,a\) \- V\_\\pi\(s\)

- Q\_\\pi\(s,a\)表示在状态s下采取动作a的预期收益

- V\_\\pi\(s\)表示在状态s下，按照当前的策略随机选择动作的平均预期收益

所以A\_\\pi\(s,a\)\&gt;0表示是一个好动作，采取动作a可以获得高出平均的预期收益

#### **20\.3\.1 GAE（Generalized Advantage Estimation）广义优势估计**

Motivation：计算优势函数一般使用TD\(0\)来计算

- TD\(0\)误差只考虑了下一步的奖励和价值，这可能导致高偏差

- \\delta\_t = r\_t \+ \\gamma V\(s\_\{t\+1\}\) \- V\(s\_t\)

- 蒙特卡洛估计（Monte Carlo）虽然无偏，但方差很高

GAE结合了两者的优点，通过一个参数\\lambda\\in \[0,1\]来进行平衡，权衡偏差和方差

$A_t^{GAE(\gamma,\lambda)} = \sum_{l=0}^\infty (\gamma \lambda)^l \delta_{t+l}$



对于A\_\{t\+1\}和A\_t有这样的关系：A\_t = \\gamma \\lambda A\_\{t\+1\} \+ \\delta\_t

### **20\.4 熵\(Entropy\)奖励：奖励探索，避免偏执**

PPO的目标函数通常还会加上一些正则项，比如鼓励熵增大（使得动作的概率不会一家独大，更加均衡，便于进行探索）

PPO的目标函数：

$L^{PPO}(\theta) = L^{CLIP}(\theta) -c_1 L^{VF}(\theta) + c_2 S(\pi_\theta)(s)$



其中   

- L^\{CLIP\}\(\\theta\) = \\mathbb\{E\}\_t\[\\min\(r\_t\(\\theta\)A\_t,clip\(r\_t\(\\theta\),1\-\\epsilon,1\+\\epsilon\)A\_t\)\]    为了训练actor网络，训练策略

- L^\{VF\}\(\\theta\) = \(V\_\\theta\(s\_t\)\-V\_t^\{target\}\)^2     V\_\\theta\(s\_t\) 表示在当前策略下的价值评分          这里的V\_t^\{target\}是我们想要让价值网络去靠近的真值，表示蒙特卡洛回报，或者是GAE计算出的优势加上当前的价值估计   这一项是为了训练critic网络  训练评分函数V

    - 蒙特卡洛：V^\{target\}\_t = R\_t = r\_t \+ \\gamma r\_\{t\+1\} \+\.\.\.\+\\gamma^\{T\-t\}r\_T 就是直接计算回报return  无偏但是高方差

    - V\_\{t\}^\{target\} = A\_t \+ V\_\{\\theta\_\{old\}\}\(s\_t\)   A\_t表示在状态s\_t下进行动作a\_t相对于平均表现好了多少，使用GAE计算

- S\(\\pi\_\\theta\)\(s\) = \-\\sum\_a \\pi\_\\theta\(a\|s\)\\ln\\pi\_\\theta\(a\|s\)  

可以看到实际上价值网络和策略网络是共享参数\\theta的

对于连续动作空间也是需要熵奖励的

$H = -\int p(x)\ln p(x)dx$



p\(x\)就是概率密度函数

### **20\.5 PPO调节学习率**

不能使得学习率一直不变，要进行动态调整

首先先来看一下：两个一元高斯分布的从p到q的KL散度公式：

$KL(p||q) = \sum_x p(x) \ln \frac{p(x)}{q(x)}  = \ln\frac{\sigma_2}{\sigma_1} + \frac{\sigma_1^2 + (\mu_1 - \mu_2)^2}{2\sigma_2 ^ 2} -\frac{1}{2}$



那么对于两个维数相同的多元高斯分布：

$KL(p||q) = \sum_x p(x) \ln \frac{p(x)}{q(x)}  = \sum_{i =1}^N [\ln\frac{\sigma_{q,i}}{\sigma_{p,i}} + \frac{\sigma_{p,i}^2 + (\mu_{p,i} - \mu_{q,i})^2}{2\sigma_{q,i} ^ 2} -\frac{1}{2}]$





## **21 SAC Soft Actor\-Critic算法**

参考博客：https://zhuanlan\.zhihu\.com/p/70360272

SAC是一种面向最大熵的（Maximum Entropy Reinforcement learning）off\-policy算法，并且是随机策略（stochastic Policy）

### **21\.1 为什么研究Maximum Entropy Reinforcement learning**

一般的DRL只要求return的期望值最大，也就是累加的reward的期望值最大

而最大熵RL，除了上面的基本目标，还要求policy的每一次输出的action的熵entropy也要最大

$\pi^* = \argmax_\pi \mathbb{E}_{(s_t,a_t) \sim \rho_{\pi}}[\Sigma_tR(s_t,a_t) + \alpha H(\pi(\cdot | s_t)]$

使得return和熵的和要达到最大

这是为了：使得输出的每一个action的概率尽可能分散，而不是集中在一个action上面



**优势：**

- policy通过最大熵，不仅可以学到一种解决任务的方法，而是所有的方法

- 更强的exploration能力

- 更强的鲁棒性，由于要从不同的方式来探索各种最优的可能性，所以面对干扰更容易作出调整



### **21\.2 Maximum Entropy Reinforcement Learning 的Bellman方程**

### 



