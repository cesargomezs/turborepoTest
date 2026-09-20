import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  // 🚀 FIX MAESTRO: Si la petición es de lectura (GET), permitimos el paso libre para invitados y público general.
  if (req.method === 'GET') {
    req.user = { id: null, role: 'guest' };
    return next();
  }

  // 1. A partir de aquí solo se exige token estricto para métodos de escritura (POST, PUT, DELETE)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("⛔ Petición bloqueada: No hay header de autorización.");
    return res.status(401).json({ error: 'Acceso denegado. Se requiere iniciar sesión.', redirect: '/' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'undefined' || token === 'null') {
    console.log("⛔ Petición bloqueada: El token recibido es 'undefined' o 'null'.");
    return res.status(401).json({ error: 'Token vacío o corrupto.', redirect: '/' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_viviendoenusa_chimba_2026';
    const decoded = jwt.verify(token, secret);
    
    req.user = decoded; 
    return next(); // Todo bien, dejamos pasar token real
    
  } catch (error: any) {
    console.log("⛔ Petición bloqueada: Token expirado o falso.");
    return res.status(401).json({ error: 'Token inválido o expirado.', redirect: '/' });
  }
};