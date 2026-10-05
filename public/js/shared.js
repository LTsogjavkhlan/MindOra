// Shared header/footer behaviour for every public page. Nav button hover and
// the greyed-out "current page" (.active-section) state are pure CSS in
// css/shared.css; this file only handles what CSS can't.
document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    // Reduced motion: every GSAP tween on the site (entrances, hovers, slide
    // fades) completes near-instantly instead of moving. The two looping
    // carousels in main.js additionally start paused.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.globalTimeline.timeScale(20);
    }

    const mainMenu = document.querySelector('.main-menu');
    const hamburger = document.querySelector('.hamburger-menu');
    const backToTopBtn = document.querySelector('.back-to-top');

    // Menu entrance animation
    gsap.from('.main-menu nav a', {
        y: -10,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: 'power1.out',
        clearProps: 'transform,opacity'
    });

    // One passive scroll listener for both the mobile hide-on-scroll menu and
    // the back-to-top button.
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;

        if (mainMenu && window.innerWidth <= 768 && Math.abs(scrollTop - lastScrollTop) > 5) {
            const hide = scrollTop > lastScrollTop && scrollTop > 60;
            requestAnimationFrame(() => {
                mainMenu.style.transform = hide ? 'translateY(-100%)' : 'translateY(0)';
            });
            lastScrollTop = scrollTop;
        }

        backToTopBtn?.classList.toggle('visible', scrollTop > 500);
    }, { passive: true });

    backToTopBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Mobile menu
    if (!hamburger || !mainMenu) return;
    const hamburgerIcon = hamburger.querySelector('svg');

    function setMenuOpen(open) {
        mainMenu.classList.toggle('mobile-open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        if (hamburgerIcon) {
            gsap.to(hamburgerIcon, { rotation: open ? 90 : 0, duration: 0.3, ease: 'power2.out' });
        }
        if (open) {
            gsap.fromTo(mainMenu.querySelectorAll('.mobile-nav-links a'),
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, delay: 0.1, ease: 'power2.out' }
            );
        }
    }

    const isMenuOpen = () => mainMenu.classList.contains('mobile-open');

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        setMenuOpen(!isMenuOpen());
    });

    mainMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenuOpen(false));
    });

    // Close when clicking outside the menu
    document.addEventListener('click', (e) => {
        if (isMenuOpen() && !mainMenu.contains(e.target)) setMenuOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen()) {
            setMenuOpen(false);
            hamburger.focus();
        }
    });
});
