// Prevent browser extension errors
window.addEventListener('error', function (e) {
    if (e.message.includes('message channel closed')) {
        // Suppress browser extension related errors
        e.preventDefault();
        return false;
    }
});

// Wait for the CMS-driven content to finish rendering (js/content-loader.js)
// before setting up animations/interactions, so they run against real
// advice cards instead of an empty/static-fallback container.
document.addEventListener('content:rendered', function () {
    // Hero animation
    gsap.to('.hero-title', {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.3
    });

    gsap.to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.6
    });

    // Animate cards on scroll
    gsap.utils.toArray('.advice-card').forEach((card, i) => {
        gsap.fromTo(card,
            { opacity: 0, y: 50 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                delay: i * 0.2,
                scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    toggleActions: "play none none none"
                }
            }
        );
    });

    // Mentorship section animation
    gsap.from('.mentorship-text', {
        opacity: 0,
        x: -50,
        duration: 1,
        scrollTrigger: {
            trigger: '.mentorship-section',
            start: "top 70%",
            toggleActions: "play none none none"
        }
    });

    gsap.from('.mentorship-image', {
        opacity: 0,
        x: 50,
        duration: 1,
        scrollTrigger: {
            trigger: '.mentorship-section',
            start: "top 70%",
            toggleActions: "play none none none"
        }
    });

    // Modal functionality
    const studyModal = document.getElementById('study-modal');
    const modalTitle = document.getElementById('modal-study-title');
    const modalContent = document.getElementById('modal-study-content');
    const modalLink = document.getElementById('modal-full-study');
    const closeModal = studyModal.querySelector('.modal-close');
    let opener = null;

    function openStudy(study, trigger) {
        modalTitle.textContent = study.title;
        modalContent.innerHTML = sanitizeHtml(study.content);
        // Hide the "full study" link when there's nowhere real to go.
        const href = safeUrl(study.link);
        modalLink.hidden = !href || href === '#';
        modalLink.setAttribute('href', href || '#');

        opener = trigger;
        studyModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeydown);
        closeModal.focus();
    }

    function closeStudy() {
        studyModal.classList.remove('active');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKeydown);
        opener?.focus();
    }

    function onKeydown(e) {
        if (e.key === 'Escape') closeStudy();
    }

    // Advice cards are rendered from MongoDB by js/content-loader.js,
    // which registers each one's case study on window.__caseStudies.
    document.querySelectorAll('.card-link').forEach((button) => {
        button.addEventListener('click', () => {
            const study = window.__caseStudies && window.__caseStudies[button.dataset.study];
            if (study) openStudy(study, button);
        });
    });

    closeModal.addEventListener('click', closeStudy);
    studyModal.addEventListener('click', (e) => {
        if (e.target === studyModal) closeStudy();
    });
});