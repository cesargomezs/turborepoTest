// @ts-ignore
import util from 'util';
import { Jimp } from 'jimp';

// Parche para Node 25+ y compatibilidad con TFJS
if (!(util as any).isNullOrUndefined) {
  (util as any).isNullOrUndefined = (obj: any) => obj === null || obj === undefined;
}
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer'; // 1. Importar Multer

const upload = multer({ storage: multer.memoryStorage() }); // 1.1 Definir el middleware de Multer

import * as tf from '@tensorflow/tfjs';

import * as nsfwjs from 'nsfwjs'; // 3. Importar NSFWJS
import { db } from '@viviendoenusa/db';
import { users } from '@viviendoenusa/db/schema';
import { eq } from 'drizzle-orm';


const app = express();

console.log(process.env.PORT);
const port = process.env.PORT || 3000;

// ✅ CAMBIO: Usamos 'any' o el tipo genérico para evitar el error de Namespace
let model: any = null;

async function loadModel() {
  if (!model) {
    console.log("⏳ Cargando modelo IA (Modo JS)...");
    try {
      // Forzamos el backend de CPU para evitar problemas de drivers en el servidor
      await tf.setBackend('cpu');
      model = await nsfwjs.load();
      console.log("✅ Modelo cargado correctamente");
    } catch (error) {
      console.error("❌ Error cargando modelo:", error);
    }
  }
}
loadModel();

app.use(cors());
app.use(express.json());

// --- NUEVO: ENDPOINT DE VALIDACIÓN NSFW ---
app.post('/validate-nsfw', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !model) {
      return res.json({ isSafe: true });
    }

    //console.log("📸 Procesando imagen...");

    // 1. LEER LA IMAGEN (Sintaxis para Jimp v1+)
    const jimpImage = await Jimp.read(req.file.buffer);
    
    // 2. REDIMENSIONAR 
    jimpImage.cover({ w: 224, h: 224 });

    // 3. CONVERTIR A TENSOR
    // Accedemos a los datos crudos de los píxeles
    const imageWidth = jimpImage.bitmap.width;
    const imageHeight = jimpImage.bitmap.height;
    const imageData = jimpImage.bitmap.data; // Buffer de píxeles RGBA

    const imageTensor = tf.tidy(() => {
      // Creamos el tensor desde el Uint8Array de Jimp
      const img = tf.tensor3d(new Uint8Array(imageData), [imageHeight, imageWidth, 4]);
      // Removemos el canal Alpha (RGBA -> RGB)
      return img.slice([0, 0, 0], [-1, -1, 3]) as tf.Tensor3D;
    });

    // 4. CLASIFICAR
    const predictions = await model.classify(imageTensor);
    imageTensor.dispose();

    // 5. LOGS DE CONTROL
    //console.log('--- Resultados de la IA ---');
    //console.table(predictions);

    const threshold = 0.40;
    const isUnsafe = predictions.some((p: any) => 
      ['Porn', 'Hentai', 'Sexy'].includes(p.className) && p.probability > threshold
    );

    //console.log(`¿Es inapropiada?: ${isUnsafe ? '❌ SÍ' : '✅ NO'}`);
    res.json({ isSafe: !isUnsafe });

  } catch (error) {
    //console.error("❌ Error en la validación:", error);
    res.json({ isSafe: true });
  }
});
// --- TUS ENDPOINTS ANTERIORES ---

app.get('/health', (req, res) => {
  res.send('API de VUSA operativa ✅');
});

app.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al conectar con la DB' });
  }
});

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
  console.log(`🚀 Servidor Express corriendo en http://192.168.1.107:${port}`);
});