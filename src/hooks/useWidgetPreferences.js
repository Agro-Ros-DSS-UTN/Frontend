/**
 * @file useWidgetPreferences.js
 * @description Hook personalizado de React para administrar, reordenar y persistir las preferencias
 * de visualización de widgets en paneles de control y dashboards (ej: visibilidad y orden de tarjetas).
 *
 * Características principales:
 * - Persistencia por usuario y por pantalla en `localStorage`.
 * - Control de versiones del esquema (`SCHEMA_VERSION`) para compatibilidad futura.
 * - Fusión inteligente con el catálogo predeterminado: si una actualización del sistema añade
 *   nuevos widgets, se incorporan automáticamente respetando las preferencias previas del usuario.
 * - Operaciones de alternar visibilidad, reordenamiento (subir/bajar), mostrar/ocultar todos y reseteo a valores de fábrica.
 * - Generación de un mapa de visibilidad memoizado para consultas rápidas O(1) durante el renderizado.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Versión del esquema de almacenamiento. Permite migrar datos si la estructura cambia en el futuro.
 */
const SCHEMA_VERSION = 1;

/**
 * Hook para gestionar las preferencias de widgets de una página específica.
 *
 * @param {string} pageKey - Clave única que identifica la página o dashboard (ej: 'dashboard_admin', 'dashboard_seller').
 * @param {Array<{ id: string, defaultVisible?: boolean }>} [defaultCatalog=[]] - Catálogo base de widgets disponibles con su configuración predeterminada.
 * @returns {Object} API del hook con estados actuales, funciones de mutación y contadores.
 */
export const useWidgetPreferences = (pageKey, defaultCatalog = []) => {
  // Obtención del usuario autenticado para aislar las preferencias entre diferentes cuentas
  const { currentUser } = useAuth();
  const userId = currentUser?.idUser || currentUser?.id || 'guest';

  // Clave compuesta única en localStorage: combina el ID del usuario y el identificador de página
  const storageKey = `agro_widgets_${userId}_${pageKey}`;

  /**
   * Carga las preferencias guardadas desde localStorage y las combina con el catálogo por defecto.
   * Maneja casos en los que no existan preferencias previas, datos corruptos o nuevos widgets introducidos en el código.
   */
  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);

      // Si no hay datos guardados previamente, inicializar con el orden y visibilidad por defecto
      if (!stored) {
        return defaultCatalog.map((item, index) => ({
          id: item.id,
          visible: item.defaultVisible ?? true,
          order: index,
        }));
      }

      const parsed = JSON.parse(stored);
      // Mapa auxiliar para consultar rápidamente la configuración guardada por ID de widget
      const savedMap = new Map((parsed.widgets || []).map((w) => [w.id, w]));

      // Validar esquema y fusionar posibles widgets nuevos agregados en actualizaciones
      return defaultCatalog.map((item, index) => {
        const saved = savedMap.get(item.id);
        if (saved) {
          // Si el widget ya estaba configurado por el usuario, respetar sus preferencias
          return {
            id: item.id,
            visible: typeof saved.visible === 'boolean' ? saved.visible : true,
            order: typeof saved.order === 'number' ? saved.order : index,
          };
        }
        // Nuevo widget no registrado previamente en el almacenamiento del usuario
        return {
          id: item.id,
          visible: item.defaultVisible ?? true,
          order: index,
        };
      }).sort((a, b) => a.order - b.order); // Ordenar según la posición numérica guardada
    } catch (e) {
      // Captura y respaldo en caso de error de lectura o JSON mal formado
      console.warn(`Error al leer preferencias de widgets para ${pageKey}:`, e);
      return defaultCatalog.map((item, index) => ({
        id: item.id,
        visible: item.defaultVisible ?? true,
        order: index,
      }));
    }
  }, [storageKey, defaultCatalog, pageKey]);

  // Estado local que almacena la lista ordenada de configuraciones de widgets
  const [widgetStates, setWidgetStates] = useState(loadPreferences);

  // Efecto que recarga las preferencias si cambia el usuario activo o el catálogo de widgets
  useEffect(() => {
    setWidgetStates(loadPreferences());
  }, [loadPreferences]);

  /**
   * Persiste la configuración actual de widgets en localStorage con metadatos de auditoría y esquema.
   */
  const savePreferences = useCallback((newStates) => {
    setWidgetStates(newStates);
    try {
      const payload = {
        version: SCHEMA_VERSION,
        userId,
        page: pageKey,
        updatedAt: new Date().toISOString(),
        widgets: newStates,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.error('Error al persistir preferencias de widgets:', e);
    }
  }, [storageKey, userId, pageKey]);

  /**
   * Alterna la visibilidad (mostrar/ocultar) de un widget específico por su ID.
   */
  const toggleWidget = useCallback((widgetId) => {
    setWidgetStates((prev) => {
      const next = prev.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w));
      savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  /**
   * Establece explícitamente el estado de visibilidad booleano de un widget.
   */
  const setWidgetVisible = useCallback((widgetId, visible) => {
    setWidgetStates((prev) => {
      const next = prev.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w));
      savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  /**
   * Reordena un widget desplazándolo una posición hacia arriba ('up') o hacia abajo ('down').
   * Intercambia posiciones con el elemento contiguo y reindexa los números de orden correlativamente.
   */
  const moveWidget = useCallback((widgetId, direction) => {
    setWidgetStates((prev) => {
      const index = prev.findIndex((w) => w.id === widgetId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      // Prevenir desbordamiento de límites de la lista
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      // Reasignar orden numérico correlativo (0, 1, 2...) para mantener consistencia
      const reindexed = next.map((w, idx) => ({ ...w, order: idx }));
      savePreferences(reindexed);
      return reindexed;
    });
  }, [savePreferences]);

  /**
   * Establece masivamente la visibilidad de todos los widgets (mostrar todos o esconder todos).
   */
  const setAllWidgetsVisibility = useCallback((visible) => {
    setWidgetStates((prev) => {
      const next = prev.map((w) => ({ ...w, visible }));
      savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  /**
   * Restablece la configuración de widgets a los valores iniciales provistos por el catálogo por defecto.
   */
  const resetToDefaults = useCallback(() => {
    const defaults = defaultCatalog.map((item, index) => ({
      id: item.id,
      visible: item.defaultVisible ?? true,
      order: index,
    }));
    savePreferences(defaults);
  }, [defaultCatalog, savePreferences]);

  /**
   * Diccionario memoizado de búsqueda rápida O(1) de visibilidad por ID de widget.
   * Evita recorrer el array en cada render de cada tarjeta del dashboard.
   */
  const visibilityMap = useMemo(() => {
    const map = {};
    widgetStates.forEach((w) => {
      map[w.id] = w.visible;
    });
    return map;
  }, [widgetStates]);

  /**
   * Consulta si un widget específico debe mostrarse o no.
   * Por defecto retorna `true` si el widget no está registrado.
   */
  const isVisible = useCallback((widgetId) => {
    return visibilityMap[widgetId] ?? true;
  }, [visibilityMap]);

  // Cantidad total de widgets que actualmente tienen visibilidad activa
  const activeCount = useMemo(() => widgetStates.filter((w) => w.visible).length, [widgetStates]);

  return {
    widgetStates,
    isVisible,
    toggleWidget,
    setWidgetVisible,
    moveWidget,
    setAllWidgetsVisibility,
    resetToDefaults,
    activeCount,
    totalCount: defaultCatalog.length,
  };
};

export default useWidgetPreferences;
