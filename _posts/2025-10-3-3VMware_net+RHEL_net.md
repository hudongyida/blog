---
layout    : post
title     : "3 VMware虚拟网络和RHEL系统网络"
date      : 2025-09-30
lastupdate: 2025-10-3
categories: Linux-basis
---
# 前言

在这一章中我会向你讲述VMware网络和RHEL系统网卡的配置，在我刚刚开始学习Linux，使用VMware虚拟机进行实验的时候，VMware网络也曾要是十分的头疼，而且但是我几乎找遍了国内的各大论坛几乎没看到有几篇文章系统性的讲述了Vmware虚拟网络。所以在讲解Linux系统网络配置之前，我觉得我有必要先为你较为系统性的讲述VMware网络。

# VMware网络

如果你点开过VMware的 `虚拟机设置`中的 `网络适配器`看过的话一定对下面这张图不陌生。
![vm](attachments/Linux3/VMnet01.png)
你一定也想知道 `桥接模式`,`NAT模式`,`仅主机模式`,`自定义`有什么区别，分别是做什么的。
我们先来看下面这一张图。
![vm](attachments/Linux3/VMnet02.png)
这一张图表示的是我们现在的电脑网络架构，我们的电脑通过物理网卡连接到外面的物理网络，这张物理网卡可以是带RJ45网口的PCIE网卡，也可以无线网卡，总之就是能够让你上网的网卡，我们在电脑上聊天的QQ，微信都是通过这张物理网卡和远端的服务器进行通讯。而且这张图中的黄色区域则表示VMware。
在明白了大概的网络结构后我们开始正式的讲解

## 桥接模式

![vm](attachments/Linux3/VMnet03.png)  
桥接模式就是在物理主机的物理网卡上创建一张虚拟的网卡，连接到物理网络，然后将VM虚拟机再将里面的操作系统连接到张虚拟的网卡上，实现虚拟机和外网的直接通讯。在一般的现网中都存在DHCP【IP地址动态分配服务】如果这里配置服务器为DHCP获取网络那么这时候服务器就会在物理网络中请求DHCP地址。但是这种模式我们用的很少，因为这种模式是直接和物理网络通信，并不利于学习和实验环境。  
那为什么又要设计这么一个选项，答案很简单也是为现网服务，Linux有很多，很好用的网络检测和渗透工具，比如大名鼎鼎的"Kali Linux"操作系统，它内置了多种渗透工具，可以很方便的为网络安全工程师提供渗透测试环境，但是如果直接裸机安装Linux并不利于日常生活办公，这时候就会使用VMware虚拟机来部署这些工作测试环境，并且使用桥接模式，完成物理网络的安全测试。  
![vm](attachments/Linux3/VMnet04.png)  
在你使用桥接模式的时候你一定也发现了，在桥接模式的下面存在一个勾选框，`复制物理网络连接状态`，如果你使用的是桥接模式我会建议你将这个勾选框勾选上，这个框的作用是识别物理网络的状态，如果这时候物理断开了，比如网线被拔了，或者wifi断了，如果你勾选这个选项那么虚拟机中的网络也会一并断开，但是如果你没有勾选这个款，出现了类似的情况后虚拟机创建的虚拟网卡并不知道网络被断开了，所以VM中的操作系统会继续尝试连接网络。  
![vm](attachments/Linux3/VMnet03-1.png)  

## NAT模式

在将NAT模式前，我觉得我可能需要简单提一嘴NAT技术。NAT（网络地址转换）是一种将私有IP地址转换为公网IP地址的技术，允许多个内网设备共享一个公网IP访问互联网。而VM使用的代端口的NAT地址转换，NAPT地址转换技术，他是NAT技术的一种。【如果不理解也没关系，你只需知道NAT能将实现地址转换，一个IP地址可以供多个设备使用。】  
VM的NAT也是同理，先虚拟出一个VM NAT路由，然后将虚拟机连接到VM NAT路由上，实现外网通信。  
![vm](attachments/Linux3/VMnet05.png)  
下面是VM实现NAT的具体架构原理，VMware会创建很多VM虚拟网络，用于NAT，DHCP服务或用于和主机的连接。  
![vm](attachments/Linux3/VMnet05-1.png)  
而NAT模式则是最特殊的，在默认情况下NAT使用的是VMnat8网络，有关VM 虚拟网络的知识点后面会详细讲解。  
![vm](attachments/Linux3/VMnet06.png)  
  
## 仅主机模式
仅主机模式也是VM虚拟网络之一，他和NAT网络也是会默认生成的网络之一，但是有一点不同的是，NAT会建立虚拟网络路由，但是仅主机模式不会。  
![vm](attachments/Linux3/VMnet07.png)  
![vm](attachments/Linux3/VMnet07-1.png)  
从他的结构图可以看到VM net1并没有路由器所以他无法和外网链接，同时他有一根线连接到到了物理主机。有关VM虚拟网会在后面详细讲解。

## 自定义网络
可以根据自己需求自行设置的网络。  
![vm](attachments/Linux3/VMnet08.png)  
从上面的图可以看到，VM虚拟机给我提供了很多的虚拟网络，但是如果没有设置的话所有网络的效果除开IP地址其他的都和VMnet1一样【VMnet8 除外】，所以下面我会给你讲述VMnet网络的核心，VMnet虚拟网络设置。  
### VM虚拟网络
我们要配置虚拟网络，首先就要打开VM虚拟网络编辑器。  
点击左上角的`编辑`选项卡，在弹出的下拉列表中选择`虚拟网络编辑器`。  
![vm](attachments/Linux3/VMnet10.png)  
打开后你会看到下面窗口，这个就是虚拟网络编辑器，默认情况应该只有VMnet0 桥接模式，VMnet1 仅主机模式，VMnet8 NAT模式。点击右下角的`更改设置`进行VM虚拟网络的配置。  
![vm](attachments/Linux3/VMnet11.png)  
下面我会逐一为你讲解每个配置选项。  
#### `添加网络`,`移除网络`,`重命名网络`
![vm](attachments/Linux3/VMnet12.png)  
顾名思义久是添加VM虚拟网络，因为默认的网络只有3个，VM0，VM1，VM8，但是我们可以更具我们自己的需求添加网络，**警告，虽然VM0，VM1，VM8可以被删除，但是删除后之前介绍的 桥接模式，NAT模式，仅主机模式会直接无法使用。而且你也发现了，这三个网络是无法进行名称修改的，如果你不知道你在做什么的话，请不要修改这三个网络。**如果你有自定义网络的需求请自行添加网络。  
![vm](attachments/Linux3/VMnet12-1.png)  
#### VMnet信息
![vm](attachments/Linux3/VMnet13.png)  
这一块区域是用来配置VM网络的类型的，我们新添加了一个网络后我们需要决定网络的类型。下面我将逐一介绍每个网络的类型和注意事项。  
1. 桥接模式:  
   ![vm](attachments/Linux3/VMnet13-1.png)  
   配置直接和物理网卡通信的网络，默认是VMnet0 网络。多个网卡可以同时配置为该模式，但是只有VMnet0可以被配置为自动，并且每个网卡只能绑定一张物理网卡，无法将多个网络绑定在一个物理接口上。  
   ![vm](attachments/Linux3/VMnet13-2.png)  
   如果你试图将两个桥接模式的虚拟网络绑定在一张网卡上就会报错。  
   ![vm](attachments/Linux3/VMnet13-3.png)  
2. NAT模式：  
   创建虚拟路由器和物理网卡连接，并且将这段VM网段中的地址进行转换。默认是VMnet8网络，并且全部网络中只能有一个NAT模式，如果你其他的网段想使用NAT模式，就必须将VMnet8修改成其他模式，**警告，理论上来讲你是可这样修改，但是我强烈不推荐你直接将VMnet8修改为其他模式，前面已经说了VMnet8是和默认的NAT模式绑定死的，如果你选择将VMnet8修改为其他模式，那么你的NAT模式将直接无法使用，如果你修改了VMnet8的模式后还是需要使用NAT，那么你只能选择配置到自定义网络，在自定义网络中选择你新配置的NAT模式的网络。**  
   ![vm](attachments/Linux3/VMnet14.png)  
   如果你想对NAT进行设置你可以选择后面的`NAT设置`按钮。  
   ![vm](attachments/Linux3/VMnet14-1.png)  
   在这里你可以配置网关的IP地址，一般默认是点2,点1是主机，后面会讲，你也配置端口转发，但是这个功能一般不会用，你也可以设置VMnet8网络的DNS，这个DNS值对连接使用VMnet8的虚拟机生效，你也不必为了实验大费周章的修改主机的DNS。  
   ![vm](attachments/Linux3/VMnet14-2.png)  
   NAT设置中的网关地址必须是下面子网中的，不然NAT可能会无法使用。  
3. 仅主机模式:  
   实验环境下使用的最多的模式，因为他不受外部网络环境干扰，是完完全全的自定义网络，关于如何配置后面会讲。这个网络默认是VMnet1，但是他可以有20个。因为VM一共就20个虚拟网络。理论上你也可以将VMnet0和VMnet8修改到此模式**实际上也可以，只是强烈不建议罢了。如果你改了后果负责。**  
   ![vm](attachments/Linux3/VMnet15.png)  
#### VMnet配置
用于配置每个网络功能的地方。  
![vm](attachments/Linux3/VMnet16.png)  
1. 将主机虚拟适配器连接到此网络  
   ![vm](attachments/Linux3/VMnet16-1.png)  
   如果你勾选了这个选项就是下面这张图。  
   ![vm](attachments/Linux3/VMnet07-1.png)  
   如果你**没有勾选**那么图就会变成这样。  
   ![vm](attachments/Linux3/VMnet16-2.png)  
   你一定想知道这个虚拟适配器在哪里。在`控制面板>网络和 Internet>网络连接`，如果你勾选了这个选择那么所有的适配器都会在这里显示并且适配器的名词就叫做`VMware Adapter VMnet*`,默认情况下会存在VMnet1和VMnet8。  
   ![vm](attachments/Linux3/VMnet16-3.png)  
   我这里为了测试所以我将VMware Adapter VMnet1删除了，你会发现即使我配置了仅主机模式也依然无法与主机进行通讯。  
   ![vm](attachments/Linux3/VMnet16-4.png)  
   那我是不是可以理解，如果需要虚拟机和主机通讯则需要`VMware Adapter`虚拟网络适配器存在才能进进行通讯？答案是的，`VMware Adapter`会在添加创建新的VMnet的时候自动创建，因为这个选项是默认勾选的。并且在创建VMnet的时候会自动配置主机地址为这个网段的第一台主机。当然你也可以在主机的VMware Adapter虚拟网络适配器中修改主机在VM虚拟网络中的IP地址。  
   ![vm](attachments/Linux3/VMnet16-5.png)  
   但是请注意，在修改主机VMware Adapter虚拟网络适配器的IP时要配置新的IP在所属网段中。  
2. 使用DHCP服务器将IP地址分配给虚拟机。  
   即在这条网络是中是否要启用DHCP地址自动分配。  
   ![vm](attachments/Linux3/VMnet17.png)  
   如果你需要设置DHCP地址自动配置的范围，你可以点击后面的`DHCP设置`按钮，在配置DHCP地址的时候同样需要注意，地址范围需要再下面的子网网段的范围中。  
   ![vm](attachments/Linux3/VMnet17-1.png)  
3. 子网设置  
   ![vm](attachments/Linux3/VMnet18.png)  
   设置这个网段的子网，推荐使用下面子网。  
   |子网|子网掩码|子网案例|掩码案例|
   |---|---|---|---|
   |10.\*.\*.\*|255.\*.\*.\*|10.0.0.0|255.0.0.0|
   |172.16.\*.\*|255.255.\*.\*|172.16.0.0|255.255.0.0|
   |192.168.\*.\*|255.255.255.\*|192.168.1.0|255.255.255.0|   
   为什么是这几个网段，因为这几个网段都是内网网段，他们的IP数据报不被允许在公网上进行传输，运营商网络一旦收到了上面3个网段中的IP数据报会直接丢弃。**虽然你也可以将网段配置为其他IP即他可能是公网的，但是这里不推荐你这么做**，如果你有一定的网络知识知道怎么配置子网和子网掩码那你随意，如果你不会，你可以直接使用后面的子网案例，掩码案例。如果上面的子网不够你使用，而你又不会配置子网，请直接配置子网为`192.168.N.0`N可以为1~245中级的任意数，掩码`255.255.255.0`。  
   如果我虚拟机配置的IP地址不在子网网段中，那么可以通讯吗？如下图，我子网配置的是172.16.0.0/16，但是我的两台虚拟主机配置的是192.168.1.2和3。  
   ![vm](attachments/Linux3/VMnet18-1.png)  
   答案是可以，因为在同网段内的通讯是靠二层ARP协议进行，而计算机网络的二层使用的MAC地址【有关ARP协议具体的工作原理，感兴趣的可以自行查找有关资料，这里不做过多赘述】，而且不是三层的IP地址，但如果你要是使用NAT功能【OSI 3/4层技术】或DHCP功能【OSI 7层技术】则必须要将虚拟机IP配置在子网中。  
   **警告: 虽然你可以配置虚拟机IP和子网不一致，但是我不推荐你这么做，我会将他写出来只是为了让你更好的理解VMware虚拟网络的工作原理。**  
## LAN区域
这个功能用的很少，几乎不用，这个的作用是将统一网段的主机隔离开，无法进行通讯。  
![vm](attachments/Linux3/VMnet19.png)  
如下图所示，即使他们是在同一个网段中，但是由于VLAN区域的不同也是无法进行通讯的。  
![vm](attachments/Linux3/VMnet19-1.png)  

# RHEL系统网络
这里的RHEL网络配置参考的是[Red Hat Enterprise Linux 9配置和管理网络](https://docs.redhat.com/zh-cn/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking)摘写，如果你希望得到更详细的信息可以参考此手册。  
在开始前我需要先补充一条Linux命令:  
```bash
ip address
   #简写
ip a
```  
这条命令是用来查看Linux ip配置的命令。  
![net](attachments/Linux3/net01.png)  
## 网卡和网卡配置文件
在正式开始Linux的网络配置前，我需要先给你讲明白网卡和网卡配置文件。在Linux系统中，所有的硬件都是以"文件"的型式存在表现的，例如磁盘网卡等。网卡则在`/sys/class/net`目录下。虽然这这里他表示为文件，但是我们并不能直接对这个"文件"进行编辑，我们需要编辑他的配置文件。而这个配置文件一般存在于`/etc`目录下，在Centos7，RHEL8即更加老的版本这个配置文件存在于`/etc/sysconfig/network-scripts/`目录下，配置文件即`ifcfg-网卡名`，但是在RHEL9之后的版本中将这一配置文件移除。在这个目录下会仅剩一个`readme-ifcfg-rh.txt`的描述文件，而这个文件中说明了，这一改变的原因，感兴趣的可以自行查看。所以在RHEL9即之后的系统中都将使用`nmcli`命令或`nmtui`或等其他方式进行,`NetworkManager`网络的配置和管理。  
如果你使用的Centos6,7等旧版系统，后面会有配置教学。  
## 使用nmcli命令的IP配置
这是nmcli的[配置文档](https://networkmanager.dev/docs/api/latest/nmcli.html)，感兴趣的可以自行查阅。  
命令格式:  
```bash
nmcli [选项] { help | general | networking | radio | connection | device | agent | monitor} [命令] [参数]
```  
下面是nmcli的命令格式【摘自官方文档】，看到这么多的内容先别晕，后面的配置案例我会将常用的配置逐一讲解配置一遍。  
| 主要类别 | 子命令 | 功能描述 | 常用参数/选项 |
|---------|--------|----------|--------------|
| **general** (通用命令) | `status` | 显示 NetworkManager 整体状态 | - |
| | `hostname` | 查看/设置系统主机名 | `[hostname]` |
| | `permissions` | 显示调用者权限 | - |
| | `logging` | 查看/更改日志级别和域 | `[level] [domains]` |
| | `reload` | 重新加载配置 | `[conf/dns-rc/dns-full]` |
| **networking** (网络控制) | `on/off` | 启用/禁用网络 | - |
| | `connectivity` | 检查网络连接状态 | `[check]` |
| **radio** (无线电控制) | `wifi` | 控制 Wi-Fi 开关 | `[on/off]` |
| | `wwan` | 控制移动宽带开关 | `[on/off]` |
| | `all` | 控制所有无线电开关 | `[on/off]` |
| **connection** (连接管理) | `show` | 列出连接配置 | `[--active] [id/uuid/path]` |
| | `up/down` | 激活/停用连接 | `[id/uuid/path] [ifname]` |
| | `add` | 添加新连接 | `type [选项]` |
| | `modify` | 修改连接属性 | `[id/uuid/path] [属性值]` |
| | `edit` | 交互式编辑连接 | `[id/uuid/path/type]` |
| | `delete` | 删除连接 | `[id/uuid/path]` |
| | `clone` | 克隆连接 | `[id/uuid/path] [新名称]` |
| | `monitor` | 监控连接活动 | `[id/uuid/path]` |
| | `import/export` | 导入/导出连接配置 | `type [file]` |
| **device** (设备管理) | `status` | 显示设备状态 | - |
| | `show` | 显示设备详细信息 | `[ifname]` |
| | `up/down` | 连接/断开设备 | `ifname` |
| | `wifi list` | 扫描可用 Wi-Fi | `[--rescan] [ifname]` |
| | `wifi connect` | 连接 Wi-Fi 网络 | `(B)SSID [password] [ifname]` |
| | `wifi hotspot` | 创建 Wi-Fi 热点 | `[ifname] [ssid] [password]` |
| | `wifi rescan` | 重新扫描 Wi-Fi | `[ifname] [ssid]` |
| | `wifi show-password` | 显示 Wi-Fi 密码 | `[ifname]` |
| | `lldp` | 显示邻居设备信息 | `[list] [ifname]` |
| | `monitor` | 监控设备活动 | `[ifname]` |
| **monitor** (活动监控) | - | 观察 NetworkManager 活动 | - |
| **agent** (代理功能) | `secret` | 作为 NetworkManager 密钥代理 | - |
| | `polkit` | 作为 polkit 授权代理 | - |
| | `all` | 同时作为密钥和授权代理 | - |
  
常用选项  
| 选项 | 简写 | 功能描述 |
|------|------|----------|
| `--terse` | `-t` | 简洁输出（适合脚本处理） |
| `--pretty` | `-p` | 易读输出 |
| `--fields` | `-f` | 指定输出字段 |
| `--show-secrets` | `-s` | 显示密码和密钥 |
| `--ask` | `-a` | 交互式询问缺失参数 |
| `--mode` | `-m` | 输出模式（tabular/multiline） |
| `--colors` | `-c` | 颜色输出控制 |
| `--wait` | `-w` | 设置操作超时时间 |
| `--offline` | - | 离线模式工作 |
### 配置案例
#### 以太网配置
这是使用的最多的配置。  
在进行以太网配置前，我们需要先使用命令来查看有哪些配置文件。  
```bash
nmcli connection show
```  
结果如下：  
```
[root@localhost ~]# nmcli connection show 
NAME             UUID                                  TYPE      DEVICE          
ens160           1d329372-2449-3a31-a0a1-d88b1b7caef9  ethernet  ens160          
lo               06093bc2-3752-4c4f-8d62-f1a122de3c54  loopback  lo              
```  
你会看到`NAME`连接名【唯一】，`UUID`【唯一】，`TYPE`连接的类型，`DEVICE`这个链接绑定的硬件。  
默认情况下，NetworkManager 为主机中的每个网络适配器创建一个配置文件。当然你也添加，添加的命令后面会将讲。    
  
  
配置IPV4的地址:  
默认情况下IPv4的地址是DHCP自动获取的。
```bash
nmcli connection modify ens160 ipv4.method auto
```  
`connection`表示链接，`modify`表示修改，`ens160`是前面展示的链接名，`ipv4.method`表示ipv4的配置方法，方法参数为`auto`自动。  
配置静态的ip地址:  
```bash
nmcli connection modify ens160 ipv4.method manual ipv4.addresses 192.168.1.5/24 ipv4.gateway 192.168.1.254 ipv4.dns 223.5.5.5
```  
命令看起来很长，但其实很简单，依然是前面的，连接`connection`，修改`modify`，`ens160`,配置方法手动`ipv4.method manual`,`manual`表示手动。手动配置什么？IP地址，子网掩码，网关，DNS就这4个。你可能会觉得比较难记，你可以打开前面的教你打开过的`控制面板>网络和 Internet>网络连接`。  
![net](attachments/Linux3/net02.png)  
你会发现这不就是Windows手动配置网络中的参数吗？没错linux手动配置的参数和Windows是差不多的，如果你不需要dns域名解析也可以将这一段删除`ipv4.dns 223.5.5.5`。如果你不需要三层的路由功能，仅使用二层同网段通讯，也可以直接将`ipv4.gateway 192.168.1.254`这一段删除。这样子网络的配置文件就修改好了，但是我会建议你添加一个参数`autoconnect yes`即开机或插拔网线的时候自动启用这个配置文件。至于为什么要怎么做后面会讲解。所以完整命令如下。  
```bash
nmcli connection modify ens160 ipv4.method manual ipv4.addresses 192.168.1.5/24 ipv4.gateway 192.168.1.254 ipv4.dns 223.5.5.5 autoconnect yes
```  
下面是IPV6的配置，做为拓展  
```bash
   #自动获取
nmcli connection modify ens160 ipv6.method auto
   #手动配置
nmcli connection modify ens160 ipv6.method manual ipv6.addresses 2001:db8:1::fffe/64 ipv6.gateway 2001:db8:1::fffe ipv6.dns 2001:db8:1::ffbb 
```  
如果你需要修改配置文件中的其他值也是使用下面格式:  
```bash
nmcli connection modify [连接名称] [设置名称] [值]
```  
修改完后配置文件并没有启用，此时我们需要配置使用命令启用配置文件。  
```bash
nmcli connection up ens160
```  
为什么我前面说要加上`autoconnect yes`这个参数，因为如果是我们自己新增的配置文件，那么在系统重启后或者在插拔网线后链接不会自动激活，需要使用`nmcli`命令配置启动，但是如果我们添加了这段参数他就会自己自动激活，所以这里我直接习惯为每个链接文件都配置了`autoconnect yes`这个参数。  

#### 链路聚合配置
首先这种配置一般是用在数据中心，因为链路聚合需要两段协商。所以需要上游交换机也配置响应的链路聚合配置。如下图中的服务器就是聚合配置。【没有基础的可以大概的看看，了解一下】  
![data_cent](attachments/Linux3/data_cent.png)  
要实现聚合配置先决条件就是双网卡。如果是使用VM虚拟机打开`虚拟机设置`窗口，操作如下。  
![net](attachments/Linux3/net03.png)  
首先链路聚合有多种聚合方式。  
| 绑定模式 | 模式名称         | 交换机配置要求                                     |
|---------|------------------|----------------------------------------------------|
| 0       | balance-rr       | 需要启用静态 EtherChannel，而不是协商的 LACP       |
| 1       | active-backup    | 交换机上不需要配置                                |
| 2       | balance-xor      | 需要启用静态 EtherChannel，而不是协商的 LACP       |
| 3       | broadcast       | 需要启用静态 EtherChannel，而不是协商的 LACP       |
| 4       | 802.3ad          | 需要启用 LACP 协商的 EtherChannel                 |
| 5       | balance-tlb      | 交换机上不需要配置                                |
| 6       | balance-alb      | 交换机上不需要配置                                |
| -       | balance-slb      | 交换机上不需要配置                                |  
  
这里以1模式【主备模式】为示例:  
1. 创建绑定接口  
```bash
nmcli connection add type bond con-name bond0 ifname bond0 bond.options "mode=active-backup"
```
2. 配置端口绑定  
   对于没绑定网卡的,因为ens是我们刚刚新加的网卡，没有配置，所以使用add命令添加配置文件  
```bash
nmcli connection add type ethernet port-type bond con-name bond0-port1 ifname ens192 controller bond0
```
   对于已经有绑定网卡端口的这使用下面命令  
```bash
   #修改配置
nmcli connection modify ens160 controller bond0
   #激活配置
nmcli connection up ens160
```
   如果知道有链接文件绑定的可以使用下面命令查看，两条命令效果一样  
```bash
nmcli device status
nmcli connection show
```
3. 配置聚合接口的IP地址:    
```bash
nmcli connection modify bond0 ipv4.addresses 192.168.1.100/24 ipv4.gateway 192.168.1.254 ipv4.dns 192.168.1.253 ipv4.method manual
```
  
  
前面说的如果需要自己添加网卡配置文件的命令格式如下:  
```bash
nmcli connection add type <接口类型> con-name <连接名称> ifname <网卡设备名称> {【假设这里添加的是IPV4配置文件，如果不是请将整个{}中的内容删除】ipv4.address <IP地址/掩码> ipv4.gateway <网关IP> ipv4.method manual} 
```

## 使用nmtui界面进行IP配置
nmtui是NetworkManager的图像化编辑工具。即使你是使用Shell界面也能连接。  
### 配置案例
#### 以太网配置
##### 配置为dhcp
使用`nmtui`命令启动nmtui界面  
```bash
nmtui
```  
1. 启动后使用上下左右方向键进行移动，然后选择`Edit a connection`回车  
![net](attachments/Linux3/net10.png)  
2. 选择`ens160`回车  
![net](attachments/Linux3/net11.png)  
3. 将鼠标移动到`IPv4 CONFIGURATION`在后面的`<>`回车，选择`Automatic`回车  
![net](attachments/Linux3/net12.png)  
4. 移动到右下角的`OK`回车  
![net](attachments/Linux3/net13.png)  
5. 移动到右下角的`Back`回车  
![net](attachments/Linux3/net14.png)  
6. 移动到最后的`Quit`回车  
![net](attachments/Linux3/net15.png)  
7. 修改完成，使用命令`nmcli con up ens160`激活配置，使用命令`ip a`查看  
![net](attachments/Linux3/net16.png)  

##### 配置为静态IP
1. 启动后使用上下左右方向键进行移动，然后选择`Edit a connection`回车  
![net](attachments/Linux3/net10.png)  
2. 选择`ens160`回车  
![net](attachments/Linux3/net11.png)  
3. 将鼠标移动到`IPv4 CONFIGURATION`在后面的`<>`回车，选择`Manual`回车  
![net](attachments/Linux3/net20.png)  
4. 移动到后面的`Show`回车，回车后会变成`Hide`  
![net](attachments/Linux3/net21.png)  
5. 选择`Addresses`后面的`<Add..>`回车  
![net](attachments/Linux3/net22.png)  
6. 输入IP地址回车，如果想删除这个地址可将光标移动到后面的`<Remove>`回车，会将这个地址删除  
![net](attachments/Linux3/net23.png)  
7. 光标下移，配置网关  
![net](attachments/Linux3/net24.png)  
8. 网关配置完成，因为这里已经有DNS了，所以没有配置，如果有需要配可以移动光标到`<Add..>`进行添加配置。  
![net](attachments/Linux3/net25.png)  
9. 移动到右下角的`OK`回车  
![net](attachments/Linux3/net26.png)  
10. 移动到右下角的`Back`回车  
![net](attachments/Linux3/net14.png)  
11. 移动到最后的`Quit`回车  
![net](attachments/Linux3/net15.png)  
12. 修改完成，使用命令`nmcli con up ens160`激活配置，使用命令`ip a`查看  
![net](attachments/Linux3/net27.png)  
##### 新建配置网卡配置文件【以配置静态IP172.16.1.1/24地址为例】  
1. 启动后使用上下左右方向键进行移动，然后选择`Edit a connection`回车  
![net](attachments/Linux3/net10.png)  
2. 移动光标到右边的`<Add..>`回车  
![net](attachments/Linux3/net30.png)  
3. 选择连接的类型`Ethernet`回车  
![net](attachments/Linux3/net31.png)  
4. 移动光标到`<Create>`回车，创建一个新的链接配置文件  
![net](attachments/Linux3/net32.png)  
5. 打开下面的配置界面，不知道怎么开的看前面的`配置为静态IP`。  
![net](attachments/Linux3/net33.png)  
6. 其他步骤和`配置为静态IP`相同，但是要额外配置连接名称`Profile name`和网卡设备名称`Device`。另外因为这里配置的172.16.1/24的地址所以需要配置`Address`为`172.16.1.1/24`如果没有后面的`/24`系统会自动配置掩码为`/16`16位掩码。为什么是16位，因为在还没有`CIDR 无类地址码`IP地址是被分为ABCD4类地址，A类似地址是8为掩码【私网10开头】，B类是16位掩码【私网172.16开头】，C类24位掩码【私网192.168老天】，而这个172.16刚好是B类地址，所以会自动分配`/16`位掩码。  
![net](attachments/Linux3/net34.png)  
7. 完成后，移动到右下角的`Back`回车  
![net](attachments/Linux3/net35.png)  
8. 移动到最后的`Quit`回车  
![net](attachments/Linux3/net36.png)  
9. 使用命令`nmcli con up net172`激活配置，使用命令`ip a`查看  
![net](attachments/Linux3/net37.png)  

# Centos 7 等老式RHEL系统的IP地址配置
先使用`ip a`命令查看网卡信息。  
![net](attachments/Linux3/net40.png)  
然后使用vi 编辑器编辑配置文件，为什么不使用VIM，因为我不知道你们的电脑有没有安装VIM，所以这里直接使用vi,如果你安装了Vim将vi替换为vim也可以  
```bash
vi /etc/sysconfig/network-scripts/ifcfg-ens33 #我这里的网络名称是ens33
```
修改`BOOTPROTO`选项为`BOOTPROTO=static`新增`IPADDR`,`NETMASK`,`GATEWAY`  
![net](attachments/Linux3/net41.png)  
保存退出后执行命令,重启网络:  
```bash
systemctl restart network
```  
使用`ip a`查看  
![net](attachments/Linux3/net42.png)  
如果出现了下面保存可能代表配置文件写错了，或者他和`NetworkManager`配置冲突了。  
![net](attachments/Linux3/net43.png)  
解决办法:  
1. 首先检查配置文件写错了没有,有没有和其他的网络冲突，如果没有写错再进行下一步
2. 检查NetworkManager是否开启，如果开启了请把他关了
```bash
systemctl status NetworkManager
```  
![net](attachments/Linux3/net44.png)  
   如果是开启的请使用下面命令将他关掉
```bash
systemctl disable NetworkManager --now
```  
3. 再执行重启网络命令
```bash
systemctl restart network
```  

# 总结
很高兴你能看到这里，这一章我向你讲述了VMware虚拟网络和RHEL系统的网络配置，以及如何使用NetworkManager进行网络管理，NetworkManager不仅仅只能在RHEL系列的系统上使用，他也可在其他的Linux系统上使用。下一章我会为你讲述RHEL系统的软件安装，和rpm软件包管理。  