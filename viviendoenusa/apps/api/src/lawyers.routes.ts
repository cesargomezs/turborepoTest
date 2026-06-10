import { Router } from "express";
// Apuntamos correctamente a la carpeta controllers
import { createLawyer, getLawyers, updateLawyer, getLawyerByIdWithReviews, createRating } from "./controllers/lawyers.controller";

const router = Router();

// 🔍 Consulta (Todos)
router.get('/', async (req, res) => {
  try {
    // 🚨 Extraemos el zip code de la URL (ej. ?zip=91730)
    const zipCode = req.query.zip as string; 
    
    // 🚨 Se lo pasamos a la función getLawyers
    const lawyers = await getLawyers(zipCode);
    
    res.json(lawyers);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// 📥 Ingreso (Creación de Abogado)
router.post("/", async (req, res) => {
  try {
    const newLawyer = await createLawyer(req.body);
    res.status(201).json(newLawyer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 🚀 Ingreso de RATING (Creación de una nueva calificación/reseña)
// VA ANTES DE LOS /:id PARA QUE EXPRESS NO SE CONFUNDA
router.post("/rating", async (req, res) => {
    try {
      const newRating = await createRating(req.body);
      res.status(201).json(newRating);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
});

// 🔍 Consulta (Por ID)
router.get("/:id", async (req, res) => {
  try {
    const lawyer = await getLawyerByIdWithReviews(req.params.id);
    if (!lawyer) return res.status(404).json({ message: "Abogado no encontrado" });
    res.json(lawyer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 🔄 Actualización
router.put("/:id", async (req, res) => {
  try {
    const updated = await updateLawyer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Abogado no encontrado" });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;