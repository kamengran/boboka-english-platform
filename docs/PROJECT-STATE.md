# BoBoKa English — 项目状态记录

## Baseline（Git tag: `baseline-before-platform-upgrade`）

### 结构
- `Frontend/` 静态 HTML + `style.css`（主风格）；`quiz / speaking / progress` 三页为 Tailwind CDN 设计稿风格。
- `Backed/` Express 5 + better-sqlite3（`boboka.db`），端口 3000，只有 GET 内容接口。
- `Frontend/assets/Books/` 4 本 PDF（口语1–4）。

### 真实内容
- 数据库：1 门课 `speaking1`，40 个 Lesson；只有 Lesson 1 有内容（2 段对话、6 句型、18 词、3 语法、8 练习、Guided/Free Output）。
- `typing_exercises / quiz_questions / speaking_exercises` 为空。
- 用户、进度、打卡、作业等表存在但 0 行且无代码使用。

### 已知问题（Step 1–2 处理）
1. `Backed/data.js` 语法错误：Lesson 2 vocabulary 中断、文件末尾未闭合 → 导入脚本无法运行。
2. `flashcards.html`、`search-results.html` 不存在。
3. Quiz / Speaking / Progress 是静态模板，含无关假内容。
4. Home / Courses / Account 使用写死的假数据。
5. `API_BASE` 写死 `http://localhost:3000`。
6. Lesson 上一课/下一课上限写死 40。
7. 手机（390px）首页横向溢出。

## 内容规则（用户确认）
- 教材正文（Dialogue / Patterns / Vocabulary / Grammar / Guided / Free Output）**不能由 AI 创造或补写**。缺失的部分标记为「教材内容待补充」。
- 练习内容（Typing / Quiz / Flashcards / Speaking 题 / Review）可以**仅基于当前 Lesson 已有内容**生成，
  不引入未学过的语法或词汇，不写成教材原文，并在数据里标记来源为生成内容。

---

## 如何运行（Step 2 之后）

```
cd Backed
npm install            # 第一次
npm run content        # 导入教材(data.js) 并重新生成练习；数据库已包含时可跳过
node server.js         # 然后打开 http://localhost:3000/
```

- 前端由后端同一个端口托管，`shared.js` 自动决定 API 地址（不再写死 localhost）。
- 教材正文只来自 `Backed/data.js`；`generate-practice.js` 只根据已导入的教材生成 Quiz / Speaking 练习（`source='generated'`）。
- 教材缺失的部分写在 `data.js` 的 `contentPending`，网站显示「教材内容待补充」。
- 学习记录（打字/测验/口语/单词卡）目前保存在浏览器 localStorage（`boboka.progress.v1`），账户系统完成后迁移到 `lesson_progress` 等表。

## 仍然是占位 / 未完成
- Login / WeChat：只有界面，`account.html` 的“模拟登录”不是真实账户。
- Course Access：`account.html` 仍是前端演示，服务器没有课程权限。
- 每日打卡 / Streak / Homework / AI Review / Teacher Review / Notifications / 中英切换：未开始。
- `Backed/data.js` 只有 Lesson 1–3（Lesson 2 教材原稿中断，待补充）；Lesson 4–40 待录入。
- Speaking 2（Lesson 41–80）数据库里没有这门课，网站不再显示。

---

## Step 3：账户体系（Development / Test 登录）

- 登录：**只有开发测试登录**（`Test Student A / B`、`Test Teacher`），页面和 API 都标记 Development / Test Account。微信登录**没有接入**，按钮明确显示「尚未接入」。
- 会话：服务器数据库 `sessions`（保存 token 哈希），浏览器只拿到 HttpOnly cookie；同源，不开 CORS。
- `NODE_ENV=production` 时开发测试登录默认关闭（`BOBOKA_DEV_LOGIN=0/1` 可强制）。
- 课程权限：`user_courses`（学生）；老师/助教（`users.role`）可看全部。课程内容、Lesson 列表、搜索、PDF、所有写入接口都由服务器检查。
- 服务器保存：Lesson 进入、打字结果、测验（服务器判分，答案不发给浏览器）、口语练习项、单词卡标记、Lesson 完成状态、每日打卡与连续天数。
- `Backed/boboka.db` 不再放进 Git（包含账户和学习数据）；用 `cd Backed && npm run content` 重建教材内容。
- 测试：`cd Backed && npm test`（20 项 API 测试）；`tests/browser-e2e.js`（真实浏览器）。

Lesson 完成条件（Homework 上线后会加上作业）：打字练习完成过 + 测验做过一次。
打卡日期按 `BOBOKA_TZ`（默认 Asia/Shanghai）计算；同一天只能打卡一次；今天还没打卡时，昨天已打卡的连续天数不断。

### 仍然是占位
- 微信登录、真实购买 / 开通课程（现在用 dev 种子数据授予 Speaking 1）。
- Book 2–4：数据库里没有 Speaking 2–4 课程，暂时任何登录用户都能读（有对应课程后自动受限制）。
- 录音不上传；Homework / AI / Teacher Review / Notifications / 中英切换：未开始。

---

## Step 4：Homework 系统

- 老师 / 管理员创建、修改、发布作业（每个 Lesson 可以有多份）：标题、课程、Lesson、说明、截止日期、Required/Optional、允许的提交方式（文字 / 图片 / PDF / Word / 音频；Video 预留）、是否允许重新提交、是否启用 AI Review、是否需要 Teacher Review、AI Feedback Level。
- 学生只能查看和提交；不能创建 / 修改作业要求。
- 没有正式教材作业时，只有 `[Demo / Test]` 测试作业（开发环境自动创建，页面上有 Demo / Test Homework 标记）。**系统不会自动创建教材作业内容。**
- 每次提交 = 一个新的 Version（1 / 2 / 3…），永不覆盖；反馈对应具体版本；老师只能批改最新版本。
- 状态：NOT_STARTED / SUBMITTED / AI_REVIEWING / AI_REVIEWED / TEACHER_REVIEW / NEEDS_REVISION / RESUBMITTED / COMPLETED（作业状态 = 最新版本状态）。AI_REVIEWING / AI_REVIEWED 只是预留，现在没有 AI。
- 完成规则：`teacher_review_required=1`（默认）→ 只有老师“标记完成”才算完成；`=0` → 提交即完成（与 AI 无关）。
- Lesson 完成 = 打字 + 测验 + 本课所有已发布的 Required 作业为 COMPLETED。
- 文件：`Backed/uploads/`（不进 Git，不公开访问，只能通过需要登录的 `/api/homework/files/:id` 下载）；`storage.js` 是可替换的存储接口；数据库保存原始文件名、存储名 / 路径、类型、大小、上传时间、submission_id。
- 文件安全：扩展名白名单 + 内容（magic number）校验；单个 ≤ 15 MB，一次最多 5 个、合计 ≤ 40 MB；不允许 exe / bat / js / html / svg 等。
- 页面：`homework.html`（学生）、`teacher-homework.html`（老师：学生提交 + 作业管理）、`teacher-review.html`（批改）；Lesson 页、课程目录、首页、进度页显示作业状态。
- 测试：`npm test`（41 项）；`tests/browser-homework-e2e.js`（真实浏览器）。

### 仍然是占位
- AI Review：只保存设置和数据表 `homework_ai_reviews`，没有接入任何 AI。
- 老师页面不显示“还没提交的学生”（需要课程学员名单，等真实账户 / 购买系统）。
- 文件存储是本地文件夹；Video 未开放；没有通知功能。
