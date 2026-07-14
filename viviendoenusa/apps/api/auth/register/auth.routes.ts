import { Router, Request, Response } from 'express'; 
import { getUser, registerUser, updateUser } from '../../src/controllers/authController';

const router = Router();

// ➕ Crear usuario
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Recibimos data y la URL de la imagen del frontend
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
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUser(req.params.id.toString());
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 Actualizar usuario
router.put('/profile/:id', async (req: Request, res: Response) => {
  try {
    const { data, newImageUri } = req.body;
    
    const updatedUser = await updateUser(req.params.id.toString(), data, newImageUri);
    return res.status(200).json({ message: "Perfil actualizado", user: updatedUser });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;