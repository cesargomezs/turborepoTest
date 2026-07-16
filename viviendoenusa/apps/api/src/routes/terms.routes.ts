import { Router } from 'express';
import { acceptTerms, checkTermsStatus } from '../controllers/terms.controller'; // Ajusta la ruta a tu carpeta de controladores

const router = Router();

// Ruta para verificar si el usuario ha aceptado los términos actuales
// Se espera pasar el userId como parámetro en la URL
router.get('/status/:userId', checkTermsStatus);

// Ruta para registrar que el usuario acepta los términos
// Se espera recibir el userId en el body de la petición
router.post('/accept', acceptTerms);

export default router;