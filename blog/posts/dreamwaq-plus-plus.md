# DreamWaQ\+\+ 

project:https://dreamwaqpp\.github\.io/

paper:https://dreamwaqpp\.github\.io/static/paper\.pdf

conclusion：通过**融合本体感知与外部感知的多模态强化学习框架**，成功赋予了四足机器人在复杂未知环境中兼具敏捷性、抗扰性与障碍物规避能力的“直觉”，使其无需专门训练即可掌握跨越楼梯、深坑及不平整路面的多样化运动技能。



Obstacle\-Aware Quadrupedal  Locomotion With Resilient Multi\-Modal  Reinforcement Learning

## 1 Introduction



本文的contributions如下：

- 提出了一种多模态感知模块，融合本体感觉和外部感觉，这种多模态感知能力和传感器无关（称为弹性控制器），可以与各种外感知传感器集成

- 通过DRL框架增强鲁棒性，使得controller有效利用感知模块

- Skill discovery  使得鼓励学习多种步态







## 2 related Work









## 3 Learning Framework

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Y2U2NTVhMTdjMGZlMjZmNDU2MTc0NjkzNjVmZjRhYThfMTM3MTZjYTEzY2YzYzM5ZTc1MGE5MThiNTk5YjY0ZDhfSUQ6NzYzNDEwMTQ3MjYxNTMzNjkxOF8xNzgwMjMyNjAyOjE3ODAzMTkwMDJfVjM)



与DreamWaQ架构相似，同样使用不对称actor\-critic

actor网络：输入部分的噪声观测数据$o_t^p$和多模态的上下文$z_t^{pe}$

critic网络：输入特权观测，包括高度图，外部受力，地形属性，足部位置







### 3\.B Hierarchical Exteroceptive Memory

为了解决外部传感器的工作频率明显低于本体感觉传感器和控制环路的问题，使用了一种内存结构，

该结构通过串联最近K次测量的点来生成机器人周围更密集的点云，每个点都使用SE\(3\)变换转换到机器人的当前位置（就是将过去的几个测量到的点搬运并且拼接到当前时刻），不是全场景重建，而是仅使用自回归来估算机器人身体框架随时间变化的SE\(3\)变换，避免了计算密集型重构

搬运的一句就是IMU测得的朝向，以及状态估计网络预测的线速度，来推测机器人身体坐标随时间的变换







### 3\.C Exteroceptive Encoder



利用了三维点作为框架的输入（便于切换深度相机和激光雷达）

使用PointNet的架构来有效提取点云中的信息，可以容纳任意数量的点，同时保持对于噪声的鲁棒性

当点云中的异常值和严重噪声占据主导地位的时候，maxpool就会变得有害，不加区分的聚合点特征，为此采用了**置信过滤器层，从统计学角度提出latent space中不可靠的点**



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Nzg5OTU5ZWI0MWJhMTE4OGYyMDE0ZDYwNTRmYTk4YTlfZWMwNzBiMDliYjAwZTAwOWYyOGI3ZmEzMjQ2ZWY5OTdfSUQ6NzYzNDExMzYyMzU3Njk4ODYyM18xNzgwMjMyNjAyOjE3ODAzMTkwMDJfVjM)











