const EMAILJS_CONFIG = {
    publicKey: "N6Jpe3EHbc8X7xHdi",
    serviceId: "service_q4du29b",
    templateId: "template_uomk2zy"
};
const EMAILJS_CDN_FALLBACKS = [
    "https://unpkg.com/@emailjs/browser@3/dist/email.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/emailjs-com/3.2.0/email.min.js"
];
let emailJsLoadPromise = null;

function isEmailJsReady() {
    return typeof window.emailjs !== 'undefined'
        && typeof window.emailjs.init === 'function'
        && typeof window.emailjs.send === 'function';
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

async function ensureEmailJsReady() {
    if (isEmailJsReady()) return true;
    if (emailJsLoadPromise) return emailJsLoadPromise;

    emailJsLoadPromise = (async () => {
        for (const src of EMAILJS_CDN_FALLBACKS) {
            try {
                await loadScript(src);
                if (isEmailJsReady()) {
                    window.emailjs.init(EMAILJS_CONFIG.publicKey);
                    return true;
                }
            } catch (error) {
                console.warn('EmailJS fallback load failed:', error.message);
            }
        }
        return false;
    })();

    return emailJsLoadPromise;
}

// Initialize EmailJS (only when DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    if (isEmailJsReady()) {
        window.emailjs.init(EMAILJS_CONFIG.publicKey);
    }
});

// State
let cart = [];
let currentCategory = 'all';
let currentSearchTerm = '';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const categoryList = document.getElementById('categoryList');
const bestSellerGrid = document.getElementById('bestSellerGrid');
const allProductsGrid = document.getElementById('allProductsGrid');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartModal = document.getElementById('cartModal');
const cartItems = document.getElementById('cartItems');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');
const successModal = document.getElementById('successModal');
const closeCartBtn = document.getElementById('closeCartBtn');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const okBtn = document.getElementById('okBtn');
const notification = document.getElementById('notification');

// Event Listeners
searchInput.addEventListener('input', handleSearch);
categoryList.addEventListener('click', handleCategoryChange);
cartBtn.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
checkoutBtn.addEventListener('click', openCheckout);
closeCheckoutBtn.addEventListener('click', closeCheckout);
checkoutForm.addEventListener('submit', handleCheckout);
okBtn.addEventListener('click', resetAndClose);

// Initialize
if (typeof musicData === 'undefined') {
    bestSellerGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 3rem;">⚠️ Error: data.js not loaded</p>';
    allProductsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red; padding: 3rem;">⚠️ Error: data.js not loaded</p>';
} else {
    renderProducts();
}

// Functions
function filterProducts() {
    let filtered = musicData;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(song => song.category === currentCategory);
    }

    if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(song =>
            song.title.toLowerCase().includes(term) ||
            song.artist.toLowerCase().includes(term)
        );
    }

    return filtered;
}

function renderProducts() {
    const filtered = filterProducts();

    // Best Seller
    const bestSellers = filtered.filter(song => song.isBestSeller);
    bestSellerGrid.innerHTML = bestSellers.length > 0
        ? bestSellers.map((song, i) => createProductCard(song, i)).join('')
        : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">No songs found</p>';

    // All Products
    allProductsGrid.innerHTML = filtered.length > 0
        ? filtered.map((song, i) => createProductCard(song, i + 100)).join('')
        : '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">No songs found</p>';

    attachProductListeners();
}

function createProductCard(song, index) {
    return `
        <div class="product-card" data-song-id="${song.id}" style="animation-delay: ${index * 0.05}s;">
            <div class="product-cover" style="background-image: url('${song.image}'); background-size: cover; background-position: center;">
                <div class="play-button" data-song-id="${song.id}">▶️</div>
            </div>
            <div class="product-info">
                <div>
                    <div class="product-title">${song.title}</div>
                    <div class="product-artist">${song.artist}</div>
                    <div class="product-price">${formatPrice(song.price)}</div>
                </div>
                <div class="product-actions">
                    <button class="btn-add-cart" data-song-id="${song.id}">Add to Cart</button>
                    <button class="btn-wishlist" data-song-id="${song.id}">❤️</button>
                </div>
            </div>
        </div>
    `;
}

function attachProductListeners() {
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const songId = parseInt(btn.dataset.songId);
            addToCart(songId);
            showNotification(`Added to cart!`);
        });
    });

    document.querySelectorAll('.play-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            playPreview(btn);
        });
    });

    document.querySelectorAll('.btn-wishlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isLiked = btn.textContent === '❤️';
            btn.textContent = isLiked ? '🤍' : '❤️';
            showNotification(isLiked ? 'Removed from favorites' : 'Added to favorites');
        });
    });
}

function handleSearch(e) {
    currentSearchTerm = e.target.value;
    renderProducts();
}

function handleCategoryChange(e) {
    if (e.target.classList.contains('category-btn')) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderProducts();
    }
}

function addToCart(songId) {
    const song = musicData.find(s => s.id === songId);
    if (!song) return;

    const existingItem = cart.find(item => item.id === songId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...song, quantity: 1 });
    }

    updateCart();
}

function updateCart() {
    cartCount.textContent = cart.length;
    cartCount.classList.toggle('show', cart.length > 0);
    renderCartItems();
}

function renderCartItems() {
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <p class="empty-cart">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Your cart is empty
            </p>
        `;
        checkoutBtn.disabled = true;
        document.getElementById('subtotal').textContent = formatPrice(0);
        document.getElementById('total').textContent = formatPrice(0);
        return;
    }

    checkoutBtn.disabled = false;

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-cover">${item.emoji}</div>
            <div class="cart-item-info">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-artist">${item.artist}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" data-index="${index}" data-action="decrease">−</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" data-index="${index}" data-action="increase">+</button>
                <button class="remove-btn" data-index="${index}">✕</button>
            </div>
        </div>
    `).join('');

    cartItems.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const action = btn.dataset.action;
            if (action === 'increase') {
                cart[index].quantity += 1;
                updateCart();
            } else if (action === 'decrease') {
                if (cart[index].quantity > 1) {
                    cart[index].quantity -= 1;
                    updateCart();
                } else {
                    cart.splice(index, 1);
                    updateCart();
                }
            }
        });
    });

    cartItems.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            cart.splice(index, 1);
            updateCart();
        });
    });

    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('subtotal').textContent = formatPrice(subtotal);
    document.getElementById('total').textContent = formatPrice(subtotal);
}

function openCart() {
    cartModal.classList.add('active');
}

function closeCart() {
    cartModal.classList.remove('active');
}

function openCheckout() {
    closeCart();
    renderCheckoutItems();
    generateQRCode();
    checkoutModal.classList.add('active');
}

function closeCheckout() {
    checkoutModal.classList.remove('active');
}

function renderCheckoutItems() {
    const checkoutItems = document.getElementById('checkoutItems');
    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span class="checkout-item-title">${item.title} - ${item.artist}</span>
            <span class="checkout-item-qty">×${item.quantity}</span>
            <span class="checkout-item-price">${formatPrice(item.price * item.quantity)}</span>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutTotal').textContent = formatPrice(total);
}

function generateQRCode() {
    const qrContainer = document.getElementById('qrCode');
    qrContainer.innerHTML = `<img src="images/qr.jpg" alt="Payment QR Code">`;
}

async function handleCheckout(e) {
    e.preventDefault();

    let name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value;
    const email = document.getElementById('customerEmail').value;
    const transactionId = document.getElementById('transactionId').value;

    // If name is empty, use default
    if (!name) {
        name = 'Customer';
    }

    if (!phone || !email || !transactionId) {
        showNotification('Please fill in Phone, Email, and Transaction ID', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Invalid email address', 'error');
        return;
    }

    const phoneRegex = /^[0-9]{10,}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        showNotification('Phone must be at least 10 digits', 'error');
        return;
    }

    // Prepare email data
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItems = cart.map(item => `${item.title} (${item.artist}) x${item.quantity} - ${formatPrice(item.price * item.quantity)}`).join('\n');

    // Send email using EmailJS (with clear status feedback)
    const emailJsReady = await ensureEmailJsReady();
    if (emailJsReady) {
        const emailParams = {
            to_email: email,
            name: name,
            customer_name: name,
            customer_phone: phone,
            transaction_id: transactionId,
            order_items: cartItems,
            order_total: formatPrice(total),
            message: `Cảm ơn bạn đã mua hàng! File nhạc sẽ được gửi trong 24 giờ.`,
            email: email
        };

        console.log('📧 Sending email with params:', emailParams);
        window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, emailParams)
            .then(response => {
                console.log('✅ Email sent successfully to:', email, response);
                showSuccess(name, email, true);
            })
            .catch(error => {
                console.error('❌ Email send FAILED:', error);
                console.error('Error text:', error.text);
                console.error('Params sent:', emailParams);
                const errorDetail = error?.text || error?.message || 'Unknown EmailJS error';
                showSuccess(name, email, false, errorDetail);
            });
    } else {
        console.log('EmailJS not available');
        showSuccess(name, email, false, 'EmailJS library not loaded');
    }
}

function showSuccess(name, email, emailSent = true, emailErrorDetail = '') {
    closeCheckout();
    const errorText = emailErrorDetail ? ` (${emailErrorDetail})` : '';
    const successMessage = emailSent
        ? `Thank you, ${name}! Your music files will be sent to ${email} within 24 hours.`
        : `Thank you, ${name}! Order is confirmed, but we could not send confirmation email to ${email} right now${errorText}. Please check your EmailJS config/network and try again.`;

    document.getElementById('successMessage').textContent = successMessage;
    successModal.classList.add('active');
    checkoutForm.reset();

    if (emailSent) {
        showNotification('✅ Order confirmed! Email sent successfully.', 'success');
    } else {
        showNotification(`⚠️ Email send failed${errorText}`, 'error');
    }
}

function resetAndClose() {
    successModal.classList.remove('active');
    cart = [];
    updateCart();
    currentCategory = 'all';
    currentSearchTerm = '';
    searchInput.value = '';
    renderProducts();
    document.querySelector('[data-category="all"]').classList.add('active');
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(price);
}

// Global variable to track currently playing audio
let currentAudio = null;
let currentButton = null;

function playPreview(button) {
    const songId = parseInt(button.dataset.songId);
    const song = musicData.find(s => s.id === songId);

    if (!song || !song.audio) {
        showNotification('Audio preview not available', 'error');
        return;
    }

    // If clicking the same button that's playing - pause it
    if (currentButton === button && currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        button.textContent = '▶️';
        button.style.background = '';
        return;
    }

    // If clicking the same button that's paused - resume it
    if (currentButton === button && currentAudio && currentAudio.paused) {
        currentAudio.play();
        button.textContent = '⏸️';
        button.style.background = 'rgba(255, 255, 255, 0.9)';
        return;
    }

    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    // Reset previous button
    if (currentButton && currentButton !== button) {
        currentButton.textContent = '▶️';
        currentButton.style.background = '';
    }

    // Create and play new audio
    const audio = document.createElement('audio');
    audio.src = song.audio;
    audio.volume = 0.5;

    currentAudio = audio;
    currentButton = button;

    // Visual feedback
    button.textContent = '⏸️';
    button.style.background = 'rgba(255, 255, 255, 0.9)';

    audio.addEventListener('ended', () => {
        button.textContent = '▶️';
        button.style.background = '';
        currentAudio = null;
        currentButton = null;
    });

    audio.addEventListener('error', () => {
        showNotification('Failed to load audio', 'error');
        button.textContent = '▶️';
        button.style.background = '';
        currentAudio = null;
        currentButton = null;
    });

    audio.play().catch(err => {
        console.log('Playback error:', err);
        showNotification('Playback error - check browser audio settings', 'error');
        button.textContent = '▶️';
        button.style.background = '';
        currentAudio = null;
        currentButton = null;
    });
}

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === cartModal) closeCart();
    if (e.target === checkoutModal) closeCheckout();
    if (e.target === successModal) resetAndClose();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCart();
        closeCheckout();
        successModal.classList.remove('active');
    }
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
