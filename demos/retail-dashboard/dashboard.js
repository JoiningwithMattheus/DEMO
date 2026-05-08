const seedProducts = [
  { id: createId(), name: "House espresso beans", category: "Coffee", stock: 18 },
  { id: createId(), name: "Decaf filter blend", category: "Coffee", stock: 6 },
  { id: createId(), name: "Sourdough boxes", category: "Packaging", stock: 11 },
  { id: createId(), name: "Cinnamon rolls", category: "Bakery", stock: 4 },
  { id: createId(), name: "Cake carriers", category: "Packaging", stock: 22 }
];

const orders = [
  { name: "Office lunch boxes", detail: "12 items, pickup 12:30", status: "Preparing" },
  { name: "Weekend cake order", detail: "Deposit paid, confirm message", status: "Needs reply" },
  { name: "Coffee subscription", detail: "Pack beans before 16:00", status: "Ready soon" }
];

let products = loadProducts();

const table = document.querySelector("#inventory-table");
const search = document.querySelector("#inventory-search");
const categoryFilter = document.querySelector("#category-filter");
const stockForm = document.querySelector("#stock-form");
const stockNote = document.querySelector("#stock-note");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const sidebarToggleLabel = document.querySelector(".sidebar-toggle-label");
const dashboardFrame = document.querySelector(".dashboard-frame");
const sidebarMedia = window.matchMedia("(max-width: 980px)");

search.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);

stockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(stockForm);
  const product = {
    id: createId(),
    name: data.get("name").toString().trim(),
    category: data.get("category").toString(),
    stock: Number(data.get("stock"))
  };

  if (!product.name) return;

  products = [product, ...products];
  saveProducts();
  stockForm.reset();
  stockNote.textContent = `${product.name} was added to inventory.`;
  renderProducts();
});

table.addEventListener("click", (event) => {
  const button = event.target.closest("[data-restock]");
  if (!button) return;

  products = products.map((product) =>
    product.id === button.dataset.restock ? { ...product, stock: product.stock + 8 } : product
  );
  saveProducts();
  renderProducts();
});

sidebarToggle.addEventListener("click", () => {
  dashboardFrame.classList.toggle("sidebar-hidden");
  updateSidebarToggle();
});

sidebarMedia.addEventListener("change", syncSidebarForViewport);
syncSidebarForViewport();
renderProducts();
renderOrders();

function renderProducts() {
  const query = search.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const visible = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(query);
    const matchesCategory = category === "all" || product.category === category;
    return matchesSearch && matchesCategory;
  });

  table.innerHTML = visible
    .map((product) => {
      const state = getStockState(product.stock);
      return `
        <tr>
          <td>${escapeHtml(product.name)}</td>
          <td>${product.category}</td>
          <td>${product.stock}</td>
          <td><span class="pill ${state.className}">${state.label}</span></td>
          <td><button class="status-action" type="button" data-restock="${product.id}">Restock +8</button></td>
        </tr>
      `;
    })
    .join("");

  const lowCount = products.filter((product) => product.stock <= 6).length;
  const revenue = 780 + products.reduce((total, product) => total + product.stock * 3, 0);

  document.querySelector("#inventory-count").textContent = `${visible.length} item${visible.length === 1 ? "" : "s"}`;
  document.querySelector("#metric-low").textContent = lowCount;
  document.querySelector("#metric-orders").textContent = orders.length;
  document.querySelector("#metric-revenue").textContent = `EUR ${revenue.toLocaleString("en-US")}`;
}

function renderOrders() {
  document.querySelector("#order-list").innerHTML = orders
    .map(
      (order) => `
        <li>
          <strong>${order.name}</strong>
          <span class="muted">${order.detail}</span>
          <span class="pill warn">${order.status}</span>
        </li>
      `
    )
    .join("");
}

function syncSidebarForViewport() {
  dashboardFrame.classList.toggle("sidebar-hidden", sidebarMedia.matches);
  updateSidebarToggle();
}

function updateSidebarToggle() {
  const isOpen = !dashboardFrame.classList.contains("sidebar-hidden");
  sidebarToggle.setAttribute("aria-expanded", String(isOpen));
  sidebarToggle.setAttribute("aria-label", isOpen ? "Switch to focus view" : "Show sidebar menu");
  sidebarToggle.setAttribute("title", isOpen ? "Switch to focus view" : "Show sidebar menu");

  if (sidebarToggleLabel) {
    sidebarToggleLabel.textContent = isOpen ? "Focus view" : "Show menu";
  }
}

function getStockState(stock) {
  if (stock <= 5) return { label: "Low", className: "warn" };
  if (stock >= 20) return { label: "Healthy", className: "good" };
  return { label: "Watch", className: "bad" };
}

function loadProducts() {
  try {
    const saved = localStorage.getItem("stockroomProducts");
    return saved ? JSON.parse(saved) : seedProducts;
  } catch {
    return seedProducts;
  }
}

function saveProducts() {
  localStorage.setItem("stockroomProducts", JSON.stringify(products));
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `product-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return map[character];
  });
}
