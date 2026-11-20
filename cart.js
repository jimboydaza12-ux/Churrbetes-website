const CART_STORAGE_KEY = "churrbetes-cart";
const PRODUCTS = {
  ube: { name: "Ube", price: 99, image: "churrbetes-ube.png" },
  cheese: { name: "Cheese", price: 99, image: "churrbetes-cheese.png" },
  vanilla: { name: "Vanilla", price: 99, image: "churrbetes-product.png" }
};

function showCartMessage(message, error) {
  const messageElement = document.querySelector("[data-cart-message]");

  if (messageElement) {
    messageElement.textContent = message;
    messageElement.hidden = !message;
  } else if (message) {
    console.error(message, error || "");
  }

  if (error) {
    console.error(message, error);
  }
}

function readCart() {
  let serializedCart;

  try {
    serializedCart = localStorage.getItem(CART_STORAGE_KEY);
  } catch (error) {
    showCartMessage("Your browser could not access the cart. Try enabling site storage.", error);
    return {};
  }

  if (!serializedCart) {
    return {};
  }

  let savedCart;

  try {
    savedCart = JSON.parse(serializedCart);
  } catch (error) {
    showCartMessage("The saved cart could not be read, so it has been started over.", error);
    return {};
  }

  if (!savedCart || typeof savedCart !== "object" || Array.isArray(savedCart)) {
    showCartMessage("The saved cart data was invalid, so it has been started over.");
    return {};
  }

  const cart = {};
  let skippedInvalidItem = false;

  Object.entries(savedCart).forEach(([flavor, quantity]) => {
    if (Object.prototype.hasOwnProperty.call(PRODUCTS, flavor) && Number.isSafeInteger(quantity) && quantity > 0) {
      cart[flavor] = quantity;
    } else {
      skippedInvalidItem = true;
    }
  });

  if (skippedInvalidItem) {
    showCartMessage("Invalid saved cart items were skipped.");
  }

  return cart;
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    return true;
  } catch (error) {
    showCartMessage("Your cart could not be saved. Check your browser's site-storage settings.", error);
    return false;
  }
}

function getItemCount(cart) {
  return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
}

function updateCartBadge(cart) {
  const itemCount = getItemCount(cart);
  const itemLabel = itemCount === 1 ? "item" : "items";

  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    badge.textContent = String(itemCount);
  });

  document.querySelectorAll("[data-cart-link]").forEach((link) => {
    link.setAttribute("aria-label", `Shopping cart, ${itemCount} ${itemLabel}`);
  });
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderCart() {
  const itemsContainer = document.querySelector("[data-cart-items]");

  if (!itemsContainer) {
    return;
  }

  const cart = readCart();
  const entries = Object.keys(PRODUCTS)
    .filter((flavor) => cart[flavor])
    .map((flavor) => [flavor, PRODUCTS[flavor], cart[flavor]]);
  const emptyMessage = document.querySelector("[data-cart-empty]");
  const summaryContainer = document.querySelector("[data-cart-summary]");
  const totalElement = document.querySelector("[data-cart-total]");
  const checkoutForm = document.querySelector("[data-checkout-form]");

  itemsContainer.replaceChildren();
  summaryContainer.replaceChildren();
  emptyMessage.hidden = entries.length > 0;
  checkoutForm.hidden = entries.length === 0;

  let total = 0;

  entries.forEach(([flavor, product, quantity]) => {
    const subtotal = product.price * quantity;
    total += subtotal;

    const row = document.createElement("article");
    row.className = "checkout-item";

    const image = document.createElement("img");
    image.className = "checkout-item-image";
    image.src = product.image;
    image.alt = "";

    const details = document.createElement("div");
    details.className = "checkout-item-details";
    details.appendChild(createTextElement("h3", "checkout-item-name", product.name));
    details.appendChild(createTextElement("p", "checkout-item-price", `₱${product.price} each`));

    const quantityLabel = createTextElement("label", "quantity-control", "Quantity");
    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.step = "1";
    quantityInput.value = String(quantity);
    quantityInput.setAttribute("aria-label", `${product.name} quantity`);
    quantityLabel.appendChild(quantityInput);
    details.appendChild(quantityLabel);

    quantityInput.addEventListener("change", () => {
      const newQuantity = Number(quantityInput.value);

      if (!Number.isSafeInteger(newQuantity) || newQuantity < 1) {
        quantityInput.value = String(quantity);
        showCartMessage("Enter a whole quantity of at least 1.");
        return;
      }

      const updatedCart = readCart();
      updatedCart[flavor] = newQuantity;

      if (saveCart(updatedCart)) {
        showCartMessage("");
        updateCartBadge(updatedCart);
        renderCart();
      }
    });

    const subtotalElement = createTextElement("strong", "checkout-item-subtotal", `₱${subtotal}`);
    const removeButton = createTextElement("button", "remove-cart-item", "Remove");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${product.name} from cart`);
    removeButton.addEventListener("click", () => {
      const updatedCart = readCart();
      delete updatedCart[flavor];

      if (saveCart(updatedCart)) {
        showCartMessage(`${product.name} removed from your cart.`);
        updateCartBadge(updatedCart);
        renderCart();
      }
    });

    row.append(image, details, subtotalElement, removeButton);
    itemsContainer.appendChild(row);

    const summaryLine = document.createElement("p");
    summaryLine.className = "cart-summary-line";
    summaryLine.append(
      createTextElement("span", "", `${product.name} × ${quantity}`),
      createTextElement("strong", "", `₱${subtotal}`)
    );
    summaryContainer.appendChild(summaryLine);
  });

  totalElement.textContent = `₱${total}`;
  updateCartBadge(cart);
}

document.querySelectorAll("[data-add-to-cart]").forEach((button) => {
  button.addEventListener("click", () => {
    const flavor = button.dataset.addToCart;
    const product = Object.prototype.hasOwnProperty.call(PRODUCTS, flavor) ? PRODUCTS[flavor] : null;

    if (!product) {
      showCartMessage("That flavor could not be added to your cart.");
      return;
    }

    const cart = readCart();
    if ((cart[flavor] || 0) >= Number.MAX_SAFE_INTEGER) {
      showCartMessage("That quantity is too large to add to your cart.");
      return;
    }

    cart[flavor] = (cart[flavor] || 0) + 1;

    if (saveCart(cart)) {
      updateCartBadge(cart);
      showCartMessage(`${product.name} added to your cart. You have ${getItemCount(cart)} item${getItemCount(cart) === 1 ? "" : "s"}.`);
    }
  });
});

document.querySelectorAll("[data-checkout-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const cart = readCart();
    const entries = Object.keys(PRODUCTS).filter((flavor) => cart[flavor]);

    if (entries.length === 0) {
      showCartMessage("Add at least one flavor before placing an order.");
      renderCart();
      return;
    }

    const formData = new FormData(form);
    const total = entries.reduce((sum, flavor) => sum + PRODUCTS[flavor].price * cart[flavor], 0);
    const itemLines = entries.map((flavor) => {
      const product = PRODUCTS[flavor];
      return `${product.name} x ${cart[flavor]} - ₱${product.price * cart[flavor]}`;
    });
    const body = [
      "Churrbetes website order",
      "",
      `Name: ${formData.get("customerName")}`,
      `Phone: ${formData.get("phone")}`,
      `Email: ${formData.get("email") || "Not provided"}`,
      "",
      "Items:",
      ...itemLines,
      "",
      `Total: ₱${total}`,
      `Notes: ${formData.get("notes") || "None"}`
    ].join("\n");
    const subject = "Churrbetes order";
    window.location.href = `mailto:churrbetes@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});

updateCartBadge(readCart());
renderCart();
