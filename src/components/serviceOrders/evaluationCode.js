// Código de la evaluación de servicio: la evaluación es una por orden, así que su
// código sale del número de la orden ("OS-2026-0001" → "EV-2026-0001").
export const evaluationCode = (order) => {
  const number = String(order?.orderNumber || '').trim();
  if (!number) return 'EV';
  return /^OS-/i.test(number) ? number.replace(/^OS-/i, 'EV-') : `EV-${number}`;
};

export default evaluationCode;
