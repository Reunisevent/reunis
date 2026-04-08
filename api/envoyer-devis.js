const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });

  try {
    var body = req.body;
    var nom = body.nom || '';
    var email = body.email || '';
    var telephone = body.telephone || '';
    var livraison = body.livraison || '';
    var adresse_livraison = body.adresse_livraison || '';
    var date_evenement = body.date_evenement || '';
    var type_evenement = body.type_evenement || '';
    var message = body.message || '';
    var articles = body.articles || [];

    // ── Email à Réunis ──
    var lignesArticles = articles.map(function(a){
      var ligne = '<tr style="border-bottom:1px solid #eee;">'
        + '<td style="padding:12px 8px;"><strong>' + a.name + '</strong></td>'
        + '<td style="padding:12px 8px;text-align:center;">' + (a.qty || 1) + '</td>'
        + '<td style="padding:12px 8px;text-align:right;">' + (a.prix ? parseFloat(a.prix).toFixed(2) + '€' : 'Sur devis') + '</td>'
        + '</tr>';

      if(a.perso && (a.perso.texte || a.perso.couleur || a.perso.fileUrl)) {
        ligne += '<tr style="background:#faf9f9;">'
          + '<td colspan="3" style="padding:6px 8px 12px 24px;font-size:12px;color:#888;">'
          + '✏️ Personnalisation : '
          + (a.perso.texte ? '<em>' + a.perso.texte + '</em>' : '')
          + (a.perso.couleur ? ' — Couleur : ' + (a.perso.couleur === 'Autre' ? a.perso.couleurAutre : a.perso.couleur) : '')
          + (a.perso.fileUrl ? ' — <a href="' + a.perso.fileUrl + '" target="_blank">Voir le fichier joint</a>' : '')
          + '</td></tr>';
      }
      return ligne;
    }).join('');

    var totalArticles = articles.reduce(function(acc, a) {
      return acc + ((parseFloat(a.prix) || 0) * (a.qty || 1));
    }, 0);

    var htmlReunis = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">'
      + '<div style="background:#000;padding:24px;text-align:center;">'
      + '<h1 style="color:white;font-size:28px;margin:0;letter-spacing:2px;">Réunis</h1>'
      + '<p style="color:#D65B80;font-size:11px;letter-spacing:3px;margin:4px 0 0;text-transform:uppercase;">Nouvelle demande de devis</p>'
      + '</div>'
      + '<div style="padding:32px;background:#FAF1F1;">'

      + '<h2 style="font-size:16px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">Coordonnées</h2>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">'
      + '<tr><td style="padding:6px 0;color:#888;width:40%;">Nom</td><td style="padding:6px 0;font-weight:600;">' + nom + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:' + email + '">' + email + '</a></td></tr>'
      + (telephone ? '<tr><td style="padding:6px 0;color:#888;">Téléphone</td><td style="padding:6px 0;font-weight:600;">' + telephone + '</td></tr>' : '')
      + (body.livraison ? '<tr><td style="padding:6px 0;color:#888;">Livraison</td><td style="padding:6px 0;font-weight:600;">' + body.livraison + '</td></tr>' : '')
      + (body.adresse_livraison ? '<tr><td style="padding:6px 0;color:#888;">Adresse</td><td style="padding:6px 0;font-weight:600;">' + body.adresse_livraison + '</td></tr>' : '')
      + (date_evenement ? '<tr><td style="padding:6px 0;color:#888;">Date événement</td><td style="padding:6px 0;font-weight:600;">' + date_evenement + '</td></tr>' : '')
      + (type_evenement ? '<tr><td style="padding:6px 0;color:#888;">Type événement</td><td style="padding:6px 0;font-weight:600;">' + type_evenement + '</td></tr>' : '')
      + '</table>'

      + '<h2 style="font-size:16px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;">Sélection</h2>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">'
      + '<thead><tr style="background:#000;color:white;">'
      + '<th style="padding:10px 8px;text-align:left;font-size:11px;letter-spacing:1px;">Article</th>'
      + '<th style="padding:10px 8px;text-align:center;font-size:11px;letter-spacing:1px;">Qté</th>'
      + '<th style="padding:10px 8px;text-align:right;font-size:11px;letter-spacing:1px;">Prix/pcs</th>'
      + '</tr></thead>'
      + '<tbody>' + lignesArticles + '</tbody>'
      + (totalArticles > 0 ? '<tfoot><tr><td colspan="2" style="padding:12px 8px;font-weight:700;font-size:13px;">Total estimé (hors perso)</td>'
      + '<td style="padding:12px 8px;text-align:right;font-weight:700;color:#D65B80;">' + totalArticles.toFixed(2) + '€</td></tr></tfoot>' : '')
      + '</table>'

      + (message ? '<h2 style="font-size:16px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Message</h2>'
      + '<p style="font-size:14px;line-height:1.7;color:#444;background:white;padding:16px;border-radius:6px;">' + message + '</p>' : '')

      + '</div>'
      + '<div style="padding:16px;text-align:center;background:#fff;font-size:11px;color:#aaa;">'
      + 'Réunis — contact@reunisevent.com'
      + '</div></div>';

    await resend.emails.send({
      from: 'Réunis <contact@reunisevent.com>',
      to: 'contact@reunisevent.com',
      reply_to: email,
      subject: '✨ Nouvelle demande de devis — ' + nom,
      html: htmlReunis
    });

    // ── Email de confirmation au client ──
    var htmlClient = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">'
      + '<div style="background:#000;padding:24px;text-align:center;">'
      + '<h1 style="color:white;font-size:28px;margin:0;letter-spacing:2px;">Réunis</h1>'
      + '</div>'
      + '<div style="padding:32px;background:#FAF1F1;">'
      + '<h2 style="font-family:Georgia,serif;font-size:22px;font-weight:400;margin-bottom:16px;">Merci ' + nom.split(' ')[0] + ' !</h2>'
      + '<p style="font-size:14px;line-height:1.85;color:#444;margin-bottom:20px;">'
      + 'Nous avons bien reçu votre sélection et nous reviendrons vers vous dans les 48h pour confirmer la disponibilité et vous transmettre votre devis.'
      + '</p>'
      + '<p style="font-size:14px;line-height:1.85;color:#444;margin-bottom:32px;">'
      + 'En attendant, n\'hésitez pas à continuer à explorer notre catalogue !'
      + '</p>'
      + '<div style="text-align:center;">'
      + '<a href="https://www.reunisevent.com/decorer.html" style="background:#000;color:white;border-radius:6px;padding:14px 28px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;display:inline-block;">Voir le catalogue →</a>'
      + '</div>'
      + '</div>'
      + '<div style="padding:16px;text-align:center;background:#fff;font-size:11px;color:#aaa;">'
      + 'Réunis — contact@reunisevent.com'
      + '</div></div>';

    await resend.emails.send({
      from: 'Réunis <contact@reunisevent.com>',
      to: email,
      subject: 'Votre sélection Réunis — on revient vers vous très vite ✨',
      html: htmlClient
    });

    res.status(200).json({ succes: true });

  } catch(err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
};
