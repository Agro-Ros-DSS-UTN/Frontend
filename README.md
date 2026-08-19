# AgroRosario — Frontend

**Aplicación web de gestión y comunicación interna para Agroquímica Rosario**  
Trabajo Práctico — UTN FRRo, Ingeniería en Sistemas de Información  

---

##  Descripción

Este repositorio contiene la interfaz de usuario (**Frontend**) de la plataforma **AgroRosario**. Está diseñada como una aplicación de página única (SPA) moderna, ágil y adaptada a dispositivos de campo (notebooks, tablets y smartphones), permitiendo digitalizar la comunicación entre la fuerza de ventas técnica y la administración central.

La plataforma elimina la dispersión de datos en planillas y chats individuales de WhatsApp, centralizando la planificación de objetivos, hojas de ruta diarias, registro de visitas agronómicas con captura multimedia en tiempo real y el pipeline comercial completo.

---

##  Stack Tecnológico y Dependencias

| Tecnología | Rol / Propósito |
|---|---|
| **React** | Biblioteca principal para la construcción de interfaces modulares e interactivas |
| **Vite** | Entorno de desarrollo y empaquetador ultrarrápido con Hot Module Replacement (HMR) |
| **React Router DOM** | Enrutamiento declarativo del lado del cliente y protección de rutas por rol |
| **Lucide React** | Librería de iconografía vectorial moderna y consistente |
| **Web Audio API & MediaRecorder** | Grabación y reproducción de notas de voz reales en campo con visualización de ondas (*waveform dots*) |
| **Vanilla CSS Modular** | Sistema de diseño basado en CSS Custom Properties (variables globales, tokens de diseño y componentes responsivos) |
| **JWT (JSON Web Token)** | Persistencia de sesión segura y autorización de peticiones a la API |

---

##  Características y Módulos Principales

###  Portal de Administración
- **Panel de Control (Dashboard):** Visualización en tiempo real del desempeño comercial, facturación, volumen potencial y alertas de clientes sin contacto.
- **Pipeline de Oportunidades:** Seguimiento comercial por etapas (*Prospecto → Lead → Negociación → Activo / Perdido*).
- **Gestión de Empresas y Contactos (Ficha 360°):** Visualización relacional que conecta a cada empresa con sus contactos, oportunidades de negocio y actividades de campo registradas.
- **Asignación de Objetivos y Hojas de Ruta:** Definición de metas semanales de visitas y ventas asignadas a cada vendedor.
- **Gestión de Promociones y Catálogos:** Publicación de condiciones comerciales, combos de insumos y líneas de productos vigentes.

###  Portal del Vendedor en Campo
- **Inicio y Cumplimiento de Metas:** Resumen semanal de progreso de visitas y facturación asignada.
- **Hoja de Ruta Diaria:** Itinerario de visitas sugeridas para optimizar recorridos en territorio.
- **Libreta de Campo Digital:**
  - 🎙️ **Grabación de Notas de Voz:** Grabación directa con el micrófono y reproducción interactiva antes y después de enviar.
  - 📸 **Monitoreo Fotográfico de Lotes:** Carga de capturas de estado de cultivos, plagas y malezas con visor *lightbox* en alta definición.
  - 📄 **Adjuntos de Remitos y PDFs:** Subida y descarga de constancias y presupuestos firmados.
- **Gestión de Cartera de Clientes:** Consulta ágil de datos de contacto, ubicación e historial agronómico.

---

##  Estructura del Proyecto

```text
src/
├── assets/             # Logos, imágenes de lotes y recursos estáticos
├── components/         # Componentes reutilizables
│   ├── layout/         # Sidebars, TopBars y Layouts protegidos (Admin y Seller)
│   ├── modals/         # Modales de creación, edición y visualizadores multimedia
│   └── ui/             # Botones, tablas, badges y reproductores de audio
├── context/            # AuthContext (autenticación JWT y roles de usuario)
├── data/               # Servicios de conexión con la API REST y mocks de desarrollo
├── pages/              # Vistas organizadas por rol
│   ├── admin/          # Dashboard, Empresas, Contactos, Oportunidades, Actividades, etc.
│   ├── seller/         # Metas, Hoja de Ruta, Libreta de Campo, Clientes, etc.
│   └── auth/           # Pantalla de Login y recuperación de credenciales
├── styles/             # Variables CSS globales, tipografía y resets
├── App.jsx             # Definición de rutas y jerarquía de vistas
└── main.jsx            # Punto de entrada de la aplicación
