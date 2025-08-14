import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Variables de entorno reales
const BASE_URL = "https://weweb-dlocal-backend.onrender.com";
const DLOCAL_HOST = "https://sandbox.dlocal.com";
const DLOCAL_SECRET_KEY = "KQgIQ2OWOwfusCoe5Vd3lSVorZE1l3YxsqLYMJhD";
const DLOCAL_X_TRANS_KEY = "hoWSfdKWUujGYaGZXMksHTlyMEwFTtYI";
const SUCCESS_REDIRECT = "https://a669447f-3cb2-4c91-89e2-e0a8c395b8ed.weweb-preview.io/checkout-pay-succefull/";
const SUPABASE_URL = "https://dbtxxvgacdolswvvancu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidHh4dmdhY2RvbHN3dnZhbmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTk0MjUsImV4cCI6MjA3MDY3NTQyNX0.4_KQNNVDTV6ecXLoP67X3k0Ed5ZuH878Y-zvi2cntkM";

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Ruta para crear el pago y redirigir a DLocal
app.post("/api/add-payment", async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    // 1️⃣ Guardar el pago en Supabase
    const { data, error } = await supabase
      .from("payments")
      .insert([{ user_id, amount, status: "pending" }])
      .select();

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Error saving payment" });
    }

    const payment = data[0];

    // 2️⃣ Crear la firma requerida por DLocal
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}${DLOCAL_X_TRANS_KEY}${DLOCAL_SECRET_KEY}`;
    const hash = crypto.createHash("sha256").update(signaturePayload).digest("hex");

    // 3️⃣ Crear la orden en DLocal
    const dlocalResponse = await axios.post(
      `${DLOCAL_HOST}/payments`,
      {
        amount: amount,
        currency: "USD",
        country: "BR", // Cambiar al país real
        payment_method_id: "CARD", // Método de pago
        success_url: SUCCESS_REDIRECT,
        failure_url: `${BASE_URL}/payment-failure`,
        notification_url: `${BASE_URL}/api/payment-webhook`,
        order_id: payment.id.toString(),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Version": "1.3",
          "X-Login": DLOCAL_X_TRANS_KEY,
          "X-Trans-Key": DLOCAL_X_TRANS_KEY,
          "X-Date": timestamp,
          "X-Signature": hash,
        },
      }
    );

    // 4️⃣ Redirigir al link de pago de DLocal
    const paymentUrl = dlocalResponse.data && dlocalResponse.data.redirect_url;

    if (!paymentUrl) {
      return res.status(500).json({ message: "No se recibió URL de pago de DLocal" });
    }

    res.json({
      message: "Payment added successfully",
      payment_url: paymentUrl,
      row: payment
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
