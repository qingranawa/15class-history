# 页面导航设计 QA（含参考图调整记录）

## 对照目标

- source visual truth: `C:\Users\Jeff\AppData\Local\Temp\codex-clipboard-da48b36d-5515-45ad-ab49-f373703f733e.png`
- implementation screenshot: `C:\Users\Jeff\AppData\Local\Temp\15class-history-ui-qa\implementation-nav.png`
- route/state: `index.html?view=zhengshi`，未登录，页面导航可见
- viewport: 1029 × 140 CSS px
- source pixels: 1029 × 140
- implementation pixels: 1029 × 140
- device scale factor: 1
- density normalization: 不需要，源图和实现图使用相同像素尺寸

## 全视图对照

源图和实现截图在同一轮对照输入中查看。两者都采用顶部单色平面导航、底部细分隔线和导航下方留白；品牌位于左侧，5 个主入口集中在中间，黑色登录按钮位于右侧。实现导航实际测量为 `x=0, width=1029, height=81`，文档宽度也是 1029，没有把导航撑出视口。

实现保留了当前页状态，因此“首页”显示朱红色底部标记；源图没有展示当前态，这属于真实页面需要的交互状态差异，不影响结构还原。实现使用实际文字链接，没有使用图形占位、emoji 图标或模拟按钮。

## 聚焦区域对照

聚焦区域为顶部导航本身，因为本次需求只涉及导航。品牌左边距为 44px，登录按钮为 110 × 52px，中心菜单使用单行布局；这些尺寸和层级与源图一致。导航链接已实际点击验证：`指南 → guide.html`、`登录 → login.html`。

## 五项保真检查

- 字体与排版：品牌使用 UI 无衬线字体、20px/700；菜单使用 16px/500；登录使用 18px/700，移动端按比例收缩并保留触摸高度。
- 间距与布局：桌面端采用左品牌、中菜单、右账号三栏；移动端改为品牌、可横向滚动的主菜单、登录按钮，仍保持一行。
- 颜色与令牌：导航使用石白背景、细灰边线、墨黑品牌和黑色主按钮，当前状态使用氧化朱红。
- 图片与资产：参考图没有需要复用的图片资产；实现没有用 CSS/HTML 伪造图片或图标。
- 文案与内容：导航为“15班史记 / 首页 / 正史 / 外史 / 人物 / 指南 / 登录”，投稿入口在登录后仍由真实 `submit.html` 路由提供。

## 对比历史

### 第 1 轮

- findings: 未发现 P0、P1 或 P2 差异。
- action: 无需修复；保留当前态标记作为真实导航反馈。
- evidence: `implementation-nav.png`，1029 × 140；导航几何测量通过。

## 响应式与交互证据

- 7 个公共 HTML 路由 × 1440、1024、768、390 四个宽度，共 28 组检查通过。
- 每组导航宽度等于视口宽度，文档无横向溢出，登录入口可见。
- 真实链接跳转到 `guide.html` 和 `login.html`，无脚本模拟页面切换。
- API mock 下控制台错误为 0；静态服务器未接 Worker 时的 API 404 不属于导航运行时错误。

## Follow-up Polish

- P3：源图的当前页没有展示状态标记，而实现保留了首页朱红下划线；如果后续要求完全静态还原，可把当前态降为同色无下划线，但不建议牺牲页面定位能力。

## Implementation Checklist

- [x] 左品牌 / 中心主导航 / 右登录结构
- [x] 真实 HTML 链接和登录入口
- [x] 桌面端整行布局
- [x] 移动端单行横向滚动
- [x] 28 组响应式检查
- [x] 源图与实现截图同尺寸对照

## 当前导航结构修正

在用户反馈后，页面级导航已从“首页 / 正史 / 外史 / 人物 / 指南”恢复为“首页 / 提交草稿 / 免责声明 / 指南”，品牌“15班史记”继续作为额外的首页入口，右侧保留登录按钮。7 个公共页面均使用同一套结构；“提交草稿”链接直接进入真实 `submit.html`，未登录时由页面守卫引导登录。

- [x] 4 个页面级功能入口与用户确认的名称一致
- [x] 明确的“首页”按钮始终显示
- [x] 品牌和登录入口保留
- [x] 正史 / 外史 / 人物不再出现在页面级导航
- [x] 真实 HTML 路由保留

## 本轮人物关系图谱 QA

### 对照目标

- source visual truth: `C:\Users\Jeff\AppData\Local\Temp\codex-clipboard-e35305f2-3e1f-4f34-b806-a448a6b59764.png`
- implementation before: `C:\Users\Jeff\AppData\Local\Temp\15class-history-ui-qa\graph-before.png`
- implementation after: `C:\Users\Jeff\AppData\Local\Temp\15class-history-ui-qa\graph-after-matched.png`
- implementation mobile: `C:\Users\Jeff\AppData\Local\Temp\15class-history-ui-qa\graph-mobile.png`
- desktop source pixels: 1132 × 870
- desktop implementation pixels: 1132 × 870
- mobile implementation pixels: 390 × 844 CSS px
- desktop state: `index.html?view=characters&sort=popularity&order=desc`，关系图谱弹窗打开，静态人物数据回退
- density normalization: 桌面对照使用相同 1132 × 870 画布；移动端单独检查 390 × 844

### 根因与修复

- P1 原因：人物节点的 vis-network 字体颜色固定为旧深色主题的 `#e6e9f0`，而当前图谱画布是浅色，文字与背景对比度不足，导致名称看起来像没有渲染。
- P2 原因：节点携带 `value`，vis-network 自动按节点权重缩放标签，在关系较密时把普通人物名称压得过小。
- 修复：节点改用墨黑 `Noto Sans SC` 字体；核心人物使用浅朱红档案签和更大节点，普通人物使用白色节点；移除自动 value 缩放并固定标签比例；关系线改为低对比朱红线；弹窗标题、图例、空状态和下载操作改成独立样式类。

### 视觉对照

源图和修复后的 1132 × 870 截图在同一轮输入中查看。修复前画布只显示金色节点和连线，人物名称几乎不可见；修复后节点名称全部可见，节点尺寸表达出场次数，核心人物通过尺寸和浅朱红填充突出，连线不再抢正文信息。弹窗扩大为更宽的阅读区，标题、说明、图例和下载操作形成稳定的垂直层级。

### 五项保真检查

- 字体与排版：节点标签使用 `Noto Sans SC`，普通人物 22px、核心人物 26px，使用墨黑文字避免浅色画布上的低对比度。
- 间距与布局：桌面图谱区域为 892px 宽，移动端图谱区域为 328px 宽；节点距离增加，关系网不再缩成中心一团。
- 颜色与视觉令牌：采用石白画布、白色/浅朱红节点、氧化朱红边框和低透明度朱红连线，去掉旧金色主题。
- 图片与资产：图谱没有外部图片资产；实现使用 vis-network 原生 canvas 节点和连线，没有用图片或占位图伪造人物名称。
- 文案与内容：弹窗改为“关系档案 / 人物关系图谱 / 节点大小表示出场次数，连线越粗表示共同出现越多 / 下载图谱”，语义保持不变。

### 迭代记录

1. 初始对照：人物名称对比度不足，判定为 P1；改为墨黑/白色高对比字体和博物馆色板。
2. 第二轮对照：名称能显示但普通标签偏小，判定为 P2；移除 `value` 自动缩放，放大字号、节点和物理布局距离。
3. 最终对照：所有名称可见，桌面与移动端布局稳定；无 P0、P1、P2 遗留项。

### 交互与响应式证据

- 点击图谱中心节点后，`#characterModal` 成功打开，人物详情交互保留。
- 桌面弹窗图谱盒为 `x=119, width=894`，画布为 `892px` 宽；移动端图谱盒为 `x=31, width=328`，均处于对应视口内。
- 下载按钮和弹窗关闭按钮均保留；关闭按钮增加了可读的 `aria-label`。
- API 未连接时使用静态数据回退；测试中出现的 401 仅来自未登录预览 mock，没有未捕获的图谱 JavaScript 异常。

final result: passed
