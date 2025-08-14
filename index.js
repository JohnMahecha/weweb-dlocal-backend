import express from "express";
import axios from "axios";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Variables de entorno (puedes usar dotenv si quieres)
const BASE_URL = "https://weweb-dlocal-backend.onrender.com";
const DLOCAL_HOST = "https://sandbox.dlocal.com";
const DLOCAL_SECRET_KEY = "KQgIQ2OWOwfusCoe5Vd3lSVorZE1l3YxsqLYMJhD";
const DLOCAL_X_TRANS_KEY = "hoWSfdKWUujGYaGZXMksHTlyMEwFTtYI";
const SUCCESS_REDIRECT = "https://a669447f-3cb2-4c91-89e2-e0a8c395b8ed.weweb-preview.io/checkout-pay-succefull/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidHh4dmdhY2RvbHN3dnZhbmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTk0MjUsImV4cCI6MjA3MDY3NTQyNX0.4_KQNNVDTV6ecXLoP67X3k0Ed5ZuH878Y-zvi2cntkM";
const SUPABASE_URL = "https://dbtxxvgacdolswvvancu.supabase.co";

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Ruta para crear el pago y generar link de DLocal
app.post("/api/add-payment", async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    // 1. Guardar en Supabase
    const { data: insertedData, error } = await supabase
      .from("payments")
      .insert([{ user_id, amount, status: "pending" }])
      .select()
      .single();

    if (error) {
      console.error("Error insertando en Supabase:", error);
      return res.status(500).json({ error: "Error al guardar el pago" });
    }

    // 2. Preparar datos para DLocal
    const paymentId = insertedData.id.toString();
    const currency = "USD";
    const country = "CO"; // Cambia si es otro país
    const paymentMethodId = "CARD"; // Ajusta según tu integración

    const paymentPayload = {
      amount,
      currency,
      country,
      payment_method_id: paymentMethodId,
      order_id: paymentId,
      payer: {
        name: "Cliente Prueba",
        email: "cliente@example.com"
      },
      redirect_url: SUCCESS_REDIRECT
    };

    // 3. Firmar petición para DLocal
    const timestamp = Math.floor(Date.now() / 1000);
    const signatureString = `${timestamp}${DLOCAL_X_TRANS_KEY}${JSON.stringify(paymentPayload)}${DLOCAL_SECRET_KEY}`;
    const signature = crypto.createHash("sha256").update(signatureString).digest("hex");

    // 4. Llamar a DLocal
    const dlocalResponse = await axios.post(
      `${DLOCAL_HOST}/v1/payments`,
      paymentPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Date": timestamp,
          "X-Login": DLOCAL_X_TRANS_KEY,
          "X-Trans-Key": DLOCAL_X_TRANS_KEY,
          "X-Version": "1.2",
          "X-Signature": signature
        }
      }
    );

    // 5. Retornar el link de pago
    if (dlocalResponse.data && dlocalResponse.data.redirect_url) {
      return res.json({
        message: "Payment created successfully",
        redirect_url: dlocalResponse.data.redirect_url
      });
    } else {
      return res.status(500).json({ error: "No se recibió URL de pago de DLocal" });
    }
  } catch (err) {
    console.error("Error creando pago:", err.response?.data || err.message);
    res.status(500).json({ error: "Error interno creando pago" });
  }
});

// Iniciar servidor
app.listen(3000, () => {
  console.log("Servidor escuchando en puerto 3000");
});
