import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post("/api/add-payment", async (req, res) => {
  try {
    const { order_id, amount, currency, country, user_id, payer } = req.body;

    // 1️⃣ Insertar en Supabase
    const { data: payment, error } = await supabase
      .from("payments")
      .insert([{ user_id, amount, status: "pending" }])
      .select()
      .single();

    if (error) throw error;

    // 2️⃣ Crear pago en Dlocal
    const dlocalPayload = {
      order_id,
      amount,
      currency,
      country,
      payment_method_id: "CARD",
      payer,
      redirect_url: process.env.SUCCESS_REDIRECT
    };

    const signaturePayload = `${process.env.DLOCAL_X_TRANS_KEY}${order_id}${amount}${currency}${process.env.DLOCAL_SECRET_KEY}`;
    const signature = crypto.createHash("sha256").update(signaturePayload).digest("hex");

    const dlocalResponse = await fetch(`${process.env.DLOCAL_HOST}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Trans-Key": process.env.DLOCAL_X_TRANS_KEY,
        "X-Signature": signature
      },
      body: JSON.stringify(dlocalPayload)
    });

    const dlocalData = await dlocalResponse.json();

    if (!dlocalData.redirect_url) {
      return res.status(500).json({
        message: "Error al generar el link de pago en Dlocal",
        dlocalData
      });
    }

    // 3️⃣ Devolver el link
    res.json({
      message: "Payment added successfully",
      payment_url: dlocalData.redirect_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
