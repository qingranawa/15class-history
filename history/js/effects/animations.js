// 纯动画与特效
// 全局观察器实例缓存，避免重复创建
let scrollCleanups = [];

function cleanupScrollListeners() {
    scrollCleanups.forEach(fn => fn());
    scrollCleanups = [];
}

export function initCardAnimations() {
    const cards = document.querySelectorAll(".timeline-event-copy");
    // 移除已存在的 visible 类，让动画重新触发
    cards.forEach(card => card.classList.remove("visible"));

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -30px 0px" });

        cards.forEach(card => {
            // 如果卡片已经在视口内，直接标记可见
            const rect = card.getBoundingClientRect();
            const winHeight = window.innerHeight || document.documentElement.clientHeight;
            if (rect.top < winHeight - 50) {
                card.classList.add("visible");
            } else {
                observer.observe(card);
            }
        });
    } else {
        cards.forEach(card => card.classList.add("visible"));
    }
}

export function triggerViewEnter(container) {
    if (!container) return;
    container.classList.remove("view-enter");
    // 强制回流
    void container.offsetWidth;
    container.classList.add("view-enter");
}

export function addHonorificEffects() {
    const honorifics = document.querySelectorAll(".honorific");
    honorifics.forEach(el => {
        el.addEventListener("mouseenter", () => {
            el.style.transition = "0.2s";
            el.style.textShadow = "0 0 5px rgba(212,175,55,0.5)";
        });
        el.addEventListener("mouseleave", () => {
            el.style.textShadow = "none";
        });
    });
}

export function initParallaxHeader() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    window.addEventListener("scroll", () => {
        const scrollY = window.scrollY;
        if (scrollY < 300) {
            hero.style.opacity = 1 - scrollY / 500;
            hero.style.transform = `translateY(${scrollY * 0.2}px)`;
        } else {
            hero.style.opacity = "";
            hero.style.transform = "";
        }
    });
}

export function initBackToTop() {
    const backBtn = document.getElementById("backToTop");
    if (!backBtn) return;

    // 用 opacity 实现平滑淡入淡出
    backBtn.style.transition = "opacity 0.3s ease, transform 0.3s ease";

    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            backBtn.style.opacity = "1";
            backBtn.style.transform = "translateY(0)";
            backBtn.style.pointerEvents = "auto";
        } else {
            backBtn.style.opacity = "0";
            backBtn.style.transform = "translateY(10px)";
            backBtn.style.pointerEvents = "none";
        }
    };

    // 初始隐藏
    backBtn.style.opacity = "0";
    backBtn.style.transform = "translateY(10px)";
    backBtn.style.pointerEvents = "none";

    window.addEventListener("scroll", toggleVisibility);
    backBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        // 点击后立即隐藏
        backBtn.style.opacity = "0";
        backBtn.style.transform = "translateY(10px)";
        backBtn.style.pointerEvents = "none";
    });
}