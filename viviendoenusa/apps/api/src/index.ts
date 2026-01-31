import 'dotenv/config'; // Esto debe ir en la línea 1
import express from 'express';
import cors from 'cors';
import { db } from '@viviendoenusa/db';
import { users } from '@viviendoenusa/db/schema';
import { eq } from 'drizzle-orm';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de prueba de salud
app.get('/health', (req, res) => {
  res.send('API de VUSA operativa ✅');
});

// Endpoint para obtener usuarios (el que probamos antes)
app.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al conectar con la DB' });
  }
});

// NUEVO: Endpoint de Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    res.json({ message: 'Login exitoso', user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${port}`);
});