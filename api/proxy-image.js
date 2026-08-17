module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  var url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).send('Paramètre url manquant');
  }

  var parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return res.status(400).send('URL invalide');
  }
  if (parsed.protocol !== 'https:') {
    return res.status(400).send('Seules les URLs https sont autorisées');
  }
  var host = parsed.hostname.toLowerCase();
  var blockedHost = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1)/;
  if (blockedHost.test(host) || host.indexOf('.') === -1) {
    return res.status(400).send('Hôte non autorisé');
  }

  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 10000);

  try {
    var upstream = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) {
      return res.status(upstream.status).send('Erreur de récupération de l\'image');
    }
    var contentType = upstream.headers.get('content-type') || '';
    if (contentType.indexOf('image/') !== 0) {
      return res.status(415).send('Contenu non autorisé');
    }
    var buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200).send(buffer);
  } catch (err) {
    clearTimeout(timeout);
    res.status(500).send('Erreur lors du chargement de l\'image');
  }
};
