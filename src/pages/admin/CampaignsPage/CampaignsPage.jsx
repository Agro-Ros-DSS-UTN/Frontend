/**
 * @file CampaignsPage.jsx
 * @description Página de administración de Campañas y Promociones Comerciales.
 * Actúa como punto de entrada de la ruta `/admin/campaigns`, renderizando el
 * componente integral `PromotionsBoard` con la variante `"admin"`, lo cual
 * habilita la creación, edición, activación, vencimiento y eliminación de promociones,
 * descuentos por volumen y paquetes de productos para el equipo comercial.
 */

import { PromotionsBoard } from '../../../components/promotions/PromotionsBoard';

/**
 * Componente de página `CampaignsPage`.
 * Delega la gestión visual y funcional del tablero de promociones al componente
 * `PromotionsBoard` aplicando los permisos y vistas del rol Administrador.
 *
 * @returns {JSX.Element} Tablero de promociones en modalidad administrativa.
 */
export const CampaignsPage = () => (
  /* Renderizado del tablero de promociones con privilegios administrativos */
  <PromotionsBoard variant="admin" />
);

export default CampaignsPage;
