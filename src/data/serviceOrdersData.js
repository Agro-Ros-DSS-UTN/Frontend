// src/data/serviceOrdersData.js
// Catálogo jerárquico de Clientes -> Centros / Filiales -> Plantas (con direcciones)
// y conjunto de datos de Órdenes de Servicio para Agroquímica Rosario

export const HIERARCHICAL_CLIENTS_CATALOG = [
  {
    id: 'cli-afa',
    nombreCliente: 'AFA SCL (Agricultores Federados Argentinos)',
    cuit: '30-50012076-2',
    centros: [
      {
        id: 'cen-marcos-juarez',
        nombreCentro: 'Centro Marcos Juárez',
        plantas: [
          {
            id: 'pl-mj-acopio-norte',
            nombrePlanta: 'Planta Acopio Norte - Silos 1 al 12',
            direccion: 'Ruta Nacional 9 Km 435',
            localidad: 'Marcos Juárez',
            provincia: 'Córdoba',
            contactoPlanta: 'Ing. Carlos Rossi',
            telefonoPlanta: '+54 3472 42-5566'
          },
          {
            id: 'pl-mj-celda-granos',
            nombrePlanta: 'Celda de Granos y Depósito de Agroquímicos',
            direccion: 'Calle Los Piamonteses 450',
            localidad: 'Marcos Juárez',
            provincia: 'Córdoba',
            contactoPlanta: 'Mariano Beltrán',
            telefonoPlanta: '+54 3472 45-8899'
          }
        ]
      },
      {
        id: 'cen-casilda',
        nombreCentro: 'Sub Centro Casilda',
        plantas: [
          {
            id: 'pl-cas-acopio-a',
            nombrePlanta: 'Planta de Acopio A - Batería de Silos',
            direccion: 'Bv. Ovidio Lagos 1250',
            localidad: 'Casilda',
            provincia: 'Santa Fe',
            contactoPlanta: 'Roberto Aguilar',
            telefonoPlanta: '+54 341 456-7890'
          },
          {
            id: 'pl-cas-secadora',
            nombrePlanta: 'Planta Secadora y Acondicionamiento',
            direccion: 'Ruta Provincial 33 Km 748',
            localidad: 'Casilda',
            provincia: 'Santa Fe',
            contactoPlanta: 'Federico Santoro',
            telefonoPlanta: '+54 3464 42-1133'
          }
        ]
      },
      {
        id: 'cen-pergamino',
        nombreCentro: 'Regional Pergamino',
        plantas: [
          {
            id: 'pl-per-semillas',
            nombrePlanta: 'Planta Procesamiento y Tratamiento de Semillas',
            direccion: 'Ruta Nacional 8 Km 222',
            localidad: 'Pergamino',
            provincia: 'Buenos Aires',
            contactoPlanta: 'Ing. Fernando Benítez',
            telefonoPlanta: '+54 2477 43-4400'
          }
        ]
      },
      {
        id: 'cen-rafaela',
        nombreCentro: 'Sub Centro Rafaela',
        plantas: [
          {
            id: 'pl-raf-acopio',
            nombrePlanta: 'Planta Acopio Central Rafaela',
            direccion: 'Av. Italia 1890',
            localidad: 'Rafaela',
            provincia: 'Santa Fe',
            contactoPlanta: 'Guillermo Vico',
            telefonoPlanta: '+54 3492 50-1234'
          }
        ]
      }
    ]
  },
  {
    id: 'cli-cargill',
    nombreCliente: 'Cargill S.A.C.I.',
    cuit: '30-50284422-9',
    centros: [
      {
        id: 'cen-cargill-pto-alvear',
        nombreCentro: 'Terminal Portuaria Puerto Alvear',
        plantas: [
          {
            id: 'pl-carg-silos-pto',
            nombrePlanta: 'Terminal Elevadora Silos de Embarque',
            direccion: 'Zona Portuaria Km 398',
            localidad: 'Villa Gobernador Gálvez',
            provincia: 'Santa Fe',
            contactoPlanta: 'Hernán Di Bernardo',
            telefonoPlanta: '+54 341 498-7700'
          }
        ]
      },
      {
        id: 'cen-cargill-venado',
        nombreCentro: 'Sucursal Venado Tuerto',
        plantas: [
          {
            id: 'pl-carg-venado-acopio',
            nombrePlanta: 'Planta Acopio y Despacho Venado',
            direccion: 'Ruta Nacional 33 Km 630',
            localidad: 'Venado Tuerto',
            provincia: 'Santa Fe',
            contactoPlanta: 'Marcelo Gómez',
            telefonoPlanta: '+54 3462 43-7788'
          }
        ]
      }
    ]
  },
  {
    id: 'cli-bunge',
    nombreCliente: 'Bunge Argentina S.A.',
    cuit: '30-50275850-0',
    centros: [
      {
        id: 'cen-bunge-totoras',
        nombreCentro: 'Filial Totoras',
        plantas: [
          {
            id: 'pl-bunge-totoras-planta',
            nombrePlanta: 'Planta Integral Silos y Celdas Totoras',
            direccion: 'Ruta Provincial 91 S/N',
            localidad: 'Totoras',
            provincia: 'Santa Fe',
            contactoPlanta: 'Ing. Santiago Varela',
            telefonoPlanta: '+54 3476 49-5500'
          }
        ]
      }
    ]
  },
  {
    id: 'cli-coop-pergamino',
    nombreCliente: 'Cooperativa Agrícola de Pergamino',
    cuit: '30-50123987-4',
    centros: [
      {
        id: 'cen-coop-central',
        nombreCentro: 'Sede Central y Silos',
        plantas: [
          {
            id: 'pl-coop-acopio-central',
            nombrePlanta: 'Complejo de Acopio y Acondicionamiento Pergamino',
            direccion: 'Calle San Martín 890',
            localidad: 'Pergamino',
            provincia: 'Buenos Aires',
            contactoPlanta: 'Silvia Marchetti',
            telefonoPlanta: '+54 2477 44-5566'
          }
        ]
      }
    ]
  }
];

export const INITIAL_SERVICE_ORDERS = [
  {
    id: 'os-1',
    numeroOrden: 'OS-2026-0041',
    fecha: '2026-09-07',
    clienteId: 'cli-afa',
    clienteNombre: 'AFA SCL (Agricultores Federados Argentinos)',
    centroId: 'cen-marcos-juarez',
    centroNombre: 'Centro Marcos Juárez',
    plantaId: 'pl-mj-acopio-norte',
    plantaNombre: 'Planta Acopio Norte - Silos 1 al 12',
    direccion: 'Ruta Nacional 9 Km 435',
    localidad: 'Marcos Juárez',
    provincia: 'Córdoba',
    tipoTrabajo: 'Fumigación de Silos',
    estado: 'Completada',
    tecnicoAplicador: 'Juan Carlos Pereyra (Mat. 4812)',
    observacionesOrden: 'Tratamiento de choque en batería de 8 silos de trigo. Hermetizado completo con láminas de polietileno 200 micrones.',
    productosAplicados: [
      {
        producto: 'Fosfuro de Aluminio (Pastillas Phostoxin)',
        principioActivo: 'Fosfuro de aluminio 56%',
        dosis: '3.5 pastillas por m³',
        lote: 'FA-2026-09A',
        tiempoCarencia: '120 horas (5 días)',
        cantidadTotal: '45 kg'
      },
      {
        producto: 'Deltametrina K-Obiol EC 25',
        principioActivo: 'Deltametrina 2.5%',
        dosis: '10 ml / 100 kg de grano',
        lote: 'KO-2026-04B',
        tiempoCarencia: '48 horas',
        cantidadTotal: '15 Litros'
      }
    ],
    evaluacion: {
      fechaEvaluacion: '2026-09-07T17:30:00Z',
      calificacion: 5,
      conformidad: 'Conforme',
      cumplimientoEPP: true,
      puntualidad: true,
      limpiezaArea: true,
      observacionesTecnicas: 'Hermeticidad óptima constatada con detector de gases. Concentración de fosfina medida a las 4 hs dentro de rangos normales.',
      responsableReceptor: 'Ing. Carlos Rossi',
      dniReceptor: '24.891.432',
      cargoReceptor: 'Encargado General de Planta'
    }
  },
  {
    id: 'os-2',
    numeroOrden: 'OS-2026-0042',
    fecha: '2026-09-08',
    clienteId: 'cli-afa',
    clienteNombre: 'AFA SCL (Agricultores Federados Argentinos)',
    centroId: 'cen-casilda',
    centroNombre: 'Sub Centro Casilda',
    plantaId: 'pl-cas-acopio-a',
    plantaNombre: 'Planta de Acopio A - Batería de Silos',
    direccion: 'Bv. Ovidio Lagos 1250',
    localidad: 'Casilda',
    provincia: 'Santa Fe',
    tipoTrabajo: 'Desinsectación y Pulverización',
    estado: 'En Ejecución',
    tecnicoAplicador: 'Martín Sequeira',
    observacionesOrden: 'Tratamiento perimetral en norias, túneles de descarga y celdas de maíz recién cosechado.',
    productosAplicados: [
      {
        producto: 'Cipermetrina 25% AgroRos Tech',
        principioActivo: 'Cipermetrina 250 g/L',
        dosis: '150 ml cada 10 litros de agua',
        lote: 'CIP-2026-11C',
        tiempoCarencia: '24 horas',
        cantidadTotal: '8 Litros'
      }
    ],
    evaluacion: null
  },
  {
    id: 'os-3',
    numeroOrden: 'OS-2026-0043',
    fecha: '2026-09-09',
    clienteId: 'cli-cargill',
    clienteNombre: 'Cargill S.A.C.I.',
    centroId: 'cen-cargill-pto-alvear',
    centroNombre: 'Terminal Portuaria Puerto Alvear',
    plantaId: 'pl-carg-silos-pto',
    plantaNombre: 'Terminal Elevadora Silos de Embarque',
    direccion: 'Zona Portuaria Km 398',
    localidad: 'Villa Gobernador Gálvez',
    provincia: 'Santa Fe',
    tipoTrabajo: 'Control Integral de Plagas',
    estado: 'Programada',
    tecnicoAplicador: 'Esteban Funes',
    observacionesOrden: 'Control preventivo pre-embarque en silos de exportación. Verificación de barreras mecánicas y cebaderas.',
    productosAplicados: [
      {
        producto: 'Pirimifos-metil Actellic 50 CE',
        principioActivo: 'Pirimifos-metil 50%',
        dosis: '8 ml / tonelada',
        lote: 'ACT-2026-03F',
        tiempoCarencia: '72 horas',
        cantidadTotal: '20 Litros'
      }
    ],
    evaluacion: null
  },
  {
    id: 'os-4',
    numeroOrden: 'OS-2026-0040',
    fecha: '2026-09-04',
    clienteId: 'cli-bunge',
    clienteNombre: 'Bunge Argentina S.A.',
    centroId: 'cen-bunge-totoras',
    centroNombre: 'Filial Totoras',
    plantaId: 'pl-bunge-totoras-planta',
    plantaNombre: 'Planta Integral Silos y Celdas Totoras',
    direccion: 'Ruta Provincial 91 S/N',
    localidad: 'Totoras',
    provincia: 'Santa Fe',
    tipoTrabajo: 'Fumigación de Silos',
    estado: 'Completada',
    tecnicoAplicador: 'Juan Carlos Pereyra',
    observacionesOrden: 'Fumigación de celda subterránea N° 2. Sellado de ventilaciones.',
    productosAplicados: [
      {
        producto: 'Fosfuro de Magnesio (Degesch Plates)',
        principioActivo: 'Fosfuro de magnesio 56%',
        dosis: '1 placa cada 30 m³',
        lote: 'MAG-2026-08D',
        tiempoCarencia: '96 horas',
        cantidadTotal: '12 Placas'
      }
    ],
    evaluacion: {
      fechaEvaluacion: '2026-09-05T10:00:00Z',
      calificacion: 5,
      conformidad: 'Conforme',
      cumplimientoEPP: true,
      puntualidad: true,
      limpiezaArea: true,
      observacionesTecnicas: 'Servicio impecable. Cumplimiento estricto de protocolos de seguridad exigidos por Bunge.',
      responsableReceptor: 'Ing. Santiago Varela',
      dniReceptor: '29.334.120',
      cargoReceptor: 'Jefe de Planta y Silos'
    }
  }
];

export const WORK_TYPES = [
  'Fumigación de Silos',
  'Desinsectación y Pulverización',
  'Desratización y Cebaderos',
  'Control Integral de Plagas',
  'Sanitización y Desinfección',
  'Tratamiento de Granos en Tránsito',
  'Otro'
];

export const ORDER_STATUSES = [
  { key: 'Programada', label: 'Programada', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'En Ejecución', label: 'En Ejecución', color: '#d97706', bg: '#fffbeb' },
  { key: 'Completada', label: 'Completada', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'Pendiente de Evaluación', label: 'Pendiente de Evaluación', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'Cancelada', label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
];

const STORAGE_KEY = 'agroros_service_orders_db';

export const getStoredServiceOrders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading service orders from localStorage:', err);
  }
  return INITIAL_SERVICE_ORDERS;
};

export const saveStoredServiceOrders = (orders) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Error saving service orders to localStorage:', err);
  }
};
