const tf = require('@tensorflow/tfjs-node');
const { getModel } = require('../utils/nsfwHelper');

const validarImagen = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ isSafe: true, error: "No se recibió imagen" });
        }

        const model = await getModel();
        
        // Convertir buffer a tensor
        const image = tf.node.decodeImage(req.file.buffer, 3);
        const predictions = await model.classify(image);
        image.dispose(); // Liberar memoria RAM

        // Lógica de decisión
        const threshold = 0.65;
        const isSafe = !predictions.some(p => 
            (p.className === 'Porn' || p.className === 'Hentai') && p.probability > threshold
        );

        console.log(`🔍 Validación completa. ¿Es segura?: ${isSafe}`);
        return res.json({ isSafe });

    } catch (error) {
        console.error("Error en el controlador:", error);
        return res.status(500).json({ isSafe: true, error: "Error interno" });
    }
};

module.exports = { validarImagen };