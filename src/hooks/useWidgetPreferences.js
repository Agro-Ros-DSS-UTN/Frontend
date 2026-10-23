import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const SCHEMA_VERSION = 1;

export const useWidgetPreferences = (pageKey, defaultCatalog = []) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.idUser || currentUser?.id || 'guest';
  const storageKey = `agro_widgets_${userId}_${pageKey}`;

  // Inicializa o fusiona con catálogo por defecto
  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return defaultCatalog.map((item, index) => ({
          id: item.id,
          visible: item.defaultVisible ?? true,
          order: index,
        }));
      }

      const parsed = JSON.parse(stored);
      // Validar esquema y fusionar posibles widgets nuevos agregados en updates
      const savedMap = new Map((parsed.widgets || []).map((w) => [w.id, w]));

      return defaultCatalog.map((item, index) => {
        const saved = savedMap.get(item.id);
        if (saved) {
          return {
            id: item.id,
            visible: typeof saved.visible === 'boolean' ? saved.visible : true,
            order: typeof saved.order === 'number' ? saved.order : index,
          };
        }
        // Nuevo widget no registrado previamente
        return {
          id: item.id,
          visible: item.defaultVisible ?? true,
          order: index,
        };
      }).sort((a, b) => a.order - b.order);
    } catch (e) {
      console.warn(`Error al leer preferencias de widgets para ${pageKey}:`, e);
      return defaultCatalog.map((item, index) => ({
        id: item.id,
        visible: item.defaultVisible ?? true,
        order: index,
      }));
    }
  }, [storageKey, defaultCatalog, pageKey]);

  const [widgetStates, setWidgetStates] = useState(loadPreferences);

  // Recarga si cambia el usuario o el catálogo
  useEffect(() => {
    setWidgetStates(loadPreferences());
  }, [loadPreferences]);

  // Guardar en localStorage cada vez que cambian los estados
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

  // Alternar visibilidad de un widget
  const toggleWidget = useCallback((widgetId) => {
    setWidgetStates((prev) => {
      const next = prev.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w));
      savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  // Activar o desactivar explícitamente
  const setWidgetVisible = useCallback((widgetId, visible) => {
    setWidgetStates((prev) => {
      const next = prev.map((w) => (w.id === widgetId ? { ...w, visible } : w));
      savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  // Reordenar widgets (mover arriba o abajo)
  const moveWidget = useCallback((widgetId, direction) => {
    setWidgetStates((prev) => {
      const index = prev.findIndex((w) => w.id === widgetId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      // Reasignar orden numérico correlativo
      const reindexed = next.map((w, idx) => ({ ...w, order: idx }));
      savePreferences(reindexed);
      return reindexed;
    });
  }, [savePreferences]);

  // Mostrar todos / Ocultar todos
  const setAllWidgetsVisibility = useCallback((visible) => {
    setWidgetStates((prev) => {
      const next = prev.map((w) => ({ ...w, visible }));
      savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  // Restablecer valores predeterminados
  const resetToDefaults = useCallback(() => {
    const defaults = defaultCatalog.map((item, index) => ({
      id: item.id,
      visible: item.defaultVisible ?? true,
      order: index,
    }));
    savePreferences(defaults);
  }, [defaultCatalog, savePreferences]);

  // Mapa rápido de visibilidad para render: isVisible('ah_roadmaps') -> boolean
  const visibilityMap = useMemo(() => {
    const map = {};
    widgetStates.forEach((w) => {
      map[w.id] = w.visible;
    });
    return map;
  }, [widgetStates]);

  const isVisible = useCallback((widgetId) => {
    return visibilityMap[widgetId] ?? true;
  }, [visibilityMap]);

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
