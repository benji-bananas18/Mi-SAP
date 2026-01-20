// --- CONFIGURACIÓN DE URL Y PERSISTENCIA ---
const URL_API = "https://mi-sap-web.onrender.com/api";

let inventario = JSON.parse(localStorage.getItem('inventarioSAP')) || [];
let totalCaja = parseFloat(localStorage.getItem('totalCajaSAP')) || 0;

const esPaginaLogin = document.getElementById('login-container') !== null;
const esPaginaVentas = document.getElementById('listaProductos') !== null;
const esPaginaAdmin = document.getElementById('listaAdmin') !== null;

// --- SINCRONIZACIÓN CON EL SERVIDOR ---
async function sincronizarConServidor(accion, datosExtra = null) {
    localStorage.setItem('inventarioSAP', JSON.stringify(inventario));
    localStorage.setItem('totalCajaSAP', totalCaja.toString());

    try {
        const response = await fetch(`${URL_API}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion, inventario, detalle: datosExtra })
        });
        if (response.ok) console.log("Sincronizado con Render");
    } catch (error) {
        console.warn("Servidor offline. Trabajando en modo local.");
    }
}

// --- SISTEMA DE ROLES Y SEGURIDAD ---
window.onload = function() {
    const rol = sessionStorage.getItem('rolUsuario');

    if (!esPaginaLogin && !sessionStorage.getItem('sesionActiva')) {
        window.location.href = "index.html";
        return;
    }

    if (esPaginaAdmin && rol !== "ADMIN") {
        alert("Acceso denegado: Se requieren permisos de Administrador");
        window.location.href = "dashboard.html";
        return;
    }

    if (esPaginaVentas || esPaginaAdmin) {
        actualizarTabla();
        if (esPaginaVentas && document.getElementById('totalCaja')) {
            document.getElementById('totalCaja').innerText = `$${totalCaja.toFixed(2)}`;
        }
    }
};

// --- LOGIN Y REGISTRO ---
async function iniciarSesion() {
    const usuario = document.getElementById('usuario').value;
    const pass = document.getElementById('password').value;

    try {
        const res = await fetch(`${URL_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, pass })
        });
        const data = await res.json();

        if (data.login) {
            sessionStorage.setItem('sesionActiva', 'true');
            sessionStorage.setItem('rolUsuario', data.rol);
            window.location.href = data.rol === "ADMIN" ? "admin.html" : "dashboard.html";
        } else {
            alert(data.mensaje || "Error de credenciales");
        }
    } catch (e) {
        // Fallback para pruebas locales si el servidor no está listo
        if (usuario === "admin" && pass === "sap123") {
            sessionStorage.setItem('sesionActiva', 'true');
            sessionStorage.setItem('rolUsuario', 'ADMIN');
            window.location.href = "admin.html";
        } else {
            alert("No se pudo conectar con el servidor de autenticación.");
        }
    }
}

async function registrarVendedor() {
    const nombre = prompt("Nombre completo:");
    const usuario = prompt("Usuario deseado:");
    const pass = prompt("Contraseña:");

    if (nombre && usuario && pass) {
        try {
            const res = await fetch(`${URL_API}/registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, usuario, pass })
            });
            const data = await res.json();
            alert(data.mensaje);
        } catch (e) {
            alert("Error al enviar solicitud al servidor.");
        }
    }
}

// --- GESTIÓN DE VENDEDORES (SOLO ADMIN) ---
async function gestionarNuevosVendedores() {
    try {
        const res = await fetch(`${URL_API}/pendientes`);
        const pendientes = await res.json();

        if (pendientes.length === 0) return alert("No hay solicitudes pendientes.");

        let menu = "Solicitudes:\n" + pendientes.map((u, i) => `${i}. ${u.nombre} (@${u.usuario})`).join("\n");
        const idx = prompt(menu + "\n\nEscribe el número para APROBAR:");

        if (pendientes[idx]) {
            await fetch(`${URL_API}/aprobar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: pendientes[idx].usuario })
            });
            alert("Vendedor activado correctamente.");
        }
    } catch (e) {
        alert("Error al gestionar solicitudes.");
    }
}

// --- LÓGICA DE INVENTARIO ---
async function agregarProducto() {
    const nombre = document.getElementById('nombrePro').value;
    const precio = parseFloat(document.getElementById('precioPro').value);
    const stock = parseInt(document.getElementById('stockPro').value);

    if (nombre && !isNaN(precio) && !isNaN(stock)) {
        const nuevo = { id: Date.now(), nombre, precio, stock };
        inventario.push(nuevo);
        actualizarTabla();
        limpiarFormulario();
        await sincronizarConServidor('AGREGAR', nuevo);
    }
}

async function vender(id) {
    const p = inventario.find(item => item.id === id);
    if (p && p.stock > 0) {
        p.stock--;
        totalCaja += p.precio;
        if (document.getElementById('totalCaja')) {
            document.getElementById('totalCaja').innerText = `$${totalCaja.toFixed(2)}`;
        }
        actualizarTabla();
        await sincronizarConServidor('VENTA', { id, nuevoStock: p.stock });
    } else {
        alert("Sin existencias.");
    }
}

function actualizarTabla() {
    const container = esPaginaVentas ? document.getElementById('listaProductos') : document.getElementById('listaAdmin');
    if (!container) return;
    
    container.innerHTML = inventario.map(p => `
        <tr style="${p.stock < 5 ? 'color: red; font-weight: bold;' : ''}">
            <td>${p.nombre}</td>
            <td>$${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>
                ${esPaginaVentas 
                    ? `<button class="btn-vender" onclick="vender(${p.id})">Vender</button>` 
                    : `<button class="btn-editar" onclick="prepararEdicion(${p.id})">Editar</button>
                       <button class="btn-eliminar" onclick="eliminarProducto(${p.id})">Eliminar</button>`
                }
            </td>
        </tr>
    `).join('');
}

function filtrarProductos() {
    const texto = document.getElementById('inputBusqueda').value.toLowerCase();
    const filtrados = inventario.filter(p => p.nombre.toLowerCase().includes(texto));
    const container = esPaginaVentas ? document.getElementById('listaProductos') : document.getElementById('listaAdmin');
    
    container.innerHTML = filtrados.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>$${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td>${esPaginaVentas ? '...' : '...'}</td>
        </tr>
    `).join('');
}

async function eliminarProducto(id) {
    if (confirm("¿Eliminar?")) {
        inventario = inventario.filter(p => p.id !== id);
        actualizarTabla();
        await sincronizarConServidor('ELIMINAR', { id });
    }
}

function cerrarSesion() {
    sessionStorage.clear();
    window.location.href = "index.html";
}

function limpiarFormulario() {
    ['nombrePro', 'precioPro', 'stockPro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}