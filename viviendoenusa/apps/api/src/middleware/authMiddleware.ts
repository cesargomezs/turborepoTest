import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  // 1. Si no viene el header (Como en tu foto del navegador), bloqueamos:
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("⛔ Petición bloqueada: No hay header de autorización.");
    return res.status(401).json({ error: 'Acceso denegado. Se requiere iniciar sesión.', redirect: '/' });
  }

  const token = authHeader.split(' ')[1];

  // 2. Si el frontend envía "Bearer undefined" o "Bearer null" (Como en tu foto de Network), bloqueamos:
  if (!token || token === 'undefined' || token === 'null') {
    console.log("⛔ Petición bloqueada: El token recibido es 'undefined' o 'null'.");
    return res.status(401).json({ error: 'Token vacío o corrupto.', redirect: '/' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const decoded = jwt.verify(token, secret);
    
    req.user = decoded; 
    return next(); // Todo bien, dejamos pasar
    
  } catch (error: any) {
    console.log("⛔ Petición bloqueada: Token expirado o falso.");
    return res.status(401).json({ error: 'Token inválido o expirado.', redirect: '/' });
  }
};