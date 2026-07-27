import { Router, Response, Request } from 'express';
import { acceptTerms, checkTermsStatus, getActiveTerms } from '../controllers/terms.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';

const router = Router();

// 🚀 NUEVA RUTA (Pública): Obtener el documento actual
router.get('/active', async (req: Request, res: Response) => {
  try {
    return await getActiveTerms(req, res);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error interno' });
  }
});

// 🔍 GET: Verificar estado del usuario
router.get('/status/:userId', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;
    if (userIdFromToken !== req.params.userId) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    return await checkTermsStatus(req as any, res);
  } catch (error: any) {
    return res.status(500).json({ error: 'Error interno' });
  }
});

// 📥 POST: Registrar términos
router.post('/accept', async (req: Request, res: Response) => {
  try {
    return await acceptTerms(req, res);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;