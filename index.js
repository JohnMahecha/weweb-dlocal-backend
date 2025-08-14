import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json());

// Env variables
const SUPABASE_URL = "https://dbtxxvgacdolswvvancu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidHh4dmdhY2RvbHN3dnZhbmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTk0MjUsImV4cCI6MjA3MDY3NTQyNX0.4_KQNNVDTV6ecXLoP67X3k0Ed5ZuH878Y-zvi2cntkM";
const DLOCAL_HOST = "https://sandbox.dlocal.com";
const DLOCAL_SECRET_KEY = "KQgIQ2OWOwfusCoe5Vd3lSVorZE1l3YxsqLYMJhD";
const DLOCAL_X_TRANS_KEY = "hoWSfdKWUujGYaGZXMksHTlyMEwFTtYI";
const SUCCESS_REDIRECT = "https://a669447f-3cb2-4c91-89e2-e0a8c395b8ed.weweb-preview.io/checkout-pay-succefull/";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función para generar la firma de Dlocal
function generateSignature(body, secret) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

app.post("/api/add-payment", async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    // 1️⃣ Guardar en Supabase
    const { data, error } = await supabase
      .from("payments")
      .insert([{ user_id, amount, status: "pending" }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: "Error saving payment", error });
    }

    // 2️⃣ Crear pago en Dlocal
    const orderId = `order_${Date.now()}`;
    const paymentPayload = {
      amount: amount,
      currency: "USD",
      country: "CO",
      payment_method_id: "CARD",
      payment_method_flow: "REDIRECT",
      payer: {
        name: "John Mahecha",
        email: "test@example.com"
      },
      order_id: orderId,
      callback_url: `${process.env.BASE_URL || "https://weweb-dlocal-backend.onrender.com"}/api/dlocal-callback`,
      success_url: SUCCESS_REDIRECT
    };

    const bodyString = JSON.stringify(paymentPayload);
    const signature = generateSignature(bodyString, DLOCAL_SECRET_KEY);

    const dlocalRes = await fetch(`${DLOCAL_HOST}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Trans-Key": DLOCAL_X_TRANS_KEY,
        "X-Signature": signature
      },
      body: bodyString
    });

    const dlocalData = await dlocalRes.json();

    if (!dlocalRes.ok) {
      return res.status(500).json({
        message: "Error creating Dlocal payment",
        error: dlocalData
      });
    }

    // 3️⃣ Devolver el link de pago
    return res.status(200).json({
      message: "Payment created successfully",
      supabaseRow: data,
      dlocal: dlocalData,
      redirect_url: dlocalData.redirect_url
    });

  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
