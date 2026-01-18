// --- CONFIGURACIÓN DE URL Y PERSISTENCIA ---
// REEMPLAZA ESTA URL con la que te dé Render para tu "Web Service" (Backend)
const URL_API = "https://tu-servicio-backend.onrender.com/api/productos";

let inventario = JSON.parse(localStorage.getItem('inventarioSAP')) || [];
let totalCaja = parseFloat(localStorage.getItem('totalCajaSAP')) || 0;

const esPaginaLogin = document.getElementById('login-container') !== null;
const esPaginaVentas = document.getElementById('listaProductos') !== null;
const esPaginaAdmin = document.getElementById('listaAdmin') !== null;

// --- SINCRONIZACIÓN CON EL SERVIDOR (OPCIÓN B) ---
async function sincronizarConServidor(accion, datosExtra = null) {
    // Siempre guardamos una copia local por si falla el internet
    localStorage.setItem('inventarioSAP', JSON.stringify(inventario));
    localStorage.setItem('totalCajaSAP', totalCaja.toString());

    console.log(`Sincronizando ${accion} en la nube...`);

    try {
        // Enviamos el inventario completo o el cambio específico al servidor
        const response = await fetch(URL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accion: accion,
                inventario: inventario,
                totalCaja: totalCaja,
                detalle: datosExtra
            })
        });

        if (response.ok) {
            console.log("Servidor actualizado correctamente.");
        }
    } catch (error) {
        console.warn("El servidor no respondió. Los cambios se guardaron localmente.");
    }
}

// --- INICIO ---
window.onload = function() {
    if (!esPaginaLogin && !esAdmin()) {
        window.location.href = "index.html";
        return;
    }

    if (esPaginaVentas || esPaginaAdmin) {
        actualizarTabla();
        if (esPaginaVentas) {
            const displayCaja = document.getElementById('totalCaja');
            if (displayCaja) displayCaja.innerText = `$${totalCaja.toFixed(2)}`;
        }
    }
};

// --- SEGURIDAD ---
function esAdmin() {
    return sessionStorage.getItem('sesionActiva') === 'true';
}

function iniciarSesion() {
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('password').value;

    if (user === "admin" && pass === "sap123") {
        sessionStorage.setItem('sesionActiva', 'true');
        window.location.href = "dashboard.html";
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

function cerrarSesion() {
    sessionStorage.removeItem('sesionActiva');
    window.location.href = "index.html";
}

// --- GESTIÓN DE PRODUCTOS ---
async function agregarProducto() {
    const nombre = document.getElementById('nombrePro').value;
    const precio = parseFloat(document.getElementById('precioPro').value);
    const stock = parseInt(document.getElementById('stockPro').value);

    if (nombre && !isNaN(precio) && !isNaN(stock)) {
        const nuevo = { id: Date.now(), nombre, precio, stock };
        inventario.push(nuevo);
        
        actualizarTabla();
        limpiarFormulario();
        await sincronizarConServidor('AGREGAR_PRODUCTO', nuevo);
    } else {
        alert("Completa todos los campos correctamente");
    }
}

async function vender(id) {
    const producto = inventario.find(p => p.id === id);
    if (producto && producto.stock > 0) {
        producto.stock--;
        totalCaja += producto.precio;
        
        const displayCaja = document.getElementById('totalCaja');
        if (displayCaja) displayCaja.innerText = `$${totalCaja.toFixed(2)}`;
        
        actualizarTabla();
        await sincronizarConServidor('VENTA', { id: id, nuevoStock: producto.stock });
    } else {
        alert("¡Sin stock!");
    }
}

// --- RENDERIZADO ---
function actualizarTabla() {
    if (esPaginaVentas) renderizarVentas(inventario);
    else if (esPaginaAdmin) renderizarAdmin(inventario);
}

function renderizarVentas(datos) {
    const tabla = document.getElementById('listaProductos');
    if (!tabla) return;
    tabla.innerHTML = datos.map(p => `
        <tr style="${p.stock < 5 ? 'color: red; font-weight: bold;' : ''}">
            <td>${p.nombre}</td>
            <td>$${p.precio.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><button class="btn-vender" onclick="vender(${p.id})">Vender 1</button></td>
        </tr>
    `).join('');
}

function renderizarAdmin(datos) {
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

function filtrarProductos() {
    const texto = document.getElementById('inputBusqueda').value.toLowerCase();
    const filtrados = inventario.filter(p => p.nombre.toLowerCase().includes(texto));
    if (esPaginaVentas) renderizarVentas(filtrados);
    else if (esPaginaAdmin) renderizarAdmin(filtrados);
}

// --- EDICIÓN Y ELIMINACIÓN ---
async function eliminarProducto(id) {
    if (confirm("¿Eliminar producto?")) {
        inventario = inventario.filter(p => p.id !== id);
        actualizarTabla();
        await sincronizarConServidor('ELIMINAR_PRODUCTO', { id });
    }
}

function prepararEdicion(id) {
    const p = inventario.find(item => item.id === id);
    if (!p) return;

    document.getElementById('nombrePro').value = p.nombre;
    document.getElementById('precioPro').value = p.precio;
    document.getElementById('stockPro').value = p.stock;

    const btn = document.getElementById('btnGuardar');
    btn.innerText = "Actualizar Cambios";
    btn.style.backgroundColor = "#ffc107";
    btn.onclick = () => confirmarEdicion(id);
}

async function confirmarEdicion(id) {
    const index = inventario.findIndex(p => p.id === id);
    inventario[index].nombre = document.getElementById('nombrePro').value;
    inventario[index].precio = parseFloat(document.getElementById('precioPro').value);
    inventario[index].stock = parseInt(document.getElementById('stockPro').value);

    const btn = document.getElementById('btnGuardar');
    btn.innerText = "Guardar";
    btn.style.backgroundColor = "#28a745";
    btn.onclick = agregarProducto;

    actualizarTabla();
    limpiarFormulario();
    await sincronizarConServidor('EDITAR_PRODUCTO', inventario[index]);
}

function limpiarFormulario() {
    const inputs = ['nombrePro', 'precioPro', 'stockPro'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

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









// Función para que un nuevo vendedor pida cuenta
async function registrarVendedor() {
    const nombre = prompt("Ingresa tu nombre completo:");
    const user = prompt("Crea un nombre de usuario:");
    const pass = prompt("Crea una contraseña:");

    if (nombre && user && pass) {
        try {
            const res = await fetch(`${URL_API}/registro`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nombre, usuario: user, pass })
            });
            const data = await res.json();
            alert(data.mensaje);
        } catch (e) {
            alert("Error al conectar con el servidor.");
        }
    }
}

// Función exclusiva del Admin para ver y aprobar
async function gestionarNuevosVendedores() {
    if (obtenerRol() !== "ADMIN") return;

    try {
        const res = await fetch(`${URL_API}/pendientes`);
        const pendientes = await res.json();

        if (pendientes.length === 0) {
            alert("No hay solicitudes de nuevos vendedores.");
            return;
        }

        // Listar y elegir a quién aprobar
        let lista = "Solicitudes pendientes:\n";
        pendientes.forEach((u, i) => lista += `${i}. ${u.nombre} (@${u.usuario})\n`);
        
        const index = prompt(lista + "\nEscribe el número del usuario para APROBAR:");
        
        if (pendientes[index]) {
            await fetch(`${URL_API}/aprobar`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ usuario: pendientes[index].usuario })
            });
            alert("¡Vendedor aprobado!");
        }
    } catch (e) {
        console.error(e);
    }
}