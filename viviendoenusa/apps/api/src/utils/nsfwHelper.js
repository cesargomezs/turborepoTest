const nsfw = require('nsfwjs');

let model = null;

const getModel = async () => {
    if (!model) {
        console.log("⏳ Cargando modelo NSFW...");
        model = await nsfw.load();
        console.log("✅ Modelo listo para validar");
    }
    return model;
};

module.exports = { getModel };