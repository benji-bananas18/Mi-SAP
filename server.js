const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- BASE DE DATOS TEMPORAL (Se reinicia si el servidor se apaga) ---
let productos = [];
let usuariosPendientes = []; 
let usuariosActivos = [
    { usuario: "admin", pass: "sap123", rol: "ADMIN" } 
];

// --- RUTAS DE PRODUCTOS ---

// Obtener inventario
app.get('/api/productos', (req, res) => {
    res.json(productos);
});

// Sincronizar cambios (Ventas, Ediciones, Nuevos)
app.post('/api/productos', (req, res) => {
    const { accion, inventario } = req.body;
    
    if (inventario) {
        productos = inventario; // Actualizamos la lista global
        console.log(`Acción recibida: ${accion}. Inventario actualizado.`);
        res.status(201).json({ mensaje: "Sincronizado con éxito" });
    } else {
        res.status(400).json({ error: "Datos de inventario no recibidos" });
    }
});

// --- RUTAS DE USUARIOS Y ROLES ---

// 1. Registro inicial (Vendedor solicita acceso)
app.post('/api/registro', (req, res) => {
    const { nombre, usuario, pass } = req.body;
    
    // Evitar duplicados en pendientes
    if (usuariosPendientes.find(u => u.usuario === usuario)) {
        return res.status(400).json({ mensaje: "Este usuario ya tiene una solicitud pendiente." });
    }

    usuariosPendientes.push({ nombre, usuario, pass });
    console.log(`Nueva solicitud de: ${usuario}`);
    res.json({ mensaje: "Solicitud enviada. Espera la aprobación del admin." });
});

// 2. Ver solicitudes (Solo para el Admin)
app.get('/api/pendientes', (req, res) => {
    res.json(usuariosPendientes);
});

// 3. Aprobar vendedor
app.post('/api/aprobar', (req, res) => {
    const { usuario } = req.body;
    const index = usuariosPendientes.findIndex(u => u.usuario === usuario);
    
    if (index !== -1) {
        const aprobado = usuariosPendientes.splice(index, 1)[0];
        aprobado.rol = "VENDEDOR"; 
        usuariosActivos.push(aprobado);
        console.log(`Usuario ${usuario} aprobado como Vendedor.`);
        res.json({ mensaje: `Usuario ${usuario} ahora es Vendedor.` });
    } else {
        res.status(404).json({ error: "Usuario no encontrado" });
    }
});

// 4. Login unificado
app.post('/api/login', (req, res) => {
    const { usuario, pass } = req.body;
    const user = usuariosActivos.find(u => u.usuario === usuario && u.pass === pass);
    
    if (user) {
        res.json({ login: true, rol: user.rol });
    } else {
        res.status(401).json({ login: false, mensaje: "Credenciales inválidas o cuenta no activa" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor SAP corriendo en puerto ${PORT}`);
});