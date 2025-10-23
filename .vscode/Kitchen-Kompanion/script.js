const openBtn = document.getElementById('openBtn');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const itemForm = document.getElementById('itemForm');
const fridge = document.getElementById('fridge');

let lastFocused = null;

function openModal() {
  lastFocused = document.activeElement;
  backdrop.style.display = 'flex';
  backdrop.setAttribute('aria-hidden', 'false');
  document.getElementById('name').focus();
}

function closeModal() {
  backdrop.style.display = 'none';
  backdrop.setAttribute('aria-hidden', 'true');
  if (lastFocused) lastFocused.focus();
  itemForm.reset();
}

openBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) closeModal();
});

function createItemCard({ name, amount, exp, imgDataUrl, notes }) {
  const card = document.createElement('div');
  card.className = 'item';

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if (imgDataUrl) {
    const img = document.createElement('img');
    img.src = imgDataUrl;
    img.alt = name;
    thumb.appendChild(img);
  } else {
    thumb.textContent = name.charAt(0).toUpperCase();
    thumb.style.fontSize = '2.6rem';
    thumb.style.color = '#555';
  }
  card.appendChild(thumb);

  const title = document.createElement('div');
  title.innerHTML = `<strong>${escapeHtml(name)}</strong>`;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const left = document.createElement('div');
  left.innerHTML = `<span>${amount}x</span>`;
  const right = document.createElement('div');
  right.innerHTML = `<span>${exp ? formatDate(exp) : '<em>No date</em>'}</span>`;
  meta.appendChild(left);
  meta.appendChild(right);
  card.appendChild(meta);

  if (notes) {
    const p = document.createElement('div');
    p.style.fontSize = '0.85rem';
    p.style.color = 'var(--muted)';
    p.style.marginTop = '0.4rem';
    p.textContent = notes;
    card.appendChild(p);
  }

  return card;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString();
  } catch (e) { return d; }
}

itemForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const form = ev.target;
  const name = form.name.value.trim();
  const amount = form.amount.value;
  const exp = form.exp.value || '';
  const notes = form.notes.value.trim();

  let imgDataUrl = null;
  const file = form.image.files[0];
  if (file) {
    try {
      imgDataUrl = await fileToDataUrl(file);
    } catch (err) {
      console.error('Image load failed', err);
    }
  }

  const card = createItemCard({ name, amount, exp, imgDataUrl, notes });
  fridge.prepend(card);
  closeModal();
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// demo seed
const seed = [
  { name: 'Milk', amount: 1, exp: '', imgDataUrl: '', notes: '2%' },
  { name: 'Apples', amount: 6, exp: '', imgDataUrl: '', notes: 'Green' }
];
seed.forEach(it => fridge.appendChild(createItemCard(it)));
