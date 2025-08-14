// index.js
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

// --- Config ---
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true })); // para callback x-www-form-urlencoded

// Entornos requeridos
const {
  SUPABASE_URL,
  SUPABASE_KEY, // usa service_role en server si puedes
  DLOCAL_X_TRANS_KEY,
  DLOCAL_SECRET_KEY,
  DLOCAL_HOST = 'https://sandbox.dlocal.com',
  BASE_URL = 'https://weweb-dlocal-backend.onrender.com',
  SUCCESS_REDIRECT = 'https://tu-sitio.weweb.app/pago-exitoso'
} = process.env;

// Helpers
function nowIso() {
  return new Date().toISOString();
}

function signatureFor(bodyString, xDate) {
  // HMAC-SHA256 de: X-Login + X-Date + RequestBody (sin delimitadores)
  // Devuelve el valor para el header Authorization: V2-HMAC-SHA256, Signature: <hex>
  const message = `${DLOCAL_X_LOGIN}${xDate}${bodyString || ''}`;
  const sig = crypto.createHmac('sha256', DLOCAL_SECRET_KEY).update(message, 'utf-8').digest('hex');
  return `V2-HMAC-SHA256, Signature: ${sig}`;
}

// Llamadas a dLocal
async function dlocalCreatePayment(payload) {
  const url = `${DLOCAL_HOST}/payments`;
  const xDate = nowIso();
  const bodyString = JSON.stringify(payload);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Date': xDate,
      'X-Login': DLOCAL_X_LOGIN,
      'X-Trans-Key': DLOCAL_X_TRANS_KEY,
      'X-Version': '2.1',
      'Content-Type': 'application/json',
      'User-Agent': 'WeWeb-Demo/1.0',
      'Authorization': signatureFor(bodyString, xDate)
    },
    body: bodyString
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`dLocal create payment failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function dlocalGetPaymentStatus(paymentId) {
  const url = `${DLOCAL_HOST}/payments/${encodeURIComponent(paymentId)}`;
  const xDate = nowIso();
  const bodyString = ''; // GET: cuerpo vacío para la firma
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Date': xDate,
      'X-Login': DLOCAL_X_LOGIN,
      'X-Trans-Key': DLOCAL_X_TRANS_KEY,
      'X-Version': '2.1',
      'User-Agent': 'WeWeb-Demo/1.0',
      'Authorization': signatureFor(bodyString, xDate)
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`dLocal get payment failed: ${res.status} ${text}`);
  }
  return res.json();
}

// Supabase REST helper
async function sbInsertPayment(row) {
  const url = `${SUPABASE_URL}/rest/v1/payments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.[0] || null;
}

async function sbUpdatePaymentByOrderId(order_id, patch) {
  const url = `${SUPABASE_URL}/rest/v1/payments?order_id=eq.${encodeURIComponent(order_id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase update failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.[0] || null;
}

async function sbUpdatePaymentByDlocalId(dlocal_payment_id, patch) {
  const url = `${SUPABASE_URL}/rest/v1/payments?dlocal_payment_id=eq.${encodeURIComponent(dlocal_payment_id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase update failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.[0] || null;
}

// --- ENDPOINTS ---

// Salud
app.get('/', (_, res) => {
  res.send('Backend dLocal + Supabase OK');
});

// 1) Crear checkout (REDIRECT)
app.post('/api/create-checkout', async (req, res) => {
  try {
    const {
      order_id,           // generado por tu frontend (UUID)
      amount,             // number
      currency = 'COP',
      country = 'CO',
      user_id = null,
      payer = {           // si tu WeWeb aún no pide datos, usa dummy
        name: 'Test User',
        email: 'test@example.com'
      },
      metadata = null     // opcional: items del carrito, etc.
    } = req.body || {};

    if (!order_id || !amount) {
      return res.status(400).json({ error: 'order_id y amount son requeridos' });
    }

    const payload = {
      amount: Number(amount),
      currency,
      country,
      payment_method_flow: 'REDIRECT',
      // 1-step (tarjeta directa): descomenta la línea siguiente
      // payment_method_id: 'CARD',
      payer,
      order_id,
      notification_url: `${BASE_URL}/api/dlocal/webhook`,
      callback_url: `${BASE_URL}/api/dlocal/callback`,
      ...(metadata ? { metadata } : {})
    };

    const dlocalResp = await dlocalCreatePayment(payload);
    // dLocal responde con id, status y redirect_url
    const { id: dlocal_payment_id, status, redirect_url } = dlocalResp;

    // Guarda en Supabase
    await sbInsertPayment({
      user_id,
      amount: Number(amount),
      status: 'pending',
      dlocal_status: status,
      order_id,
      dlocal_payment_id,
      redirect_url
    });

    return res.json({
      ok: true,
      order_id,
      dlocal_payment_id,
      status,
      redirect_url
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// 2) Callback (POST del navegador al terminar el flujo en dLocal)
// dLocal envía {paymentId, status, date, signature} por POST.
// No confíes en "status" del callback para tu DB; consulta el pago. (doc)
app.post('/api/dlocal/callback', async (req, res) => {
  try {
    // soportar form-urlencoded y JSON
    const body = typeof req.body === 'object' ? req.body : {};
    const { paymentId, status, date, signature } = body;

    // Validación simple de firma de callback (según doc de callback)
    // firma = HMAC(secretKey, X-Login + date + "{status:...,paymentId:...}")
    try {
      const rawBody = `{status:${status},paymentId:${paymentId}}`;
      const expected = crypto.createHmac('sha256', DLOCAL_SECRET_KEY)
        .update(`${DLOCAL_X_LOGIN}${date}${rawBody}`)
        .digest('hex');
      if (!signature || signature !== expected) {
        console.warn('Callback signature mismatch');
      }
    } catch (e) {
      console.warn('Callback signature check failed', e);
    }

    // Consulta estado real y actualiza DB
    let latest = null;
    if (paymentId) {
      latest = await dlocalGetPaymentStatus(paymentId);
      const patch = {
        dlocal_status: latest?.status || status || null
      };
      await sbUpdatePaymentByDlocalId(paymentId, patch);
    }

    // Redirige al front (WeWeb) con info útil
    const finalStatus = latest?.status || status || 'PENDING';
    const redirectTo = new URL(SUCCESS_REDIRECT);
    redirectTo.searchParams.set('paymentId', paymentId || '');
    redirectTo.searchParams.set('status', finalStatus);
    return res.redirect(302, redirectTo.toString());
  } catch (err) {
    console.error(err);
    res.status(500).send('Callback error');
  }
});

// 3) Webhook (IPN) de dLocal con firma en Authorization
app.post('/api/dlocal/webhook', async (req, res) => {
  try {
    const auth = req.get('Authorization') || '';
    const xDate = req.get('X-Date') || '';
    const bodyString = JSON.stringify(req.body || {});
    const expectedAuth = signatureFor(bodyString, xDate);

    if (!auth || auth !== expectedAuth) {
      console.warn('Webhook signature mismatch');
      // Puedes retornar 401 si quieres estricto. Para demo aceptamos 200:
      // return res.status(401).send('Invalid signature');
    }

    // El webhook trae el objeto payment completo (incluye order_id, id, status, etc.)
    const paymentObj = req.body || {};
    const { id: dlocal_payment_id, order_id, status } = paymentObj;

    if (order_id || dlocal_payment_id) {
      await sbUpdatePaymentByOrderId(order_id, {
        dlocal_payment_id,
        dlocal_status: status,
        status: status === 'PAID' ? 'paid' : status?.toLowerCase?.() || null
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// 4) Consultar estado puntual (para WeWeb)
app.get('/api/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const data = await dlocalGetPaymentStatus(paymentId);
    // opcional: sincronizar DB
    await sbUpdatePaymentByDlocalId(paymentId, {
      dlocal_status: data?.status,
      status: data?.status === 'PAID' ? 'paid' : data?.status?.toLowerCase?.()
    });
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

// --- legacy: lo dejamos por compatibilidad con tus pruebas anteriores ---
app.post('/api/add-payment', async (req, res) => {
  try {
    const { user_id = null, amount = 0, status = 'pending' } = req.body || {};
    const row = await sbInsertPayment({ user_id, amount: Number(amount), status });
    res.json({ message: 'Payment added successfully', row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
