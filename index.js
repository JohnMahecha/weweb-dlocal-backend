// index.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const DLOCAL_API_KEY = process.env.DLOCAL_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!DLOCAL_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Variables de entorno faltantes. Revisa tu archivo .env o Render.");
  process.exit(1);
}

app.get("/", (req, res) => {
  res.send("✅ Backend de DLocal funcionando");
});

// Ejemplo de endpoint para iniciar pago con DLocal
app.post("/pago", async (req, res) => {
  try {
    const response = await fetch("https://api.dlocal.com/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DLOCAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("❌ Error al procesar el pago:", error);
    res.status(500).json({ error: "Error en el pago" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
