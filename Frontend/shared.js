/* =========================================================
   BoBoKa English — 共用脚本

   1. API 地址（不再在每个页面里写死 localhost）
   2. 统一的页头 / 页脚（每个页面只放两个占位符）
   3. 本机学习记录（还没有账户系统时的临时存储）
   4. 选择 Lesson 的通用组件
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       API

       前端和后端在同一个地址（node server.js 后打开
       http://localhost:3000/），所以不需要写任何服务器地址。
       登录状态保存在服务器发的 HttpOnly cookie 里。

       - 没有登录（401）：自动跳到登录页，登录后回到这里。
       - 没有课程权限（403）：抛出错误，页面显示说明。
    ===================================================== */

    const API_BASE =
        typeof window.BOBOKA_API_BASE === "string"
            ? window.BOBOKA_API_BASE
            : "";


    class ApiError extends Error {

        constructor(message, status, code) {

            super(message);

            this.status = status;

            this.code = code;

        }

    }


    function currentPathWithQuery() {

        return (
            location.pathname.split("/").pop() +
            location.search
        ) || "index.html";

    }


    async function request(method, path, body, options) {

        const settings = options || {};

        let response;

        try {

            response = await fetch(
                API_BASE + path,
                {

                    method: method,

                    credentials: "same-origin",

                    // FormData（上传文件）由浏览器自己设置 Content-Type
                    headers:
                        body === undefined ||
                        (typeof FormData !== "undefined" && body instanceof FormData)
                            ? {}
                            : { "Content-Type": "application/json" },

                    body:
                        body === undefined
                            ? undefined
                            : (typeof FormData !== "undefined" && body instanceof FormData)
                                ? body
                                : JSON.stringify(body)

                }
            );

        }

        catch (error) {

            throw new ApiError(
                "无法连接服务器。请先在 Backed 文件夹运行 node server.js，" +
                "然后用 http://localhost:3000/ 打开网站。",
                0,
                "network"
            );

        }

        let result = null;

        try {
            result = await response.json();
        }

        catch (error) {
            // 不是 JSON
        }

        if (
            !result ||
            !response.ok ||
            result.success === false
        ) {

            const status = response.status;

            const code = result && result.code;

            if (
                status === 401 &&
                !settings.noRedirect
            ) {

                location.href =
                    "login.html?next=" +
                    encodeURIComponent(currentPathWithQuery());

                // 页面跳转前，让后面的代码停在这里
                return new Promise(() => {});

            }

            throw new ApiError(
                (result && result.message) ||
                "读取数据失败。",
                status,
                code
            );

        }

        return result;

    }


    const api = (path, options) =>
        request("GET", path, undefined, options);

    const post = (path, body, options) =>
        request("POST", path, body === undefined ? {} : body, options);

    const put = (path, body, options) =>
        request("PUT", path, body, options);

    const del = (path, options) =>
        request("DELETE", path, {}, options);


    // 当前登录的用户（没有登录返回 null）
    let mePromise = null;

    function me(force) {

        if (!mePromise || force) {

            mePromise =
                request(
                    "GET", "/api/me", undefined,
                    { noRedirect: true }
                )
                    .then(result => result.data)
                    .catch(error => {

                        if (error.status === 401) {
                            return null;
                        }

                        throw error;

                    });

        }

        return mePromise;

    }


    /* =====================================================
       SMALL HELPERS
    ===================================================== */

    function esc(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function query() {
        return new URLSearchParams(location.search);
    }


    // 需要登录的页面：没有登录就跳到登录页，登录后回来
    async function requireLogin() {

        const data = await me();

        if (!data) {

            location.href =
                "login.html?next=" +
                encodeURIComponent(currentPathWithQuery());

            return new Promise(() => {});

        }

        return data;

    }


    function lessonKey(course, lesson) {
        return `${course}:${lesson}`;
    }


    function lessonUrl(page, course, lesson) {

        return (
            `${page}?course=${encodeURIComponent(course)}` +
            `&lesson=${encodeURIComponent(lesson)}`
        );

    }


    /* =====================================================
       学习进度现在保存在服务器数据库里（属于登录的用户）。
       以前保存在浏览器 localStorage 里的旧记录不再使用，
       这里顺便清理掉。
    ===================================================== */

    try {
        localStorage.removeItem("boboka.progress.v1");
    }

    catch (error) {
        // 浏览器禁止存储：忽略
    }


    function lessonApi(course, lesson, suffix) {

        return (
            "/api/courses/" + encodeURIComponent(course) +
            "/lessons/" + encodeURIComponent(lesson) + (suffix || "")
        );

    }


    function formatDateTime(value) {

        if (!value) {
            return "";
        }

        // SQLite 的 CURRENT_TIMESTAMP 是 UTC，没有 Z
        const date = new Date(
            String(value).replace(" ", "T") + "Z"
        );

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString("zh-CN", {
            hour12: false
        });

    }


    /* =====================================================
       HEADER / FOOTER
    ===================================================== */

    const NAV = [

        {
            href: "index.html",
            label: "首页",
            pages: ["index.html", ""]
        },

        {
            href: "books.html",
            label: "书籍",
            pages: ["books.html", "reader.html"]
        },

        {
            href: "courses.html",
            label: "课程",
            pages: [
                "courses.html",
                "course-detail.html",
                "lesson.html"
            ]
        },

        {
            href: "practice.html",
            label: "练习",
            pages: ["practice.html", "flashcards.html"]
        },

        {
            href: "typing-practice.html",
            label: "打字练习",
            pages: ["typing-practice.html"]
        },

        {
            href: "quiz.html",
            label: "测验",
            pages: ["quiz.html"]
        },

        {
            href: "speaking.html",
            label: "口语练习",
            pages: ["speaking.html"]
        },

        {
            href: "progress.html",
            label: "学习进度",
            pages: ["progress.html"]
        }

    ];


    function currentPage() {

        const parts =
            location.pathname.split("/");

        return parts[parts.length - 1] || "index.html";

    }


    function headerHTML() {

        const page = currentPage();

        const links = NAV.map(item => {

            const active =
                item.pages.includes(page)
                    ? ' class="active"'
                    : "";

            return (
                `<a href="${item.href}"${active}>` +
                `${item.label}</a>`
            );

        }).join("");


        const accountActive =
            page === "account.html" ||
            page === "login.html"
                ? " active"
                : "";


        return `

<header class="site-header">

    <div class="header-container">

        <a href="index.html" class="brand">

            <div class="brand-mark">B</div>

            <div class="brand-text">
                <strong>BoBoKa English</strong>
                <span>一步一步学英语</span>
            </div>

        </a>

        <button
            class="nav-toggle"
            id="navToggle"
            type="button"
            aria-label="打开菜单"
            aria-expanded="false"
        >☰</button>

        <nav class="main-nav" id="mainNav">
            ${links}
        </nav>

        <div class="header-actions">

            <form
                class="header-search"
                action="search-results.html"
                method="get"
                role="search"
            >

                <input
                    type="search"
                    name="q"
                    placeholder="搜索教材、课程、词汇..."
                    aria-label="搜索"
                >

                <button type="submit" aria-label="搜索">🔍</button>

            </form>

            <a
                href="account.html"
                id="accountButton"
                class="account-button${accountActive}"
            >👤 我的账户</a>

        </div>

    </div>

</header>

        `;

    }


    function footerHTML() {

        return `

<footer class="site-footer">

    <div class="container footer-grid">

        <div class="footer-brand">

            <div class="brand-mark">B</div>

            <div>
                <strong>BoBoKa English</strong>
                <p>一步一步学英语</p>
            </div>

        </div>

        <div class="footer-links">
            <a href="books.html">书籍</a>
            <a href="courses.html">课程</a>
            <a href="practice.html">练习</a>
            <a href="progress.html">学习进度</a>
            <a href="account.html">我的账户</a>
        </div>

        <p class="copyright">
            © 2026 BoBoKa English. 保留所有权利。
        </p>

    </div>

</footer>

        `;

    }


    function addFavicon() {

        if (document.querySelector('link[rel="icon"]')) {
            return;
        }

        const link = document.createElement("link");

        link.rel = "icon";
        link.type = "image/svg+xml";
        link.href = "favicon.svg";

        document.head.appendChild(link);

    }


    function renderChrome() {

        addFavicon();


        const header =
            document.getElementById("site-header");

        if (header) {

            header.outerHTML = headerHTML();

            const toggle =
                document.getElementById("navToggle");

            const nav =
                document.getElementById("mainNav");

            if (toggle && nav) {

                toggle.addEventListener(
                    "click",
                    function () {

                        const open =
                            nav.classList.toggle("open");

                        toggle.setAttribute(
                            "aria-expanded",
                            String(open)
                        );

                    }
                );

            }

        }

        const footer =
            document.getElementById("site-footer");

        if (footer) {
            footer.outerHTML = footerHTML();
        }

        showAccountState();

    }


    // 页头右上角显示当前用户；开发测试账号显示明确的横幅
    async function showAccountState() {

        let data = null;

        try {
            data = await me();
        }

        catch (error) {
            return;
        }

        const button =
            document.getElementById("accountButton");

        if (!data) {

            if (button) {
                button.textContent = "👤 登录";
            }

            return;

        }

        if (button) {

            button.innerHTML =
                "👤 " + esc(data.user.nickname) +
                (
                    data.user.is_dev
                        ? ' <span class="dev-pill">TEST</span>'
                        : ""
                );

        }

        // 作业入口：学生看到“作业”，老师 / 管理员看到“批改作业”
        const nav =
            document.getElementById("mainNav");

        if (nav && !document.getElementById("homeworkNav")) {

            const teacher =
                data.user.role === "teacher" ||
                data.user.role === "admin";

            const href =
                teacher ? "teacher-homework.html" : "homework.html";

            const page = currentPage();

            const active =
                page === href ||
                (teacher && page === "teacher-review.html")
                    ? ' class="active"'
                    : "";

            nav.insertAdjacentHTML(
                "beforeend",
                '<a id="homeworkNav" href="' + href + '"' + active + ">" +
                (teacher ? "批改作业" : "作业") + "</a>"
            );

        }

        if (
            data.user.is_dev &&
            !document.getElementById("devBanner")
        ) {

            const banner =
                document.createElement("div");

            banner.id = "devBanner";

            banner.className = "dev-banner";

            banner.innerHTML =
                "<b>Development / Test Account</b> · 开发测试账号 " +
                "(user_id " + esc(data.user.id) + ") · " +
                "不是真实的微信登录，只用于开发测试。";

            document.body.insertBefore(
                banner,
                document.body.firstChild
            );

        }

    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            renderChrome
        );

    }

    else {
        renderChrome();
    }


    /* =====================================================
       LESSON PICKER

       打字 / 测验 / 口语 / 单词卡 页面没有指定 Lesson 时，
       显示这个选择器，而不是悄悄默认到第 1 课。
    ===================================================== */

    async function lessonPicker(container, targetPage, title) {

        container.innerHTML = `
            <div class="picker-card">
                <p class="picker-loading">正在读取课程...</p>
            </div>
        `;

        await requireLogin();

        let courses;

        try {

            courses =
                (await api("/api/courses")).data;

        }

        catch (error) {

            container.innerHTML = `
                <div class="picker-card">
                    <h2>无法读取课程</h2>
                    <p>${esc(error.message)}</p>
                </div>
            `;

            return;

        }

        if (courses.length === 0) {

            container.innerHTML = `
                <div class="picker-card">
                    <h2>暂时没有课程</h2>
                </div>
            `;

            return;

        }

        let html = `
            <div class="picker-card">
                <h2>${esc(title || "请选择一课")}</h2>
                <p class="picker-hint">
                    选择要练习的课程内容。
                    “待补充”的课程还没有录入教材内容。
                </p>
        `;

        const usableCourses =
            courses.filter(course => course.has_access);

        if (usableCourses.length === 0) {

            container.innerHTML = `
                <div class="picker-card">
                    <h2>你还没有可以学习的课程</h2>
                    <p class="picker-hint">
                        这个账号还没有开通课程。请在
                        <a href="account.html" style="color:var(--blue);font-weight:800;">我的账户</a>
                        查看，或联系 BoBoKa English 老师开通。
                    </p>
                </div>
            `;

            return;

        }

        for (const course of usableCourses) {

            let lessons;

            try {

                lessons = (
                    await api(
                        `/api/courses/${encodeURIComponent(course.course_code)}/lessons`
                    )
                ).data.lessons;

            }

            catch (error) {
                continue;
            }

            html += `
                <h3 class="picker-course">
                    ${esc(course.title)}
                </h3>
                <div class="picker-grid">
            `;

            for (const lesson of lessons) {

                const usable =
                    lesson.content_status !== "empty";

                if (usable) {

                    html += `
                        <a
                            class="picker-lesson"
                            href="${lessonUrl(targetPage, course.course_code, lesson.lesson_number)}"
                        >
                            <b>Lesson ${lesson.lesson_number}</b>
                            <span>${esc(lesson.title)}</span>
                            ${
                                lesson.content_status === "partial"
                                    ? "<em>部分内容待补充</em>"
                                    : ""
                            }
                        </a>
                    `;

                }

                else {

                    html += `
                        <div class="picker-lesson disabled">
                            <b>Lesson ${lesson.lesson_number}</b>
                            <span>${esc(lesson.title)}</span>
                            <em>教材内容待补充</em>
                        </div>
                    `;

                }

            }

            html += "</div>";

        }

        html += "</div>";

        container.innerHTML = html;

    }


    /* =====================================================
       EXPORT
    ===================================================== */

    window.BoBoKa = {
        API_BASE,
        api,
        post,
        put,
        del,
        me,
        requireLogin,
        ApiError,
        esc,
        query,
        lessonKey,
        lessonUrl,
        lessonApi,
        formatDateTime,
        lessonPicker
    };

})();
