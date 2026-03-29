const BACKEND_URL = 'https://freshalert-backend-npml.onrender.com'; // change this to Render URL when deployed

// ─── State ───────────────────────────────────────────────────────────────────
let stream = null; // camera stream
let barcodeInterval = null; // barcode scanning interval

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
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  cameraContainer.classList.remove('open');
}
```
```
firebase deploy --only hosting
function startScanning() {
  const codeReader = new ZXingBrowser.BrowserMultiFormatReader();

  codeReader.decodeFromVideoElement(cameraFeed, async (result, error) => {
    if (result) {
      console.log('Barcode detected:', result.getText());
      codeReader.reset();
      stopCamera();
      await lookupBarcode(result.getText());
    }
  });
}

async function lookupBarcode(barcode) {
  try {
    console.log('Looking up barcode:', barcode);
    const res = await fetch(`${BACKEND_URL}/barcode/${barcode}`);
    console.log('Response Status:', res.status);
    const data = await res.json();
    console.log('Response Data', res.data);

    if (data.found && data.name) {
      nameInput.value = data.name;
    } else {
      nameInput.value = '';
      alert('Product not found — please enter the name manually');
    }
  } catch (e) {
    console.error('Barcode lookup failed:', e);
  }
}

// ─── Close modal when tapping outside ────────────────────────────────────────
modal.addEventListener('click', e => {
  if (e.target === modal) modal.classList.remove('open');
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadProducts();