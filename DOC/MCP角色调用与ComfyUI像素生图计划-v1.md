# MCP角色调用与ComfyUI像素生图计划（v1）

## 1. 目标与范围

本计划用于在当前项目中新增一套 MCP 工具层，实现以下核心能力：

1. 用户输入角色名（如 `5738g`）后，系统能精准读取 `polyu-storyworld` 角色 YAML。
2. 自动提取角色设定并进行 8 维情绪分析（Plutchik 8 基础情绪）。
3. 基于角色剧情设定与情绪结果，生成可用于玩家对话的上下文。
4. 按用户输入角色名调用 ComfyUI 生成像素风角色图（异步任务）。

非目标（v1 暂不覆盖）：

1. 完整替换现有全部顾客生成逻辑。
2. 多风格并行生图编排（先实现像素风单工作流）。
3. 复杂权限系统（先做本地开发可用）。

---

## 2. 参考形态（对齐 ltx2-comfy-v915 的思路）

参考仓库的关键思想不是“照搬代码”，而是“工具化 + 工作流化”：

1. 将外部 AI 能力封装为可调用工具，而不是散落在业务逻辑里。
2. 将 ComfyUI 调用拆分为「提交任务 -> 查询状态 -> 获取结果」的标准流程。
3. 将提示词模板、工作流 JSON、角色数据解析逻辑模块化管理。
4. 保留可替换性：后续可替换模型、工作流、提示词而不重写主流程。

---

## 3. 总体架构

建议新增一个独立目录：`mcp-server/`（Node.js 实现）。

数据流：

1. 前端/游戏层输入角色名。
2. MCP 工具 `character.get_by_name` 读取并解析 YAML。
3. MCP 工具 `emotion.analyze_character` 输出标准化 8 维权重与 top3。
4. MCP 工具 `dialogue.build_context` 组装剧情+情绪+当前回合上下文。
5. （可选）MCP 工具 `image.generate_pixel_portrait` 提交 ComfyUI 任务。
6. 前端轮询 `image.get_task` 获取状态与最终图片地址。

---

## 4. MCP 工具清单（v1）

### 4.1 角色工具

1. `character.get_by_name`
- 输入：`{ name: string }`
- 行为：
  - 在角色目录中查找 `name.yml` / `name.yaml`。
  - 解析 YAML，提取字段：`name/profile/description/background/biography/personality/traits/dialogue_style`。
  - 返回标准角色对象。
- 异常：文件不存在、解析失败。

2. `character.search`
- 输入：`{ keyword?: string, limit?: number }`
- 行为：返回可选角色列表（用于输入联想与调试）。

### 4.2 情绪工具

1. `emotion.analyze_character`
- 输入：`{ character: CharacterPayload }` 或 `{ name: string }`
- 输出（标准协议）：
  - `weights`（8 维）
  - `top3`（系统重算）
  - `confidence`
  - `rationale`
- 后处理硬规则：
  - 仅允许 8 个合法情绪 ID：
    `joy trust fear surprise sadness disgust anger anticipation`
  - 缺失补 0、clamp 到 [0,1]、归一化到 sum=1。
  - 置信度缺失默认 `0.6`。
  - 解析失败回退均匀分布 `0.125`。

### 4.3 对话上下文工具

1. `dialogue.build_context`
- 输入：
  - `character`
  - `emotionAnalysis`
  - `gameState`（可选：日期、信任值、最近事件）
- 输出：
  - `systemPromptPatch`
  - `npcPersonaSummary`
  - `sceneHooks`（可用于回合对话）

### 4.4 ComfyUI 生图工具

1. `image.generate_pixel_portrait`
- 输入：
  - `name`
  - `character`
  - `style`（默认 `pixel-portrait-v1`）
- 行为：
  - 根据角色设定生成正负提示词。
  - 加载预设 workflow JSON。
  - 调用 ComfyUI `/prompt` 提交任务。
- 输出：`{ taskId, status: "queued" }`

2. `image.get_task`
- 输入：`{ taskId }`
- 输出：`queued/running/succeeded/failed` + 图片路径/错误信息。

---

## 5. 目录与文件建议

建议新增：

1. `mcp-server/package.json`
2. `mcp-server/src/index.mjs`（MCP server 入口）
3. `mcp-server/src/tools/characterTools.mjs`
4. `mcp-server/src/tools/emotionTools.mjs`
5. `mcp-server/src/tools/dialogueTools.mjs`
6. `mcp-server/src/tools/imageTools.mjs`
7. `mcp-server/src/services/yamlCharacterService.mjs`
8. `mcp-server/src/services/emotionAnalysisService.mjs`
9. `mcp-server/src/services/comfyClient.mjs`
10. `mcp-server/workflows/pixel-portrait-v1.json`
11. `mcp-server/config/defaults.json`
12. `mcp-server/README.md`

---

## 6. 输入输出协议草案

### 6.1 `character.get_by_name`

请求：

```json
{
  "name": "5738g"
}
```

响应：

```json
{
  "ok": true,
  "character": {
    "id": "5738g",
    "displayName": "...",
    "sourceFile": ".../5738g.yaml",
    "profile": "...",
    "background": "...",
    "personality": "...",
    "dialogueStyle": "..."
  }
}
```

### 6.2 `emotion.analyze_character`

响应：

```json
{
  "ok": true,
  "emotion": {
    "weights": {
      "joy": 0.12,
      "trust": 0.18,
      "fear": 0.1,
      "surprise": 0.08,
      "sadness": 0.14,
      "disgust": 0.07,
      "anger": 0.11,
      "anticipation": 0.2
    },
    "top3": ["anticipation", "trust", "sadness"],
    "confidence": 0.82,
    "rationale": ["..."]
  }
}
```

### 6.3 `image.generate_pixel_portrait`

响应：

```json
{
  "ok": true,
  "taskId": "cui_20260416_abc123",
  "status": "queued"
}
```

---

## 7. 实施阶段

### 阶段 P0：技术验证（1-2 天）

1. 验证可读取并解析指定 YAML（按名称）。
2. 验证 MCP server 能被本地客户端调用。
3. 验证 ComfyUI 最小 workflow 可提交并返回结果。

完成标准：

1. 输入 `5738g` 可返回角色对象。
2. 可拿到一张像素风结果图（即使质量未调优）。

### 阶段 P1：核心闭环（2-4 天）

1. 实现 5 个工具：`character.get_by_name`、`character.search`、`emotion.analyze_character`、`dialogue.build_context`、`image.generate_pixel_portrait`。
2. 落实情绪后处理规则与降级策略。
3. 在游戏中接入“角色名输入 -> 情绪分析 -> 对话上下文”。

完成标准：

1. 可连续完成 20 次角色调用，不阻断流程。
2. 情绪权重总和误差 < `1e-6`。

### 阶段 P2：稳定性与体验（2-3 天）

1. 增加 `image.get_task` 轮询与错误状态映射。
2. 增加缓存（角色解析缓存、情绪分析短缓存）。
3. 增加输入联想与错误提示（角色不存在时给近似建议）。

完成标准：

1. 常见错误（角色不存在、YAML 解析失败、ComfyUI 超时）均有可读错误。
2. UI 能显示生成中状态并在完成后回填图像。

---

## 8. 关键技术决策

1. 角色名安全校验
- 仅允许：`[A-Za-z0-9_-]`。
- 禁止路径穿越（如 `../`）。

2. 情绪模型容错
- 不信任模型原始 `top3`，系统重算。
- 返回脏数据时强制清洗，不影响流程。

3. ComfyUI 调用策略
- 默认异步，不阻塞主线程。
- 超时可配置（例如 120s）。
- 支持失败重试 1 次（可选）。

4. 可观测性
- 记录 tool 调用耗时、失败原因、命中缓存率。

---

## 9. 风险与对策

1. 风险：角色 YAML 字段不统一
- 对策：做字段映射表与多候选提取（profile/description 等）。

2. 风险：ComfyUI 工作流节点 ID 不稳定
- 对策：固定 workflow 模板并加启动自检。

3. 风险：模型输出不稳定
- 对策：严格 JSON 协议 + 后处理 + 默认回退。

4. 风险：前端等待时间过长
- 对策：异步任务 + 占位图 + 进度提示。

---

## 10. 验收清单（MVP）

1. 输入角色名可稳定定位并解析 YAML。
2. 可稳定产出 8 维情绪权重，并满足合法性与归一化约束。
3. 对话生成可使用角色剧情设定与情绪结果。
4. 可触发 ComfyUI 像素风生图并返回任务结果。
5. 全流程无“因为猜测错误/解析错误导致硬中断”。

---

## 11. 下一步执行建议

1. 先实现 `character.get_by_name` 与 `emotion.analyze_character`，打通文本主流程。
2. 再接入 `dialogue.build_context` 到现有 prompt 模板系统。
3. 最后接 ComfyUI 的 `image.generate_pixel_portrait` + `image.get_task`。

> 备注：本计划采用“先闭环、后优化”的策略，优先交付可用能力，再逐步提高生成质量和运行稳定性。
