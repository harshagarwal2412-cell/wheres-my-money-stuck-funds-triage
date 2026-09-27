import { RAILS } from "./config";
import { fmtAge, usd } from "./format";
import type { CauseId, Lang, TriagedTransfer } from "./types";

export interface CustomerMessage {
  /** Index of the current step in the 4-step progress bar. */
  step: number;
  /** Whether the current step is shown as a problem. */
  bad: boolean;
  body: string;
}

const eta = (x: TriagedTransfer): string => fmtAge(Math.max(RAILS[x.rail].sla - x.ageH, 0));

/**
 * Customer-facing copy. Facts (amount, step, reason, deadline) come from the
 * classifier; wording is a fixed template. A language model could adjust tone,
 * but never decides what is true about someone's money.
 */
export function message(x: TriagedTransfer, lang: Lang): CustomerMessage {
  const A = usd(x.amt);
  const rl = RAILS[x.rail].label;
  const es = lang === "es";

  const templates: Record<CauseId, [number, boolean, string]> = {
    ON_TRACK: [2, false, es
      ? `Tu ${A} va en camino. Normalmente llega en ${eta(x)} más. No tienes que hacer nada.`
      : `Your ${A} is on its way. It usually lands within ${eta(x)}. Nothing you need to do.`],
    LATE: [2, true, es
      ? `Tu ${A} está tardando más de lo normal con nuestro socio bancario. Ya lo escalamos y te avisamos apenas se mueva. Tu dinero no se ha perdido.`
      : `Your ${A} is taking longer than usual at our banking partner. We've escalated it and will update you as soon as it moves. Your money isn't lost.`],
    HOLD_SILENT: [3, true, es
      ? `Estamos revisando esta transferencia de ${A}, algo que hacemos por seguridad. Tu dinero está seguro. Te diremos exactamente qué necesitamos en menos de 24 horas.`
      : `We're reviewing this ${A} transfer, which we do for security. Your money is safe. We'll tell you exactly what we need within 24 hours.`],
    HOLD_DOC: [3, true, es
      ? `Para liberar tus ${A} necesitamos: ${x.docNeeded}. Súbelo aquí y lo revisamos el mismo día.`
      : `To release your ${A} we need: ${x.docNeeded}. Upload it here and we'll review it the same day.`],
    DESYNC: [3, true, es
      ? `Tus ${A} ya llegaron. Un error de nuestro lado no los sumó a tu saldo. Lo estamos corrigiendo ahora y verás el saldo actualizado pronto.`
      : `Your ${A} arrived. An error on our side didn't add it to your balance. We're fixing it now and you'll see the updated balance shortly.`],
    UNMATCHED: [2, true, es
      ? `Recibimos ${A}, pero la transferencia llegó sin tu referencia. ¿Puedes enviarnos el comprobante del banco? Con eso la asignamos a tu cuenta.`
      : `We received ${A}, but it arrived without your reference. Can you send us the bank receipt? That's how we'll match it to your account.`],
    RETURNED: [2, true, es
      ? `Tu banco devolvió los ${A} (${x.returnCode}). El dinero vuelve a tu cuenta de origen. Revisa los datos e inténtalo de nuevo.`
      : `Your bank returned the ${A} (${x.returnCode}). The money goes back to your source account. Check the details and try again.`],
    WRONG_NET: [1, true, es
      ? `Tus ${A} se enviaron por ${x.network}, pero esta dirección es de ${x.expectedNet}. Nuestro equipo puede intentar recuperarlos. No vuelvas a enviar a esta dirección por ${x.network}.`
      : `Your ${A} was sent on ${x.network}, but this address is on ${x.expectedNet}. Our team can try to recover it. Don't send to this address on ${x.network} again.`],
    MAINT: [2, true, es
      ? `${rl} está en mantenimiento y tu ${A} quedó en espera. Tu dinero está seguro. Te avisamos cuando se reanude.`
      : `${rl} is down for maintenance and your ${A} is on hold. Your money is safe. We'll let you know when it resumes.`],
    UNKNOWN: [1, true, es
      ? `Estamos revisando tu transferencia de ${A}. Un agente te escribirá hoy.`
      : `We're looking into your ${A} transfer. An agent will message you today.`],
  };

  const [step, bad, body] = templates[x.cause];
  return { step, bad, body };
}

export const STEP_LABELS: Record<Lang, string[]> = {
  es: ["Enviado", "Recibido por el banco", "Revisión", "En tu saldo"],
  en: ["Sent", "Received by partner", "Checks", "In your balance"],
};
