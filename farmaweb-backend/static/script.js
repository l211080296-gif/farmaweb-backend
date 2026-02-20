// script.js (Archivo principal)
// VERSIÓN CORREGIDA Y MEJORADA - OCULTAR CARRITO PARA ADMIN

import { loadPage, toggleMobileMenu, closeMobileMenu } from './modules/router.js';
import { updateLoginButton, handleLogout, handleLogin } from './modules/auth.js';
import { updateCartBadge, addToCart, updateCartItemQuantity, removeFromCart, clearCart } from './modules/cart.js';
import { handleSearch } from './modules/pages/catalog.js';
import { cart, currentUser } from './modules/state.js';

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    if (!main) {
        console.error("Error: Elemento 'main' no encontrado.");
        return;
    }

    // --- MANEJADORES GLOBALES ---
    document.body.addEventListener('click', handleBodyClick);
    document.body.addEventListener('submit', handleFormSubmit);

    // --- LISTENERS ESTÁTICOS ---
    document.getElementById('desktop-search-input')?.addEventListener('input', handleSearch);
    document.getElementById('mobile-search-input')?.addEventListener('input', handleSearch);

    // --- CARGA INICIAL ---
    updateCartBadge();
    updateLoginButton();
    updateCartVisibility();   // ← ya estaba, pero ahora la función es más depurable
    loadPage('inicio');
});

// Función mejorada para ocultar/mostrar carrito según rol
function updateCartVisibility() {
    const cartButton = document.getElementById('cartButton');
    if (!cartButton) {
        console.warn('[CartVisibility] No se encontró elemento con id="cartButton" → revisa index.html');
        return;
    }

    console.log('[CartVisibility] Ejecutando... currentUser =', currentUser);

    if (!currentUser) {
        console.log('[CartVisibility] No hay sesión → MOSTRAR carrito');
        cartButton.style.display = 'inline-flex';
        return;
    }

    // Ajusta esta condición según lo que realmente tenga tu objeto currentUser
    // Abre F12 → Console y mira qué imprime arriba para saber qué propiedad usar
    const esAdmin = 
        currentUser.rol === 'admin' ||
        currentUser.role === 'admin' ||
        currentUser.tipo === 'administrador' ||
        currentUser.isAdmin === true ||
        currentUser.username?.toLowerCase() === 'admin' || 
        currentUser.username?.toLowerCase().includes('admin');

    if (esAdmin) {
        console.log('[CartVisibility] USUARIO ES ADMIN → OCULTANDO carrito');
        cartButton.style.display = 'none';
    } else {
        console.log('[CartVisibility] Usuario cliente/normal → MOSTRANDO carrito');
        cartButton.style.display = 'inline-flex';
    }
}

// Workaround para actualizar después de login/logout (ya que están en auth.js)
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'currentUser') {
        console.log('[Storage] currentUser actualizado → refrescando visibilidad carrito');
        updateCartVisibility();
    }
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    if (key === 'currentUser') {
        console.log('[Storage] Sesión cerrada → refrescando visibilidad carrito');
        updateCartVisibility();
    }
};

// --- 2. MANEJADOR DE CLICS GLOBAL (Delegación) ---
function handleBodyClick(event) {
    const target = event.target;

    // Toggle menú móvil
    if (target.closest('.mobile-menu-button')) {
        toggleMobileMenu();
        return;
    }

    // Cerrar menú móvil al clic fuera
    if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
        closeMobileMenu();
    }

    // Navegación SPA
    const pageLink = target.closest('[data-page]');
    if (pageLink) {
        event.preventDefault();
        
        const category = pageLink.getAttribute('data-category');
        if (category) {
            localStorage.setItem('pending_category', category);
        } else if (pageLink.getAttribute('data-page') === 'catalogo') {
            localStorage.removeItem('pending_category');
        }
        
        loadPage(pageLink.getAttribute('data-page'));
        closeMobileMenu();
        return;
    }

    // Añadir al carrito
    const addToCartButton = target.closest('.add-to-cart-btn');
    if (addToCartButton) {
        event.preventDefault();
        addToCart(addToCartButton.getAttribute('data-product-id'));
        return;
    }

    // Botones dentro del carrito (+, -, eliminar)
    const cartActionButton = target.closest('.quantity-btn, .remove-item-btn');
    if (cartActionButton) {
        event.preventDefault();
        const productId = cartActionButton.getAttribute('data-product-id');
        const action = cartActionButton.getAttribute('data-action');
        const item = cart.find(i => i.id === productId);
        if (item) {
            if (action === 'increase') updateCartItemQuantity(productId, item.quantity + 1);
            if (action === 'decrease') updateCartItemQuantity(productId, item.quantity - 1);
            if (action === 'remove') removeFromCart(productId);
        }
        return;
    }

    // Logout
    if (target.closest('.logout-button')) {
        event.preventDefault();
        handleLogout();
        return;
    }
}

// --- 3. MANEJADOR DE SUBMITS GLOBAL ---
function handleFormSubmit(event) {
    const form = event.target;

    if (form.id === 'login-form') {
        event.preventDefault();
        handleLogin(event);
        return;
    }

    if (form.id === 'contact-form') {
        event.preventDefault();
        alert('Mensaje enviado con éxito. (Simulación)');
        form.reset();
        return;
    }

    if (form.id === 'personal-info-form') {
        event.preventDefault();
        const newNameInput = form.querySelector('#acc-name');
        if (newNameInput && currentUser) {
            currentUser.name = newNameInput.value;
            alert('Información actualizada con éxito.');
            updateLoginButton();
            loadPage('cuenta');
        }
        return;
    }

    if (form.id === 'payment-form') {
        event.preventDefault();
        alert('¡Pedido realizado con éxito! (Simulación)');
        clearCart();
        loadPage('orden-completa');
        return;
    }
}
