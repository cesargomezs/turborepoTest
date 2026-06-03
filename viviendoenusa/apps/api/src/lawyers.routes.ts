import { Router } from "express";
// Apuntamos correctamente a la carpeta controllers que se ve en tu imagen
import { createLawyer, getLawyers, getLawyerById, updateLawyer, getLawyerByIdWithReviews,createRating } from "./controllers/lawyers.controller";

const router = Router();

// Consulta (Todos)
router.get("/", async (req, res) => {
  try {
    const data = await getLawyers();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Consulta (Por ID)
router.get("/:id", async (req, res) => {
  try {
    const lawyer = await getLawyerByIdWithReviews(req.params.id);
    if (!lawyer) return res.status(404).json({ message: "Abogado no encontrado" });
    res.json(lawyer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Ingreso (Creación)
router.post("/", async (req, res) => {
  try {

    const newLawyer = await createLawyer(req.body);
    res.status(201).json(newLawyer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Actualización
router.put("/:id", async (req, res) => {
  try {
    const updated = await updateLawyer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Abogado no encontrado" });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Ingreso de RATING (Creación de una nueva calificación/reseña)
router.post("/rating", async (req, res) => {
    try {
      const newRating = await createRating(req.body);
      res.status(201).json(newRating);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
});

export default router;