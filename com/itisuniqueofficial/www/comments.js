const config={apiEndpoint:"https://www.itisuniqueofficial.com/feeds/comments/default?alt=json&max-results=1000",initialComments:10,loadMoreCount:5,showAvatar:!0,avatarSize:50,roundAvatar:!0,characters:150,showMoreLink:!0,moreLinkText:"Read More",animationDuration:300,defaultAvatar:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjit9MCnrMRXaYOqLwqsPIzmWRnN1Hr7rt3NHkgAHI5fTGEpn8PZ-yNGZicjo6_7YeFlWpPR8FQPx5Lyg2Xxtv-HhUEnofyuz4w9MlTrL9Jz86HjlYoPOagfZK_Rr79lYIj9ekYIUfJldvY6N0FmQ49Suf5MciTOlBqRgNKH_-xjUhJvAw/s1600/user.png"};

if (typeof window.debounce === "undefined") {
    window.debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
}

class CommentsWidget {
    constructor() {
        this.allComments = [];
        this.displayedComments = config.initialComments;
        this.container = document.getElementById("idbcomments");
        this.loader = document.getElementById("comments-loader");
        this.loadMoreBtn = document.getElementById("load-more-comments");
        this.countElement = document.getElementById("comments-count");
        this.isLoadingMore = false;
        this.retryAttempts = 0;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.fetchComments();
        this.setupIntersectionObserver();
    }

    bindEvents() {
        this.loadMoreBtn.addEventListener("click", debounce(() => this.loadMore(), 300));
    }

    async fetchComments() {
        this.showLoader(true);
        try {
            const response = await fetch(config.apiEndpoint, { cache: "no-store" });
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            this.allComments = (data.feed.entry || []).sort((a, b) => new Date(b.published.$t) - new Date(a.published.$t));
            this.renderComments();
            this.updateUI();
            this.retryAttempts = 0; 
        } catch (error) {
            console.error("Failed to load comments:", error);
            if (this.retryAttempts < 3) {
                this.retryAttempts++;
                setTimeout(() => this.fetchComments(), 2000);
            } else {
                this.showError();
            }
        } finally {
            this.showLoader(false);
        }
    }

    renderComments() {
        const fragment = document.createDocumentFragment();
        this.allComments.slice(0, this.displayedComments).forEach((comment, index) => {
            fragment.appendChild(this.createCommentElement(comment, index));
        });
        this.container.appendChild(fragment);
    }

    createCommentElement(comment, index) {
        const name = comment.author?.[0]?.name?.$t || "Anonymous";
        const avatarUrl = this.getAvatarUrl(comment.author?.[0]?.gd$image?.src);
        const link = comment.link?.find(l => l.rel === "alternate")?.href || "#";
        const content = comment.content?.$t.replace(/(<([^>]+)>)/gi, "") || "";
        const date = new Date(comment.published.$t).toLocaleString();
        const shortContent = content.length > config.characters ? content.substring(0, config.characters) + "…" : content;
        const moreLink = config.showMoreLink && content.length > config.characters ? `<a href="${link}" class="more-link">${config.moreLinkText}</a>` : "";

        const div = document.createElement("div");
        div.className = "comment";
        div.setAttribute("role", "listitem");
        div.style.animationDelay = `${0.1 * index}s`;
        div.innerHTML = `${config.showAvatar ? `<img class="avatar ${config.roundAvatar ? "round" : ""}" src="${avatarUrl}" alt="Avatar of ${name}" loading="lazy" width="${config.avatarSize}" height="${config.avatarSize}">` : ""}<div class="comment-content"><div class="comment-header"><a href="${link}" class="author" rel="nofollow">${name}</a><time class="comment-date" datetime="${comment.published.$t}">${date}</time></div><p>${shortContent} ${moreLink}</p></div>`;
        return div;
    }

    getAvatarUrl(src) {
        if (!src || src.includes("blank.gif")) return config.defaultAvatar;
        return src.replace(/\/s(1600|220)\//, `/s${config.avatarSize}-c/`);
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("animate");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        this.container.querySelectorAll(".comment").forEach(comment => observer.observe(comment));
    }

    async loadMore() {
        if (this.isLoadingMore) return;
        this.isLoadingMore = true;
        this.loadMoreBtn.disabled = true;
        this.loadMoreBtn.textContent = "Loading...";
        this.displayedComments += config.loadMoreCount;
        this.renderComments();
        this.updateUI();
        this.isLoadingMore = false;
        this.loadMoreBtn.disabled = false;
        this.loadMoreBtn.textContent = "Load More Comments";
        this.loadMoreBtn.focus();
    }

    updateUI() {
        this.countElement.textContent = `${Math.min(this.displayedComments, this.allComments.length)} of ${this.allComments.length} comments`;
        this.loadMoreBtn.classList.toggle("hidden", this.displayedComments >= this.allComments.length);
    }

    showLoader(state) {
        this.loader.classList.toggle("hidden", !state);
    }

    showError() {
        this.container.innerHTML = '<div class="error-message" role="alert">Failed to load comments.<button id="retry-btn" class="retry-btn">Retry</button></div>';
        document.getElementById("retry-btn").addEventListener("click", () => this.fetchComments());
    }
}

new CommentsWidget();
