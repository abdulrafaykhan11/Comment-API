const COMMENTS_LIMIT = 20;
const API_URL = "https://jsonplaceholder.typicode.com/comments";

const output = document.getElementById("output");
const alertContainer = document.getElementById("alert-container");
const refreshButton = document.getElementById("refresh-btn");
const recordsCount = document.getElementById("records-count");
const feedStatus = document.getElementById("feed-status");
const syncTime = document.getElementById("sync-time");
const commentForm = document.getElementById("comment-form");
const commentNameInput = document.getElementById("comment-name");
const commentEmailInput = document.getElementById("comment-email");
const commentBodyInput = document.getElementById("comment-body");
const sidebarComments = document.getElementById("sidebar-comments");
const sidebarReplies = document.getElementById("sidebar-replies");
const sidebarLikes = document.getElementById("sidebar-likes");
const sidebarResponse = document.getElementById("sidebar-response");
const featuredAuthor = document.getElementById("featured-author");
const featuredComment = document.getElementById("featured-comment");

let commentsState = [];
let nextCommentId = 1000;
let nextReplyId = 5000;
let lastSyncLabel = "Waiting...";
let pendingReplyFocusCommentId = null;

const icons = {
    heart: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 21s-6.716-4.21-9.192-8.095C.93 10.04 2.122 5.75 5.9 4.61c2.02-.61 4.14.05 5.4 1.65 1.26-1.6 3.38-2.26 5.4-1.65 3.778 1.14 4.97 5.43 3.092 8.295C18.716 16.79 12 21 12 21Z"></path>
        </svg>
    `,
    reply: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10 9 5 4v16l5-5h5a6 6 0 0 0 0-12H9"></path>
        </svg>
    `,
    thread: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M8 7h8"></path>
            <path d="M8 12h8"></path>
            <path d="M8 17h5"></path>
            <path d="M4 7h.01"></path>
            <path d="M4 12h.01"></path>
            <path d="M4 17h.01"></path>
        </svg>
    `
};

const validationConfig = {
    name: {
        required: "Please enter your name.",
        invalid: "Name must be at least 3 characters."
    },
    email: {
        required: "Please enter your email.",
        invalid: "Enter a valid email address."
    },
    body: {
        required: "Please write your message.",
        invalid: "Message must be at least 12 characters."
    }
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

function formatTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getRelativeLabel(index) {
    if (index === 0) {
        return "Just now";
    }

    if (index < 4) {
        return `${index + 1} min ago`;
    }

    return `${index + 3} min ago`;
}

function setStatus(text) {
    feedStatus.textContent = text;
}

function getReplySeed(comment, index) {
    const templates = [
        "I had the same experience and the comfort really stood out after a few hours of use.",
        "Totally agree. The sound signature feels balanced and the finish looks premium in person.",
        "Interesting take. I noticed the battery life stayed close to the advertised performance too.",
        "Thanks for sharing this. Your point about clarity is exactly why I kept mine."
    ];

    const totalReplies = index % 3 === 0 ? 2 : index % 4 === 0 ? 1 : 0;

    return Array.from({ length: totalReplies }, (_, replyIndex) => ({
        id: nextReplyId++,
        name: replyIndex === 0 ? "Aurelia Team" : `Member ${index + replyIndex}`,
        email: replyIndex === 0 ? "support@aurelia.audio" : `member${index + replyIndex}@mail.com`,
        body: replyIndex === 0
            ? `Thanks for the feedback on "${comment.name}". ${templates[(index + replyIndex) % templates.length]}`
            : templates[(index + replyIndex) % templates.length],
        likes: 4 + index + replyIndex,
        liked: false,
        timestamp: `${replyIndex + 1} min ago`
    }));
}

function createCommentModel(comment, index) {
    return {
        id: comment.id,
        postId: comment.postId,
        name: comment.name,
        email: comment.email,
        body: comment.body,
        likes: 18 + index * 2,
        liked: false,
        timestamp: getRelativeLabel(index),
        pinned: index < 2,
        replyFormVisible: false,
        repliesVisible: index < 2,
        replies: getReplySeed(comment, index)
    };
}

function buildCommentsState(rawComments) {
    commentsState = rawComments.slice(0, COMMENTS_LIMIT).map(createCommentModel);

    const highestCommentId = commentsState.reduce((maxId, comment) => Math.max(maxId, comment.id), 0);
    nextCommentId = highestCommentId + 1;
}

function createLoaderCard() {
    return `
        <article class="loader-card">
            <div class="placeholder-glow">
                <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
                    <div class="d-flex align-items-center gap-3 flex-grow-1">
                        <span class="placeholder rounded-4" style="width:52px;height:52px;"></span>
                        <div class="flex-grow-1">
                            <span class="placeholder col-5 mb-2 rounded-pill"></span>
                            <span class="placeholder col-7 rounded-pill"></span>
                        </div>
                    </div>
                    <span class="placeholder col-2 rounded-pill"></span>
                </div>
                <div class="placeholder col-12 mb-2 rounded"></div>
                <div class="placeholder col-11 mb-2 rounded"></div>
                <div class="placeholder col-8 mb-4 rounded"></div>
                <div class="d-flex flex-wrap gap-2">
                    <span class="placeholder col-2 rounded-pill"></span>
                    <span class="placeholder col-2 rounded-pill"></span>
                    <span class="placeholder col-3 rounded-pill"></span>
                </div>
            </div>
        </article>
    `;
}

function showLoader() {
    output.innerHTML = Array.from({ length: 5 }, createLoaderCard).join("");
}

function showError(message) {
    alertContainer.innerHTML = `
        <div class="alert error-box p-4 mb-0" role="alert">
            <h5 class="alert-heading mb-2">Failed to fetch data</h5>
            <p class="mb-0">${escapeHtml(message)}</p>
        </div>
    `;
    output.innerHTML = "";
    setStatus("Offline");
    syncTime.textContent = "--:--";
    updateSidebar();
}

function showEmptyState() {
    output.innerHTML = `
        <div class="empty-state">
            <h4 class="mb-2">No comments available</h4>
            <p class="mb-0">The API responded successfully, but there are no records to show right now.</p>
        </div>
    `;
    setStatus("Empty");
    updateSidebar();
}

function renderReply(reply) {
    return `
        <article class="reply-card">
            <div class="reply-top">
                <div class="reply-author">
                    <div class="reply-avatar">${escapeHtml(getInitials(reply.name))}</div>
                    <div>
                        <div class="reply-name-row">
                            <h4 class="reply-name">${escapeHtml(reply.name)}</h4>
                            ${reply.email === "support@aurelia.audio" ? '<span class="verified-mark">Official</span>' : ""}
                        </div>
                        <p class="reply-email">${escapeHtml(reply.email)}</p>
                    </div>
                </div>
                <span class="reply-timestamp">${escapeHtml(reply.timestamp)}</span>
            </div>

            <p class="reply-body">${escapeHtml(reply.body)}</p>

            <div class="reply-meta">
                <button class="action-btn ${reply.liked ? "liked" : ""}" type="button" data-action="like-reply" data-reply-id="${reply.id}">
                    ${icons.heart}
                    <span class="action-count">${reply.likes}</span>
                </button>
            </div>
        </article>
    `;
}

function renderReplyForm(comment) {
    return `
        <form class="reply-form" data-reply-form="${comment.id}" novalidate>
            <div class="reply-form-intro">
                <div>
                    <p class="reply-form-kicker">Reply mode</p>
                    <h4 class="reply-form-title">Replying to ${escapeHtml(comment.name)}</h4>
                </div>
                <button class="reply-cancel-btn" type="button" data-action="toggle-reply-form" data-comment-id="${comment.id}">
                    Cancel
                </button>
            </div>
            <div class="reply-form-grid">
                <div class="reply-field">
                    <input class="reply-input" name="name" type="text" placeholder="Your name" required>
                    <span class="field-error" aria-live="polite" hidden></span>
                </div>
                <div class="reply-field">
                    <input class="reply-input" name="email" type="email" placeholder="you@example.com" required>
                    <span class="field-error" aria-live="polite" hidden></span>
                </div>
            </div>
            <div class="reply-field reply-field-full">
                <textarea class="reply-textarea" name="body" rows="3" placeholder="Write your reply..." required></textarea>
                <span class="field-error" aria-live="polite" hidden></span>
            </div>
            <div class="reply-form-footer">
                <span class="reply-note">Reply will appear instantly in this demo.</span>
                <button class="reply-submit-btn" type="submit">Reply</button>
            </div>
        </form>
    `;
}

function renderReplies(comment) {
    if (!comment.replies.length && !comment.replyFormVisible) {
        return "";
    }

    const contextMarkup = (comment.repliesVisible || comment.replyFormVisible)
        ? `
            <div class="reply-context ${comment.replyFormVisible ? "active" : ""}">
                <span class="reply-context-icon">&#8627;</span>
                <div>
                    <p class="reply-context-label">${comment.replyFormVisible ? "Reply mode is active" : "Replies are open"}</p>
                    <strong>${comment.replyFormVisible ? `You are replying to ${escapeHtml(comment.name)}` : `${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"} visible in this thread`}</strong>
                </div>
            </div>
        `
        : "";

    const repliesMarkup = comment.repliesVisible && comment.replies.length
        ? `<div class="reply-list">${comment.replies.map(renderReply).join("")}</div>`
        : "";

    const formMarkup = comment.replyFormVisible ? renderReplyForm(comment) : "";

    return `
        <div class="reply-thread">
            ${contextMarkup}
            ${repliesMarkup}
            ${formMarkup}
        </div>
    `;
}

function renderComment(comment) {
    return `
        <article class="comment-card ${comment.replyFormVisible ? "is-replying" : ""} ${comment.repliesVisible ? "thread-open" : ""}" data-comment-id="${comment.id}">
            <div class="comment-top">
                <div class="comment-author">
                    <div class="avatar-badge">${escapeHtml(getInitials(comment.name))}</div>
                    <div>
                        <div class="comment-name-row">
                            <h3 class="comment-name">${escapeHtml(comment.name)}</h3>
                            ${comment.pinned ? '<span class="verified-mark">Top Reviewer</span>' : ""}
                        </div>
                        <p class="comment-email">${escapeHtml(comment.email)}</p>
                    </div>
                </div>

                <div class="comment-badges">
                    <span class="comment-badge">Comment #${comment.id}</span>
                    <span class="comment-badge">Post ${comment.postId}</span>
                </div>
            </div>

            <p class="comment-body">${escapeHtml(comment.body)}</p>

            <div class="comment-footer">
                <div class="comment-actions">
                    <button class="action-btn ${comment.liked ? "liked" : ""}" type="button" data-action="like-comment" data-comment-id="${comment.id}">
                        ${icons.heart}
                        <span class="action-count">${comment.likes}</span>
                    </button>
                    <button class="action-btn ${comment.replyFormVisible ? "active" : ""}" type="button" data-action="toggle-reply-form" data-comment-id="${comment.id}">
                        ${icons.reply}
                        <span class="action-count">${comment.replyFormVisible ? "Cancel reply" : "Reply"}</span>
                    </button>
                    ${comment.replies.length ? `
                        <button class="reply-toggle-btn ${comment.repliesVisible ? "active" : ""}" type="button" data-action="toggle-replies" data-comment-id="${comment.id}">
                            ${icons.thread}
                            <span>${comment.repliesVisible ? "Hide replies" : "Show more"}</span>
                            <span class="reply-toggle-count">(${comment.replies.length})</span>
                        </button>
                    ` : ""}
                </div>

                <span class="comment-timestamp">${escapeHtml(comment.timestamp)}</span>
            </div>

            ${renderReplies(comment)}
        </article>
    `;
}

function updateSidebar() {
    const totalComments = commentsState.length;
    const totalReplies = commentsState.reduce((count, comment) => count + comment.replies.length, 0);
    const totalLikes = commentsState.reduce((count, comment) => {
        const replyLikes = comment.replies.reduce((replyCount, reply) => replyCount + reply.likes, 0);
        return count + comment.likes + replyLikes;
    }, 0);
    const responseRate = totalComments ? Math.round((totalReplies / totalComments) * 100) : 0;
    const topComment = commentsState.reduce((currentTop, comment) => {
        if (!currentTop || comment.likes > currentTop.likes) {
            return comment;
        }

        return currentTop;
    }, null);

    sidebarComments.textContent = totalComments;
    sidebarReplies.textContent = totalReplies;
    sidebarLikes.textContent = totalLikes;
    sidebarResponse.textContent = `${responseRate}%`;

    if (topComment) {
        featuredAuthor.textContent = topComment.name;
        featuredComment.textContent = topComment.body.length > 130
            ? `${topComment.body.slice(0, 127)}...`
            : topComment.body;
    } else {
        featuredAuthor.textContent = "No active comment";
        featuredComment.textContent = "Refresh the feed to load comments.";
    }
}

function getValidationMessage(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const messages = validationConfig[fieldName];

    if (!messages) {
        return "";
    }

    if (!value) {
        return messages.required;
    }

    if (fieldName === "name" && value.length < 3) {
        return messages.invalid;
    }

    if (fieldName === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return messages.invalid;
    }

    if (fieldName === "body" && value.length < 12) {
        return messages.invalid;
    }

    return "";
}

function setFieldValidationState(field, message) {
    const wrapper = field.closest(".input-group-box, .reply-field");
    const errorNode = wrapper?.querySelector(".field-error");
    const hasError = Boolean(message);

    field.classList.toggle("is-invalid-input", hasError);
    field.setAttribute("aria-invalid", String(hasError));

    if (wrapper) {
        wrapper.classList.toggle("is-invalid", hasError);
    }

    if (errorNode) {
        errorNode.textContent = message;
        errorNode.hidden = !hasError;
    }
}

function validateField(field) {
    if (!field || !field.name) {
        return true;
    }

    const message = getValidationMessage(field);
    setFieldValidationState(field, message);

    return !message;
}

function validateForm(formElement) {
    const fields = Array.from(formElement.querySelectorAll("[name]"));
    let firstInvalidField = null;

    for (const field of fields) {
        const isValid = validateField(field);

        if (!isValid && !firstInvalidField) {
            firstInvalidField = field;
        }
    }

    if (firstInvalidField) {
        firstInvalidField.focus();
        return false;
    }

    return true;
}

function clearFormValidation(formElement) {
    const fields = Array.from(formElement.querySelectorAll("[name]"));

    for (const field of fields) {
        setFieldValidationState(field, "");
    }
}

function renderComments() {
    if (!commentsState.length) {
        showEmptyState();
        return;
    }

    alertContainer.innerHTML = "";
    output.innerHTML = commentsState.map(renderComment).join("");
    recordsCount.textContent = commentsState.length;
    setStatus("Live discussion");
    syncTime.textContent = lastSyncLabel;
    updateSidebar();

    if (pendingReplyFocusCommentId !== null) {
        focusReplyForm(pendingReplyFocusCommentId);
        pendingReplyFocusCommentId = null;
    }
}

function focusReplyForm(commentId) {
    const replyForm = output.querySelector(`[data-reply-form="${commentId}"]`);
    const replyTextarea = replyForm?.querySelector(".reply-textarea");

    if (replyTextarea) {
        replyTextarea.focus();
        replyTextarea.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }
}

function toggleCommentLike(commentId) {
    const comment = commentsState.find((item) => item.id === commentId);

    if (!comment) {
        return;
    }

    comment.liked = !comment.liked;
    comment.likes += comment.liked ? 1 : -1;
    renderComments();
}

function toggleReplyLike(replyId) {
    for (const comment of commentsState) {
        const reply = comment.replies.find((item) => item.id === replyId);

        if (reply) {
            reply.liked = !reply.liked;
            reply.likes += reply.liked ? 1 : -1;
            renderComments();
            return;
        }
    }
}

function toggleReplyForm(commentId) {
    const activeComment = commentsState.find((comment) => comment.id === commentId);

    if (!activeComment) {
        return;
    }

    const shouldOpen = !activeComment.replyFormVisible;

    commentsState = commentsState.map((comment) => ({
        ...comment,
        replyFormVisible: comment.id === commentId ? shouldOpen : false,
        repliesVisible: comment.id === commentId
            ? shouldOpen || comment.repliesVisible
            : comment.repliesVisible
    }));

    pendingReplyFocusCommentId = shouldOpen ? commentId : null;

    renderComments();
}

function toggleReplies(commentId) {
    commentsState = commentsState.map((comment) => {
        if (comment.id === commentId) {
            return {
                ...comment,
                repliesVisible: !comment.repliesVisible
            };
        }

        return comment;
    });

    renderComments();
}

function addNewComment(name, email, body) {
    const newComment = {
        id: nextCommentId++,
        postId: 1,
        name,
        email,
        body,
        likes: 0,
        liked: false,
        timestamp: "Just now",
        pinned: false,
        replyFormVisible: false,
        repliesVisible: false,
        replies: []
    };

    commentsState.unshift(newComment);
    renderComments();
}

function addReply(commentId, name, email, body) {
    commentsState = commentsState.map((comment) => {
        if (comment.id === commentId) {
            const newReply = {
                id: nextReplyId++,
                name,
                email,
                body,
                likes: 0,
                liked: false,
                timestamp: "Just now"
            };

            return {
                ...comment,
                repliesVisible: true,
                replyFormVisible: false,
                replies: [newReply, ...comment.replies]
            };
        }

        return comment;
    });

    renderComments();
}

async function loadComments() {
    refreshButton.disabled = true;
    setStatus("Loading comments...");
    recordsCount.textContent = COMMENTS_LIMIT;
    syncTime.textContent = "Updating...";
    alertContainer.innerHTML = "";
    showLoader();

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Please check your internet connection and try again.");
        }

        const comments = await response.json();
        buildCommentsState(comments);
        lastSyncLabel = formatTime();
        renderComments();
    } catch (error) {
        console.error("Fetch error:", error);
        commentsState = [];
        showError(error.message || "Please check your internet connection and try again.");
    } finally {
        refreshButton.disabled = false;
    }
}

commentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateForm(commentForm)) {
        return;
    }

    const name = commentNameInput.value.trim();
    const email = commentEmailInput.value.trim();
    const body = commentBodyInput.value.trim();

    addNewComment(name, email, body);
    commentForm.reset();
    clearFormValidation(commentForm);
});

output.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");

    if (!actionTarget) {
        return;
    }

    const action = actionTarget.dataset.action;
    const commentId = Number(actionTarget.dataset.commentId);
    const replyId = Number(actionTarget.dataset.replyId);

    if (action === "like-comment") {
        toggleCommentLike(commentId);
    }

    if (action === "toggle-reply-form") {
        toggleReplyForm(commentId);
    }

    if (action === "toggle-replies") {
        toggleReplies(commentId);
    }

    if (action === "like-reply") {
        toggleReplyLike(replyId);
    }
});

commentForm.addEventListener("input", (event) => {
    const field = event.target.closest("[name]");

    if (!field) {
        return;
    }

    validateField(field);
});

commentForm.addEventListener("focusout", (event) => {
    const field = event.target.closest("[name]");

    if (!field) {
        return;
    }

    validateField(field);
});

output.addEventListener("input", (event) => {
    const field = event.target.closest(".reply-input, .reply-textarea");

    if (!field) {
        return;
    }

    validateField(field);
});

output.addEventListener("focusout", (event) => {
    const field = event.target.closest(".reply-input, .reply-textarea");

    if (!field) {
        return;
    }

    validateField(field);
});

output.addEventListener("submit", (event) => {
    const replyForm = event.target.closest("[data-reply-form]");

    if (!replyForm) {
        return;
    }

    event.preventDefault();

    if (!validateForm(replyForm)) {
        return;
    }

    const commentId = Number(replyForm.dataset.replyForm);
    const formData = new FormData(replyForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const body = String(formData.get("body") || "").trim();

    addReply(commentId, name, email, body);
});

refreshButton.addEventListener("click", loadComments);

loadComments();
