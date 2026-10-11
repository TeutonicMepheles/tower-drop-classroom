# 部署与继承配置

本课堂仓库的 CI 只验证，不执行部署。

开发容器（在仓库根目录运行）：

```sh
docker compose -f deploy/docker/compose.dev.yml up --build
```

生产镜像构建（构建上下文必须为仓库根目录）：

```sh
docker build -f deploy/docker/Dockerfile.production -t tower-drop-classroom:local .
```

`docker/compose.upstream.yml` 为原仓库镜像示例，仍指向 `ghcr.io/diegolibonati/tower-drop:latest`；它不会运行本次课堂重构成果。保留供历史参考，不是本仓库发布入口。

本次只校验路径与配置，未执行容器构建或部署。
