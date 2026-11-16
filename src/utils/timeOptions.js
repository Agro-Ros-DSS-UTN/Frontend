/**
 * @file timeOptions.js
 * @description Constantes y configuraciones horarias compartidas para la planificación de Hojas de Ruta.
 * Define la lista de horarios válidos para las paradas y el límite máximo de paradas permitidas por hoja.
 * Al centralizarse aquí, se asegura consistencia entre los paneles y formularios del administrador y del vendedor.
 */

// Horarios disponibles para las paradas de una Hoja de Ruta — compartido
// entre el formulario de planificación del admin y el del vendedor para que
// sean exactamente el mismo listado en ambos portales.

/**
 * Listado ordenado de franjas horarias disponibles (formato HH:mm) en intervalos de 30 minutos,
 * abarcando desde las 06:00 hasta las 22:00.
 * Se utiliza para poblar los selectores de hora al asignar o editar una parada en la hoja de ruta.
 */
export const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

/**
 * Cantidad máxima de paradas permitidas en una única Hoja de Ruta diaria.
 * Se utiliza como cota superior en validaciones de formulario y para deshabilitar
 * la adición de nuevas paradas cuando se alcanza este límite.
 */
export const MAX_ROADMAP_STOPS = 8;
