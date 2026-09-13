/**
 * BLUE CART SHOPPING - MULTI-PAGE & RESELLER LOGIC
 */

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const client = (SUPABASE_URL.startsWith("http") && !SUPABASE_URL.includes("YOUR_PROJECT"))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const state = {
  currentPage: 'home',
  user: null,
  cart: JSON.parse(localStorage.getItem('bluecart_cart') || '[]'),
  referralCode: localStorage.getItem('bluecart_ref') || 'BCS-8821',
  customerSellingPrice: null, // Holds the price passed via WhatsApp link
  isCustomerMode: false,
  products: [
    {
      id: 'p101',
      name: 'Pure Cotton Printed Anarkali Kurti',
      category: 'Women',
      base_price: 299,
      mrp: 899,
      default_reseller_profit: 100,
      images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'],
      description: 'Pure breathable cotton fabric with rich gold foil ethnic print. Machine washable, skin-friendly, Cash On Delivery available across India.'
    },
    {
      id: 'p102',
      name: 'Wireless Bluetooth Earbuds Pro (36hr Playtime)',
      category: 'Electronics',
      base_price: 399,
      mrp: 1499,
      default_reseller_profit: 150,
      images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600'],
      description: 'Deep Bass HD sound, IPX5 water resistant, Type-C fast charging, Touch sensors with voice assistant support.'
    },
    {
      id: 'p103',
      name: 'Men Premium Regular Fit Casual Shirt',
      category: 'Men',
      base_price: 349,
      mrp: 999,
      default_reseller_profit: 120,
      images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600'],
      description: 'Soft-washed premium chambray cotton. Regular fit tailored with button-down collar and curved hem.'
    },
    {
      id: 'p104',
      name: 'Insulated Hot & Cold Water Bottle (1000ml)',
      category: 'Home',
      base_price: 199,
      mrp: 599,
      default_reseller_profit: 80,
      images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600'],
      description: 'Double-wall stainless steel vacuum flask. Keeps beverages chilled for 24 hrs and piping hot for 12 hrs.'
    }
  ],
  orders: JSON.parse(localStorage.getItem('bluecart_orders') || '[]'),
  selectedProduct: null
};

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// 1. ROUTING SYSTEM (Back/Forward Button & URL Query Aware)
function navigateTo(pageName, params = {}, pushHistory = true) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageName}`);

  if (target) {
    target.classList.add('active');
    state.currentPage = pageName;
    window.scrollTo(0, 0);

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-page') === pageName);
    });

    const query = new URLSearchParams(params);
    query.set('page', pageName);
    const newUrl = `${window.location.pathname}?${query.toString()}`;

    if (pushHistory) {
      window.history.pushState({ page: pageName, params }, '', newUrl);
    }

    if (pageName === 'home') {
      document.title = "Blue Cart | Wholesale Reseller Shopping";
      renderHomeProducts(state.products);
    } else if (pageName === 'product') {
      const productId = params.id || (state.selectedProduct ? state.selectedProduct.id : state.products[0].id);
      loadProductDetailPage(productId, params.sp, params.ref);
    } else if (pageName === 'cart') {
      document.title = "Blue Cart | Reseller Cart";
      renderCartPage();
    } else if (pageName === 'checkout') {
      document.title = "Blue Cart | Customer Address";
      setupCheckoutSummary();
    } else if (pageName === 'reseller-dashboard') {
      document.title = "Blue Cart | Reseller Portal";
      renderResellerDashboard();
    } else if (pageName === 'reseller-wallet') {
      document.title = "Blue Cart | Earnings & Wallet";
      renderWalletPage();
    } else if (pageName === 'admin') {
      document.title = "Blue Cart | Admin Order Management";
      renderAdminOrdersTable();
    }
  }
}

function navigateBack() {
  window.history.back();
}

window.onpopstate = (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page') || 'home';
  const id = urlParams.get('id');
  const sp = urlParams.get('sp');
  const ref = urlParams.get('ref');
  navigateTo(page, { id, sp, ref }, false);
};

// 2. HOME CATALOG
function renderHomeProducts(productList) {
  const grid = document.getElementById('home-products-grid');
  grid.innerHTML = productList.map(p => {
    const defaultSelling = Number(p.base_price) + Number(p.default_reseller_profit);
    return `
      <div class="card product-card">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
        <div class="product-card-body">
          <span class="profit-badge">Reseller Margin: ₹${p.default_reseller_profit}</span>
          <div class="product-title">${p.name}</div>
          <div class="price-row">
            <span class="selling-price">₹${defaultSelling}</span>
            <span class="mrp-price">₹${p.mrp}</span>
          </div>
          <button class="btn btn-primary btn-sm btn-block" style="margin-top:auto;" onclick="navigateTo('product', { id: '${p.id}' })">
            Set Price & Share
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filterCategory(cat) {
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.classList.toggle('active', pill.innerText.includes(cat));
  });
  renderHomeProducts(cat === 'All' ? state.products : state.products.filter(p => p.category === cat));
}

function handleGlobalSearch(e) {
  const q = e.target.value.toLowerCase().trim();
  renderHomeProducts(state.products.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
}

// 3. PRODUCT DETAIL & RESELLER VS CUSTOMER MODE
function loadProductDetailPage(productId, customSellingPrice, referralCode) {
  const p = state.products.find(item => item.id === productId) || state.products[0];
  state.selectedProduct = p;

  if (referralCode) {
    state.referralCode = referralCode;
    localStorage.setItem('bluecart_ref', referralCode);
  }

  document.getElementById('detail-product-img').src = p.images[0];
  document.getElementById('detail-product-cat').innerText = p.category;
  document.getElementById('detail-product-name').innerText = p.name;
  document.getElementById('detail-product-mrp').innerText = `MRP: ₹${p.mrp}`;
  document.getElementById('detail-product-desc').innerText = p.description;

  const basePrice = Number(p.base_price);

  // CUSTOMER VIEW DETECTION: If 'sp' is present in URL
  if (customSellingPrice) {
    state.isCustomerMode = true;
    state.customerSellingPrice = Number(customSellingPrice);

    // Hide Base price & Profit Calculator completely
    document.getElementById('reseller-profit-calc-box').style.display = 'none';
    document.getElementById('reseller-action-btns').style.display = 'none';

    // Show Customer COD purchase button with Reseller's Price
    document.getElementById('customer-buy-box').style.display = 'block';
    document.getElementById('cust-discount-tag').style.display = 'inline-block';
    document.getElementById('detail-product-selling').innerText = `₹${state.customerSellingPrice}`;
    document.getElementById('btn-cust-price').innerText = state.customerSellingPrice;
    document.getElementById('app-badge-role').innerText = "CUSTOMER STORE";

    document.title = `${p.name} - Special Offer ₹${state.customerSellingPrice}`;
  } else {
    // RESELLER VIEW: Show Base price, Calculator & WhatsApp Share
    state.isCustomerMode = false;
    document.getElementById('reseller-profit-calc-box').style.display = 'block';
    document.getElementById('reseller-action-btns').style.display = 'grid';
    document.getElementById('customer-buy-box').style.display = 'none';
    document.getElementById('cust-discount-tag').style.display = 'none';
    document.getElementById('app-badge-role').innerText = "RESELLER";

    const defaultSelling = basePrice + Number(p.default_reseller_profit);
    document.getElementById('calc-base-display').innerText = `₹${basePrice}`;
    
    const sellingInput = document.getElementById('calc-selling-input');
    sellingInput.value = defaultSelling;

    function updateLiveProfit() {
      const sp = Number(sellingInput.value);
      const profit = sp - basePrice;
      document.getElementById('calc-profit-display').innerText = `₹${profit}`;
      document.getElementById('detail-product-selling').innerText = `Selling: ₹${sp}`;
    }
    sellingInput.oninput = updateLiveProfit;
    updateLiveProfit();
  }
}

// 4. WHATSAPP PHOTO + DETAILS + CUSTOM SELLING PRICE SHARING
async function shareProductWhatsApp() {
  const p = state.selectedProduct;
  const customSellingPrice = document.getElementById('calc-selling-input').value;
  const ref = state.referralCode;

  // Generate share link that locks this exact selling price for the customer!
  const shareLink = `${window.location.origin}${window.location.pathname}?page=product&id=${p.id}&sp=${customSellingPrice}&ref=${ref}`;

  const shareText = `🔥 Special Offer: *${p.name}*\n\n💰 Price: *₹${customSellingPrice}* (Inclusive of all taxes)\n🚚 Fast Home Delivery (Cash on Delivery Available)\n\n👉 Order directly here:\n${shareLink}`;

  // Check if browser/mobile supports sharing images directly via Web Share API
  if (navigator.canShare && navigator.share) {
    try {
      showToast('Preparing image for WhatsApp...', 'info');
      // Fetch product photo as blob/file
      const response = await fetch(p.images[0]);
      const blob = await response.blob();
      const imageFile = new File([blob], `${p.id}-photo.jpg`, { type: blob.type });

      if (navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          files: [imageFile],
          title: p.name,
          text: shareText
        });
        showToast('Shared successfully!', 'success');
        return;
      }
    } catch (err) {
      console.warn('Native image share fallback:', err);
    }
  }

  // Fallback: Open WhatsApp with product details, direct customer price, and photo preview URL
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + `\n\n📸 Product Photo: ${p.images[0]}`)}`;
  window.open(waUrl, '_blank');
}

// 5. CUSTOMER DIRECT COD CHECKOUT
function customerDirectBuyNow() {
  const p = state.selectedProduct;
  const sp = state.customerSellingPrice;
  const profit = sp - Number(p.base_price);

  state.cart = [{
    id: p.id,
    name: p.name,
    image: p.images[0],
    base_price: Number(p.base_price),
    selling_price: sp,
    profit: profit,
    quantity: 1
  }];
  localStorage.setItem('bluecart_cart', JSON.stringify(state.cart));
  updateCartBadges();

  navigateTo('checkout');
}

// 6. CART LOGIC
function addProductToCartFromDetail() {
  const p = state.selectedProduct;
  const sp = Number(document.getElementById('calc-selling-input').value);
  const base = Number(p.base_price);
  const profit = sp - base;

  if (profit < 10) {
    showToast('Margin must be at least ₹10', 'error');
    return;
  }

  state.cart.push({
    id: p.id,
    name: p.name,
    image: p.images[0],
    base_price: base,
    selling_price: sp,
    profit: profit,
    quantity: 1
  });

  localStorage.setItem('bluecart_cart', JSON.stringify(state.cart));
  updateCartBadges();
  showToast('Added to cart with your custom price!', 'success');
}

function renderCartPage() {
  const container = document.getElementById('cart-items-container');
  const summaryBox = document.getElementById('cart-summary-box');

  if (state.cart.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding: 40px 16px;"><p>Cart is empty.</p><button class="btn btn-primary" onclick="navigateTo('home')" style="margin-top:10px;">Browse Catalog</button></div>`;
    summaryBox.style.display = 'none';
    return;
  }

  summaryBox.style.display = 'block';
  let totalSelling = 0, totalBase = 0, totalProfit = 0;

  container.innerHTML = state.cart.map((item, idx) => {
    totalSelling += (item.selling_price * item.quantity);
    totalBase += (item.base_price * item.quantity);
    totalProfit += (item.profit * item.quantity);

    return `
      <div class="card" style="display:flex; flex-direction:row; padding:12px; gap:12px; align-items:center; margin-bottom:10px;">
        <img src="${item.image}" style="width:65px; height:65px; border-radius:8px; object-fit:cover;" />
        <div style="flex:1;">
          <div style="font-weight:700; font-size:0.85rem;">${item.name}</div>
          <div style="font-size:0.8rem; color:var(--muted);">Collect: ₹${item.selling_price}</div>
          <div style="font-size:0.8rem; color:var(--success); font-weight:700;">Margin: ₹${item.profit * item.quantity}</div>
        </div>
        <button onclick="removeCartItem(${idx})" class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger);"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join('');

  document.getElementById('cart-total-selling').innerText = `₹${totalSelling}`;
  document.getElementById('cart-total-base').innerText = `₹${totalBase}`;
  document.getElementById('cart-total-profit').innerText = `₹${totalProfit}`;
}

function removeCartItem(idx) {
  state.cart.splice(idx, 1);
  localStorage.setItem('bluecart_cart', JSON.stringify(state.cart));
  updateCartBadges();
  renderCartPage();
}

function updateCartBadges() {
  const count = state.cart.reduce((s, i) => s + (i.quantity || 1), 0);
  document.querySelectorAll('.cart-badge-count').forEach(b => b.innerText = count);
}

// 7. CHECKOUT & COD CONFIRMATION
function setupCheckoutSummary() {
  const totalSelling = state.cart.reduce((s, i) => s + (i.selling_price * i.quantity), 0);
  const totalProfit = state.cart.reduce((s, i) => s + (i.profit * i.quantity), 0);

  document.getElementById('co-summary-total').innerText = `₹${totalSelling}`;
  
  if (state.isCustomerMode) {
    document.getElementById('co-profit-row').style.display = 'none';
    document.getElementById('co-header-title').innerText = "Delivery Address for COD";
  } else {
    document.getElementById('co-profit-row').style.display = 'flex';
    document.getElementById('co-summary-profit').innerText = `₹${totalProfit}`;
  }
}

async function handlePlaceOrder(e) {
  e.preventDefault();
  if (state.cart.length === 0) return;

  const totalSelling = state.cart.reduce((s, i) => s + (i.selling_price * i.quantity), 0);
  const totalProfit = state.cart.reduce((s, i) => s + (i.profit * i.quantity), 0);

  const newOrder = {
    id: 'BC-' + Math.floor(100000 + Math.random() * 900000),
    customer_name: document.getElementById('order-cust-name').value,
    customer_mobile: document.getElementById('order-cust-phone').value,
    shipping_address: document.getElementById('order-cust-address').value,
    city: document.getElementById('order-cust-city').value,
    pincode: document.getElementById('order-cust-pincode').value,
    total_amount: totalSelling,
    reseller_profit: totalProfit,
    order_status: 'Pending',
    reseller_id: state.referralCode,
    created_at: new Date().toLocaleDateString()
  };

  if (client) {
    try {
      await client.from('orders').insert(newOrder);
    } catch (err) {
      console.warn("Supabase insert error (saving locally):", err);
    }
  }

  state.orders.unshift(newOrder);
  localStorage.setItem('bluecart_orders', JSON.stringify(state.orders));

  state.cart = [];
  localStorage.setItem('bluecart_cart', JSON.stringify([]));
  updateCartBadges();

  if (state.isCustomerMode) {
    alert(`🎉 Thank you, ${newOrder.customer_name}! Your Cash on Delivery order for ₹${totalSelling} has been placed successfully. You will receive an SMS confirmation.`);
    navigateTo('home');
  } else {
    showToast('Customer COD Order Placed! Reseller Margin recorded.', 'success');
    navigateTo('reseller-dashboard');
  }
}

// 8. RESELLER DASHBOARD & WALLET
function renderResellerDashboard() {
  const orders = state.orders;
  const delivered = orders.filter(o => o.order_status === 'Delivered').reduce((s, o) => s + Number(o.reseller_profit), 0);
  const pending = orders.filter(o => o.order_status !== 'Delivered' && o.order_status !== 'Cancelled').reduce((s, o) => s + Number(o.reseller_profit), 0);

  document.getElementById('stat-total-orders').innerText = orders.length;
  document.getElementById('stat-ready-profit').innerText = `₹${delivered}`;
  document.getElementById('stat-transit-profit').innerText = `₹${pending}`;

  const container = document.getElementById('reseller-orders-list');
  if (orders.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">No shipments yet. Share your WhatsApp links!</p>`;
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="card" style="padding:14px;">
      <div style="display:flex; justify-content:space-between;">
        <strong>Order #${o.id}</strong>
        <span class="badge-tag">${o.order_status}</span>
      </div>
      <div style="font-size:0.85rem; margin:6px 0;">Customer: ${o.customer_name} (${o.city})</div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; border-top:1px solid #f1f5f9; padding-top:6px;">
        <span>Collect: ₹${o.total_amount}</span>
        <strong style="color:var(--success);">Your Margin: ₹${o.reseller_profit}</strong>
      </div>
    </div>
  `).join('');
}

function renderWalletPage() {
  const readyProfit = state.orders.filter(o => o.order_status === 'Delivered').reduce((s, o) => s + Number(o.reseller_profit), 0);
  document.getElementById('wallet-balance-num').innerText = `₹${readyProfit}.00`;
}

function handlePayoutRequest(e) {
  e.preventDefault();
  const amt = document.getElementById('payout-amount-input').value;
  const upi = document.getElementById('payout-upi-input').value;
  showToast(`Withdrawal of ₹${amt} requested to ${upi}!`, 'success');
  document.getElementById('payout-amount-input').value = '';
  document.getElementById('payout-upi-input').value = '';
}

// 9. ADMIN ORDER DISPATCH CONTROLLER
function renderAdminOrdersTable() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (state.orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">No customer orders placed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.orders.map((o, idx) => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customer_name}<br><small>${o.customer_mobile}</small></td>
      <td>₹${o.total_amount}</td>
      <td style="color:var(--success); font-weight:700;">₹${o.reseller_profit}</td>
      <td><span class="profit-badge">${o.order_status}</span></td>
      <td>
        <select onchange="updateOrderStatusAdmin(${idx}, this.value)" style="padding:4px 8px; border-radius:6px;">
          <option ${o.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option ${o.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join('');
}

function updateOrderStatusAdmin(idx, newStatus) {
  state.orders[idx].order_status = newStatus;
  localStorage.setItem('bluecart_orders', JSON.stringify(state.orders));
  showToast(`Order status updated to ${newStatus}. Wallet balance updated!`, 'success');
  renderAdminOrdersTable();
}

// 10. AUTH LOGIN
function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  state.user = { email };
  document.getElementById('header-auth-btn').innerHTML = `<button class="btn btn-sm btn-outline" onclick="navigateTo('reseller-dashboard')"><i class="fa-solid fa-user"></i> Portal</button>`;
  showToast(`Logged in successfully!`, 'success');
  navigateTo('reseller-dashboard');
}

function demoAdminLogin() {
  showToast('Switched to Admin Panel', 'success');
  navigateTo('admin');
}

// AUTO INIT & URL PARSER
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();

  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page') || 'home';
  const id = urlParams.get('id');
  const sp = urlParams.get('sp');
  const ref = urlParams.get('ref');

  navigateTo(page, { id, sp, ref }, false);
});