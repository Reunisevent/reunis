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
    var prenom = nom.split(' ')[0];

    // Formater la date JJ/MM/AAAA
    function formatDate(d) {
      if(!d) return '';
      var parts = d.split('-');
      if(parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
      return d;
    }
    var date_evenement_fmt = formatDate(date_evenement);

    // ── Lignes articles ──
    var lignesArticles = articles.map(function(a){
      var ligne = '<tr style="border-bottom:1px solid #ede8e8;">'
        + '<td style="padding:12px 8px;font-size:13px;color:#333;"><strong>' + a.name + '</strong></td>'
        + '<td style="padding:12px 8px;text-align:center;font-size:13px;color:#333;">' + (a.qty || 1) + '</td>'
        + '<td style="padding:12px 8px;text-align:right;font-size:13px;color:#333;">' + (a.prix ? parseFloat(a.prix).toFixed(2) + '€' : 'Sur devis') + '</td>'
        + '</tr>';

      if(a.personnalisable === 'Oui') {
        if(a.perso && (a.perso.texte || a.perso.couleur || a.perso.fileUrl)) {
          ligne += '<tr style="background:#f5f0f0;">'
            + '<td colspan="3" style="padding:6px 8px 12px 24px;font-size:12px;color:#888;">'
            + '✏️ Personnalisation souhaitée : '
            + (a.perso.texte ? '<em>' + a.perso.texte + '</em>' : '')
            + (a.perso.couleur ? ' — Couleur : ' + (a.perso.couleur === 'Autre' ? a.perso.couleurAutre : a.perso.couleur) : '')
            + (a.perso.fileUrl ? ' — <a href="' + a.perso.fileUrl + '" target="_blank" style="color:#D65B80;">Voir le fichier joint</a>' : '')
            + '</td></tr>';
        } else {
          ligne += '<tr style="background:#f5f0f0;">'
            + '<td colspan="3" style="padding:6px 8px 12px 24px;font-size:12px;color:#888;">'
            + '📦 Personnalisation : non souhaitée'
            + '</td></tr>';
        }
      }
      return ligne;
    }).join('');

    var totalArticles = articles.reduce(function(acc, a) {
      return acc + ((parseFloat(a.prix) || 0) * (a.qty || 1));
    }, 0);

    // ── Email à Réunis ──
    var htmlReunis = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF1F1;">'
      + '<div style="background:#FAF1F1;padding:28px 32px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,.1);">'
      + '<img src="https://res.cloudinary.com/dhdzcow9l/image/upload/v1779474856/Reunisevent_logo_mail_kjkdbc.png" alt="Réunis" style="height:80px;width:auto;display:block;margin:0 auto;">'
      + '<p style="color:#D65B80;font-size:11px;letter-spacing:3px;margin:8px 0 0;text-transform:uppercase;">Nouvelle demande de devis</p>'
      + '</div>'
      + '<div style="padding:32px;background:#FAF1F1;">'
      + '<h2 style="font-size:16px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;color:#222;">Coordonnées</h2>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">'
      + '<tr><td style="padding:6px 0;color:#888;width:40%;font-size:13px;">Nom</td><td style="padding:6px 0;font-weight:600;font-size:13px;">' + nom + '</td></tr>'
      + '<tr><td style="padding:6px 0;color:#888;font-size:13px;">Email</td><td style="padding:6px 0;font-weight:600;font-size:13px;"><a href="mailto:' + email + '" style="color:#D65B80;">' + email + '</a></td></tr>'
      + (telephone ? '<tr><td style="padding:6px 0;color:#888;font-size:13px;">Téléphone</td><td style="padding:6px 0;font-weight:600;font-size:13px;">' + telephone + '</td></tr>' : '')
      + (livraison ? '<tr><td style="padding:6px 0;color:#888;font-size:13px;">Livraison</td><td style="padding:6px 0;font-weight:600;font-size:13px;">' + livraison + '</td></tr>' : '')
      + (adresse_livraison ? '<tr><td style="padding:6px 0;color:#888;font-size:13px;">Adresse</td><td style="padding:6px 0;font-weight:600;font-size:13px;">' + adresse_livraison + '</td></tr>' : '')
      + (date_evenement ? '<tr><td style="padding:6px 0;color:#888;font-size:13px;">Date événement</td><td style="padding:6px 0;font-weight:600;font-size:13px;">' + date_evenement_fmt + '</td></tr>' : '')
      + (type_evenement ? '<tr><td style="padding:6px 0;color:#888;font-size:13px;">Type événement</td><td style="padding:6px 0;font-weight:600;font-size:13px;">' + type_evenement + '</td></tr>' : '')
      + '</table>'
      + '<h2 style="font-size:16px;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px;color:#222;">Sélection</h2>'
      + '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:white;border-radius:8px;overflow:hidden;">'
      + '<thead><tr style="background:#222;color:white;">'
      + '<th style="padding:10px 8px;text-align:left;font-size:11px;letter-spacing:1px;">Article</th>'
      + '<th style="padding:10px 8px;text-align:center;font-size:11px;letter-spacing:1px;">Qté</th>'
      + '<th style="padding:10px 8px;text-align:right;font-size:11px;letter-spacing:1px;">Prix/pcs</th>'
      + '</tr></thead>'
      + '<tbody>' + lignesArticles + '</tbody>'
      + (totalArticles > 0 ? '<tfoot><tr style="background:#f5f0f0;"><td colspan="2" style="padding:12px 8px;font-weight:700;font-size:13px;">Total estimé (hors perso)</td>'
      + '<td style="padding:12px 8px;text-align:right;font-weight:700;color:#D65B80;font-size:14px;">' + totalArticles.toFixed(2) + '€</td></tr></tfoot>' : '')
      + '</table>'
      + (message ? '<h2 style="font-size:16px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;color:#222;">Message</h2>'
      + '<p style="font-size:14px;line-height:1.7;color:#444;background:white;padding:16px;border-radius:6px;">' + message + '</p>' : '')
      + '</div>'
      + '<div style="padding:16px;text-align:center;background:#FAF1F1;border-top:1px solid rgba(0,0,0,.1);font-size:11px;color:#aaa;">'
      + 'Réunis — <a href="mailto:contact@reunisevent.com" style="color:#D65B80;">contact@reunisevent.com</a>'
      + '</div></div>';

    await resend.emails.send({
      from: 'Réunis <contact@reunisevent.com>',
      to: 'contact@reunisevent.com',
      reply_to: email,
      subject: '✨ Nouvelle demande de devis — ' + nom,
      html: htmlReunis
    });

    // ── Email de confirmation au client ──
    var recapRows = '';
    if(date_evenement) recapRows += '<tr><td style="padding:7px 0;color:#888;font-size:13px;width:45%;">Date de l\'événement</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + date_evenement_fmt + '</td></tr>';
    if(type_evenement) recapRows += '<tr><td style="padding:7px 0;color:#888;font-size:13px;">Type d\'événement</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + type_evenement + '</td></tr>';
    if(livraison) recapRows += '<tr><td style="padding:7px 0;color:#888;font-size:13px;">Mode de livraison</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + livraison + '</td></tr>';
    if(totalArticles > 0) recapRows += '<tr><td style="padding:7px 0;color:#888;font-size:13px;">Montant estimé</td><td style="padding:7px 0;font-size:13px;font-weight:700;color:#D65B80;">' + totalArticles.toFixed(2) + '€</td></tr>';
    if(message) recapRows += '<tr><td style="padding:7px 0;color:#888;font-size:13px;vertical-align:top;">Votre message</td><td style="padding:7px 0;font-size:13px;color:#444;font-style:italic;">' + message + '</td></tr>';

    var htmlClient = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF1F1;">'

      // Header
      + '<div style="background:#FAF1F1;padding:28px 32px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,.1);">'
      + '<img src="https://res.cloudinary.com/dhdzcow9l/image/upload/v1779474856/Reunisevent_logo_mail_kjkdbc.png" alt="Réunis" style="height:80px;width:auto;display:block;margin:0 auto;">'
      + '</div>'

      // Corps
      + '<div style="padding:36px 32px;background:#FAF1F1;">'

      // Accroche
      + '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#222;margin:0 0 16px;">Merci ' + prenom + '&nbsp;!</h2>'
      + '<p style="font-size:14px;line-height:1.85;color:#444;margin:0 0 28px;">'
      + 'Nous avons bien reçu votre sélection et nous reviendrons vers vous dans les meilleurs délais.'
      + '</p>'

      // Phrase de remerciement
      + '<p style="font-size:14px;line-height:1.85;color:#D65B80;margin:0 0 28px;font-style:italic;">'
      + 'Nous avons hâte de donner vie à votre événement 🪩'
      + '</p>'

      // Récapitulatif
      + (recapRows ? '<div style="background:white;border-radius:8px;padding:20px 24px;margin-bottom:28px;">'
      + '<p style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 14px;">Récapitulatif de votre demande</p>'
      + '<table style="width:100%;border-collapse:collapse;">' + recapRows + '</table>'
      + '</div>' : '')

      // Séparateur
      + '<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:0 0 28px;">'

      // Catalogue
      + '<p style="font-size:13px;font-weight:700;color:#222;margin:0 0 6px;">Vous avez oublié quelque chose ?</p>'
      + '<p style="font-size:13px;line-height:1.75;color:#444;margin:0 0 12px;">Votre sélection reste modifiable sans frais jusqu\'à 5 jours avant votre événement.</p>'
      + '<p style="margin:0 0 28px;"><a href="https://www.reunisevent.com/decorer.html" style="color:#D65B80;font-size:13px;font-weight:700;text-decoration:none;">Explorer le catalogue →</a></p>'

      // Configurateur
      + '<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:0 0 28px;">'
      + '<p style="font-size:13px;font-weight:700;color:#222;margin:0 0 6px;">Besoin d\'un coup de pouce pour l\'organisation ou la scénographie de votre événement ?</p>'
      + '<p style="font-size:13px;line-height:1.75;color:#444;margin:0 0 12px;">Nous pouvons vous accompagner à chaque étape. Laissez-vous guider pas à pas.</p>'
      + '<p style="margin:0 0 28px;"><a href="https://www.reunisevent.com/configurateur.html" style="color:#D65B80;font-size:13px;font-weight:700;text-decoration:none;">Utiliser le configurateur →</a></p>'

      // FAQ
      + '<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:0 0 28px;">'
      + '<p style="font-size:13px;color:#444;margin:0 0 4px;">Une question ? Retrouvez toutes les réponses dans <a href="https://www.reunisevent.com/faq.html" style="color:#D65B80;font-weight:700;text-decoration:none;">notre FAQ</a>.</p>'

      + '</div>'

      // Footer
      + '<div style="padding:20px 32px;background:#FAF1F1;border-top:1px solid rgba(0,0,0,.1);text-align:center;">'
      + '<p style="font-size:11px;color:#aaa;margin:0 0 6px;">Réunis — <a href="mailto:contact@reunisevent.com" style="color:#D65B80;text-decoration:none;">contact@reunisevent.com</a></p>'
      + '<p style="font-size:10px;color:#bbb;margin:0;">*Sélection modifiable sous réserve de disponibilité.</p>'
      + '</div>'

      + '</div>';

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
