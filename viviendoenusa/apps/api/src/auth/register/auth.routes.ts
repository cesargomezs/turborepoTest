import { Router, Request, Response } from 'express'; 
import rateLimit from 'express-rate-limit'; 
import { AuthRequest, verifyToken } from '../../middleware/authMiddleware'; 
import { 
  authenticateUser, 
  getUser, 
  registerUser, 
  updateUser, 
  updatePassword,
  sendPasswordResetEmail,
  getMiPerfil,
  saveDeviceToken,
  deleteUserAccount
} from '../../controllers/authController';
import jwt from 'jsonwebtoken';

const router = Router();

// Guardia de seguridad (Rate Limiter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { 
    error: "Demasiados intentos desde esta IP. Por favor, espera 15 minutos antes de volver a intentar." 
  },
  standardHeaders: true, 
  legacyHeaders: false,
});

// Ruta protegida para perfil
router.get('/mi-perfil', verifyToken, getMiPerfil);

// Registrar usuario (CLÁSICO O COMPLETAR PERFIL SOCIAL)
router.post('/register', async (req, res) => {
  try {
    // 🔥 EL FIX DEL ROUTER: Asegurarnos de atrapar el token venga donde venga
    const requestData = {
      ...req.body.data,
      pushToken: req.body.pushToken || req.body.data?.pushToken,
      deviceType: req.body.deviceType || req.body.data?.deviceType
    };

    // Capturar la IP real para los términos y condiciones
    const forwarded = req.headers['x-forwarded-for'];
    const ipString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const reqIp = ipString ? ipString.split(',')[0].trim() : req.socket?.remoteAddress;

    // Ahora sí le pasamos toda la data completa (incluyendo el token) y la IP
    const newUser = await registerUser(requestData, req.body.newImageUri, reqIp);
    
    const baseSecret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, baseSecret, { expiresIn: '7d' });
    
    res.status(200).json({ user: newUser, token: token });
  } catch (error: any) { 
    res.status(400).json({ error: error.message });
  }
});

// Consultar usuario
router.get('/profile/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id || req.user?.id;
    if (!targetId) return res.status(400).json({ error: "ID no proporcionado" });
    
    const user = await getUser(String(targetId));
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    
    return res.status(200).json(user);
  } catch (error: any) { 
    return res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario
router.put('/profile/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id || req.user?.id;
    if (!targetId) return res.status(400).json({ error: "ID no proporcionado" });
    
    if (req.user?.id !== String(targetId) && req.user?.typeDetail !== 'SAdmin') {
      return res.status(403).json({ error: "No tienes permiso para editar este perfil." });
    }
    
    const { data, newImageUri } = req.body;
    const updatedUser = await updateUser(String(targetId), data, newImageUri);
    return res.status(200).json({ message: "Perfil actualizado", user: updatedUser });
  } catch (error: any) { 
    return res.status(400).json({ error: error.message });
  }
});

// Ruta centralizada de login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    // Aquí el router sí extrae el pushToken del body, por lo que el controlador sí lo recibe
    const { email, password, idToken, isGoogle, isApple, pushToken, deviceType } = req.body; 
    
    const result = await authenticateUser({ 
      email, password, idToken, isGoogle, isApple, pushToken, deviceType
    });
    
    res.status(200).json(result);
  } catch (error: any) { 
    res.status(401).json({ error: error.message });
  }
});

// Enviar correo de recuperación
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const resultado = await sendPasswordResetEmail(email);
    res.status(200).json(resultado); 
  } catch (error: any) { 
    res.status(400).json({ error: error.message }); 
  }
});

// Ruta protegida para registrar token push del dispositivo post-login
router.post('/save-device-token', verifyToken, saveDeviceToken);

// Actualizar contraseña
router.post('/update-password', updatePassword);

// Dar de baja / eliminar cuenta
router.delete('/delete-account', verifyToken, deleteUserAccount);

export default router;