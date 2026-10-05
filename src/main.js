// Home page entry point (style.css is linked directly in index.html).

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DATE_FORMAT = new Intl.DateTimeFormat('mn-MN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// Wait for the CMS-driven hero content to finish rendering (js/content-loader.js)
// before setting up the slider/animations, so they run against real content
// instead of an empty container.
document.addEventListener("content:rendered", () => {
    // Check if GSAP is loaded
    if (typeof gsap === 'undefined') {
        console.error('GSAP is not loaded! Please check if the GSAP script tags are properly included.');
        return;
    }

    // Check if ScrollTrigger is loaded
    if (typeof ScrollTrigger === 'undefined') {
        console.error('ScrollTrigger is not loaded! Please check if the ScrollTrigger script tag is properly included.');
        return;
    }

    // Performance optimizations for GSAP
    gsap.ticker.lagSmoothing(0); // Disable lag smoothing
    gsap.config({
        autoSleep: 60,
        force3D: true,  // Force GPU acceleration
        nullTargetWarn: false // Reduce console warnings on mobile
    });

    // Mobile-specific performance optimizations
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // Reduce animation quality on mobile for better performance
        gsap.config({
            autoSleep: 30,
            force3D: false // Disable 3D transforms on mobile to prevent rendering issues
        });

        // Disable scroll-triggered animations on mobile for better performance
        ScrollTrigger.config({
            refreshPriority: -1,
            ignoreMobileResize: true
        });
    }

    // Initialize all components
    init();

    // Comment popup functionality - Define before it's used
    function showCommentPopup(card) {
        // Extract data from the card with error checking
        const image = card.querySelector('.client-image');
        const nameElement = card.querySelector('.client-info h3');
        const titleElement = card.querySelector('.client-info span');
        const commentElement = card.querySelector('.comment-content p');

        if (!image || !nameElement || !titleElement || !commentElement) {
            console.error('Missing elements in card:', { image, nameElement, titleElement, commentElement });
            return;
        }

        const name = nameElement.textContent;
        const title = titleElement.textContent;
        const comment = commentElement.textContent;
        const date = card.dataset.date ? DATE_FORMAT.format(new Date(card.dataset.date)) : '';
        const imageSrc = image.src;
        const imageAlt = image.alt;
        const opener = document.activeElement;

        // Create popup overlay if it doesn't exist
        let overlay = document.querySelector('.comment-popup-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'comment-popup-overlay';
            document.body.appendChild(overlay);
        }

        // Create popup HTML
        overlay.innerHTML = `
            <div class="comment-popup" role="dialog" aria-modal="true" aria-labelledby="comment-popup-name">
                <button class="comment-popup-close" type="button" aria-label="Хаах">&times;</button>
                <div class="comment-popup-header">
                    <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}" class="comment-popup-image">
                    <div class="comment-popup-info">
                        <h3 id="comment-popup-name">${escapeHtml(name)}</h3>
                        <div class="title">${escapeHtml(title)}</div>
                        ${date ? `<div class="date"><time datetime="${escapeHtml(card.dataset.date)}">${escapeHtml(date)}</time></div>` : ''}
                    </div>
                </div>
                <div class="comment-popup-text">${escapeHtml(comment)}</div>
            </div>
        `;

        const popup = overlay.querySelector('.comment-popup');
        const closeBtn = overlay.querySelector('.comment-popup-close');

        // Set initial state for animation
        gsap.set(overlay, {
            opacity: 0,
            visibility: 'visible',
            pointerEvents: 'auto',
            display: 'flex'
        });
        gsap.set(popup, {
            scale: 0.8,
            y: 50,
            opacity: 0
        });

        // Animate popup in
        const openTl = gsap.timeline();
        openTl.to(overlay, {
            opacity: 1,
            duration: 0.2,
            ease: "power2.out"
        })
            .to(popup, {
                scale: 1,
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: "back.out(1.2)"
            }, 0.1);

        closeBtn.focus();

        // Close handlers - removed again on close so reopening doesn't stack them
        const onOverlayClick = (e) => {
            if (e.target === overlay) closePopup();
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') closePopup();
        };

        const closePopup = () => {
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', handleEsc);
            opener?.focus();
            const closeTl = gsap.timeline();
            closeTl.to(popup, {
                scale: 0.8,
                y: 50,
                opacity: 0,
                duration: 0.3,
                ease: "back.in(1.2)"
            })
                .to(overlay, {
                    opacity: 0,
                    duration: 0.2,
                    ease: "power2.out",
                    onComplete: () => {
                        gsap.set(overlay, { visibility: 'hidden', pointerEvents: 'none' });
                    }
                }, 0.1);
        };

        closeBtn.addEventListener('click', closePopup);
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', handleEsc);
    }

    // Main initialization function
    function init() {
        // Nav entrance/hover animation is handled by shared.js (was duplicated here before)
        initServiceCardAnimations();
        initContactAnimations();
        initAboutSectionAnimations();
        initAboutAnimatedBackground();
        initSectionTracking();
        setupSlider();
        lazyLoad();
        setupInfiniteScroll();
        initShowcaseAnimations();
        initNewSectionAnimations();
        initTrendingCarousel();
    }

    // Make sure ScrollTrigger is refreshed when window is fully loaded
    window.addEventListener('load', () => {
        // Force refresh ScrollTrigger to fix parallax issues
        ScrollTrigger.refresh(true);
    });


    // Explore Card Animations ("What are you looking for?" grid) - the cards
    // are native <a> elements, so no click/keyboard shimming is needed here.
    function initServiceCardAnimations() {
        const exploreCards = document.querySelectorAll('.explore-card');

        if (exploreCards.length === 0) {
            return;
        }

        // GSAP Timeline for initial animations
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '#services',
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse'
            }
        });

        // Animate explore cards on scroll with stagger effect
        exploreCards.forEach((card, index) => {
            tl.fromTo(card,
                {
                    opacity: 0,
                    y: 60,
                    scale: 0.95
                },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.6,
                    ease: "power2.out"
                },
                index * 0.2 // Stagger delay
            );
        });
    }

    // Contact section animations
    function initContactAnimations() {
        // Handle phone card click to copy
        const phoneCard = document.querySelector('.contact-card[data-phone]');
        if (phoneCard) {
            const copyIndicator = phoneCard.querySelector('.copy-indicator');
            if (copyIndicator) {
                const originalText = copyIndicator.textContent;

                phoneCard.addEventListener('click', async () => {
                    const phone = phoneCard.dataset.phone;
                    try {
                        await navigator.clipboard.writeText(phone);

                        // Simple feedback without GSAP animation
                        copyIndicator.textContent = 'Дугаар хуулагдлаа!';
                        copyIndicator.style.opacity = '1';
                        copyIndicator.style.transform = 'translateY(0)';

                        // Reset after 2 seconds
                        setTimeout(() => {
                            copyIndicator.style.opacity = '0';
                            copyIndicator.style.transform = 'translateY(10px)';

                            // Reset text after fade out
                            setTimeout(() => {
                                copyIndicator.textContent = originalText;
                            }, 300);
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                    }
                });
            }
        }

        // Fix card animations - make them immediately visible
        const contactCards = document.querySelectorAll('.contact-card.small-card');

        if (contactCards.length) {
            // Make cards immediately visible instead of animating them in
            contactCards.forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) translateZ(0)';
                card.style.display = 'flex';
                card.style.visibility = 'visible';
                card.classList.add('card-visible');
            });

            // Optimized hover effects for cards and icons - faster and less laggy
            contactCards.forEach(card => {
                const icon = card.querySelector('.contact-icon');

                // Precompute the animation values
                const cardHoverProps = {
                    y: -5,
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)',
                    duration: 0.15, // Faster animation
                    ease: 'power1.out' // Simpler easing
                };

                const cardNormalProps = {
                    y: 0,
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
                    duration: 0.15, // Faster animation
                    ease: 'power1.out' // Simpler easing
                };

                const iconHoverProps = {
                    scale: 1.2,
                    opacity: 0.9,
                    duration: 0.15, // Faster animation
                    ease: 'power1.out' // Simpler easing
                };

                const iconNormalProps = {
                    scale: 1,
                    opacity: 1,
                    duration: 0.15, // Faster animation
                    ease: 'power1.out' // Simpler easing
                };

                // Add mouseenter event for card hover
                card.addEventListener('mouseenter', () => {
                    // Kill any ongoing animations to prevent lag
                    gsap.killTweensOf(card);
                    if (icon) gsap.killTweensOf(icon);

                    // Animate card and icon simultaneously
                    gsap.to(card, cardHoverProps);
                    if (icon) gsap.to(icon, iconHoverProps);
                });

                // Add mouseleave event
                card.addEventListener('mouseleave', () => {
                    // Kill any ongoing animations to prevent lag
                    gsap.killTweensOf(card);
                    if (icon) gsap.killTweensOf(icon);

                    // Animate card and icon simultaneously
                    gsap.to(card, cardNormalProps);
                    if (icon) gsap.to(icon, iconNormalProps);
                });
            });
        }
    }


    // About section animations - main content is handled by glass cards (initAboutAnimatedBackground)
    function initAboutSectionAnimations() {
        const aboutSection = document.querySelector('.about-section');
        if (!aboutSection) return;

        const statItems = aboutSection.querySelectorAll('.stat-item');

        gsap.set(statItems, { y: 20, opacity: 0 });
        statItems.forEach((stat, index) => {
            ScrollTrigger.create({
                trigger: stat,
                start: 'top bottom-=50',
                onEnter: () => {
                    gsap.to(stat, {
                        y: 0,
                        opacity: 1,
                        delay: index * 0.1,
                        duration: 0.6,
                        ease: 'power2.out'
                    });
                }
            });
        });
    }

    // Showcase sections (TD/Surgalt/Zuwluguu teasers) - simple fade/stagger on
    // scroll into view, matching the lighter IntersectionObserver-based
    // pattern used for TD's product grid rather than a heavy GSAP timeline.
    function initShowcaseAnimations() {
        const sections = document.querySelectorAll('.showcase-section');
        if (!sections.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const cards = entry.target.querySelectorAll('.teaser-card');
                gsap.fromTo(cards,
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
                );
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.15 });

        sections.forEach((section) => observer.observe(section));
    }

    // Reveal-on-scroll for the new homepage sections (same lightweight
    // IntersectionObserver + stagger-fade pattern as initShowcaseAnimations).
    function initNewSectionAnimations() {
        const groups = [
            { container: '.trending-carousel', items: '.trend-card' },
            { container: '.how-steps', items: '.how-step' },
        ];

        groups.forEach(({ container, items }) => {
            const el = document.querySelector(container);
            if (!el) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const cards = entry.target.querySelectorAll(items);
                    gsap.fromTo(cards,
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
                    );
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.15 });

            observer.observe(el);
        });
    }

    // Trending Now carousel: native scroll-snap track, JS only drives the
    // optional prev/next arrow buttons (touch/trackpad swipe works natively).
    function initTrendingCarousel() {
        const track = document.getElementById('trend-track');
        if (!track) return;

        const prevBtn = document.querySelector('.trend-nav.prev');
        const nextBtn = document.querySelector('.trend-nav.next');
        const scrollByCard = (direction) => {
            const card = track.querySelector('.trend-card');
            const step = card ? card.getBoundingClientRect().width + 20 : 280;
            track.scrollBy({ left: direction * step * 2, behavior: 'smooth' });
        };

        prevBtn?.addEventListener('click', () => scrollByCard(-1));
        nextBtn?.addEventListener('click', () => scrollByCard(1));
    }

    // About Section animated background and glass cards
    function initAboutAnimatedBackground() {
        const aboutSection = document.querySelector('#about');
        if (!aboutSection) return;

        const interactiveBubble = aboutSection.querySelector('.interactive');
        const glassCards = aboutSection.querySelectorAll('.glass-card');
        const sectionTitle = aboutSection.querySelector('h2');

        // Interactive mouse-following bubble effect
        if (interactiveBubble) {
            let curX = 0;
            let curY = 0;
            let tgX = 0;
            let tgY = 0;
            let rafId = null;

            function moveInteractiveBubble() {
                curX += (tgX - curX) / 20;
                curY += (tgY - curY) / 20;
                interactiveBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
                rafId = requestAnimationFrame(moveInteractiveBubble);
            }

            // Mouse move handler
            const handleMouseMove = (event) => {
                const rect = aboutSection.getBoundingClientRect();
                tgX = event.clientX - rect.left;
                tgY = event.clientY - rect.top;
            };

            // Only listen/animate while the section is on screen - otherwise this
            // rAF loop would run forever (every frame, for the rest of the page's
            // life) even after the user scrolls away, which is wasteful on any
            // device and especially costly on low-end ones.
            let isListening = false;
            const start = () => {
                if (isListening) return;
                aboutSection.addEventListener('mousemove', handleMouseMove);
                isListening = true;
                moveInteractiveBubble();
            };
            const stop = () => {
                if (!isListening) return;
                aboutSection.removeEventListener('mousemove', handleMouseMove);
                isListening = false;
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            };

            ScrollTrigger.create({
                trigger: aboutSection,
                start: 'top bottom',
                end: 'bottom top',
                onEnter: start,
                onLeave: stop,
                onEnterBack: start,
                onLeaveBack: stop
            });
        }

        // Title animation
        ScrollTrigger.create({
            trigger: sectionTitle,
            start: 'top bottom-=100',
            onEnter: () => {
                gsap.from(sectionTitle, {
                    y: 50,
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power2.out'
                });
            }
        });

        // Glass cards animation - Fix the frozen card issue
        glassCards.forEach((card, index) => {
            // Set initial hidden state
            gsap.set(card, {
                y: 60,
                opacity: 0,
                scale: 0.8
            });

            // Entrance animation
            ScrollTrigger.create({
                trigger: card,
                start: 'top bottom-=50',
                onEnter: () => {
                    gsap.to(card, {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.8,
                        delay: index * 0.2,
                        ease: 'back.out(1.7)'
                    });
                }
            });

            // Simple hover lift (previously: tilt + icon scale/rotate + staggered
            // highlight scale all firing at once - simplified for a calmer feel)
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    y: -6,
                    scale: 1.02,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    y: 0,
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            // Click animation
            card.addEventListener('click', () => {
                gsap.to(card, {
                    scale: 0.95,
                    duration: 0.1,
                    ease: 'power2.out',
                    onComplete: () => {
                        gsap.to(card, {
                            scale: 1,
                            duration: 0.3,
                            ease: 'back.out(1.7)'
                        });
                    }
                });
            });
        });
    }

    // Section tracking for navigation highlighting
    function initSectionTracking() {
        const sections = document.querySelectorAll('section[id]');
        const menuLinks = document.querySelectorAll('.main-menu a[href^="#"]');

        if (!sections.length || !menuLinks.length) return;

        // Clear any existing active states on page load
        menuLinks.forEach(link => {
            link.classList.remove('active-section');
            link.removeAttribute('data-active');
        });

        // Map menu buttons by their href
        const menuButtons = {};
        menuLinks.forEach(link => {
            menuButtons[link.getAttribute('href')] = link;
        });

        // Only create a ScrollTrigger for sections that actually have a matching
        // nav link (about/services/contact) - the homepage has many more
        // section ids than nav links (hero, trending, how-it-works, the three
        // showcases, portfolio), and creating+tracking a ScrollTrigger for each
        // of those on every scroll/resize for no visual effect is wasted work.
        const trackedSections = Array.from(sections).filter((section) => menuButtons['#' + section.id]);

        trackedSections.forEach(section => {
            const button = menuButtons['#' + section.id];
            ScrollTrigger.create({
                trigger: section,
                start: 'top center',
                end: 'bottom center',
                onToggle: ({ isActive }) => {
                    if (isActive) {
                        button.classList.add('active-section');
                        button.setAttribute('data-active', 'true');
                    } else {
                        button.classList.remove('active-section');
                        button.removeAttribute('data-active');
                    }
                }
            });
        });
    }

    // Hero slider functionality
    function setupSlider() {
        const sliderContainer = document.querySelector('.slider-container');
        if (!sliderContainer) return;

        const slides = document.querySelectorAll('.slide');
        const prevBtn = document.querySelector('.slider-nav.prev');
        const nextBtn = document.querySelector('.slider-nav.next');
        const indicators = document.querySelectorAll('.indicator');

        let currentIndex = 0;
        const totalSlides = slides.length;
        let autoplayInterval;
        const autoplayDelay = 7000; // Longer delay between transitions
        let isAnimating = false; // Prevent animation overlapping

        // Initialize indicators 
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                if (!isAnimating) goToSlide(index);
            });
        });

        // Add button event listeners
        prevBtn?.addEventListener('click', () => {
            if (!isAnimating) navigate(-1);
        });
        nextBtn?.addEventListener('click', () => {
            if (!isAnimating) navigate(1);
        });

        // Touch gesture support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;
        const minSwipeDistance = 50;

        sliderContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            setInteracting(true);
        }, { passive: true });

        sliderContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            // Only trigger swipe if horizontal movement is greater than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right - go to previous slide
                    if (!isAnimating) navigate(-1);
                } else {
                    // Swipe left - go to next slide  
                    if (!isAnimating) navigate(1);
                }
            }

            // Resume autoplay shortly after the touch interaction ends
            setTimeout(() => setInteracting(false), 2000);
        }, { passive: true });

        // Autoplay runs only when nobody is hovering, focusing or touching the
        // slider, the user hasn't paused it, and reduced motion isn't requested.
        const toggleBtn = sliderContainer.querySelector('.carousel-toggle');
        let userPaused = REDUCED_MOTION;
        let interacting = false;

        function syncAutoplay() {
            if (userPaused || interacting) stopAutoplay();
            else startAutoplay();
            if (toggleBtn) {
                toggleBtn.dataset.paused = String(userPaused);
                toggleBtn.setAttribute('aria-label', userPaused ? 'Слайдыг үргэлжлүүлэх' : 'Слайдыг зогсоох');
            }
        }

        function setInteracting(value) {
            interacting = value;
            syncAutoplay();
        }

        toggleBtn?.addEventListener('click', () => {
            userPaused = !userPaused;
            syncAutoplay();
        });
        sliderContainer.addEventListener('mouseenter', () => setInteracting(true));
        sliderContainer.addEventListener('mouseleave', () => setInteracting(false));
        sliderContainer.addEventListener('focusin', () => setInteracting(true));
        sliderContainer.addEventListener('focusout', (e) => {
            if (!sliderContainer.contains(e.relatedTarget)) setInteracting(false);
        });

        syncAutoplay();

        // Preload all images immediately for smoother transitions
        preloadAllImages();

        // Preload all slide images
        function preloadAllImages() {
            slides.forEach(slide => {
                const img = slide.querySelector('.slide-bg img');
                if (img && img.dataset.src) {
                    // Create a new image to preload
                    const preloadImg = new Image();
                    preloadImg.src = img.dataset.src;

                    // Once preloaded, update the actual image
                    preloadImg.onload = () => {
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                    };
                }
            });
        }

        // Update slide with optimized animation
        function updateSlide() {
            if (isAnimating) return;
            isAnimating = true;

            // Update indicators
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentIndex);
            });

            // Get current and previous slides
            const currentSlide = slides[currentIndex];
            const oldSlides = Array.from(slides).filter(s => s !== currentSlide);

            // Use requestAnimationFrame for smoother transitions
            requestAnimationFrame(() => {
                // Prepare the new slide
                gsap.set(currentSlide, {
                    zIndex: 2,
                    opacity: 0,
                    display: 'block'
                });

                // Add active class to enable CSS transitions
                currentSlide.classList.add('active');

                // Hide old slides immediately
                oldSlides.forEach(slide => {
                    slide.classList.remove('active');
                    gsap.set(slide, { opacity: 0, zIndex: 1 });
                });

                // Simple fade in of the new slide
                gsap.to(currentSlide, {
                    opacity: 1,
                    duration: 0.5, // Slightly faster for better responsiveness
                    ease: 'power1.out',
                    onComplete: () => {
                        isAnimating = false;
                    }
                });

                // Animate the content separately
                const content = currentSlide.querySelector('.slide-content');
                gsap.fromTo(content,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.5, delay: 0.1, ease: 'power2.out' }
                );
            });
        }

        // Navigate through slides
        function navigate(direction) {
            if (isAnimating) return;
            currentIndex = (currentIndex + direction + totalSlides) % totalSlides;
            updateSlide();
            resetAutoplay();
        }

        // Go to specific slide
        function goToSlide(index) {
            if (isAnimating || index === currentIndex) return;
            currentIndex = index;
            updateSlide();
            resetAutoplay();
        }

        // Autoplay functions
        function startAutoplay() {
            if (autoplayInterval) return;
            autoplayInterval = setInterval(() => {
                if (!isAnimating) navigate(1);
            }, autoplayDelay);
        }

        function stopAutoplay() {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
        }

        function resetAutoplay() {
            stopAutoplay();
            syncAutoplay();
        }

        // Initial slide setup
        updateSlide();
    }

    // Lazy loading images
    function lazyLoad() {
        const lazyImages = document.querySelectorAll("img.lazy-load");

        if (!lazyImages.length) return;

        const observerOptions = {
            root: null,
            rootMargin: "0px",
            threshold: 0.1
        };

        const handleIntersection = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;

                    if (src) {
                        img.src = src;
                        img.addEventListener('load', () => handleImageLoad(img));
                        observer.unobserve(img);
                    }
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);
        lazyImages.forEach(img => observer.observe(img));
    }

    // Image load handler
    function handleImageLoad(img) {
        img.classList.add('loaded');
        gsap.to(img, {
            opacity: 1,
            duration: 0.5,
            ease: 'power1.out'
        });
    }

    // Enhanced infinite scroll for comments with GSAP animations
    function setupInfiniteScroll() {
        const container = document.querySelector('.infinite-scroll-container');
        if (!container) return;

        const cards = container.querySelectorAll('.comment-card');
        if (cards.length < 2) return;

        // Clone cards for infinite scroll effect (limit to just a few for better performance).
        // Clones are purely visual: hidden from screen readers, skipped by Tab,
        // and stripped of ids so the originals' ids/aria references stay unique.
        const maxClones = Math.min(4, cards.length);
        for (let i = 0; i < maxClones; i++) {
            const clone = cards[i % cards.length].cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.setAttribute('tabindex', '-1');
            clone.removeAttribute('aria-labelledby');
            clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
            container.appendChild(clone);
        }

        // Add enhanced hover animations and click handlers for glass cards
        const allCards = container.querySelectorAll('.comment-card');
        allCards.forEach((card, index) => {
            const clientImage = card.querySelector('.client-image');

            // Enhanced hover animation with GSAP
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    scale: 1.02,
                    rotationY: 2,
                    duration: 0.3,
                    ease: "power2.out"
                });

                if (clientImage) {
                    gsap.to(clientImage, {
                        scale: 1.1,
                        rotation: 5,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    scale: 1,
                    rotationY: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });

                if (clientImage) {
                    gsap.to(clientImage, {
                        scale: 1,
                        rotation: 0,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            });

            // Open the popup on click, or Enter/Space for keyboard users
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                showCommentPopup(card);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                showCommentPopup(card);
            });
        });

        const scrollTween = gsap.to(container, {
            x: `-50%`,
            duration: cards.length * 10, // Slightly slower for better visibility
            ease: "linear", // Use linear for smoother scrolling
            repeat: -1,
            paused: true
        });

        // Plays only while the section is on screen, nobody is hovering or
        // focusing a card, the user hasn't paused it, and reduced motion isn't
        // requested (then it starts paused and the button can start it).
        const toggleBtn = document.querySelector('.marquee-toggle');
        let inView = false;
        let interacting = false;
        let userPaused = REDUCED_MOTION;

        function syncMarquee() {
            if (inView && !interacting && !userPaused) scrollTween.play();
            else scrollTween.pause();
            if (toggleBtn) {
                toggleBtn.dataset.paused = String(userPaused);
                toggleBtn.setAttribute('aria-label', userPaused ? 'Сэтгэгдлүүдийг гүйлгэх' : 'Сэтгэгдлүүдийг зогсоох');
            }
        }

        toggleBtn?.addEventListener('click', () => {
            userPaused = !userPaused;
            syncMarquee();
        });
        container.addEventListener('mouseenter', () => { interacting = true; syncMarquee(); });
        container.addEventListener('mouseleave', () => { interacting = false; syncMarquee(); });
        container.addEventListener('focusin', () => { interacting = true; syncMarquee(); });
        container.addEventListener('focusout', (e) => {
            if (!container.contains(e.relatedTarget)) { interacting = false; syncMarquee(); }
        });

        ScrollTrigger.create({
            trigger: "#portfolio",
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => { inView = self.isActive; syncMarquee(); }
        });
        syncMarquee();
    }
});

// Mobile menu functionality now handled by shared.js
// Contact form handling now lives in js/contact-form.js (shared across all pages)
