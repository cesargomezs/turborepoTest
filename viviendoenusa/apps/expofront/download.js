const fs = require('fs');
const https = require('https');

const file = fs.createWriteStream("apps/expofront/assets/model/group1-shard1of1.bin");
https.get("https://unpkg.com/nsfwjs@2.4.2/models/mobilenet_v2/group1-shard1of1.bin", (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Descarga completada. Verifica que el archivo pese 2,367,312 bytes.");
  });
});