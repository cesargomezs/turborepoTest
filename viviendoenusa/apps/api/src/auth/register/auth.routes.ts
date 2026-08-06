import { Router, Request, Response } from 'express'; 
import rateLimit from 'express-rate-limit'; // 🚀 1. Importamos la librería de seguridad
import { AuthRequest, verifyToken } from 'src/middleware/authMiddleware'; // El candado
import { db } from '../../../../../packages/db/src/index';
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
import { getPlatformStats } from 'src/controllers/publicController';

const router = Router();

// 🚀 2. CREAMOS EL GUARDIA DE SEGURIDAD (Rate Limiter)
// Bloquea temporalmente a cualquier IP que intente atacar o hacer spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos de memoria
  max: 10, // Máximo 10 intentos por IP
  message: { 
    error: "Demasiados intentos desde esta IP. Por favor, espera 15 minutos antes de volver a intentar." 
  },
  standardHeaders: true, // Envía información del límite en los headers
  legacyHeaders: false,
});

// Esta ruta está protegida: solo alguien con un token válido puede entrar
router.get('/mi-perfil', verifyToken, getMiPerfil);

// ➕ Crear usuario (Le ponemos el limiter para evitar spam de cuentas falsas)
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { data, newImageUri } = req.body;
    const newUser = await registerUser(data, newImageUri);
    
    return res.status(201).json({ 
      message: "Usuario registrado con éxito", 
      user: newUser 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 Consultar usuario
router.get('/profile/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 SOLUCIÓN: Usamos el ID del parámetro o, por seguridad, el del token.
    // Además, usamos String() en lugar de .toString() para evitar que explote si viene vacío.
    const targetId = req.params.id || req.user?.id;
    
    if (!targetId) {
      return res.status(400).json({ error: "ID de usuario no proporcionado" });
    }

    const user = await getUser(String(targetId));
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 Actualizar usuario
// 🛡️ Actualizar usuario (Protegida)
router.put('/profile/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id || req.user?.id;

    if (!targetId) {
      return res.status(400).json({ error: "ID de usuario no proporcionado" });
    }

    // 🔒 Verificamos que el usuario que hace la petición sea el dueño o un Super Admin
    if (req.user?.id !== String(targetId) && req.user?.typeDetail !== 'SAdmin') {
      return res.status(403).json({ error: "No tienes permiso para editar este perfil." });
    }

    const { data, newImageUri } = req.body;
    
    // 🚀 Pasamos el targetId de forma segura
    const updatedUser = await updateUser(String(targetId), data, newImageUri);
    return res.status(200).json({ message: "Perfil actualizado", user: updatedUser });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🚀 RUTA CENTRALIZADA DE LOGIN (Google + Email)
// Protegida con limiter para evitar ataques de fuerza bruta adivinando contraseñas
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, idToken, isGoogle } = req.body;
    const result = await authenticateUser({ 
      email, 
      password, 
      idToken, 
      isGoogle 
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// 📧 ENVIAR CORREO DE RECUPERACIÓN (La ruta que faltaba)
// Protegida con limiter para evitar spam de correos
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    console.log("Solicitud de reseteo recibida para:", email); 
    const result = await sendPasswordResetEmail(email);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 📱 Registrar o actualizar el token push del dispositivo (Protegida)
router.post('/save-device-token', verifyToken, saveDeviceToken);

// 🔐 ACTUALIZAR LA CONTRASEÑA
router.post('/update-password', updatePassword);

// 🗑️ 2. RUTA PARA DAR DE BAJA / ELIMINAR CUENTA (Protegida)
router.delete('/delete-account', verifyToken, deleteUserAccount);

router.get('/stats', getPlatformStats);

export default router;