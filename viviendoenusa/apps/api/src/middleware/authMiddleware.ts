import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos el Request de Express para poder inyectarle el usuario
export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 1. Obtener el token del encabezado de la petición
  const authHeader = req.headers['authorization'];
  //const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN_AQUI"
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere un token.' });
  }

  try {

    jwt.verify(token, process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026', (err, decoded) => {
      if (err) {
        console.error("❌ Error de validación de token:", err.message);
        return res.status(403).json({ error: "Token inválido o expirado." });
      }
      req.user = decoded as any; // Inyectamos el usuario
      next();
    });
    
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado. Por favor, inicia sesión de nuevo.' });
  }
};
