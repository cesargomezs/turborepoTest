import { Router } from 'express';
const router = Router();

router.post('/it-support', async (req, res) => {
  try {
    const { email, message, userName } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: 'El correo y el mensaje son obligatorios.' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const textoMensaje = `💬 *Nuevo Mensaje de Soporte IT* 💬\n\n` +
        `*Usuario:* \`${userName || 'Anónimo'}\`\n` +
        `*Correo:* \`${email}\`\n\n` +
        `*Mensaje:*\n${message}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: textoMensaje,
          parse_mode: 'Markdown'
        })
      });
    }

    return res.status(200).json({ success: true, message: 'Mensaje enviado con éxito.' });
  } catch (error) {
    console.error('Error en soporte IT:', error);
    return res.status(500).json({ error: 'Error interno al enviar el mensaje.' });
  }
});

export default router;