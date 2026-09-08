"use strict";

/* =========================================================
   KAISOUL AI — app.js
   ========================================================= */

const STORAGE_KEY = "kaisoul_ai_chats";
const THEME_KEY = "kaisoul_ai_theme";

let chats = [];
let currentChatId = null;
let isLoading = false;


/* =========================================================
   DOM
   ========================================================= */

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const openSidebarBtn = document.getElementById("openSidebar");
const closeSidebarBtn = document.getElementById("closeSidebar");

const newChatBtn = document.getElementById("newChatBtn");
const newChatHeader = document.getElementById("newChatHeader");

const themeBtn = document.getElementById("themeBtn");

const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const chatContainer = document.getElementById("chatContainer");
const chatContent = document.getElementById("chatContent");

const welcome = document.getElementById("welcome");

const recentList = document.getElementById("recentList");
const historyList = document.getElementById("historyList");

const chatTitle = document.getElementById("chatTitle");


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadTheme();
    loadChats();

    setupEvents();

    if (chats.length === 0) {
        createNewChat(false);
    } else {
        const savedCurrent =
            localStorage.getItem("kaisoul_current_chat");

        const exists = chats.some(
            chat => chat.id === savedCurrent
        );

        if (exists) {
            currentChatId = savedCurrent;
        } else {
            currentChatId = chats[0].id;
        }

        renderCurrentChat();
    }

    renderSidebar();

    autoResize();

});


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    openSidebarBtn.addEventListener("click", openSidebar);

    closeSidebarBtn.addEventListener("click", closeSidebar);

    sidebarOverlay.addEventListener("click", closeSidebar);

    newChatBtn.addEventListener("click", () => {
        createNewChat(true);
    });

    newChatHeader.addEventListener("click", () => {
        createNewChat(true);
    });

    themeBtn.addEventListener("click", toggleTheme);

    chatForm.addEventListener("submit", event => {
        event.preventDefault();
        sendMessage();
    });

    messageInput.addEventListener("input", autoResize);

    messageInput.addEventListener("keydown", event => {

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }

    });

}


/* =========================================================
   CHAT STORAGE
   ========================================================= */

function loadChats() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            chats = [];
            return;
        }

        const parsed = JSON.parse(saved);

        chats = Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error("Không thể đọc lịch sử:", error);

        chats = [];

    }

}


function saveChats() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(chats)
    );

    if (currentChatId) {
        localStorage.setItem(
            "kaisoul_current_chat",
            currentChatId
        );
    }

}


/* =========================================================
   CREATE CHAT
   ========================================================= */

function createNewChat(openMenu = true) {

    const chat = {
        id:
            Date.now().toString() +
            Math.random().toString(36).slice(2),

        title: "Cuộc trò chuyện mới",

        createdAt: Date.now(),

        updatedAt: Date.now(),

        messages: []
    };

    chats.unshift(chat);

    currentChatId = chat.id;

    saveChats();

    renderCurrentChat();

    renderSidebar();

    if (openMenu && window.innerWidth < 800) {
        closeSidebar();
    }

    setTimeout(() => {
        messageInput.focus();
    }, 100);

}


/* =========================================================
   CURRENT CHAT
   ========================================================= */

function getCurrentChat() {

    return chats.find(
        chat => chat.id === currentChatId
    );

}


function renderCurrentChat() {

    const chat = getCurrentChat();

    if (!chat) {
        createNewChat(false);
        return;
    }

    chatTitle.textContent =
        chat.title || "KAISOUL AI";

    chatContent.innerHTML = "";

    if (!chat.messages.length) {

        chatContent.appendChild(
            createWelcome()
        );

        return;
    }

    chat.messages.forEach(message => {

        addMessageToDOM(
            message.role,
            message.content,
            false
        );

    });

    scrollToBottom();

}


function createWelcome() {

    const element = document.createElement("div");

    element.className = "welcome";

    element.innerHTML = `
        <div class="welcome-inner">

            <div class="welcome-mark">
                K
            </div>

            <h1 class="welcome-title">
                KAISOUL AI
            </h1>

            <p class="welcome-description">
                AI chuyên lập trình
            </p>

        </div>
    `;

    return element;

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    if (isLoading) {
        return;
    }

    const text = messageInput.value.trim();

    if (!text) {
        return;
    }

    const chat = getCurrentChat();

    if (!chat) {
        createNewChat(false);
        return;
    }

    /* USER MESSAGE */

    chat.messages.push({
        role: "user",
        content: text
    });

    chat.updatedAt = Date.now();

    if (
        chat.title === "Cuộc trò chuyện mới" ||
        !chat.title
    ) {

        chat.title = createTitle(text);

    }

    messageInput.value = "";

    autoResize();

    saveChats();

    renderCurrentChat();

    renderSidebar();

    /* LOADING */

    setLoading(true);

    const loadingElement =
        createLoadingMessage();

    chatContent.appendChild(
        loadingElement
    );

    scrollToBottom();

    try {

        const response = await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    messages: chat.messages
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Không thể kết nối AI."
            );

        }

        const answer =
            data.text?.trim();

        if (!answer) {
            throw new Error(
                "AI không trả về nội dung."
            );
        }

        /* MODEL MESSAGE */

        chat.messages.push({
            role: "model",
            content: answer
        });

        chat.updatedAt = Date.now();

        saveChats();

        renderCurrentChat();

        renderSidebar();

    } catch (error) {

        console.error(error);

        loadingElement.remove();

        addMessageToDOM(
            "model",
            `⚠️ ${error.message}`,
            false
        );

        showToast(
            "Không thể kết nối tới KAISOUL AI"
        );

    } finally {

        setLoading(false);

        messageInput.focus();

    }

}


/* =========================================================
   MESSAGE DOM
   ========================================================= */

function addMessageToDOM(
    role,
    content,
    scroll = true
) {

    const message =
        document.createElement("div");

    message.className =
        `message message-${role}`;

    if (role === "user") {

        message.innerHTML = `
            <div class="message-bubble">
                ${escapeHTML(content)}
            </div>
        `;

    } else {

        const body =
            document.createElement("div");

        body.className = "message-body";

        body.innerHTML =
            renderMarkdown(content);

        message.appendChild(body);

        const actions =
            document.createElement(
                "div"
            );

        actions.className =
            "message-actions";

        const copy =
            document.createElement("button");

        copy.className =
            "message-action";

        copy.textContent =
            "Copy";

        copy.addEventListener(
            "click",
            () => copyText(content)
        );

        actions.appendChild(copy);

        message.appendChild(actions);

    }

    chatContent.appendChild(message);

    if (scroll) {
        scrollToBottom();
    }

    return message;

}


/* =========================================================
   LOADING
   ========================================================= */

function createLoadingMessage() {

    const message =
        document.createElement("div");

    message.className =
        "message message-model";

    message.innerHTML = `
        <div class="message-body">

            <div class="typing">
                <span></span>
                <span></span>
                <span></span>
            </div>

        </div>
    `;

    return message;

}


/* =========================================================
   MARKDOWN
   ========================================================= */

function renderMarkdown(text) {

    const blocks = [];

    let working = text.replace(
        /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g,
        (_, language, code) => {

            const id =
                `CODEBLOCK_${blocks.length}`;

            blocks.push({
                id,
                language:
                    language || "code",
                code:
                    code.trim()
            });

            return `\n${id}\n`;

        }
    );

    working = escapeHTML(working);

    working = working.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    working = working.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    working = working.replace(
        /\n\n+/g,
        "</p><p>"
    );

    working = working.replace(
        /\n/g,
        "<br>"
    );

    working =
        "<p>" +
        working +
        "</p>";

    blocks.forEach(block => {

        const safeCode =
            escapeHTML(block.code);

        const html = `
            <div class="code-wrapper">

                <div class="code-header">

                    <span>
                        ${escapeHTML(block.language)}
                    </span>

                    <button
                        class="copy-code"
                        data-code="${encodeURIComponent(block.code)}"
                    >
                        Copy
                    </button>

                </div>

                <pre><code>${safeCode}</code></pre>

            </div>
        `;

        working =
            working.replace(
                block.id,
                html
            );

    });

    return working;

}


/* =========================================================
   CODE COPY
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".copy-code"
            );

        if (!button) {
            return;
        }

        const code =
            decodeURIComponent(
                button.dataset.code
            );

        copyText(code);

    }
);


async function copyText(text) {

    try {

        await navigator.clipboard.writeText(
            text
        );

        showToast("Đã copy");

    } catch {

        showToast(
            "Không thể copy"
        );

    }

}


/* =========================================================
   SIDEBAR
   ========================================================= */

function renderSidebar() {

    renderRecent();

    renderHistory();

}


function renderRecent() {

    recentList.innerHTML = "";

    const recent =
        [...chats]
            .sort(
                (a, b) =>
                    b.updatedAt -
                    a.updatedAt
            )
            .slice(0, 5);

    if (!recent.length) {

        recentList.innerHTML =
            `<div class="empty-history">
                Chưa có cuộc trò chuyện
            </div>`;

        return;
    }

    recent.forEach(chat => {

        recentList.appendChild(
            createChatItem(chat)
        );

    });

}


function renderHistory() {

    historyList.innerHTML = "";

    const sorted =
        [...chats].sort(
            (a, b) =>
                b.updatedAt -
                a.updatedAt
        );

    if (!sorted.length) {

        historyList.innerHTML =
            `<div class="empty-history">
                Chưa có lịch sử
            </div>`;

        return;
    }

    sorted.forEach(chat => {

        historyList.appendChild(
            createChatItem(chat)
        );

    });

}


function createChatItem(chat) {

    const button =
        document.createElement("button");

    button.className =
        "chat-item";

    if (chat.id === currentChatId) {
        button.classList.add("active");
    }

    button.innerHTML = `
        <span class="chat-item-title">
            ${escapeHTML(
                chat.title ||
                "Cuộc trò chuyện"
            )}
        </span>
    `;

    button.addEventListener(
        "click",
        () => {

            currentChatId =
                chat.id;

            saveChats();

            renderCurrentChat();

            renderSidebar();

            if (
                window.innerWidth <
                800
            ) {
                closeSidebar();
            }

        }
    );

    return button;

}


/* =========================================================
   TITLE
   ========================================================= */

function createTitle(text) {

    let title =
        text
            .replace(/\s+/g, " ")
            .trim();

    if (title.length > 42) {
        title =
            title.slice(0, 42) +
            "…";
    }

    return title ||
        "Cuộc trò chuyện mới";

}


/* =========================================================
   THEME
   ========================================================= */

function loadTheme() {

    const saved =
        localStorage.getItem(
            THEME_KEY
        );

    if (saved === "dark") {
        document.body.classList.add(
            "dark"
        );
    }

}


function toggleTheme() {

    document.body.classList.toggle(
        "dark"
    );

    const dark =
        document.body.classList.contains(
            "dark"
        );

    localStorage.setItem(
        THEME_KEY,
        dark ? "dark" : "light"
    );

}


/* =========================================================
   SIDEBAR CONTROL
   ========================================================= */

function openSidebar() {

    sidebar.classList.add("open");

    sidebarOverlay.classList.add(
        "active"
    );

}


function closeSidebar() {

    sidebar.classList.remove("open");

    sidebarOverlay.classList.remove(
        "active"
    );

}


/* =========================================================
   LOADING STATE
   ========================================================= */

function setLoading(value) {

    isLoading = value;

    sendBtn.classList.toggle(
        "loading",
        value
    );

    sendBtn.disabled = value;

    messageInput.disabled = value;

}


/* =========================================================
   TEXTAREA
   ========================================================= */

function autoResize() {

    messageInput.style.height =
        "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            180
        ) +
        "px";

}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToBottom() {

    requestAnimationFrame(() => {

        chatContainer.scrollTo({
            top:
                chatContainer.scrollHeight,
            behavior: "smooth"
        });

    });

}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;

function showToast(text) {

    let toast =
        document.querySelector(
            ".toast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.className =
            "toast";

        document.body.appendChild(
            toast
        );

    }

    toast.textContent = text;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 1800);

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
