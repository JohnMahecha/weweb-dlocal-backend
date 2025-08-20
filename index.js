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
  res.json({ status: "Backend funcionando con dLocal Go - CO" });
});

app.post("/api/add-payment", async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Formato UTC sin milisegundos
    const date = new Date().toISOString().split(".")[0] + "Z";

    // DEBUG: imprimir llaves para confirmar que no están undefined
    console.log("DLOCAL_API_KEY:", process.env.DLOCAL_API_KEY);
    console.log("DLOCAL_TRAN_KEY:", process.env.DLOCAL_TRAN_KEY);
    console.log("DLOCAL_SECRET_KEY:", process.env.DLOCAL_SECRET_KEY);

    // ===========================
    // Payload para Colombia
    // ===========================
    const payload = {
      amount: amount || "10000",
      currency: currency || "COP",
      country: "CO",
      payment_method_id: "CARD",
      description: description || "Test Payment",
      payer: {
        name: "John Test",
        email: "john@test.com",
        document: "1234567890",   // Número de cédula ficticio para sandbox
        document_type: "CC"       // Cédula de ciudadanía (Colombia)
      },
      callback_url: "https://tusitio.com/callback",
      success_url: "https://tusitio.com/success",
      failure_url: "https://tusitio.com/failure",
    };

    const secret = process.env.DLOCAL_SECRET_KEY;
    const requestBody = JSON.stringify(payload);
    const signatureRaw = `${date}${requestBody}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(signatureRaw)
      .digest("hex");

    const response = await axios.post(
      "https://sandbox.dlocal.com/payments",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Date": date,
          "X-Login": process.env.DLOCAL_API_KEY,
          "X-Trans-Key": process.env.DLOCAL_TRAN_KEY,
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
    console.error(error?.response?.data || error.message);
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
