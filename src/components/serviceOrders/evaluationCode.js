// Número de la evaluación de servicio: es propio (el de la planilla) y se carga a mano.
// Si una evaluación todavía no lo tiene, se muestra el que se usaba antes, derivado
// del número de la orden ("OS-2026-0001" → "EV-2026-0001").
export const evaluationCode = (order) => {
  const own = String(order?.evaluation?.evaluationNumber || '').trim();
  if (own) return own;
  const number = String(order?.orderNumber || '').trim();
  if (!number) return 'EV';
  return /^OS-/i.test(number) ? number.replace(/^OS-/i, 'EV-') : `EV-${number}`;
};

export default evaluationCode;
