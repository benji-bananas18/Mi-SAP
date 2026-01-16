// --- CONFIGURACIÓN INICIAL Y PERSISTENCIA ---
let inventario = JSON.parse(localStorage.getItem('inventarioSAP')) || [];
let totalCaja = parseFloat(localStorage.getItem('totalCajaSAP')) || 0;

// Variables de detección de página
const esPaginaLogin = document.getElementById('login-container') !== null;
const esPaginaVentas = document.getElementById('listaProductos') !== null;
const esPaginaAdmin = document.getElementById('listaAdmin') !== null;

// Ejecución inmediata al cargar
window.onload = function() {
    // 1. Proteger páginas privadas
    if (!esPaginaLogin && !esAdmin()) {
        window.location.href = "index.html";
        return;
    }

    // 2. Cargar datos si estamos en una página con tablas
    if (esPaginaVentas || esPaginaAdmin) {
        actualizarTabla();
        if (esPaginaVentas) {
            document.getElementById('totalCaja').innerText = `$${totalCaja.toFixed(2)}`;
        }
    }
};

// --- SEGURIDAD ---
const ADMIN_USER = "admin";
const ADMIN_PASS = "sap123";

function esAdmin() {
    return sessionStorage.getItem('sesionActiva') === 'true';
}

function iniciarSesion() {
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('password').value;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('sesionActiva', 'true');
        window.location.href = "dashboard.html"; // Nos manda a ventas
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

function cerrarSesion() {
    sessionStorage.removeItem('sesionActiva');
    window.location.href = "index.html";
}

// --- GESTIÓN DE DATOS ---
function guardarEnLocalStorage() {
    localStorage.setItem('inventarioSAP', JSON.stringify(inventario));
    localStorage.setItem('totalCajaSAP', totalCaja.toString());
}

function agregarProducto() {
    const nombre = document.getElementById('nombrePro').value;
    const precio = parseFloat(document.getElementById('precioPro').value);
    const stock = parseInt(document.getElementById('stockPro').value);

    if (nombre && precio && stock) {
        const nuevoProducto = {
            id: Date.now(),
            nombre: nombre,
            precio: precio,
            stock: stock
        };
        inventario.push(nuevoProducto);
        actualizarTabla();
        limpiarFormulario();
        guardarEnLocalStorage();
    } else {
        alert("Completa todos los campos");
    }
}

// --- RENDERIZADO DE TABLAS ---
function actualizarTabla() {
    if (esPaginaVentas) {
        renderizarTablaVentas(inventario);
    } else if (esPaginaAdmin) {
        renderizarTablaAdmin(inventario);
    }
}

function renderizarTablaVentas(datos) {
    const tabla = document.getElementById('listaProductos');
    if (!tabla) return;
    tabla.innerHTML = datos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>$${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><button class="btn-vender" onclick="vender(${p.id})">Vender 1</button></td>
        </tr>
    `).join('');
}

function renderizarTablaAdmin(datos) {
    const tabla = document.getElementById('listaAdmin');
    if (!tabla) return;
    tabla.innerHTML = datos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>$${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>
                <button class="btn-editar" onclick="prepararEdicion(${p.id})">Editar</button>
                <button class="btn-eliminar" onclick="eliminarProducto(${p.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// --- FUNCIONES DE VENTA Y FILTRADO ---
function filtrarProductos() {
    const texto = document.getElementById('inputBusqueda').value.toLowerCase();
    const filtrados = inventario.filter(p => p.nombre.toLowerCase().includes(texto));
    
    if (esPaginaVentas) renderizarTablaVentas(filtrados);
    else if (esPaginaAdmin) renderizarTablaAdmin(filtrados);
}

function vender(id) {
    const producto = inventario.find(p => p.id === id);
    if (producto && producto.stock > 0) {
        producto.stock--;
        totalCaja += producto.precio;
        document.getElementById('totalCaja').innerText = `$${totalCaja.toFixed(2)}`;
        actualizarTabla();
        guardarEnLocalStorage();
    } else {
        alert("¡Sin stock!");
    }
}

// --- EDICIÓN Y ELIMINACIÓN (ADMIN) ---
function eliminarProducto(id) {
    if (confirm("¿Eliminar producto?")) {
        inventario = inventario.filter(p => p.id !== id);
        actualizarTabla();
        guardarEnLocalStorage();
    }
}

function prepararEdicion(id) {
    const producto = inventario.find(p => p.id === id);
    if (!producto) return;

    document.getElementById('nombrePro').value = producto.nombre;
    document.getElementById('precioPro').value = producto.precio;
    document.getElementById('stockPro').value = producto.stock;

    const btn = document.getElementById('btnGuardar');
    btn.innerText = "Actualizar Cambios";
    btn.style.backgroundColor = "#ffc107";
    btn.style.color = "black";
    btn.onclick = function() { confirmarEdicion(id); };
}

function confirmarEdicion(id) {
    const index = inventario.findIndex(p => p.id === id);
    inventario[index].nombre = document.getElementById('nombrePro').value;
    inventario[index].precio = parseFloat(document.getElementById('precioPro').value);
    inventario[index].stock = parseInt(document.getElementById('stockPro').value);

    const btn = document.getElementById('btnGuardar');
    btn.innerText = "Guardar";
    btn.style.backgroundColor = "#28a745";
    btn.style.color = "white";
    btn.onclick = agregarProducto;

    actualizarTabla();
    limpiarFormulario();
    guardarEnLocalStorage();
}

function limpiarFormulario() {
    document.getElementById('nombrePro').value = "";
    document.getElementById('precioPro').value = "";
    document.getElementById('stockPro').value = "";
}

// --- REPORTE C++ ---
function descargarReporte() {
    if (inventario.length === 0) return alert("No hay datos");
    let csv = "ID,Producto,Precio,Stock\n" + inventario.map(p => `${p.id},${p.nombre},${p.precio},${p.stock}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_inventario.csv';
    a.click();
}