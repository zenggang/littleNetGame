# 文档同步 Hook

## 目标

这个仓库已经进入“增量迭代”阶段。以后凡是聊到架构、主流程、验证链路、发布门槛、里程碑判断的改动，相关文档必须在同一次工作里同步更新，不能只改代码或只口头说明。

## 默认规则

- 如果改动影响以下任一内容，必须同步更新文档：
  - 架构边界
  - 主流程行为
  - 本地 Demo 模式与真实联机模式的关系
  - 验证方式、发布门槛、上线前检查项
  - 里程碑判断、当前阶段状态、下一阶段路线
- 如果改动不需要更新文档，最终说明里必须明确写出“为什么这次不用更新文档”。

## 默认检查文档

发生中大型改动时，至少检查这些文件是否需要同步：

- `README.md`
- `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
- `docs/verification/game-core-release-checklist.md`

如果改动会让旧 spec / old plan 的“状态”或“当前事实”失真，还要同步更新这些历史文档顶部状态：

- `docs/superpowers/specs/2026-04-16-pure-game-core-rebuild-design.md`
- `docs/superpowers/plans/2026-04-16-pure-game-core-rebuild-implementation.md`
- `docs/superpowers/specs/2026-04-16-battle-game-feel-polish-design.md`

## 历史文档处理原则

- 旧 spec / 旧 plan 不要继续伪装成“当前真相”。
- 一旦主链路已经落地，旧文档应改成：
  - 历史设计基线
  - 历史实施计划
  - 当前状态请看新的状态/里程文档

## 当前推荐节奏

- 小 bug / 小修复：默认走 `只工程`
- 开新阶段前：先补或更新 spec
- 完成一个阶段性能力后：立即回填 current-state / checklist

## 语言

- 默认中文
- 说明要直接、具体、可执行
