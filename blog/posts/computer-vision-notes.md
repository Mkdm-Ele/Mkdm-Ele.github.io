# 计算机视觉

## Chapter 2 Fundamentals of  Artificial Neural Network 



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzMyNTFjNDYwNDUzZTdkMzlhYTViN2M2ZTg4ZGE4YzNfY2Q4YmQ0MzEwOTllMTdlYWQ2NDU1ZDdjMmE2ZjQ1Y2VfSUQ6NzYyNzM5OTA0OTI4ODk3NzM2Nl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

相比较于传统的machine learning，深度学习所做的事情，就是将特征提取和分类器结合为一个神经网络，以黑盒的方式，不需要自行设计特征



### 2\.1 Activation Fucntions

为什么需要激活函数？

如果没有激活函数，那么堆叠层数实际上仍然是线性的没有引入非线性，堆叠层数没有作用，并且不能拟合实际的非线性函数





ReLU函数的Pros and Cons

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NGFiNmRhNGMyMzRkNmQ2MTA1NTQ0MDM4MWU3MDcyNGZfOTE5ZGQ3ODkwYjUxN2YwNjhhYjkzZDM1M2I1OGJiNDVfSUQ6NzYyNzQwNDU2NTk3MzA3NzE4MF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

pros：

- 稀疏性：由于大面积的神经元是不起作用的

- 防止梯度消失问题

cons：

- 神经元死亡







### 2\.2 正则化问题

overfitting过拟合的原因主要是：

- 模型结构过于复杂

- Trainning data不足够

一般缓解overfitting的方法就是：简化模型，或者正则化，一般都采用正则化的方法



正则化的目的：**防止过拟合，增加模型的泛化能力**

正则化的方法：

- 通过在Loss Function里面添加正则项，来降低参数的复杂性

- train的时候对于神经元进行dropout处理，防止对于单独神经元的依赖，从而提高模型泛化能力

- Early stopping 早停，防止过量训练导致过拟合

- 数据增强 data augmentation





#### 2\.2\.1 L1 正则化

$J = L(\omega) \rightarrow J = L(\omega) + \lambda \|\omega\|_1$

损失函数加上了一个L1范数，L1范数就是$\omega$这个矩阵的所有参数的绝对值之和

L1正则化限制了omega的大小，使得omega这个参数的不会太大



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDA0MmQ4YWI0ZDNjZjIxNzc1N2MzZTVkYTlkNTI0N2FfYjdlODBmMDBmMmIzYTFmZjc2OTU1YTNhYjYwMTQ2NTVfSUQ6NzYyODg4MjAyOTg5NjIyMzY5MV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

但是L1正则化的后果是带来**参数矩阵的严重稀疏性**

如上图，假设omega是一个2维的向量$\omega = [\omega_1,\omega_2]$  

彩色同心圆表示在引入正则化之前的Loss的等高线，其中最中间的就是Loss最小值对应的最优解

黑色菱形表示L1正则化的约束

由于L1正则化是一个菱形，所以与彩色等高线的共同约束作用下，往往焦点就会在坐标轴上面，这时omega\_1 = 0 ，当维数增大的时候，就会导致很多的参数都是0，造成了权重矩阵的稀疏性



#### 2\.2\.2 L2正则化

为了解决上面提到的稀疏性问题，使用L2正则化

$J = L(\omega) \rightarrow J = L(\omega) + \frac{\lambda}{2} \|\omega\|_2$  

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZTcyZGY4ZWI3ODNhMDdjNDJlMGZlMjQwMzc0MWVhYzZfZGU5ZjJhYTNhMDQ2NDZmYTZiZGFmYWNmZjc1N2JiMzVfSUQ6NzYyODg4MzgxODI4MzYxNzUwMF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

L2正则化相比于L1的特点：

- Density

- 平滑可导





#### 2\.2\.3 Dropout

随即将某些没有死亡的神经元置零，增大矩阵的稀疏性

在正常的训练中，神经元之间可能会形成复杂的依赖关系，即“共适应性”（co\-adaptation）。这意味着某些神经元只有在特定的其他神经元存在时才能很好地工作。这会让模型变得脆弱，过度依赖训练数据中的特定模式

dropout是在训练的时候进行，在测试的时候不会进行，所以在测试的时候相当于是开启了所有的“子网络”







### 2\.3 优化器

常用的优化器：BGD，SGD，Mini\-Batch GD

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YWU2NWFmZGJhYWY4NmEyYmU1ZTdiMjcyMmNjMWUyZGNfZmQ0NmMwZjk1MDBiOWI0NjA4YjQwMWE4OTM3ODU5NDdfSUQ6NzYyODg4ODY2MTY4MzUyMjc2N18xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

如果理想的看，我们希望一次性将所有的数据全部计算梯度，因为这样是最具有统计意义的，但是碍于硬件限制（显存），一般将数据分成小的batch进行更新

BGD就是将所有的数据进行这样的计算

SGD是随机抽取样本

mini\-batch是BGD和SGD的折中方案，随机抽取\+小batch

一般在cv里面使用mini\-batch GD优化器



#### 2\.3\.1 Momentum

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjRhZmE1ZjdiNDI2MTlhNDdiZDZjMTk5NTQzNGE5YjZfN2UwZDFmMjBkNzlkZGY0MzFmZDA2MjhiNzBjOWRjMGFfSUQ6NzYyODg5ODQzMjg4NzIxMjk4Nl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

如上图所示，SGD在优化的过程中，会走zig\-zag的路线，不能直接平滑到达最优位置，这本质是因为不能保存上一步更新时候使用的梯度方向，所以下一次的更新方向完全看这一次抽取到的数据计算到的梯度

Motivation：累计历史的梯度来进行优化，从而加快收敛的速度，减少震荡



**更新公式：**

$v_t = \gamma v_{t-1} + \eta \nabla_\theta J(\theta_{t-1})$  速度

- 在普通的SGD里面，之境界将梯度当作步子迈出去

- 但是在动量法里面，将梯度用于计算“速度”，位置（\\theta）的更新是依靠这个速度进行累积起来的

$\theta_t = \theta_{t-1} - v_t$ 更新参数









## Chapter 3 CNNs and Image Recognition

CNN非常适合用来处理图像等二维数据



Q：为什么不适用MLP全连接层来处理图像数据

A：

- 图像数据的一个数据很大，最小也是32\*32的级别，导致全连接层的参数量过大

- 使用全连接层处理图像信息，丢失了图像像素之间的空间信息







Q：在传统图像处理中，使用的kernel（比如中值滤波，高斯模糊，锐化等经典图像操作），与卷积核有什么关系

A：可以将这每一个操作看成一个提取图像的不同特征的操作，卷积核就是一个可学习参数的核，可以学习出提取特征的无数种方法，而不是锐化这种人工设计的参数的特征提取器，同时卷积核往往有很多个channel，就可以多方位无死角的提取出多个方面的特征



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzhjNDE2NGZhMmQ1ZDAxYWIxOWM5OGU3MGZiYzEwZGNfZDY4NDE1ZDc4MmExOTA5ZmE5MWE2ZWMxNWJiMWJmYjRfSUQ6NzYzOTU0NjMxNjg4MDA3MTg1OF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)











### 3\.1 卷积提取特征的平移等变性

能够很简单理解：当图片发生平移的时候，由于卷积核的移动方式，卷积提取出的特征是不会变化的，所以卷积提取特征具有平移等变性



但是如果图片发生了旋转，提取出的特征是变化的







### 3\.2 卷积的下采样

卷积的下采样通常通过两种方法来实现：

- 池化操作

- Stride \&gt; 1，特征图尺寸就会减小



Q：为什么要进行下采样

A：

- 减少计算量，模型运行速度变快

- 扩大了感受野

- 增强鲁棒性，过滤掉一些不重要的细节和噪声



下采样同时也会造成信息量的损失，所以一般在下采样的同时，会增加channel数量，以保证信息量不损失





![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDg2MGY2YTc4NWU5M2UzNzZhZmM2YmNhNzU5OTE4MGVfNTk4NzhlNDM3MGY2NDk3ZGZiZDM5MTA2YjhhODg4NjhfSUQ6NzYzOTU1NDE3MTc3MTA3OTYyMF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)



### 3\.3 一些特殊的卷积方法

#### 3\.3\.1 深度可分离卷积 Depthwise Separable Convolution



一个3channel的图像，分别经过3个卷积核卷积，得到了三张特征图，但是这三张特征图不是相加，而是使用4个1\*1的卷积核，相当于加权求和

这样，第一个操作的3\*3卷积核就是共享的，极大减少了参数量



这种卷积操作常用于mobile net中



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTk3ZWM2MzU0YzRhMWVjZWQ0ZDNlOGYyODg3YWIxMzhfOWE2MGI3YTVhNTk1MDRlZWQ4Mjg4ZjBjZTU2NDAyNGVfSUQ6NzYzOTU1OTg0NjYzNTI2MDg3NV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)



### 3\.4 Transfer Learning

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGRiMjkzMTQ0YjYzOWQ1YmRiMjE3NmJiYzMzYmUyNDBfM2FkNjdmMDc0NGU2ODE1MTkyYTBhMzFhZjY5NDY0ZTNfSUQ6NzYzOTU2NzExNzA4MDI4NDM1N18xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

如果要复用已经训练好的CNN结构，并且使用较少的数据集来进行训练，可以冻结前面的特征提取部分，只修改分类头的训练

这样训练得到的效果不一定好，但是一定最快



如果数据集偏大一些，可以不冻结前面的CNN，而是将预训练权重作为初始位置来进行全网络或者部分网络的更新



















## Chapter 4 Object Detection

目标检测的输入：一张图像

目标检测的输出：

- 分类的标签

- Bounding box

- 每一个box的confidence score



其中bounding box有的是Horizontal Box，也就是不旋转的

也有的是Rotated Box，加上了一个旋转

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjAxZmYzNjFhNzVhYWE0OGE0MzgwYWNlOGQ0MWE0YmZfM2NmYTdmNWI4MjUxODU5Y2E2MzVhNzRiMTliNDEwYjNfSUQ6NzYzOTU3Nzc4NDQxMTY3MTUwMV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

RBox可以使用5个或者8个参数来表示

$(x,y,w,h,\theta)$分别表示：标框的中心点，框的宽度和高度，以及框的旋转角度







### 4\.1 Metric

目标检测常用的metrics有：

- IoU

- AP平均精度

- mAP 平均精度均值

- FPS 每秒帧数





**IoU 交并比**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTFkYWY5MzIzYWIxMDAxNGIyZTM0NWNhNjY4YzdkMGVfYjhhOWZmMjI5ODZmNzExZDY1MWMwZDQ5NzA3YTgzNDBfSUQ6NzYzOTU4MDIwMjM3NjgwOTQwMF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

如果使用IoU作为loss，开始的时候，标的框很可能与label的框完全不重叠，IoU为零，在优化后也很可能一直为零，导致不能正常优化更新参数









**GIoU**

为了解决IoU作为loss的训练问题，提出了Generalized Intersection over Union



GIoU的范围是\[\-1,1\]

如下图，当A，B完全不相交的时候，IoU=0，GIoU \&lt; 0，这个值越小，就说明两个差的越多

当两者完全重叠的时候，IoU = 1 后面的值为0



![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YmQ5NjIyZDY5Y2U0MTBiNmFjMjQ1OGQ5Y2FjZGQxMzNfNDgzYTRlMzdhNDg3NDQyN2NlYTE3YjFkNDYxZGYwNjRfSUQ6NzYzOTYzMzE3MDUzNTIyMjIyMl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)



**Accuracy/Precision/Recall/F1\-score**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OGJmMTc1ODFhMWI0YzM0ZmJlZWVmNjcxZTk2NzhlNjNfNTVjNDAyMDU5NGU1OWQxNTJjZmM0ZTBlM2VlMTBjODBfSUQ6NzYzOTYzNTY1NDkzMDU5OTExMl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

先来看一下confusion matrix

TP：真阳性，T表示预测正确，P表示是1

TN同理

FP：假阳性，F表示预测错误，P是1，也就是说预测是1，但实际是0

FN同理

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MzA1MTNjZDVlYzViNDIyOTVkZTBhYmRkNjlhMTI1ZmZfNmJkMWVhZjAxYjVkOTIzODUzYmZlMTcwZDcxMGNmNjRfSUQ6NzYzOTYzNjExMzQ1OTc2MDMzMV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

Accuracy是总的“正确率”

而Precision表示精确率，也就是所有判断为正的样本中的正确率   所以称为查准率

Recall表示实际为正的样本中的正确率，分母是所有的实际为正的样本  所以称为查全率



**PR曲线**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWU3MGM3MTdkNTdhOTJjNzM4MmJlYTI1MzZjYjI1YjdfNWNjNTNhMjgzZGUxOGRlODQ3MzMzMDJkNzA1ZDc1NDlfSUQ6NzYzOTY0MDM4OTEwMTE0NTA1Nl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

如果想要precision高一些，因为害怕引入假的positive，就会使得一些实际是positive的被漏检

如果想要recall高一些，因为想要找全全部的positive，就会使得一些实际是negative的被检成positive

PR曲线越接近\(1,1\)点就会越好，实际中会找一个平衡点BEP









**mAP**

AP是一个更加综合的指标，实际上就是PR\-curve的面积

AP衡量的是一个种类的识别的好坏

mAP是将所有的种类取平均，衡量总体检测的好坏





AP\_75表示：当IoU阈值是75%的时候的AP（IoU阈值表示，只有在IoU超过阈值的时候，才会将这个识别为正）

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTQwZjg5M2IwZDZjOWVjNWE1YTM1ZjdiN2I1NGRiZWVfMGNiOTZiMDc3ZGRkOTIxMzg0MjMyMmY2NzdlMzBkYThfSUQ6NzYzOTY0MjMwMDI0NzgzNzg5MV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)



**NMS Non\-Max Suppression**

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTk5MmU5NjJmZWExNTE5YmJjNjZjYWE3MTZkNGI2YjhfNDZiNzgzNzE0YjdjYTNkMDlkZTY0MTcwMWQyMWM0NGZfSUQ6NzYzOTY1MzYzMTI1NjYxMTgxM18xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

如果有两个检测出来的框的IoU超过了阈值，就认为其中一个是冗余的框，删除掉哪个置信度较低的框





![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MDM0MjJlZjdkYjlhYmI0MDgxMDllZWU1MzUxMzdmZmRfMjhjZjFkN2JmYWM3YmMwYTE4NmYwNmZjYTZlNTI2ZDZfSUQ6NzYzOTY1NDkwNzYwNzQ2OTI3OF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

NMS具体作用的流程：

- 检测到若干的框

- 先选出老大0\.9红色

- 第一轮，这个老大与别的所有的框进行IoU计算，并且删除掉超过阈值的框，比如粉色

- 第二轮，将除了老大之外的所有框比较选出老二黄色

- 老二与剩下的进行IoU计算并且删除超过阈值的框

- 下一轮，直到所有的都已经保留，或者设置为0









### 4\.2 Single object detection

对于单个物体，可以简单的认为是两个任务的结合：分类和标框

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTg4ZDRmZDM3MjA4YzZhOWVkMmQ0ZjRkMmZmMDdjMjJfMjFlZTY2OWE0MzZhYTA3Mjc4M2RlZTU0MmRlZTgxMGVfSUQ6NzYzOTkxMzQwNDI4MjY4NjQzM18xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)



### 4\.3 Multiple objects detection

对于多个物体的检测，就不能简单看成是一个分类问题

之前的方法使用了滑窗，对于每一个滑窗进行一次分类任务，这样的计算量非常大



#### 4\.3\.1 Region\-Based CNN R\-CNN

使用一个region proposals

使用一些启发式的规则（selective search），比如寻找图像中的颜色等，找出一小部分的可能包含物体的方框，相对于滑窗要快很多



R\-CNN使用了两阶段的detector：

- 第一阶段：生成region proposals（通过传统算法）

- 第二阶段：判断每一个候选的区域分别是背景还是前景物体



在第二阶段，实际上就是将候选的区域直接送到CNN里面提取



#### 4\.3\.2 fast R\-CNN

为了解决R\-CNN计算慢的问题，提出了Fast R\-CNN



R\-CNN是先经过crop，再经过卷积提取特征

Fast R\-CNN 是先经过卷积提取出特征，然后在特征上面进行crop

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NWNkN2E4NmQ3OTg4MjI2YTdmZGIwZjgxMDFhYTJkMTdfY2NmYmRmMWM5OTA0NjA1NTc2ZWViZWNmM2JjM2U1ZDFfSUQ6NzYzOTkyMDQ4Nzc5NzM5NDM2NF8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)





![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=MWZkMzY3NTk2MmY0YWUwOThlM2JiNmVjZjFiOTQ2NzhfMzc3ZTEzMTc2NDM4OGE3ZTQ5MjBhZGM4Yjk0ZTU0MWRfSUQ6NzYzOTkyMTIzMTEyNzE4NjYyNl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

Fast R\-CNN的









## Chapter 5 Object Segmentation

### 5\.1 Segmentation Types

分为三种：

- 语义分割：所有的物体都进行分割，但是不区分每一个相同种类的物体，比如不区分人1和人2

- 实例分割：只分割感兴趣的物体，不会分割不感兴趣的（比如天空和树），同时区分同一种类的不同物体

- 全景分割：上面两者的结合

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZjAxNGY0MjIyYjcxN2MwZjQxYWFkNzczODJlZjdiNTdfZTNjOTFkMjFmNDU0NDEyMjllZTg0OTZlZjk0NTFlZWZfSUQ6NzY0MTAzMDc4NDU2MzkyMzkzMl8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)







### 5\.2 Methods

#### 5\.2\.1 FCN Fully Convolutional Network 全卷积网络

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZGUyYmRkMDQ2MDYwNmY5ZTg2ODIzNjZhMDc2OGJhM2NfN2M0ZjYwY2ViNDg1NzI1NWE1MDM0Njg4ODZkOWQzZDNfSUQ6NzY0MTAzMjczMDQ0MDEyNTY0OV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)

普通的分类任务：图像经过CNN之后提取出特征，然后接到一个全连接层里面，输出 种类数\*1的 logits

分割任务：使用全卷积，进行不断的下采样之后，变成了一个21\*H\*W的特征图，21表示最终的分类的种类数，每一个像素都有21个可能，是21\*1\*1的特征



但是这样的做法有一个问题：是怎么把不断下采样后的特征突然上采样变成21\*H\*W的呢

下图解释了几种策略：

FCN\-32s：经过5次pooling，特征图变成了image原图大小的1/32，然后再经过32倍上采样，就变成了原图大小，但是这样子使用了最深层的特征，导致空间细节丢失严重，导致分割边缘非常模糊

FCN\-16s：第一次融合，pool5的特征经过2倍上采样，与pool4进行逐元素相加，然后经过16倍上采样，这样子使用了**“跳跃连接”**的思想





![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YTk2MjcwZjdhMzAxNTBhYjZmOTM0OTE2MmNkYTllNjBfN2RmM2I5ODgwZDM0ZTc0ZTgxOGQ3ZWM1MzllNDE4MTVfSUQ6NzY0MTAzNDcwMDEzMTgxNDM1OV8xNzc5ODc4NDQ3OjE3Nzk5NjQ4NDdfVjM)



















































