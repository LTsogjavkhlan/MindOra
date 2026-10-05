// Error handling for browser extensions
window.addEventListener('error', function (e) {
    if (e.message && e.message.includes('message channel closed')) {
        e.preventDefault();
        return false;
    }
});

window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.message && e.reason.message.includes('message channel closed')) {
        e.preventDefault();
        return false;
    }
});

// Wait for the CMS-driven product content to finish rendering
// (js/content-loader.js) before setting up the list section animations.
document.addEventListener("content:rendered", () => {
    initializeListSection();
});

// List Section Animations
function initializeListSection() {
    // Add GSAP animations for product cards in list section
    const productCards = document.querySelectorAll('.list-section .product-card');

    // Early return if no product cards found
    if (!productCards.length) {
        return;
    }

    // Function to animate cards in when they come into view
    const animateCardsIn = () => {
        productCards.forEach((card, index) => {
            gsap.fromTo(card,
                {
                    opacity: 0,
                    y: 50,
                    scale: 0.9
                },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: "power2.out"
                }
            );
        });
    };

    // Simplified hover animations for each card - only animate image
    productCards.forEach((card, index) => {
        card.addEventListener('mouseenter', function () {
            const image = this.querySelector('.product-image img');

            // Only animate the image since overlay and description are removed/always visible
            if (image) {
                gsap.to(image, {
                    scale: 1.1,
                    duration: 0.5,
                    ease: "power2.out"
                });
            }
        });

        card.addEventListener('mouseleave', function () {
            const image = this.querySelector('.product-image img');

            if (image) {
                gsap.to(image, {
                    scale: 1,
                    duration: 0.5,
                    ease: "power2.out"
                });
            }
        });
    });

    // Animate cards when they come into view using Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCardsIn();
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, {
        threshold: 0.1
    });

    const listSection = document.querySelector('.list-section');
    if (listSection) observer.observe(listSection);
}

// ========== IMAGE GALLERY FUNCTIONALITY ==========

// Initialize gallery functionality
function initializeGallery() {
    const galleryModal = document.getElementById('galleryModal');
    const galleryClose = document.getElementById('galleryClose');
    const galleryPrev = document.getElementById('galleryPrev');
    const galleryNext = document.getElementById('galleryNext');
    const mainImage = document.getElementById('mainImage');
    const imageCounter = document.getElementById('imageCounter');
    const galleryThumbnails = document.getElementById('galleryThumbnails');
    const galleryTitle = document.querySelector('.gallery-title');

    let currentGallery = [];
    let currentImageIndex = 0;
    let currentProductId = null;

    // Open gallery modal
    function openGallery(productId, productTitle) {
        // Products are rendered from MongoDB by js/content-loader.js, which
        // registers each one's image list on window.__productGalleries.
        currentGallery = (window.__productGalleries && window.__productGalleries[productId]) || [];
        currentProductId = productId;
        currentImageIndex = 0;

        if (currentGallery.length === 0) {
            console.warn('No gallery images found for:', productId);
            return;
        }

        // Update gallery title
        if (galleryTitle) {
            galleryTitle.textContent = productTitle ? `${productTitle} - Зургууд` : `Бүтээгдэхүүн ${productId.replace('product', '')} - Зургууд`;
        }

        // Show modal
        galleryModal.classList.add('active');
        galleryModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Focus management
        if (galleryClose) {
            galleryClose.focus();
        }

        // Load images
        updateMainImage();
        generateThumbnails();
    }

    // Update main image
    function updateMainImage() {
        const imageSrc = currentGallery[currentImageIndex];
        if (!imageSrc || !mainImage) return;

        // Add loading state
        mainImage.style.opacity = '0.5';

        // Create new image to preload
        const newImage = new Image();
        newImage.onload = () => {
            mainImage.src = imageSrc;
            mainImage.alt = `Product image ${currentImageIndex + 1} of ${currentGallery.length}`;
            mainImage.style.opacity = '1';
        };
        newImage.onerror = () => {
            console.warn('Failed to load image:', imageSrc);
            mainImage.style.opacity = '1';
        };
        newImage.src = imageSrc;

        if (imageCounter) {
            imageCounter.textContent = `${currentImageIndex + 1} / ${currentGallery.length}`;
        }
        updateThumbnailsActiveState();
    }

    // Generate thumbnails
    function generateThumbnails() {
        if (!galleryThumbnails) return;
        galleryThumbnails.innerHTML = '';

        currentGallery.forEach((imageSrc, index) => {
            const thumbnail = document.createElement('button');
            thumbnail.className = 'thumbnail';
            thumbnail.type = 'button';
            thumbnail.setAttribute('aria-label', `View image ${index + 1}`);

            if (index === 0) thumbnail.classList.add('active');

            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = `Thumbnail ${index + 1}`;
            img.loading = 'lazy';

            // Error handling for thumbnails
            img.onerror = () => {
                console.warn('Failed to load thumbnail:', imageSrc);
                thumbnail.style.display = 'none';
            };

            thumbnail.appendChild(img);
            thumbnail.addEventListener('click', () => {
                currentImageIndex = index;
                updateMainImage();
            });

            // Keyboard support
            thumbnail.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    currentImageIndex = index;
                    updateMainImage();
                }
            });

            galleryThumbnails.appendChild(thumbnail);
        });
    }

    // Update active thumbnail
    function updateThumbnailsActiveState() {
        const thumbnails = galleryThumbnails.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb, index) => {
            if (index === currentImageIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // Navigation functions
    function nextImage() {
        currentImageIndex = (currentImageIndex + 1) % currentGallery.length;
        updateMainImage();
    }

    function prevImage() {
        currentImageIndex = (currentImageIndex - 1 + currentGallery.length) % currentGallery.length;
        updateMainImage();
    }

    // Close gallery modal
    function closeGallery() {
        galleryModal.classList.remove('active');
        galleryModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        // Return focus to trigger element
        const activeProductImage = document.querySelector(`.product-image[data-product="${currentProductId}"]`);
        if (activeProductImage) {
            activeProductImage.focus();
        }
    }

    // Event listeners
    if (galleryClose) {
        galleryClose.addEventListener('click', closeGallery);
    }

    if (galleryNext) {
        galleryNext.addEventListener('click', nextImage);
    }

    if (galleryPrev) {
        galleryPrev.addEventListener('click', prevImage);
    }

    // Close on background click
    if (galleryModal) {
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) {
                closeGallery();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!galleryModal.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                closeGallery();
                break;
            case 'ArrowLeft':
                prevImage();
                break;
            case 'ArrowRight':
                nextImage();
                break;
        }
    });

    // Reads the product title from the surrounding .product-card.
    function getProductTitle(imageContainer) {
        const card = imageContainer.closest('.product-card');
        return card ? card.querySelector('.product-title')?.textContent.trim() : null;
    }

    // Delegate click/keyboard handling from a stable ancestor instead of
    // binding to each .product-image individually - this way it keeps
    // working even for cards the CMS renders after this function runs.
    document.addEventListener('click', (e) => {
        const imageContainer = e.target.closest('.product-image[data-product]');
        if (!imageContainer) return;
        const productId = imageContainer.getAttribute('data-product');
        if (!productId) return;
        e.preventDefault();
        e.stopPropagation();
        openGallery(productId, getProductTitle(imageContainer));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const imageContainer = e.target.closest('.product-image[data-product]');
        if (!imageContainer) return;
        const productId = imageContainer.getAttribute('data-product');
        if (!productId) return;
        e.preventDefault();
        e.stopPropagation();
        openGallery(productId, getProductTitle(imageContainer));
    });
}

// Initialize gallery functionality once the CMS-rendered products are in place.
document.addEventListener('content:rendered', initializeGallery);