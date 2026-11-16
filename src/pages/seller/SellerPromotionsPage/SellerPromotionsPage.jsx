/**
 * @file SellerPromotionsPage.jsx
 * @description Página de catálogo y consulta de promociones comerciales para el rol de Vendedor.
 * Actúa como punto de entrada de la ruta `/seller/promotions`, renderizando el componente
 * transversal `PromotionsBoard` con la variante "seller", lo que permite a los vendedores
 * consultar descuentos vigentes, listas de precios especiales y condiciones comerciales
 * aplicables a sus clientes sin disponer de permisos para crear o modificar promociones.
 */

import { PromotionsBoard } from '../../../components/promotions/PromotionsBoard';

/**
 * Componente principal de la página de promociones para vendedores.
 * Renderiza el tablero de promociones (`PromotionsBoard`) pasando la propiedad `variant="seller"`
 * para ofrecer una vista optimizada de solo lectura o consulta comercial en el terreno.
 */
export const SellerPromotionsPage = () => <PromotionsBoard variant="seller" />;

export default SellerPromotionsPage;
