#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <sstream>
#include <stdexcept>

using namespace std;

// Estructura para organizar los datos del producto
struct Producto {
    string id;
    string nombre;
    double precio;
    int stock;
};

int main() {
    // 1. SISTEMA DE SEGURIDAD
    string password;
    const string CLAVE_CORRECTA = "sap123";

    cout << "========================================" << endl;
    cout << "   SISTEMA SAP - ACCESO RESTRINGIDO" << endl;
    cout << "========================================" << endl;
    cout << "Introduzca la clave de administrador: ";
    cin >> password;

    if (password != CLAVE_CORRECTA) {
        cout << "\a" << endl; // Emite un sonido de alerta (beep)
        cout << "ACCESO DENEGADO. El incidente ha sido reportado." << endl;
        return 0; // Termina el programa inmediatamente
    }

    cout << "\nAcceso concedido. Procesando datos...\n" << endl;

    // 2. PROCESAMIENTO DEL ARCHIVO CSV
    ifstream archivo("reporte_inventario.csv");
    string linea, celda;
    vector<Producto> lista;

    if (!archivo.is_open()) {
        cout << "ERROR CRITICO: No se encontro 'reporte_inventario.csv'." << endl;
        cout << "Asegurate de exportarlo desde la web a esta carpeta." << endl;
        return 1;
    }

    // Saltar la primera linea (cabecera del Excel/CSV)
    getline(archivo, linea);

    double valorTotalInventario = 0;

    while (getline(archivo, linea)) {
        if (linea.empty()) continue; // Evita errores con lineas en blanco

        stringstream ss(linea);
        Producto p;
        
        try {
            // Extraer datos separados por comas
            getline(ss, p.id, ',');
            getline(ss, p.nombre, ',');
            
            getline(ss, celda, ','); 
            p.precio = stod(celda); // Convertir texto a decimal
            
            getline(ss, celda, ','); 
            p.stock = stoi(celda);  // Convertir texto a entero

            valorTotalInventario += (p.precio * p.stock);
            lista.push_back(p);
        } 
        catch (...) {
            // Si hay un error en una fila, la salta y continua con la siguiente
            continue; 
        }
    }

    archivo.close();

    // 3. SALIDA DE RESULTADOS (REPORTING)
    cout << "----------------------------------------" << endl;
    cout << "   RESULTADOS DEL ANALISIS CONTABLE" << endl;
    cout << "----------------------------------------" << endl;
    cout << " > Productos liquidados:    " << lista.size() << endl;
    cout << " > Valor neto en almacen:   $" << valorTotalInventario << endl;
    cout << "----------------------------------------" << endl;
    cout << "Presione ENTER para salir...";
    cin.ignore();
    cin.get();

    return 0;
}