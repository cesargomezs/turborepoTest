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
import helmet from 'helmet'; // 🛡️ Seguridad de Cabeceras
import rateLimit from 'express-rate-limit'; // 🛡️ Anti-Spam / DDoS
import multer from 'multer';

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const upload = multer({ storage: multer.memoryStorage() });

import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import { db, community, jobs, notifications, stores, typeDetail, users } from '@viviendoenusa/db';
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
import authRoutes from './auth/register/auth.routes';
import './cron/cron.jobs';
import termsRoutes from './routes/terms.routes';
import adminRoutes from './admin/admin.routes';


const app = express();

console.log("Puerto desde .env:", process.env.PORT);
const port = process.env.PORT || 3000;

// ============================================================================
// 🛡️ 1. CAPA DE SEGURIDAD GLOBAL (ESCUDOS ANTES DE CUALQUIER RUTA)
// ============================================================================

app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

const allowedOrigins = [
  'http://localhost:8081', 
  'http://192.168.252.243:8081', 
  'http://192.168.1.17',
  'https://www.viviendoenusa.app',
  'https://viviendoenusa.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS: Origen no autorizado'));
    }
  },
  credentials: true, 
}));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 150, 
  message: { error: '⚠️ Demasiadas peticiones desde esta IP. Por favor, intenta de nuevo en 15 minutos.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use(globalLimiter);

// ============================================================================
// ☁️ 2. CONFIGURACIONES DE NUBE E IA
// ============================================================================

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


// ============================================================================
// 🛤️ 3. RUTAS PROTEGIDAS Y ENDPOINTS
// ============================================================================

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
app.use('/auth', authRoutes);
app.use('/api/terms', termsRoutes);
app.use('/admin', adminRoutes);

// --- 📱 BUZÓN DE ERRORES DEL FRONTEND (TELEGRAM) ---
app.post('/api/crash-report', express.json(), async (req, res) => {
  const { errorMessage, errorStack, deviceInfo, userEmail } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    const textoMensaje = `📱 *Crash en Celular de Usuario* 📱\n\n` +
      `*Error:* ${errorMessage}\n` +
      `*Usuario:* \`${userEmail || 'Anónimo'}\`\n` +
      `*Dispositivo:* \`${deviceInfo}\`\n\n` +
      `*Traza:*\n\`\`\`${errorStack?.substring(0, 500) || 'Sin traza'}\`\`\``;

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: textoMensaje, parse_mode: 'Markdown' })
    }).catch(e => console.error("Error enviando crash a Telegram"));
  }

  res.status(200).json({ received: true });
});

// --- ENDPOINT DE OPTIMIZACIÓN Y SUBIDA A SUPABASE ---
app.post('/api/subir-imagen-optimizada/:carpeta', upload.single('imagen'), async (req, res) => {
  console.log(`🚨 [CONEXIÓN] Petición de subida recibida para la sección: ${req.params.carpeta}`);
  
  if (!req.file) {
    console.log("❌ [ERROR] No se recibió ningún archivo en el campo 'imagen'.");
    return res.status(400).json({ error: 'Por favor, envía una imagen en el campo "imagen".' });
  }

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

// ============================================================================
// 🚨 4. MANEJADOR DE ERRORES MAESTRO Y ALERTAS A TELEGRAM (SIEMPRE AL FINAL)
// ============================================================================
app.use(async (err: any, req: any, res: any, next: any) => {
  console.error("🚨 [ERROR GLOBAL CAPTURADO]:", err);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (botToken && chatId) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Desconocida';
      const usuarioEmail = req.user?.email || req.body?.email || req.headers['x-user-email'] || 'No autenticado/Desconocido';

      let payloadText = 'Sin datos en el body';
      if (req.body && Object.keys(req.body).length > 0) {
        const rawPayload = JSON.stringify(req.body, null, 2);
        payloadText = rawPayload.length > 500 ? rawPayload.substring(0, 500) + '\n...[truncado]' : rawPayload;
      }

      const textoMensaje = `🚨 *Error Crítico en VUSA Backend* 🚨\n\n` +
        `*Mensaje:* ${err.message}\n` +
        `*Ruta:* \`${req.method} ${req.originalUrl}\`\n` +
        `*Usuario/Email:* \`${usuarioEmail}\`\n` +
        `*IP:* \`${ip}\`\n\n` +
        `*Trama (Body):*\n\`\`\`json\n${payloadText}\n\`\`\`\n` +
        `*Stack Trace:*\n\`\`\`\n${err.stack?.substring(0, 400) || 'Sin stack'}\n\`\`\``;

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: textoMensaje,
          parse_mode: 'Markdown'
        })
      }).catch(e => console.error("Fallo al enviar alerta a Telegram:", e));

    } catch (alertaError) {
      console.error("Error armando la alerta de Telegram:", alertaError);
    }
  }

  res.status(500).json({ 
    error: "Ocurrió un error interno en el servidor. Nuestro equipo ya fue notificado." 
  });
});

// ============================================================================
// 🚀 INICIO DEL SERVIDOR
// ============================================================================
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`🚀 Servidor Express activo y listo para recibir peticiones en el puerto ${port} 🛡️`);
});