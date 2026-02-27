// Product Data
const products = [
    {
        id: 1,
        name: "Fresh Cow Milk",
        desc: "Pure, chilled cow milk direct from the farm.",
        price: 65,
        unit: "L",
        image: "assets/milk.jpg"
    },
    {
        id: 2,
        name: "Fresh Buffalo Milk",
        desc: "Thick and creamy buffalo milk for better health.",
        price: 85,
        unit: "L",
        image: "assets/buffalo_milk.jpg"
    },
    {
        id: 3,
        name: "Pure Cow Ghee",
        desc: "Traditional handmade ghee with rich aroma.",
        price: 650,
        unit: "500ml",
        image: "assets/ghee.jpg"
    },
    {
        id: 4,
        name: "Fresh Farm Curd",
        desc: "Natural, thick set curd made daily.",
        price: 40,
        unit: "500g",
        image: "assets/curd.jpg"
    },
    {
        id: 5,
        name: "Soft Fresh Paneer",
        desc: "Hygenic and soft paneer made from pure milk.",
        price: 120,
        unit: "200g",
        image: "assets/paneer.jpg"
    }
];

let cart = JSON.parse(localStorage.getItem('milkCart')) || [];

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartToggle = document.getElementById('cartToggle');
const cartModal = document.getElementById('cartModal');
const closeCart = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalValue = document.getElementById('cartTotalValue');
const cartCount = document.querySelector('.cart-count');
const orderForm = document.getElementById('orderForm');
const successOverlay = document.getElementById('successOverlay');
const navbar = document.querySelector('.navbar');

// Initialize Products
function initProducts() {
    productGrid.innerHTML = products.map(product => `
        <div class="product-card" data-aos="fade-up">
            <div class="product-img">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.desc}</p>
                <p class="product-price">₹${product.price} / ${product.unit}</p>
                <div class="product-controls">
                    <select class="qty-select" id="qty-${product.id}">
                        <option value="1">1 Unit</option>
                        <option value="2">2 Units</option>
                        <option value="3">3 Units</option>
                        <option value="4">4 Units</option>
                        <option value="5">5 Units</option>
                    </select>
                    <button class="btn btn-primary" onclick="addToCart(${product.id})">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Cart Functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const qty = parseInt(document.getElementById(`qty-${productId}`).value);

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({ ...product, qty });
    }

    updateCart();
    saveCart();

    // Animation feedback
    cartToggle.classList.add('bump');
    setTimeout(() => cartToggle.classList.remove('bump'), 300);
}

function updateCart() {
    cartCount.innerText = cart.reduce((total, item) => total + item.qty, 0);

    cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} x ${item.qty}</p>
            </div>
            <i class="fas fa-trash" onclick="removeFromCart(${index})"></i>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    cartTotalValue.innerText = `₹${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
    saveCart();
}

function saveCart() {
    localStorage.setItem('milkCart', JSON.stringify(cart));
}

// UI Handlers
cartToggle.addEventListener('click', () => {
    cartModal.classList.add('open');
});

closeCart.addEventListener('click', () => {
    cartModal.classList.remove('open');
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Form Handling
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'Processing...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(orderForm);

        const customer_name = formData.get('name').trim();
        const phone_number = formData.get('phone').trim();
        const address = formData.get('address').trim();

        // Format product names and calculate totals
        const product_name = cart.map(item => `${item.qty}x ${item.name}`).join(', ');
        const quantity = cart.reduce((sum, item) => sum + item.qty, 0);
        const total_price = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        // Insert into Supabase
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([
                {
                    customer_name,
                    phone_number,
                    address,
                    product_name,
                    quantity,
                    total_price
                }
            ])
            .select();

        if (error) throw error;

        // Show Success with Order ID
        const orderIdSpan = document.getElementById('generatedOrderId');
        if (orderIdSpan && data && data.length > 0) {
            orderIdSpan.textContent = data[0].id.substring(0, 8).toUpperCase();
        }

        successOverlay.style.display = 'flex';

        // Clear cart and form
        cart = [];
        updateCart();
        saveCart();
        cartModal.classList.remove('open');
        orderForm.reset();

    } catch (error) {
        console.error("Order error:", error.message);
        alert("Failed to place order. " + error.message);
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
});

function closeSuccess() {
    successOverlay.style.display = 'none';
}

// Set min date for delivery to today
const dateInput = document.getElementById('deliveryDate');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    dateInput.value = today;
}

// Mobile Menu
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    // Simple toggle for mobile view
    if (navLinks.classList.contains('active')) {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = '#fff';
        navLinks.style.padding = '20px';
        navLinks.style.boxShadow = '0 10px 10px rgba(0,0,0,0.1)';
    } else {
        navLinks.style.display = 'none';
    }
});

// Initialize
initProducts();
updateCart();
// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered!'))
            .catch(err => console.log('Service Worker registration failed', err));
    });
}

// PWA Install Logic
let deferredPrompt;
const pwaBanner = document.getElementById('pwaInstallBanner');
const installBtn = document.getElementById('installPwa');
const closePwa = document.getElementById('closePwa');
const pwaText = document.querySelector('.pwa-text p');

// Helper to check if mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

// Show banner proactively on mobile after delay
window.addEventListener('load', () => {
    if (isMobile && !isInStandaloneMode && !localStorage.getItem('pwaDismissed')) {
        setTimeout(() => {
            if (pwaBanner) {
                pwaBanner.style.display = 'flex';
                // Customize text for iOS users
                if (isIOS) {
                    if (pwaText) pwaText.innerHTML = 'Install as App: Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>';
                    if (installBtn) installBtn.style.display = 'none';
                }
            }
        }, 3000); // 3-second delay so user can see the hero first
    }
});

// Capture Chrome's install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Banner is already handled by the load event proactively, 
    // but we stash the prompt event for the Install button.
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
        if (pwaBanner) pwaBanner.style.display = 'none';
        localStorage.setItem('pwaDismissed', 'true');
    });
}

if (closePwa) {
    closePwa.addEventListener('click', () => {
        if (pwaBanner) pwaBanner.style.display = 'none';
        localStorage.setItem('pwaDismissed', 'true'); // Don't show again once closed
    });
}
