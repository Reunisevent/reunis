const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });

  try {
    var d = req.body;
    var prenom = d.prenom || '';
    var nom = d.nom || '';
    var email = d.email || '';
    var telephone = d.telephone || '';

    function formatDate(str) {
      if(!str) return '';
      var p = str.split('-');
      if(p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
      return str;
    }

    function row(label, value) {
      if(!value || (Array.isArray(value) && !value.length)) return '';
      var v = Array.isArray(value) ? value.join(', ') : value.toString().trim();
      if(!v) return '';
      return '<tr><td style="padding:7px 0;color:#888;font-size:13px;width:42%;vertical-align:top;">' + label + '</td>'
           + '<td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + v + '</td></tr>';
    }

    function section(title, rows) {
      var content = rows.join('');
      if(!content) return '';
      return '<div style="margin-bottom:20px;">'
           + '<p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D65B80;margin:0 0 10px;">' + title + '</p>'
           + '<table style="width:100%;border-collapse:collapse;">' + content + '</table>'
           + '</div>';
    }

    var header = '<div style="background:#FAF1F1;padding:28px 32px 20px;text-align:center;border-bottom:1px solid rgba(0,0,0,.1);">'
      + '<img src="https://res.cloudinary.com/dhdzcow9l/image/upload/v1779474856/Reunisevent_logo_mail_kjkdbc.png" alt="Réunis" style="height:80px;width:auto;display:block;margin:0 auto;">'
      + '</div>';

    var footer = '<div style="padding:20px 32px;background:#FAF1F1;border-top:1px solid rgba(0,0,0,.1);text-align:center;">'
      + '<p style="font-size:11px;color:#aaa;margin:0;">Réunis — <a href="mailto:contact@reunisevent.com" style="color:#D65B80;text-decoration:none;">contact@reunisevent.com</a></p>'
      + '</div>';

    // ── Email à Réunis ──
    var bodyReunis = header
      + '<div style="padding:32px;background:#FAF1F1;">'
      + '<p style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#D65B80;margin:0 0 24px;">Nouvelle demande configurateur</p>'

      + section('Contact', [
          row('Prénom', prenom),
          row('Nom', nom),
          row('Email', '<a href="mailto:' + email + '" style="color:#D65B80;">' + email + '</a>'),
          row('Téléphone', telephone)
        ])

      + section("L'événement", [
          row('Type', d.type_event),
          row('Précisions', d.type_event_details),
          row('Date', formatDate(d.date_event)),
          row('Durée', d.duree)
        ])

      + section('Lieu & convives', [
          row('Lieu', d.lieu_nom),
          row('Adresse', d.lieu_adresse),
          row('Recherche lieu', d.recherche_lieu),
          row('Convives', d.nb_invites >= 500 ? '500+' : d.nb_invites + ' personnes'),
          row('Précisions', d.invites_details)
        ])

      + section('Prestataires', [
          row('Déjà réservés / en recherche', d.prestataires),
          row('Autres', d.prestataires_autres),
          row('Accompagnement prestataires', d.aide_prestataires),
          row('Coordination jour J', d.coordination_j)
        ])

      + section('Décoration', [
          row('Thème', d.theme),
          row('Couleurs', d.couleurs),
          row('Fichiers inspiration', d.inspi_files),
          row('Formule', d.formule_deco),
          row('Budget', d.budget_deco >= 8000 ? '8 000€+' : parseInt(d.budget_deco).toLocaleString('fr-FR') + '€'),
          row('Photo call / backdrop', d.photocall),
          row('Ballons', d.ballons),
          row('Fleurs', d.fleurs),
          row('Catégories souhaitées', d.categories_souhaitees)
        ])

      + (d.articles_selectionnes && d.articles_selectionnes.length
          ? '<div style="margin-bottom:20px;">'
          + '<p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D65B80;margin:0 0 10px;">Articles sélectionnés (' + d.articles_selectionnes.length + ')</p>'
          + '<div style="display:flex;flex-wrap:wrap;gap:6px;">'
          + d.articles_selectionnes.map(function(n){ return '<span style="background:white;border-radius:100px;padding:4px 12px;font-size:11px;font-weight:600;color:#333;">' + n + '</span>'; }).join('')
          + '</div></div>'
          : '')

      + (d.autres_besoins
          ? '<div style="margin-bottom:20px;"><p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D65B80;margin:0 0 10px;">Message libre</p>'
          + '<p style="font-size:13px;color:#444;line-height:1.75;background:white;padding:16px;border-radius:8px;margin:0;">' + d.autres_besoins + '</p></div>'
          : '')

      + '</div>'
      + footer;

    await resend.emails.send({
      from: 'Réunis <contact@reunisevent.com>',
      to: 'contact@reunisevent.com',
      reply_to: email,
      subject: '✨ Nouveau projet configurateur — ' + prenom + ' ' + nom,
      html: '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#FAF1F1;">' + bodyReunis + '</div>'
    });

    // ── Email de confirmation au client ──
    var recap = '';
    if(d.type_event) recap += '<tr><td style="padding:7px 0;color:#888;font-size:13px;width:45%;">Type d\'événement</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + d.type_event + '</td></tr>';
    if(d.date_event) recap += '<tr><td style="padding:7px 0;color:#888;font-size:13px;">Date</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + formatDate(d.date_event) + '</td></tr>';
    if(d.formule_deco) recap += '<tr><td style="padding:7px 0;color:#888;font-size:13px;">Formule</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#333;">' + d.formule_deco + '</td></tr>';
    if(d.budget_deco) recap += '<tr><td style="padding:7px 0;color:#888;font-size:13px;">Budget décoration</td><td style="padding:7px 0;font-size:13px;font-weight:700;color:#D65B80;">' + (d.budget_deco >= 8000 ? '8 000€+' : parseInt(d.budget_deco).toLocaleString('fr-FR') + '€') + '</td></tr>';

    var htmlClient = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF1F1;">'
      + header
      + '<div style="padding:36px 32px;background:#FAF1F1;">'

      + '<h2 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#222;margin:0 0 16px;">Merci ' + prenom + '&nbsp;!</h2>'
      + '<p style="font-size:14px;line-height:1.85;color:#444;margin:0 0 20px;">Nous avons bien reçu votre projet et nous reviendrons vers vous dans les meilleurs délais.</p>'
      + '<p style="font-size:14px;line-height:1.85;color:#D65B80;font-style:italic;margin:0 0 28px;">Nous avons hâte de donner vie à votre événement 🪩</p>'

      + (recap
          ? '<div style="background:white;border-radius:8px;padding:20px 24px;margin-bottom:28px;">'
          + '<p style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 14px;">Récapitulatif de votre projet</p>'
          + '<table style="width:100%;border-collapse:collapse;">' + recap + '</table>'
          + '</div>'
          : '')

      + '<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:0 0 28px;">'
      + '<p style="font-size:13px;font-weight:700;color:#222;margin:0 0 6px;">Vous avez oublié quelque chose ?</p>'
      + '<p style="font-size:13px;line-height:1.75;color:#444;margin:0 0 12px;">N\'hésitez pas à explorer notre catalogue — votre demande reste ouverte.</p>'
      + '<p style="margin:0 0 28px;"><a href="https://www.reunisevent.com/decorer.html" style="color:#D65B80;font-size:13px;font-weight:700;text-decoration:none;">Explorer le catalogue →</a></p>'

      + '<hr style="border:none;border-top:1px solid rgba(0,0,0,.08);margin:0 0 28px;">'
      + '<p style="font-size:13px;color:#444;margin:0 0 4px;">Une question ? Retrouvez toutes les réponses dans <a href="https://www.reunisevent.com/faq.html" style="color:#D65B80;font-weight:700;text-decoration:none;">notre FAQ</a>.</p>'

      + '</div>'
      + '<div style="padding:20px 32px;background:#FAF1F1;border-top:1px solid rgba(0,0,0,.1);text-align:center;">'
      + '<p style="font-size:11px;color:#aaa;margin:0;">Réunis — <a href="mailto:contact@reunisevent.com" style="color:#D65B80;text-decoration:none;">contact@reunisevent.com</a></p>'
      + '</div>'
      + '</div>';

    await resend.emails.send({
      from: 'Réunis <contact@reunisevent.com>',
      to: email,
      subject: 'Votre projet Réunis — on revient vers vous très vite ✨',
      html: htmlClient
    });

    res.status(200).json({ succes: true });

  } catch(err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
};
