import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ status: "Backend funcionando con dLocal Go" });
});

app.post("/api/add-payment", async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Fecha en formato UTC sin milisegundos
    const date = new Date().toISOString().split(".")[0] + "Z";

    // DEBUG: mostrar llaves para confirmar
    console.log("DLOCAL_API_KEY:", process.env.DLOCAL_API_KEY);
    console.log("DLOCAL_SECRET_KEY:", process.env.DLOCAL_SECRET_KEY);

    const payload = {
      amount: amount || "10.00",
      currency: currency || "USD",
      country: "BR", // ⚠️ cambia a "CO" si vas a probar en Colombia
      payment_method_id: "CARD",
      description: description || "Test Payment",
      callback_url: "https://tusitio.com/callback",
      success_url: "https://tusitio.com/success",
      failure_url: "https://tusitio.com/failure",
    };

    // ===========================
    // Firma (X-Date + X-Login + Body)
    // ===========================
    const secret = process.env.DLOCAL_SECRET_KEY;
    const login = process.env.DLOCAL_API_KEY;
    const requestBody = JSON.stringify(payload);
    const signatureRaw = `${date}${login}${requestBody}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(signatureRaw)
      .digest("hex");

    console.log("X-Date:", date);
    console.log("X-Signature:", signature);

    // ===========================
    // Request a dLocal Go
    // ===========================
    const response = await axios.post(
      "https://sandbox.dlocal.com/payments",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Date": date,
          "X-Login": login,
          "X-Version": "1.2",
          "X-Signature": signature,
        },
      }
    );

    res.json({
      message: "Link de pago generado correctamente",
      data: response.data,
    });
  } catch (error) {
    console.error("Error DLocal:", error?.response?.data || error.message);
    res.status(500).json({
      message: "Error al generar el link de pago en DLocal Go",
      dlocalData: error?.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
