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
import multer from 'multer';

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const upload = multer({ storage: multer.memoryStorage() });

import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import { db } from '@viviendoenusa/db';
import { community, jobs, notifications, stores, typeDetail, users } from '@viviendoenusa/db/schema';
import { eq } from 'drizzle-orm';

import lawyerRoutes from './routes/lawyers.routes';
import communityRoutes from './routes/community.routes';
import donationsRoutes from './routes/donations.routes';
import eventsRoutes from  './routes/events.routes';
import storesRoutes from './routes/stores.routes';
import entrepreneurshipRoutes from './routes/entrepreneurship.routes';
import jobsRoutes from './routes/jobs.routes';
import supportRoutes from './routes/support.routes';
import notificationsRoutes from './routes/notifications.routes';
import paymentsRoutes from './routes/payments.routes';
import tarrifsRoutes from './routes/tariffs.routes';
import companiesRoutes from './routes/companies.routes';
import './cron/cron.jobs';

const app = express();

console.log("Puerto desde .env:", process.env.PORT);
const port = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

let model: any = null;

async function loadModel() {
  if (!model) {
    console.log("⏳ Cargando modelo IA (Modo JS)...");
    try {
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

app.use('/lawyers', lawyerRoutes);
app.use('/events', eventsRoutes);
app.use('/community', communityRoutes);
app.use('/donations', donationsRoutes);
app.use('/stores', storesRoutes);
app.use('/entrepreneurship', entrepreneurshipRoutes);
app.use('/jobs',jobsRoutes);
app.use('/support', supportRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/payments', paymentsRoutes);
app.use('/tariffs', tarrifsRoutes);
app.use('/companies', companiesRoutes);

// --- ENDPOINT DE OPTIMIZACIÓN Y SUBIDA A SUPABASE (DINÁMICO Y SEGURO) ---
app.post('/api/subir-imagen-optimizada/:carpeta', upload.single('imagen'), async (req, res) => {
  console.log(`🚨 [CONEXIÓN] Petición de subida recibida para la sección: ${req.params.carpeta}`);
  
  if (!req.file) {
    console.log("❌ [ERROR] No se recibió ningún archivo en el campo 'imagen'.");
    return res.status(400).json({ error: 'Por favor, envía una imagen en el campo "imagen".' });
  }

  // Lógica segura de parseo de directorios para evitar vulnerabilidades de path traversal
  const carpetaParam = String(req.params.carpeta);
  const carpetaSolicitada = carpetaParam.replace(/[^a-zA-Z0-9_-]/g, '');
  const carpetaFinal = (carpetaSolicitada && carpetaSolicitada !== 'undefined') ? carpetaSolicitada : 'general';

  try {
    const calidadDeseada = parseInt(req.query.calidad as string) || 80;

    console.log("⏳ Optimizando y convirtiendo formato a WebP...");
    const bufferWebp = await sharp(req.file.buffer)
      .webp({ quality: calidadDeseada })
      .toBuffer();

    const nombreArchivo = `${carpetaFinal}/img-${Date.now()}.webp`;
    console.log(`⏳ Almacenando en el bucket: "${NOMBRE_BUCKET}" como: ${nombreArchivo}`);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(NOMBRE_BUCKET)
      .upload(nombreArchivo, bufferWebp, {
        contentType: 'image/webp',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ [ERROR DE STORAGE EN SUPABASE]:', uploadError);
      return res.status(500).json({ error: 'Error al almacenar el archivo en el proveedor de nube.' });
    }

    console.log(`✅ [ÉXITO] Archivo guardado correctamente en la carpeta: ${carpetaFinal}`);
    return res.status(200).json({
      mensaje: 'Imagen optimizada y guardada con éxito.',
      identificadorArchivo: nombreArchivo
    });

  } catch (error: any) {
    console.error('❌ [ERROR CRÍTICO EN PROCESAMIENTO]:', error);
    return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la imagen.' });
  }
});

// --- ENDPOINT DE VALIDACIÓN NSFW ---
app.post('/validate-nsfw', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !model) {
      return res.json({ isSafe: true });
    }

    console.log("📸 Procesando imagen para NSFW...");

    const jimpImage = await Jimp.read(req.file.buffer);
    jimpImage.cover({ w: 224, h: 224 });

    const imageWidth = jimpImage.bitmap.width;
    const imageHeight = jimpImage.bitmap.height;
    const imageData = jimpImage.bitmap.data; 

    const imageTensor = tf.tidy(() => {
      const img = tf.tensor3d(new Uint8Array(imageData), [imageHeight, imageWidth, 4]);
      return img.slice([0, 0, 0], [-1, -1, 3]) as tf.Tensor3D;
    });

    const predictions = await model.classify(imageTensor);
    imageTensor.dispose();

    console.log('--- Resultados de la IA ---');
    console.table(predictions);

    const threshold = 0.40;
    const isUnsafe = predictions.some((p: any) => 
      ['Porn', 'Hentai', 'Sexy'].includes(p.className) && p.probability > threshold
    );

    console.log(`¿Es inapropiada?: ${isUnsafe ? '❌ SÍ' : '✅ NO'}`);
    res.json({ isSafe: !isUnsafe });

  } catch (error) {
    console.error("❌ Error en la validación NSFW:", error);
    res.json({ isSafe: true });
  }
});

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

app.get('/typeDetail', async (req, res) => {
  try {
    const alltypeDetail = await db.select().from(typeDetail);
    res.json(alltypeDetail);
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

app.listen(Number(port), "192.168.1.201", () => {
  console.log(`🚀 Servidor Express activo y listo para recibir peticiones en el puerto ${port}`);
});