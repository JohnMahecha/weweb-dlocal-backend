import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // aquí tienes la service_role key en Render
const supabase = createClient(supabaseUrl, supabaseKey);

// Ruta para probar que el backend responde
app.get("/", (req, res) => {
  res.send("Backend de dLocal con Supabase funcionando 🚀");
});

// Ruta para agregar pago
app.post("/api/add-payment", async (req, res) => {
  try {
    const { user_id, amount, status } = req.body;

    if (!user_id || !amount || !status) {
      return res.status(400).json({ error: "Faltan campos" });
    }

    const { error } = await supabase
      .from("payments")
      .insert([{ user_id, amount, status }]);

    if (error) throw error;

    res.json({ message: "Payment added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
