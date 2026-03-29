const BACKEND_URL = 'https://freshalert-0rkl.onrender.com';

// ─── State ───────────────────────────────────────────────────────────────────
let stream = null;
let barcodeInterval = null;
let isScanning = false;

// ─── Elements ────────────────────────────────────────────────────────────────
const productList = document.getElementById('product-list');
const emptyState = document.getElementById('empty-state');
const modal = document.getElementById('modal');
const cameraContainer = document.getElementById('camera-container');
const cameraFeed = document.getElementById('camera-feed');
const nameInput = document.getElementById('name-input');
const expiryInput = document.getElementById('expiry-input');

// ─── Load Products ────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res = await fetch(`${BACKEND_URL}/products`);
    const products = await res.json();

    productList.innerHTML = '';

    if (products.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    products.forEach(product => {
      const daysLeft = getDaysLeft(product.expiry_date);
      const urgency = daysLeft <= 1 ? 'urgent' : daysLeft <= 3 ? 'warning' : 'ok';

      const card = document.createElement('div');
      card.className = `product-card ${urgency}`;
      card.innerHTML = `
        <div>
          <div class="product-name">${product.name}</div>
          <div class="product-expiry">${formatExpiry(daysLeft)}</div>
        </div>
        <button class="delete-btn" onclick="deleteProduct(${product.id})">🗑</button>
      `;
      productList.appendChild(card);
    });
  } catch (e) {
    console.error('Failed to load products:', e);
  }
}

function getDaysLeft(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function formatExpiry(daysLeft) {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return 'Expires tomorrow';
  if (daysLeft <= 7) return `Expires in ${daysLeft} days`;
  return `Expires in ${Math.ceil(daysLeft / 7)} weeks`;
}

// ─── Add Product ──────────────────────────────────────────────────────────────
document.getElementById('add-btn').addEventListener('click', () => {
  nameInput.value = '';
  expiryInput.value = '';
  modal.classList.add('open');
});

document.getElementById('save-btn').addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const expiry = expiryInput.value;

  if (!name || !expiry) {
    alert('Please enter a product name and expiry date');
    return;
  }

  await fetch(`${BACKEND_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, expiry_date: expiry })
  });

  modal.classList.remove('open');
  loadProducts();
});

// ─── Delete Product ───────────────────────────────────────────────────────────
async function deleteProduct(id) {
  await fetch(`${BACKEND_URL}/products/${id}`, { method: 'DELETE' });
  loadProducts();
}

// ─── Barcode Scanning ─────────────────────────────────────────────────────────
document.getElementById('scan-btn').addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }});
    cameraFeed.srcObject = stream;
    cameraContainer.classList.add('open');
    startScanning();
  } catch (e) {
    alert('Could not access camera');
  }
});

document.getElementById('cancel-scan').addEventListener('click', stopCamera);

function stopCamera() {
  isScanning = false;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  try { Quagga.stop(); } catch(e) {}
  cameraContainer.classList.remove('open');
}

function startScanning() {
  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: cameraFeed,
      constraints: { facingMode: 'environment' }
    },
    decoder: {
      readers: ['ean_reader', 'ean_8_reader', 'upc_reader']
    }
  }, err => {
    if (err) {
      alert('Scanner error: ' + err);
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(result => {
    if (isScanning) return;
    isScanning = true;
    const barcode = result.codeResult.code;
    Quagga.stop();
    stopCamera();
    lookupBarcode(barcode);
  });
}

async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}`, {
      headers: { 'User-Agent': 'FreshAlert/1.0' }
    });
    const data = await res.json();

    if (data.status === 1 && data.product.product_name) {
      nameInput.value = data.product.product_name;
    } else {
      nameInput.value = '';
      alert('Product not found — please enter the name manually');
    }
  } catch (e) {
    console.error('Barcode lookup failed:', e);
    alert('Lookup failed — please enter the name manually');
  }
}

// ─── Close modal when tapping outside ────────────────────────────────────────
modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.remove('open');
});

// ─── Notifications ────────────────────────────────────────────────────────────
async function initNotifications() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered');

    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js');
    const { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging.js');

    const firebaseApp = initializeApp({
      apiKey: "AIzaSyDt__8uYr4mSKRPb_00gvzfbkS5_XMGM7s",
      authDomain: "freshalert-61e16.firebaseapp.com",
      projectId: "freshalert-61e16",
      storageBucket: "freshalert-61e16.firebasestorage.app",
      messagingSenderId: "63492535322",
      appId: "1:63492535322:web:2e34db39a6a5a7661ecda3"
    });

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: 'BICEn6V7CgiV8VgUsO02Lt43K2vySLTDVe9TrPNEHwwX7jnszLY-FRUdBnMZS3MuW3DPM8kRB-2qYc1CLUXz8AI',
      serviceWorkerRegistration: registration
    });

    console.log('FCM token:', token);

    await fetch(`${BACKEND_URL}/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    alert('Token registered successfully');
  } catch (e) {
    alert('Notification setup failed: ' + e.message);
  }
}

initNotifications();

// ─── Init ─────────────────────────────────────────────────────────────────────
loadProducts();