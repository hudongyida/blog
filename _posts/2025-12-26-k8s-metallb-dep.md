---
title     : "k8s-MetalLB安装"
date      : 2025-12-26
lastupdate: 2025-12-26
categories: k8s_attachments
---
# k8s-MetalLB安装

## 概述

MetalLB一个外部网络负载均衡器，可以在k8s中创建LoadBalancer服务，部署后MetalLB会从地址池中分配一个地址给LoadBalancer，这个地址是虚拟的。

## 安装

### 先决条件

* 拥有一个k8s集群
* 主机可以直接链接到k8s集群

### 开始安装

使用官方提供的安装脚本

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.15.2/config/manifests/metallb-native.yaml
```

可以使用下面命令查看安装部署情况

```bash
[root@master metallb]# kubectl get pod -n metallb-system 
NAME                          READY   STATUS    RESTARTS   AGE
controller-58fdf44d87-rsq85   1/1     Running   0          2m48s
speaker-97tkq                 1/1     Running   0          2m48s
speaker-b2qmf                 1/1     Running   0          2m48s
```

如果都运行起来了就表示安装完成

### 配置MetalLB

创建两个k8s资源清单

MB-address.yaml

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: vmware-lb-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.0.0.100-10.0.0.110  #可以提供给集群的IP地址
```

MB-l2.yaml

```yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: vmware-l2
  namespace: metallb-system
```

启用两个资源清单

```bash
kubectl apply -f MB-address.yaml
kubectl apply -f MB-l2.yaml
```

### 验证

验证的前提是你有ingress-nginx或者istio gateway或者其他网关控制器，我这里是有ingress-nginx控制器

```bash
[root@master metallb]# kubectl get svc -n ingress-nginx 
NAME                                 TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.68.212.226   10.0.0.100    80:30095/TCP,443:30687/TCP   45d
ingress-nginx-controller-admission   ClusterIP      10.68.83.145    <none>        443/TCP                      45d
```

分配地址后可以使用cmd,默认情况下MetalLB是不回复ICMP数据报的，所以下面提示的是已接收4

```none
C:\Users\hudong>ping 10.0.0.100

正在 Ping 10.0.0.100 具有 32 字节的数据:
来自 10.0.0.100 的回复: 无法连到端口。
来自 10.0.0.100 的回复: 无法连到端口。
来自 10.0.0.100 的回复: 无法连到端口。
来自 10.0.0.100 的回复: 无法连到端口。

10.0.0.100 的 Ping 统计信息:
    数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)，
```