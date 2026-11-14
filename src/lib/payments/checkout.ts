/* Razorpay Checkout in the browser, shared by ticket and sponsor payments. */

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay]');
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('The payment window could not be loaded. Check your connection and try again.')));
    if (!existing) {
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpay = 'true';
      document.body.appendChild(script);
    }
  });
}

/**
 * Creates the order on the server (`orderUrl`), opens Razorpay Checkout and verifies the payment.
 * Resolves with the paid order ID; rejects with a message to show when the payment fails or is closed.
 * The server decides the amount; the browser only says what is being bought.
 */
export async function payWithRazorpay(input: {
  orderUrl: string;
  orderBody: Record<string, unknown>;
  /** Shown as the merchant name in the payment window, e.g. the event name */
  title: string;
  name: string;
  email: string;
  phone: string;
  color?: string;
  /** Wording for the "not booked yet" message when the window is closed */
  cancelledMessage?: string;
}): Promise<string> {
  const res = await fetch(input.orderUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input.orderBody),
  });
  const order = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(order.error || 'The payment could not be started. Please try again.');

  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('The payment window could not be loaded.');

  return new Promise<string>((resolve, reject) => {
    let lastFailure: string | null = null;
    let settled = false;
    const rz = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: input.title,
      description: order.description ?? order.ticketName,
      prefill: { name: input.name, email: input.email, contact: input.phone },
      theme: { color: input.color && /^#[0-9a-f]{3,6}$/i.test(input.color) ? input.color : '#5A3DE0' },
      handler: async (response: RazorpayResponse) => {
        settled = true;
        try {
          const verify = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
          });
          const json = await verify.json().catch(() => ({}));
          if (!verify.ok) throw new Error(json.error || 'The payment could not be verified.');
          resolve(response.razorpay_order_id);
        } catch (err) {
          reject(new Error(`${(err as Error).message} If you were charged, contact the organizer with payment ID ${response.razorpay_payment_id}.`));
        }
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new Error(lastFailure ? `Payment failed: ${lastFailure}` : input.cancelledMessage || 'Payment cancelled.'));
        },
      },
    });
    rz.on('payment.failed', (r) => {
      lastFailure = r.error?.description || 'the payment was declined';
    });
    rz.open();
  });
}
