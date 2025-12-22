---
layout    : post
title     : "使用Github Action cicd到阿里云ACK集群"
date      : 2025-10-13
lastupdate: 2025-10-14
categories: k8s 
---
# 项目介绍
这个项目是一个2048小游戏的demo,通过Github Action CD到阿里云的ACK集群，这个项目中的流水线脚本是我自己编写的，2048小游戏本身是其他开源项目移植，该项目是为了让各位更好的感受CI/CD流程。详细请查阅我[Github](https://github.com/hudongyida/2048demo-with-Alibaba-cloud-CI-CD-Pipeline)。

# 先决条件
- 拥有一个阿里云账户
- 拥有一个Github账户
- 一个任意的Linux【非必要条件方便安装kubectl k8s集群管理工具】

# 准阶段
## Github仓库
1. 登入你的Github仓库  
   ![github](attachments/github-cicd-to-ack/github-1.png)  
2. 在右上角的搜索框搜索 "hudongyida/2048demo-with-Alibaba-cloud-CI-CD-Pipeline"或者访问链接【https://github.com/hudongyida/2048demo-with-Alibaba-cloud-CI-CD-Pipeline】  
   ![github](attachments/github-cicd-to-ack/github-2.png)  
   ![github](attachments/github-cicd-to-ack/github-3.png)  
3. 打开界面即可，如下即可  
   ![github](attachments/github-cicd-to-ack/github-4.png)  
4. 创建仓库分支。仓库名称随意，你可以保持默认，也可以自己取一个，我这里不想用这么长的，所以我该了一个短一点的，aliyun-cicd  
   ![github](attachments/github-cicd-to-ack/github-5.png)  
   ![github](attachments/github-cicd-to-ack/github-6.png)  
5. 完成后的效果如下  
   ![github](attachments/github-cicd-to-ack/github-7.png)  

## 阿里云ACR 镜像仓库
**由于我的阿里云账户已经存在一个个人版容器仓库，所以在创建阶段我无法使用自己自己的账户做演示，下面的演示阶段使用的是其他人的账户，不过不影响实际小效果，并且在后面的流水线配置演示中我也会继续使用这个仓库**
1. 是用主账号登入阿里云，选择`产品`，`容器`,`容器镜像服务ACR`  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-1.png)  
2. 创建个人版的容器镜像仓库，企业版的要付费  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-2.png)  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-3.png)  
3. 选择仓库地区，任意。【我这里选择香港是我自己的仓库在香港，为了和后面的图文匹配】  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-4.png)  
4. 创建完成后入下图所示  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-5.png)  
5. 点击`设置Registry登录密码`这个密码独立的仓库登入密码，不是阿里云主账户的登入密码。  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-6.png)  
6. 设置完成后如下  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-7.png)  
7. 创建名称空间。  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-8.png)  
8. 名称空间一整个仓库服务器只能有一个，例如你不能在香港仓库配置名称空间为demo2048【因为我个人仓库已经使用了这个仓库名称了】  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-9-1.png)  
   所以你只能使用其他名称，或者你将仓库选择在香港以外的其他地方。  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-9.png)  
   设置完成后请将仓库设置为公开，默认情况下是私密，否则可能会导致镜像拉取失败。  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-10.png)  
9. 创建仓库  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-11.png)  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-12.png)  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-13.png)  
10. 仓库创建完成  
   ![ACR-1](attachments/github-cicd-to-ack/ACR-14.png)  

## 阿里云RMA用户的AccessKey
1. 确保自己的阿里云账户有充足的可用资金或优惠券。可用额度+优惠券余额需的可以余额要大于100，否则可能导致集群无法创建。  
   ![ACK](attachments/github-cicd-to-ack/ACK-1.png)  
2. 配置对应的RMA账户，配置RMA账户是为了更好的规避权限风险，RMA账户的AccessKey实现集群访问。当然你也可以使用主账户的AccessKey【虽然不推荐但是实验环境你这么配置也没关系，请直接跳转到第7步，生产环境严禁这样使用，当然你也可以跟着下面步骤学习如何配置RMA用户，因为在企业生产环境中一般不会使用主账户，包括作者自日常使用阿里云的时候也是使用的RMA账户，主账户一般只在查账的时候才是使用】  
   ![ACK](attachments/github-cicd-to-ack/RMA-1.png)  
   这是配置主账户的AccessKey【如果你选择这样配置，请直接跳转到第7步】  
   ![ACK](attachments/github-cicd-to-ack/RMA-2-1.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-2.png)  
3. 创建RMA用户  
   ![ACK](attachments/github-cicd-to-ack/RMA-3.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-4.png)  
4. 完成身份验证后会创建就完成了，如下图  
   ![ACK](attachments/github-cicd-to-ack/RMA-5.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-6.png)  
5. 下面步骤是开启VMFA安全验证，因为阿里云的默认策略原因，RMA账户必须开启VMFA,如果不开启会导致RMA账户无法使用。如果你前面设置了不要求开启MFA认证，则可跳过此步骤。  
   ![ACK](attachments/github-cicd-to-ack/RMA-7.png)  
   将刚刚复制的链接粘贴到浏览器的地址栏打开  
   ![ACK](attachments/github-cicd-to-ack/RMA-8.png)
   ![ACK](attachments/github-cicd-to-ack/RMA-9.png)    
   下载阿里云手机APP  
   ![ACK](attachments/github-cicd-to-ack/MFA-1.jpg)  
   如果界面没有就直接搜索MFA，然后如下图操作  
   ![ACK](attachments/github-cicd-to-ack/MFA-2.jpg)  
   ![ACK](attachments/github-cicd-to-ack/MFA-3.jpg)  
   ![ACK](attachments/github-cicd-to-ack/MFA-4.jpg)  
   完成添加后会有6位数字的验证码，填写到浏览器中，每30秒刷新。  
   ![ACK](attachments/github-cicd-to-ack/MFA-5.jpg)  
   为什么和上面的数字不一样，因为30秒刷新，我没那么快的手速。  
   ![ACK](attachments/github-cicd-to-ack/RMA-10.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-11.png)  
   除开阿里云的MFA你也可以使用其他的MFA软件，比如"Microsoft Authenticator（作者本人使用）","Google Authenticator","腾讯身份验证器"  
6. 配置RMA账户权限  
   ![ACK](attachments/github-cicd-to-ack/RMA-12.png)  
   **警告生产环境中严禁这样授权，应该根据实际资源的使用情况进行合理授权，例如创建ACK集群需要使用到EIP，ECS，OSS等等资源，那么这时就给予EIP,ECS,OSS等资源的访问权限**  
   **再次申明这里是实验环境，为了便于实验，所以直接授权管理员。生产环境严禁这样配置授权**
   ![ACK](attachments/github-cicd-to-ack/RMA-13.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-14.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-15.png)  
7. 创建AccessKey  
   ![ACK](attachments/github-cicd-to-ack/RMA-20.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-21.png)  
   创建完成后会将创建出的ID和秘钥一并列出，请即使保存，因为**ID和秘钥只会显示这一次，关闭后就无法查看秘钥了**
   ![ACK](attachments/github-cicd-to-ack/RMA-22.png)  
   ![ACK](attachments/github-cicd-to-ack/RMA-23.png)  

## 阿里云ACK集群创建
1. 使用刚刚创建的RMA账户登入阿里云  
   ![ACK](attachments/github-cicd-to-ack/ACK-2.png)  
   ![ACK](attachments/github-cicd-to-ack/ACK-3.png)  
   ![ACK](attachments/github-cicd-to-ack/ACK-4.png)  
   如果你没有开启并配置了MFA那么请打开你的MFA查看代码  
   ![ACK](attachments/github-cicd-to-ack/ACK-5.png)  
   登入后界面如下  
   ![ACK](attachments/github-cicd-to-ack/ACK-6.png)  
   如果出现了无法登入请检查，请确保已经开启`控制台访问`和`MFA 设备`状态  
   ![ACK](attachments/github-cicd-to-ack/B-1.png)  
2. 创建ACK集群  
   ![ACK](attachments/github-cicd-to-ack/ACK-10.png)  
3. 选择立即购买  
   ![ACK](attachments/github-cicd-to-ack/ACK-11.png)  
4. 如果你是首次创建可能会需要RMA授权，因为我们配置的是管理员权限，所以可以直接授权，如果没有出现该界面则可能表示角色以存在，直接跳过该步骤即可。  
   ![ACK](attachments/github-cicd-to-ack/ACK-B1.png)  
   ![ACK](attachments/github-cicd-to-ack/ACK-B2.png)  
5. 按下图完成【集群配置】，完成后点击`下一步：节点池配置`  
   ![ACK](attachments/github-cicd-to-ack/ACK-12.png)  
   1. 关闭智能托管模式，不然没法手动配置，自动配置的Pro版本，烧钱  
   2. 名称随意  
   3. 选择基础版本，Pro版烧钱  
   4. 区域推荐选择，根前面的ACR仓库区域一致，我前面ACR区域配置的是香港，所以我这里选择的是香港  
   
   ![ACK](attachments/github-cicd-to-ack/ACK-13.png)  
   5. 自动创建  
   6. 自动创建普通安全组，企业要钱  
   7. 使用EIP暴露API server 【必须勾选，否则无法从公网访问集群】  
   8. 网络插件选择Flannel，下面的网段设置默认  
6. 节点池配置，按下面图片进行配置  
   ![ACK](attachments/github-cicd-to-ack/ACK-15.png)  
   CPU，内存都选择最小的，省钱，如果有钱那随意  
   ![ACK](attachments/github-cicd-to-ack/ACK-16.png)  
   操作系统默认，ACK集群会自动完成配置，登入方式选择密码  
   ![ACK](attachments/github-cicd-to-ack/ACK-17.png)  
   修改磁盘容器，省钱，如果有钱那随意  
   ![ACK](attachments/github-cicd-to-ack/ACK-18.png)  
   如果存在下面提示，则表示该操作是首次操作，需要授权，直接点击快速授权即可  
   ![ACK](attachments/github-cicd-to-ack/ACK-B3.png)  
   ![ACK](attachments/github-cicd-to-ack/ACK-B4.png)  
   点击高级设置  
   ![ACK](attachments/github-cicd-to-ack/ACK-19.png)  
   往下找到`公网IP选项`  
   ![ACK](attachments/github-cicd-to-ack/ACK-20.png)  
7. 组件配置，选择Nginx-Ingress，其他默认，这个便于后续配置域名反向代理。完成后点击"下一步：确认配置"  
   ![ACK](attachments/github-cicd-to-ack/ACK-21.png)  
8. 在这里可以查看集群的配置，如果发现有配置不对或者漏可以返回查看  
   ![ACK](attachments/github-cicd-to-ack/ACK-22.png)  
   如下图【ACK-23】，`ACK 服务开通检查`直接跳过即可。  
   ![ACK-23](attachments/github-cicd-to-ack/ACK-23.png)  
   如果你是首次创建在最后可能会提示下面情况，这些表示的是当前账户没授权，直接点击去授权即可。  
   ![ACK](attachments/github-cicd-to-ack/ACK-B5.png)   
   ![ACK](attachments/github-cicd-to-ack/ACK-B6.png)  
   在开通`可观测监控 Prometheus 版`的时候不是授权，而是需要开通，直接开通即可，我是已经开通了，所以这里的开开通是灰色的。  
   ![ACK](attachments/github-cicd-to-ack/ACK-B7.png) 
   上面步骤完成后，应该会和【ACK-23】图一样  
9. 创建集群  
   ![ACK](attachments/github-cicd-to-ack/ACK-24.png)  
   ![ACK](attachments/github-cicd-to-ack/ACK-25.png)  
   完成后效果如下  
   ![ACK](attachments/github-cicd-to-ack/ACK-26.png)  

# GIthub Action 流水线构建
1. 回到Github点击`steeting`  
   ![ci](attachments/github-cicd-to-ack/github-ci-1.png)  
2. 设置秘钥  
   ![ci](attachments/github-cicd-to-ack/github-ci-2.png)  
3. 配置秘钥参数，需要配置下面参数详细可以访问Github[文档](https://github.com/hudongyiD/aliyun-cicd/blob/main/README%20-zh_cn.md)不知道配置的文章后面有参数详解。  
   ![ci](attachments/github-cicd-to-ack/github-ci-3-1.png)  
   ![ci](attachments/github-cicd-to-ack/github-ci-3.png) 
4. 完成秘钥参数配置后，接着需要完成变量文件，`.env`文件的配置。  
   ![ci](attachments/github-cicd-to-ack/github-ci-20.png)  
   下面是参数配置详解  
### secrets 参数配置详解
- ACCESS_KEY_ID:  阿里云账户ID,还记得前面配置RMA账户时候下载的AccessKey吗？打开后效果内容如下  
   ![ci](attachments/github-cicd-to-ack/github-ci-10.png)  
   表中的`AccessKey ID`就是`ACCESS_KEY_ID`的值。  
   ![ci](attachments/github-cicd-to-ack/github-ci-11.png)  
   ![ci](attachments/github-cicd-to-ack/github-ci-12.png) 
   添加完成后继续添加 
   ![ci](attachments/github-cicd-to-ack/github-ci-13.png)  
- ACCESS_KEY_SECRET: 也是同理`AccessKey Secret`就是变量`ACCESS_KEY_SECRET`的值  
  ![ci](attachments/github-cicd-to-ack/github-ci-14.png)  
- ACR_USERNAME: 用于仓库登入，就是你的阿里云主账户用户名，为什么不是hu.... 前面已经说了，仓库部分我使用的是别人的账户做演示，所以是cg....  
  ![ci](attachments/github-cicd-to-ack/github-ci-15.png)  
  ![ci](attachments/github-cicd-to-ack/github-ci-16.png)  
- ACR_PASSWORD：登入仓库的密码，`阿里云ACR 镜像仓库`配置的第5步，配置的密码  
  ![ci](attachments/github-cicd-to-ack/github-ci-17.png)  
- DOCKER_USERNAME 如果你有dockerhub并且需要推送到docker hub仓库上，则需要配置此参数。考虑到大部分人都没用docker hub仓库，所以这里不待各位配置了，有需要自行配置。    
  ![ci](attachments/github-cicd-to-ack/github-ci-18.png)  
  在命令行界面你可以使用邮箱登入，但是在这里你使用邮箱则无法登入，所以你必须配置为用户名  
- DOCKER_PASSWORD: 登入docker仓库的密码。  
### .env变量文件配置
这是基础默认的配置文件。  
  
```
   # The repository category for pushing images, ali ACK 'ali', docker hub 'docker', ali ACK and docker hub 'all'
PUSH_REGISTRY_KIND=ali

   # Aliyun ACK config
REGION_ID=cn-hangzhou
REGISTRY=registry.cn-hangzhou.aliyuncs.com
NAMESPACE=namespace
IMAGE=image_name
INSTANCE_ID=you_instance_id

   # Docker Hub config (If you want to use this configuration, you need to modify the value of "PUSH_REGISTRY_KIND")
DOCKER_NAMESPACE=NULL  #Your Docker Hub ID
DOCKER_REGISTRY_NAME=NULL  #Your Docker Hub repository name

   # cluster config
ACK_CLUSTER_ID=

   # application config
ACK_NAMESPACE=default
ACK_DEPLOYMENT_NAME=demo2048
APP_NAME=demo2048
REPLICAS=1
CONTAINER_NAME=demo2048
CONTAINER_PORT=80

   # svc config
SVC_NAME=demo2048-svc
SVC_PROTOCOL=TCP
SVC_PORT=80
SVC_TARGET_PORT=80
SVC_NODE_PORT=30080  #This parameter may not take effect.
SVC_TYPE=NodePort

   # Ingress config
```
  
- PUSH_REGISTRY_KIND：表示你需要将构建出来的镜像推送到哪个仓库，`ali`表示阿里的ACR仓库，`docker`表示docker hub仓库，`all`两者都推送。文章中值教了大家配置ACR仓库，所以这里的值为默认。  
![ci](attachments/github-cicd-to-ack/github-ci-21.png)  
- REGION_ID: 表示仓库所在区域ID，默认值是中国杭州`cn-hangzhou`。我配置的仓库区域在中国香港，所以我的值是`cn-hongkong`  
- REGISTRY: 表示仓库地址。这个值不是将中间一段修改为所在区域。而是选择`仓库信息``公网`的后面一小段，为什么要怎么写，因为阿里云官方提供的其他登入方式有BUG，并且官方有2年未维护了，使用其他方式会导致镜像无法推送，或者仓库无法连接，所以流水线脚本只能这样配置。所以我这里的值是`cn-hongkong.personal.cr.aliyuncs.com`  
![ci](attachments/github-cicd-to-ack/github-ci-22.png)  
- NAMESPACE: 名称空间我这里的值是`github-demo2048`  
![ci](attachments/github-cicd-to-ack/github-ci-23.png)  
- IMAGE： 名称空间下的仓库命令我这里的是是`demo2048`
- INSTANCE_ID： 示例ID我这里的ID是`crpi-*************`  
![ci](attachments/github-cicd-to-ack/github-ci-21.png)  
- DOCKER_NAMESPACE: 不考虑，因为我们不推送到docker hub仓库，值默认即可
- DOCKER_REGISTRY_NAME: 不考虑，同理，默认
- ACK_CLUSTER_ID: ACK集群ID我的值是`c5422b77ef09449a4963d266a3be81202`  
![ci](attachments/github-cicd-to-ack/github-ci-24.png)  
修改完毕后的配置文件如下，这分配置文件仅适用于我  
  
```env
   # The repository category for pushing images, ali ACK 'ali', docker hub 'docker', ali ACK and docker hub 'all'
PUSH_REGISTRY_KIND=ali

   # Aliyun ACK config
REGION_ID=cn-hongkong
REGISTRY=cn-hongkong.personal.cr.aliyuncs.com
NAMESPACE=github-demo2048
IMAGE=demo2048
INSTANCE_ID=crpi-**************

   # Docker Hub config (If you want to use this configuration, you need to modify the value of "PUSH_REGISTRY_KIND")
DOCKER_NAMESPACE=NULL  #Your Docker Hub ID
DOCKER_REGISTRY_NAME=NULL  #Your Docker Hub repository name

   # cluster config
ACK_CLUSTER_ID=c5422b77ef09449a4963d266a3be81202

   # application config
ACK_NAMESPACE=default
ACK_DEPLOYMENT_NAME=demo2048
APP_NAME=demo2048
REPLICAS=1
CONTAINER_NAME=demo2048
CONTAINER_PORT=80

   # svc config
SVC_NAME=demo2048-svc
SVC_PROTOCOL=TCP
SVC_PORT=80
SVC_TARGET_PORT=80
SVC_NODE_PORT=30080  #This parameter may not take effect.
SVC_TYPE=NodePort

   # Ingress config
```

## 开始构建
1. 回到Github界面，点击上面的`Action`选项，选开启流水线  
   ![ci](attachments/github-cicd-to-ack/github-ci-25.png)  
   结果如下  
   ![ci](attachments/github-cicd-to-ack/github-ci-26.png)  
2. 点击上面的`Code`,点击`.github/workflows`文件夹  
   ![ci](attachments/github-cicd-to-ack/github-ci-27.png)  
   然后点击`.env`文件  
   ![ci](attachments/github-cicd-to-ack/github-ci-28.png)  
3. 点击右上角的编辑  
   ![ci](attachments/github-cicd-to-ack/github-ci-29.png)  
4. 将修改好的内容张贴上去  
   ![ci](attachments/github-cicd-to-ack/github-ci-30-1.png)  
5. `commit change`提交更改  
   ![ci](attachments/github-cicd-to-ack/github-ci-30.png)  
   ![ci](attachments/github-cicd-to-ack/github-ci-31.png)  
6. 提交完成后流水线会开始自动构建  
   ![ci](attachments/github-cicd-to-ack/github-ci-32.png)  
   ![ci](attachments/github-cicd-to-ack/github-ci-33.png)  
7. 点击流水线可以查构建的详细情况  
   ![ci](attachments/github-cicd-to-ack/github-ci-34.png)  
8. 如果你参数都没用配置错误的话结果会和下图一致【如果提示构建失败那么一定就是你参数问题，将后面流水线脚步解析】  
   ![ci](attachments/github-cicd-to-ack/github-ci-35.png)  

## 访问项目
我们可以在这里查看到之前部署的demo2048。如果你前面流水线构建失败了的话就没法看到这个。    
![ACK](attachments/github-cicd-to-ack/ACK-30.png)  
1. 获取服务动态端口，由于项目是节点暴露，所以只能开放30000以上的端口，虽然我配置指定的NodePort端口，但是这个字段好像并不会生效，可能是由于阿里云ACK集群安全设置的原因，所以这个端口是随机的每个人的都不一样，需要自行查看。  
   ![ACK](attachments/github-cicd-to-ack/ACK-31.png)  
   这里的端口是`32612`,稍后我们访问节点就是使用节点 IP:32612 进行访问  
2. 配置节点放行，因为我们这是是使用节点暴露访问，所以需要对节点的安全策略进行配置。点击左侧的`节点`，因为当时我们只设置了1台节点，所以我们只需要对这一个节点进行配置就好了    
   ![ACK](attachments/github-cicd-to-ack/ACK-32.png)  
   如果你配置了多个节点，可以在这里查看是部署在了哪个节点上  
   ![ACK](attachments/github-cicd-to-ack/ACK-33.png)  
   可以看到这里有一个pod运行在了IP地址为`10.147.52.52`的节点上，此时我们回到`节点`，就能根据IP地址找到对应的节点了。  
   ![ACK](attachments/github-cicd-to-ack/ACK-32.png)  
   **需要注意一定要在pod运行的节点上进行安全配置，如果你的pod运行在.52的主机上，但是你配置的是.9的主机那么你也是无法访问的**  
3. 点击进入节点主机后会看到下面内容，点击`安全组`  
   ![ACK](attachments/github-cicd-to-ack/ACK-34.png)  
   点击规则管理  
   ![ACK](attachments/github-cicd-to-ack/ACK-35.png)  
   添加规则  
   ![ACK](attachments/github-cicd-to-ack/ACK-36.png)  
   配置如下  
   ![ACK](attachments/github-cicd-to-ack/ACK-37.png)  
4. 查看公网IP  
   ![ACK](attachments/github-cicd-to-ack/ACK-38.png)  
   使用公网IP+端口进行访问  
   ![ACK](attachments/github-cicd-to-ack/ACK-39.png)  

## 更新项目
1. 留意左上角的tittle `2048`  
   ![ACK](attachments/github-cicd-to-ack/dep1.png)  
2. 回到Github，修改这个地方，将这里从`2048`修改为`2048demo`  
   ![ACK](attachments/github-cicd-to-ack/dep2.png)  
   ![ACK](attachments/github-cicd-to-ack/dep3.png)  
3. 提交更改请求  
   ![ACK](attachments/github-cicd-to-ack/dep4.png)  
4. 提交后流水线会自动构建  
   ![ACK](attachments/github-cicd-to-ack/dep5.png)  
5. 自动构建完成后回到原理的2048网页  
   ![ACK](attachments/github-cicd-to-ack/dep6.png)  
   按`F5`刷新网页，留意上面的标题，已经变成了`2048demo`  
   ![ACK](attachments/github-cicd-to-ack/dep7.png)  

# 流水线详解和故障排除
下面是一整套流水线脚本  
```yaml
name: Build and Deploy to ACK

on:
  push:
    branches: [ "main" ]

env:
  TAG: ${{ github.sha }}

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
      attestations: write
      id-token: write

    steps:
      # 0.0 Action for checking out a repo
      # 0.0 从Git仓库获取必要文件到ubuntu-latest系统中
      - name: Checkout
        uses: actions/checkout@v5

      # 0.1 Add env
      # 0.1 添加环境变量
      - name: add env
        uses: aarcangeli/load-dotenv@v1 
        with:
          path: ./.github/workflows
          filename: .env

      - name: printenv
        run: |
          printenv


      # 1.1A Login to Docker Hub
      # 1.1A 登入docker hub仓库
      - name: Log in to Docker Hub
        if: ${{   env.PUSH_REGISTRY_KIND == 'docker' ||   env.PUSH_REGISTRY_KIND == 'all' }}
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # 1.1B Login to ACR
      # 1.1B Login to 阿里云ACR仓库
      - name: Login to ACR with the AccessKey pair
        if: ${{   env.PUSH_REGISTRY_KIND == 'ali' ||   env.PUSH_REGISTRY_KIND == 'all' }}
        uses: aliyun/acr-login@v1
        with:
          login-server: "${{ env.INSTANCE_ID }}.${{ env.REGISTRY }}" # default: https://index.docker.io/v1/
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}


      #1.2 Extract metadata for Docker
      #1.2 提取docker镜像元数据
      - name: Extract metadata (tags, labels) for Docker
        if: ${{   env.PUSH_REGISTRY_KIND == 'docker' ||   env.PUSH_REGISTRY_KIND == 'all' }}
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: "${{ env.DOCKER_NAMESPACE}}/${{ env.DOCKER_REGISTRY_NAME }}"


      # 1.3A Build and push image to Docker Hub
      # 1.3A 构建并且推送镜像到docker hub
      - name: Build and push Docker image
        if: ${{   env.PUSH_REGISTRY_KIND == 'docker' ||   env.PUSH_REGISTRY_KIND == 'all' }}
        id: push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: "${{ env.DOCKER_NAMESPACE }}/${{ env.DOCKER_REGISTRY_NAME }}:${{ env.TAG }}"
          labels: ${{ steps.meta.outputs.labels }}

      # 1.3B Build and push image to ACR
      # 1.3B 构建并且推送镜像到阿里云ACR仓库
      - name: Build and push image to ACR
        if: ${{   env.PUSH_REGISTRY_KIND == 'ali' ||   env.PUSH_REGISTRY_KIND == 'all' }}
        run: |
          docker build --tag "$INSTANCE_ID.$REGISTRY/$NAMESPACE/$IMAGE:$TAG" .
          docker push "$INSTANCE_ID.$REGISTRY/$NAMESPACE/$IMAGE:$TAG"


      # 2.1 Set ACK context
      # 2.1 设置链接ACK
      - name: Set K8s context
        uses: aliyun/ack-set-context@v1
        with:
          access-key-id: "${{ secrets.ACCESS_KEY_ID }}"
          access-key-secret: "${{ secrets.ACCESS_KEY_SECRET }}"
          cluster-type: 'ACK'
          cluster-id: "${{ env.ACK_CLUSTER_ID }}"

      # 2.2A Deploy to ACK with ali image
      # 2.2A 使用阿里云ACR仓库的镜像部署
      - name: Deploy of ali image
        if: ${{  env.PUSH_REGISTRY_KIND == 'ali' ||  env.PUSH_REGISTRY_KIND == 'all' }}
        run: |-
          envsubst < deployment-ali.yaml > deployment-ali.rendered.yaml
          envsubst < svc.yaml > svc.rendered.yaml
          kubectl apply -f ./deployment-ali.rendered.yaml
          kubectl apply -f ./svc.rendered.yaml
          kubectl rollout status deployment/$ACK_DEPLOYMENT_NAME
          kubectl get services -o wide
          
        
      # 2.2B Deploy to ACK with docker hub image
      # 2.2B 使用docker hub仓库的镜像部署

      - name: Deploy of docker hub failure
        if: ${{  env.PUSH_REGISTRY_KIND == 'docker' }}
        run: |-
          envsubst < deployment-docker-hub.yaml > deployment-docker-hub.rendered.yaml
          envsubst < svc.yaml > svc.rendered.yaml
          kubectl apply -f ./deployment-docker-hub.rendered.yaml
          kubectl apply -f ./svc.rendered.yaml
          kubectl rollout status deployment/$ACK_DEPLOYMENT_NAME
          kubectl get services -o wide
```
点击这里可以查看构建的详细过程。  
![error](attachments/github-cicd-to-ack/err-1.png)  
![error](attachments/github-cicd-to-ack/err-2.png)  
这里每一个折叠都是一个任务。  
![error](attachments/github-cicd-to-ack/err-3.png)  
如果发生了错误那么前面的点点应该是红色的，而不是灰色的。  
![error](attachments/github-cicd-to-ack/err-4.png)  
## 0.*故障
![0](attachments/github-cicd-to-ack/err-5.png)  
如果覆盖发生在这里，那么我会建议你将这次仓库删除重新fork一份。  
这一段代码是在表示0.1及0.1代码段之前，一般不动就不会出问题
## 1.*故障
这一段故障则表示无法将镜像推送到仓库  
![0](attachments/github-cicd-to-ack/err-6.png)  
需要检查`ACR_USERNAME`,`ACR_PASSWORD`这些秘钥参数和配置文件中的  
![0](attachments/github-cicd-to-ack/err-7.png)  
## 2.*故障
这里的代码表示将镜像部署到ACK集群  
![0](attachments/github-cicd-to-ack/err-8.png)  
需要检查 `ACCESS_KEY_ID`,`ACCESS_KEY_SECRET` 等秘钥参数，还有env中的`ACK_CLUSTER_ID`参数，还有需要确保AccessKey对应用户有足够的权限进行集群的访问  

# 删除集群
集群一旦删除流水线会立马失效，及出现`2.*故障`及无法连接集群。  
![del](attachments/github-cicd-to-ack/del-1.png)  
![del](attachments/github-cicd-to-ack/del-2.png)  