// script.js (Archivo principal)
// VERSIÓN CORREGIDA - AHORA INCLUYE EL MENÚ MÓVIL

import { loadPage, toggleMobileMenu, closeMobileMenu } from './modules/router.js'; // <-- AÑADIDAS importaciones de menú
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
    // (El botón del menú ahora se maneja en handleBodyClick)
    document.getElementById('desktop-search-input')?.addEventListener('input', handleSearch);
    document.getElementById('mobile-search-input')?.addEventListener('input', handleSearch);

    // --- CARGA INICIAL ---
    updateCartBadge();
    updateLoginButton();
    updateCartVisibility();
    loadPage('inicio');
});

// --- 2. MANEJADOR DE CLICS GLOBAL (Delegación) ---
// --- 2. MANEJADOR DE CLICS GLOBAL (Delegación) ---
function handleBodyClick(event) {
    const target = event.target; // El elemento exacto donde se hizo clic

    // Manejador del botón de menú móvil
    const menuButton = target.closest('.mobile-menu-button');
    if (menuButton) {
        event.preventDefault();
        toggleMobileMenu(); 
        return;
    }

    // Manejador para enlaces de navegación SPA
    const pageLink = target.closest('[data-page]');
    if (pageLink) {
        event.preventDefault();
        
        // --- LÓGICA NUEVA PARA CATEGORÍAS ---
        const category = pageLink.getAttribute('data-category');
        if (category) {
            // Si clicaste en una tarjeta de categoría, guardamos la intención
            localStorage.setItem('pending_category', category);
        } else if (pageLink.getAttribute('data-page') === 'catalogo') {
            // Si clicaste en "Catálogo" del menú normal, limpiamos filtros
            localStorage.removeItem('pending_category');
        }
        // ------------------------------------

        loadPage(pageLink.getAttribute('data-page'));
        closeMobileMenu(); 
        return;
    }

    // Manejador para "Añadir al Carrito"
    const addToCartButton = target.closest('.add-to-cart-btn');
    if (addToCartButton) {
        event.preventDefault();
        addToCart(addToCartButton.getAttribute('data-product-id'));
        return;
    }

    // Manejadores para botones del carrito
    const cartButton = target.closest('.quantity-btn, .remove-item-btn');
    if (cartButton) {
        event.preventDefault();
        const productId = cartButton.getAttribute('data-product-id');
        const action = cartButton.getAttribute('data-action');
        const item = cart.find(i => i.id === productId);

        if (item) {
            if (action === 'increase') updateCartItemQuantity(productId, item.quantity + 1);
            if (action === 'decrease') updateCartItemQuantity(productId, item.quantity - 1);
            if (action === 'remove') removeFromCart(productId);
        }
        return;
    }
    
    // Manejador para botón de Logout
    const logoutButton = target.closest('.logout-button');
    if (logoutButton) {
        event.preventDefault();
        handleLogout();
        return;
    }
}

// --- 3. MANEJADOR DE SUBMITS GLOBAL (Delegación) ---
function handleFormSubmit(event) {
    const form = event.target; 

    // Manejador para formulario de Login
    if (form.id === 'login-form') {
        event.preventDefault();
        handleLogin(event);
        return;
    }

    // Manejador para formulario de Contacto
    if (form.id === 'contact-form') {
        event.preventDefault();
        alert('Mensaje enviado con éxito. (Simulación)');
        form.reset();
        return;
    }

    // Manejador para formulario de Info Personal (Mi Cuenta)
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

    // Manejador para formulario de Pago
    if (form.id === 'payment-form') {
        event.preventDefault();
        alert('¡Pedido realizado con éxito! (Simulación)');
        clearCart();
        loadPage('orden-completa');
        return;
    }
}
// Al final de script.js, después de todo lo demás
function updateCartVisibility() {
    const cartButton = document.getElementById('cartButton');
    if (!cartButton) return; // Seguridad si no está en la página actual

    const user = currentUser; // Viene de modules/state.js

    if (!user) {
        // Sin sesión → carrito visible
        cartButton.style.display = 'inline-flex';
        return;
    }

    // Con sesión → decidir por rol
    if (user.rol === 'admin' || user.role === 'admin' || user.isAdmin === true) {
        // Es admin → ocultar carrito
        cartButton.style.display = 'none';
    } else {
        // Usuario normal → mostrar carrito
        cartButton.style.display = 'inline-flex';
    }
}
