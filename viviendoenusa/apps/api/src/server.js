require('dotenv').config(); // Cargar variables de entorno desde el archivo .env
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// 1. Configuración de Supabase con privilegios de Administrador (Service Role Key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Configurar Multer para mantener el archivo temporalmente en memoria (Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const NOMBRE_BUCKET = 'tu-bucket-privado'; // <- Cambia esto por tu bucket real

// 3. Endpoint POST: Procesar, optimizar a WebP, subir a Supabase y proteger la imagen
app.post('/api/subir-imagen-optimizada', upload.single('imagen'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Por favor, envía una imagen en el campo "imagen".' });
    }

    try {
        const calidadDeseada = parseInt(req.query.calidad) || 80;

        // Convertir la imagen a WebP
        const bufferWebp = await sharp(req.file.buffer)
            .webp({ quality: calidadDeseada })
            .toBuffer();

        // Crear un nombre de archivo único
        const nombreArchivo = `img-${Date.now()}.webp`;

        // Subir a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from(NOMBRE_BUCKET)
            .upload(nombreArchivo, bufferWebp, {
                contentType: 'image/webp',
                upsert: false
            });

        if (uploadError) {
            console.error('Error al subir a Supabase:', uploadError);
            return res.status(500).json({ error: 'Error al almacenar el archivo en la nube.' });
        }

        // Generar URL firmada temporal (60 segundos)
        const { data: signedData, error: signedError } = await supabase
            .storage
            .from(NOMBRE_BUCKET)
            .createSignedUrl(nombreArchivo, 60);

        if (signedError) {
            console.error('Error al generar la URL firmada:', signedError);
            return res.status(500).json({ error: 'Imagen guardada, pero falló la generación de acceso seguro.' });
        }

        // Responder con éxito
        res.status(200).json({
            mensaje: 'Imagen procesada, optimizada y guardada con éxito.',
            identificadorArchivo: nombreArchivo, // Guarda este string en tu base de datos
            urlAccesoTemporal: signedData.signedUrl
        });

    } catch (error) {
        console.error('Error crítico en el proceso:', error);
        res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la imagen.' });
    }
});

// 4. Endpoint GET: Solicitar una URL temporal para una imagen ya guardada
app.get('/api/obtener-imagen/:nombreArchivo', async (req, res) => {
    const nombreArchivo = req.params.nombreArchivo;

    try {
        const { data, error } = await supabase
            .storage
            .from(NOMBRE_BUCKET)
            .createSignedUrl(nombreArchivo, 60);

        if (error) {
            console.error('Error de Supabase al buscar imagen:', error);
            return res.status(404).json({ error: 'Archivo no encontrado o no accesible.' });
        }

        // Devolvemos la URL temporal al frontend
        res.status(200).json({ urlSegura: data.signedUrl });

    } catch (error) {
        console.error('Error al generar el acceso:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// 5. Levantar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});