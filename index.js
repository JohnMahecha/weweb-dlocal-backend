import express from "express";
import axios from "axios";
import crypto from "crypto";

const app = express();
app.use(express.json());

// Variables de entorno
const DLOCAL_LOGIN = process.env.DLOCAL_LOGIN;
const DLOCAL_TRANS_KEY = process.env.DLOCAL_TRANS_KEY;
const DLOCAL_SECRET_KEY = process.env.DLOCAL_SECRET_KEY;

// Endpoint para crear pago
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, currency, country, external_id } = req.body;

    // Fecha en formato RFC 1123 (GMT)
    const date = new Date().toUTCString();

    // Cuerpo del request
    const body = {
      amount,
      currency,
      country,
      payment_method_id: "CARD",
      payment_method_flow: "DIRECT",
      order_id: external_id,
      success_url: "https://tuweb.com/success",
      failure_url: "https://tuweb.com/failure",
    };

    // String para firmar: metodo + path + fecha + cuerpo
    const path = "/v1/payments";
    const stringToSign = `POST\n${path}\n${date}\n${JSON.stringify(body)}`;

    // Firma en base64
    const signature = crypto
      .createHmac("sha256", DLOCAL_SECRET_KEY)
      .update(stringToSign)
      .digest("base64");

    // Headers requeridos
    const headers = {
      "Content-Type": "application/json",
      "X-Date": date,
      "X-Login": DLOCAL_LOGIN,
      "X-Trans-Key": DLOCAL_TRANS_KEY,
      Authorization: `V2-HMAC-SHA256, Signature=${signature}`,
    };

    // Request a DLocal
    const response = await axios.post(
      `https://sandbox.dlocal.com${path}`,
      body,
      { headers }
    );

    // Enviar solo el link de pago
    res.json({
      message: "Payment created successfully",
      payment_url: response.data.payment.payment_url,
      dlocal_response: response.data,
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      message: "Error al generar el link de pago en Dlocal",
      details: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
