# 课程专用镜像：在 gvenzl/oracle-free:23-slim 上预置好学生环境
#
# 为什么自己做镜像：
#   原来的做法是"裸镜像 + devcontainer feature 现场装 Node + postCreate 用 sqlplus 建用户/装基线"。
#   每建一个 codespace 都要重跑一遍，任何一步失败学生就卡住，而 Oracle 首次建库的 2–3 分钟
#   本来就被浪费掉了。这个镜像把能提前做的全部做进镜像层：
#     1. Node.js 20 + git（判题器要跑 mocha，CodeRoad 配课要 git）
#     2. 判题依赖（预装到 /opt/coderoad-deps，postCreate 时拷进工作区）
#     3. 建库初始化（/container-entrypoint-initdb.d：TESTER、授权、DUMPDIR、基线数据）
#   这三样都不进学生的 git 工作区，学生看到的是一个干净的项目。
#
# ⚠️ 绝对不要在这里写 ENTRYPOINT / CMD。
#    基础镜像的 entrypoint 负责启动 listener、建 PDB、建 APP_USER 和跑初始化脚本；
#    覆盖它 Oracle 就起不来（devcontainer 那边还配了 overrideCommand: false 配合）。
#
# 构建上下文是仓库根目录（devcontainer.json 里写了 context: ".."），
# 所以下面的 COPY 路径都相对于仓库根。

FROM gvenzl/oracle-free:23-slim

ARG NODE_VERSION=20.20.2

# 基础镜像的默认用户是 oracle（数据库进程用户），装东西需要 root
USER root

# --- 系统依赖 ---------------------------------------------------------------
# git 是必须的，别省：
#   CodeRoad 配课时会执行 `git init` / `git ls-remote <repo>`（见扩展源码 wm() / Em()），
#   缺 git 会直接抛 "Git config error"，课程根本进不去。
#   旧方案里 git 是 devcontainers/features/node 顺手装上的（它内部 check_packages git），
#   去掉那个 feature 之后必须自己补，否则会引入一个比 Node 更隐蔽的故障。
# ca-certificates 也是必须的：
#   基础镜像构建时用的是 `curl -k`（跳过证书校验），说明镜像里原本没有 CA 根证书；
#   而 `git ls-remote https://github.com/...` 和 curl 下载 Node 都需要它，
#   缺了会报 "server certificate verification failed"。
# tar/gzip/xz 用于解压 Node 官方二进制包；curl 用来下载（基础镜像里其实有，
# 但显式装一次，免得将来基础镜像瘦身把 curl 去掉导致构建失败）。
RUN microdnf install -y git ca-certificates curl tar gzip xz \
 && microdnf clean all \
 && rm -rf /var/cache/dnf /var/cache/yum \
 && git --version

# --- Node.js 20 -------------------------------------------------------------
# 装进 /opt/node，再用软链接指到 /usr/local/bin 和 /usr/bin：
# 判题器、postCreate、学生终端走的 PATH 不一样，两处都指过去最省事。
# 用官方预编译二进制而不是发行版仓库：OL8 appstream 里的 nodejs 只到 18。
# 下载后校验 SHA256：构建期拉外网二进制，不校验等于把供应链交给运气。
ARG NODE_SHA256=df770b2a6f130ed8627c9782c988fda9669fa23898329a61a871e32f965e007d
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
      -o /tmp/node.tar.xz \
 && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
 && tar -xJ -C /opt -f /tmp/node.tar.xz \
 && rm -f /tmp/node.tar.xz \
 && mv "/opt/node-v${NODE_VERSION}-linux-x64" /opt/node \
 && ln -sf /opt/node/bin/node /usr/local/bin/node \
 && ln -sf /opt/node/bin/npm  /usr/local/bin/npm \
 && ln -sf /opt/node/bin/npx  /usr/local/bin/npx \
 && ln -sf /opt/node/bin/node /usr/bin/node \
 && ln -sf /opt/node/bin/npm  /usr/bin/npm \
 && node -v && npm -v

# --- 判题依赖 ---------------------------------------------------------------
# 只装到 /opt/coderoad-deps，不碰工作区（工作区在运行时是挂载卷，镜像里写不进去）。
# postCreate 会把这些文件 cp 到 coderoad/node_modules，学生不需要联网 npm install。
#
# coderoad/package-lock.json 里 74 条 resolved 全部指向 registry.npmmirror.com（国内镜像）。
# 实测（npm 11，清空 cache）：npm ci 会**直接信任锁文件里的 resolved URL**，不理会 --registry；
# 那个域名在 Codespaces 构建机上不可达时，npm ci 直接失败。
# 所以不能只靠"失败再重试"——先把 resolved 的主机名改写成官方 registry，
# 再跑 npm ci。锁文件里的 integrity 是内容哈希、与镜像源无关，因此改写主机是安全的。
# 注意：改写只发生在镜像里的副本，仓库里的 package-lock.json 不动。
WORKDIR /opt/coderoad-deps
COPY coderoad/package.json coderoad/package-lock.json ./
RUN sed -i 's#https://registry\.npmmirror\.com#https://registry.npmjs.org#g' package-lock.json \
 && ( npm ci --omit=dev --no-audit --no-fund \
      || ( rm -rf node_modules package-lock.json \
           && npm install --omit=dev --no-audit --no-fund \
                --registry=https://registry.npmjs.org ) ) \
 && node -e "require.resolve('mocha'); require.resolve('oracledb'); console.log('deps ok')"

# --- 建库初始化 -------------------------------------------------------------
# gvenzl/oracle-free 的 entrypoint 在"首次建库 + APP_USER 建好之后"按文件名顺序执行
# /container-entrypoint-initdb.d 下的 *.sh / *.sql。这就是把准备工作做进镜像的正确入口。
# 同一份脚本再放一份到 /opt/course/：postCreate 会再跑它一次做幂等兜底
# （覆盖"从旧镜像/预构建恢复时跳过初始化阶段"的情况）。
COPY .devcontainer/initdb/10_db_setup.sh /container-entrypoint-initdb.d/10_db_setup.sh
COPY .devcontainer/initdb/10_db_setup.sh /opt/course/dbSetup.sh

# 基线数据：只拷这一个文件，运行期工作区里的 answers/ 原样保留（判题器要用整目录）
# 改成 ASCII 文件名存进镜像：这个路径会被 initdb 脚本按字面量引用，避免中文在
# sqlplus 的 @ 命令和不同 locale 下出岔子
COPY answers/00.sql /opt/course/baseline/00_baseline.sql

# 脚本必须有执行位：entrypoint 对 .sh 的处理是"可执行就用子进程跑，否则 source 进来"。
# /tmp/dump 是 Data Pump 的 DIRECTORY 目标：目录要提前存在，且数据库进程（oracle 用户）能写。
RUN chmod 755 /container-entrypoint-initdb.d/10_db_setup.sh /opt/course/dbSetup.sh \
 && chmod 755 /opt/course /opt/course/baseline \
 && chmod 644 /opt/course/baseline/00_baseline.sql \
 && mkdir -p /tmp/dump \
 && chmod 777 /tmp/dump

# --- 构建期自检（fail fast）--------------------------------------------------
# 这是"容器能不能用"的最低前提。任何一项缺失都在 docker build 阶段报错，
# 而不是让 Codespaces 建出一个起不来的容器、学生看到 recovery mode 再去猜。
# 每项对应一个真实故障：
#   node/npm    → 判题器跑不起来
#   git         → CodeRoad 配课 `git ls-remote` 失败，进不了课程
#   initdb 脚本 → TESTER / 基线不会被创建
#   /tmp/dump   → 实验四 expdp/impdp 失败
# bash -n 顺带验语法：CRLF 或拼错会在这里暴露，而不是开机时炸掉整个容器。
RUN set -eux; \
    command -v node && node -v; \
    command -v npm  && npm -v; \
    command -v git  && git --version; \
    test -s /container-entrypoint-initdb.d/10_db_setup.sh; \
    test -s /opt/course/baseline/00_baseline.sql; \
    test -d /tmp/dump; \
    bash -n /container-entrypoint-initdb.d/10_db_setup.sh; \
    bash -n /opt/course/dbSetup.sh; \
    if grep -q $'\r' /opt/course/dbSetup.sh; then \
      echo "ERROR: initdb 脚本含 CRLF，进容器会报 '\\r: command not found'" >&2; exit 1; \
    fi; \
    echo "build self-check ok"

# --- 自动开课用的环境变量 ---------------------------------------------------
# CodeRoad 在扩展宿主进程里读 process.env.CODEROAD_TUTORIAL_URL（模块加载时读一次）。
# 这里烘一份到容器级 ENV：docker run -e 的效果，容器内所有进程都能看到。
# devcontainer.json 里另外用 remoteEnv 再设一份 —— remoteEnv 才是规范里
# "给 VS Code 及其子进程（扩展宿主、终端）" 的那一路，两层都设最稳。
ENV CODEROAD_TUTORIAL_URL="https://raw.githubusercontent.com/tovuse/database-lab/feat/image-prep-and-finer-steps/tutorial.json"

# 回到基础镜像的默认用户和工作目录，不要改变运行期身份
USER oracle
WORKDIR ${ORACLE_BASE}
