import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuración Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Endpoint para crear pago
app.post("/api/add-payment", async (req, res) => {
  try {
    const { amount, currency, description, payer } = req.body;

    if (!amount || !currency || !description || !payer) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Petición a DLocal
    const dlocalResponse = await fetch("https://api.dlocal.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DLOCAL_API_KEY}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        description,
        payer
      }),
    });

    const dlocalData = await dlocalResponse.json();

    // Guardar en Supabase
    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          amount,
          currency,
          description,
          payer_name: payer.name,
          payer_email: payer.email,
          payment_id: dlocalData.id || null,
          status: dlocalData.status || "pending"
        }
      ]);

    if (error) {
      console.error("Error guardando en Supabase:", error);
    }

    res.json({
      message: "Pago creado correctamente",
      dlocal: dlocalData,
      supabase: data
    });

  } catch (err) {
    console.error("Error en /api/add-payment:", err);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
});

// Iniciar servidor
app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
});
