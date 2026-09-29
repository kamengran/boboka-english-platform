/* =========================================================
   Homework — 学生页和老师页共用的显示代码
   （状态名称、版本历史、文件预览）
========================================================= */

(function () {

    "use strict";

    const esc = BoBoKa.esc;


    const STATUS_LABEL = {

        NOT_STARTED: "未开始",

        SUBMITTED: "已提交",

        AI_REVIEWING: "AI 检查中",

        AI_REVIEWED: "AI 已检查",

        TEACHER_REVIEW: "老师批改中",

        NEEDS_REVISION: "需要修改",

        RESUBMITTED: "已重新提交",

        COMPLETED: "已完成"

    };


    // 状态颜色：done = 绿，warn = 橙，wait = 蓝，todo = 灰
    const STATUS_CLASS = {

        NOT_STARTED: "todo",

        SUBMITTED: "wait",

        AI_REVIEWING: "wait",

        AI_REVIEWED: "wait",

        TEACHER_REVIEW: "wait",

        NEEDS_REVISION: "warn",

        RESUBMITTED: "wait",

        COMPLETED: "done"

    };


    const TYPE_LABEL = {
        text: "文字",
        image: "图片 / 手写照片",
        pdf: "PDF",
        document: "Word 文档",
        audio: "音频",
        video: "视频（预留）"
    };


    const ACTION_LABEL = {
        feedback: "反馈",
        return_for_revision: "退回修改",
        complete: "标记完成"
    };


    function statusPill(status) {

        return (
            `<span class="hw-pill ${STATUS_CLASS[status] || "todo"}">` +
            `${esc(STATUS_LABEL[status] || status)}</span>`
        );

    }


    function demoBadge(isDemo) {

        return isDemo
            ? '<span class="hw-badge demo" title="系统测试用的作业，不是教材作业">Demo / Test Homework</span>'
            : "";

    }


    function requiredBadge(isRequired) {

        return isRequired
            ? '<span class="hw-badge req">Required 必做</span>'
            : '<span class="hw-badge opt">Optional 选做</span>';

    }


    function formatBytes(bytes) {

        if (bytes < 1024) return bytes + " B";

        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";

        return (bytes / 1024 / 1024).toFixed(1) + " MB";

    }


    // due_at 是 ISO（UTC）时间，用浏览器所在时区显示
    function formatDue(iso) {

        if (!iso) return "没有截止日期";

        const date = new Date(iso);

        if (Number.isNaN(date.getTime())) return iso;

        return date.toLocaleString("zh-CN", { hour12: false });

    }


    function dueHTML(assignmentOrItem, overdue) {

        const text = formatDue(assignmentOrItem.due_at);

        return overdue
            ? `<span class="hw-overdue">⏰ ${esc(text)}（已逾期）</span>`
            : `<span>${esc(text)}</span>`;

    }


    // 文件：图片显示缩略图，音频可以播放，其他给链接
    function fileHTML(file) {

        const link =
            `<a href="${esc(file.url)}" target="_blank" rel="noopener">` +
            `${esc(file.original_name)}</a> ` +
            `<span class="app-muted">${esc(formatBytes(file.size_bytes))}</span>`;

        if (file.kind === "image" && file.mime_type !== "image/heic") {

            return `
                <div class="hw-file">
                    <a href="${esc(file.url)}" target="_blank" rel="noopener">
                        <img class="hw-thumb" src="${esc(file.url)}" alt="${esc(file.original_name)}" loading="lazy">
                    </a>
                    <div>🖼 ${link}</div>
                </div>`;

        }

        if (file.kind === "audio") {

            return `
                <div class="hw-file">
                    <div>🎧 ${link}</div>
                    <audio controls preload="none" src="${esc(file.url)}"></audio>
                </div>`;

        }

        const icon =
            file.kind === "pdf" ? "📕"
            : file.kind === "document" ? "📄"
            : "🖼";

        return `<div class="hw-file"><div>${icon} ${link}</div></div>`;

    }


    function feedbackHTML(feedback) {

        if (!feedback || feedback.length === 0) {
            return "";
        }

        return `
            <div class="hw-feedback-list">
                ${feedback.map(item => `
                    <div class="hw-feedback ${esc(item.action)}">
                        <div class="hw-feedback-head">
                            <b>${item.author_role === "ai" ? "AI" : "老师"}：${esc(item.author_name || "")}</b>
                            <span class="hw-tag">${esc(ACTION_LABEL[item.action] || item.action)}</span>
                            <span class="app-muted">${esc(BoBoKa.formatDateTime(item.created_at))}</span>
                        </div>
                        ${item.body ? `<div class="hw-feedback-body">${esc(item.body)}</div>` : ""}
                    </div>`).join("")}
            </div>`;

    }


    // 一个版本（Version N）的完整内容
    function versionHTML(version, options) {

        const settings = options || {};

        const aiBox = settings.aiEnabled
            ? `<div class="hw-ai">🤖 AI 检查：尚未接入。（这份作业已开启 AI Review 设置，AI 功能会在后续版本提供。）</div>`
            : "";

        return `
            <div class="hw-version" id="version-${version.version}">

                <div class="hw-version-head">
                    <h3>Version ${version.version}</h3>
                    ${statusPill(version.status)}
                    ${version.is_late ? '<span class="hw-tag late">迟交</span>' : ""}
                    ${settings.latest ? '<span class="hw-tag">最新版本</span>' : ""}
                    <span class="app-muted">提交时间：${esc(BoBoKa.formatDateTime(version.submitted_at))}</span>
                </div>

                ${version.text_content
                    ? `<div class="hw-text">${esc(version.text_content)}</div>`
                    : ""}

                ${version.files.length
                    ? `<div class="hw-files">${version.files.map(fileHTML).join("")}</div>`
                    : ""}

                ${!version.text_content && version.files.length === 0
                    ? '<p class="app-muted">（这个版本没有内容）</p>'
                    : ""}

                ${aiBox}

                ${feedbackHTML(version.feedback)}

            </div>`;

    }


    window.HW = {
        STATUS_LABEL,
        STATUS_CLASS,
        TYPE_LABEL,
        statusPill,
        demoBadge,
        requiredBadge,
        formatBytes,
        formatDue,
        dueHTML,
        versionHTML,
        feedbackHTML,
        fileHTML
    };

})();
