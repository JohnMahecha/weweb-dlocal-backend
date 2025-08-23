import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Backend funcionando con dLocal Go - CO" });
});

app.post("/api/add-payment", async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Variables del .env
    const apiKey = process.env.DLOCAL_API_KEY;
    const secretKey = process.env.DLOCAL_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return res.status(500).json({
        message: "Faltan credenciales DLOCAL en el backend",
      });
    }

    // Endpoint dLocal Go (Sandbox para CO)
    const url = "https://sandbox.dlocalgo.com/v1/payments";

    // ===========================
    // Payload para pago Colombia
    // ===========================
    const payload = {
      amount: amount || "10.00",
      currency: currency || "USD",
      country: "CO",
      payment_method_id: "CARD",
      description: description || "Test Payment",
      payer: {
        name: "John Test",
        email: "john@test.com",
        document: "1234567890", // Documento ficticio
        document_type: "CC", // Cédula (CO)
      },
      callback_url: "https://tusitio.com/callback",
      success_url: "https://tusitio.com/success",
    };

    // ===========================
    // Firma HMAC
    // ===========================
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = JSON.stringify(payload);
    const toSign = `${timestamp}${bodyString}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(toSign)
      .digest("hex");

    // ===========================
    // Request a dLocal Go
    // ===========================
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: bodyString,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        message: "Error al generar el link de pago en dLocal Go",
        dlocalData: data,
      });
    }

    return res.json({
      message: "Link de pago generado correctamente",
      dlocalData: data,
    });
  } catch (error) {
    console.error("Error general:", error);
    return res.status(500).json({
      message: "Error interno en el servidor",
      error: error.message,
    });
  }
});

// ===========================
// Puerto
// ===========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
