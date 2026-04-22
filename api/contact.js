module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { nom, email, telephone, date, type_evenement, message } = req.body;

  if (!nom || !email || !message) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #222;">
      <h2 style="color: #D65B80; font-size: 20px; margin-bottom: 24px;">
        Nouveau message via le formulaire de contact
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #888; width: 160px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Nom</td><td style="padding: 8px 0; font-size: 14px;">${nom}</td></tr>
        <tr><td style="padding: 8px 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #D65B80;">${email}</a></td></tr>
        ${telephone ? `<tr><td style="padding: 8px 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Téléphone</td><td style="padding: 8px 0; font-size: 14px;">${telephone}</td></tr>` : ''}
        ${date ? `<tr><td style="padding: 8px 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Date</td><td style="padding: 8px 0; font-size: 14px;">${date}</td></tr>` : ''}
        ${type_evenement ? `<tr><td style="padding: 8px 0; color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Événement</td><td style="padding: 8px 0; font-size: 14px;">${type_evenement}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px; padding: 16px; background: #FAF1F1; border-radius: 8px; font-size: 14px; line-height: 1.8;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <p style="margin-top: 24px; font-size: 12px; color: #aaa;">Réunis — reunisevent.com</p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Réunis Contact <contact@reunisevent.com>',
      to: ['contact@reunisevent.com'],
      reply_to: email,
      subject: `Nouveau message de ${nom}${type_evenement ? ' — ' + type_evenement : ''}`,
      html
    })
  });

  if (!response.ok) {
    const err = await response.json();
    return res.status(500).json({ error: 'Erreur envoi email', detail: err });
  }

  return res.status(200).json({ success: true });
}
