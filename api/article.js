const { Client } = require('@notionhq/client');
const { mapArticle } = require('./_article');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  const { id } = req.query;
  if (!id) return res.status(400).json({ erreur: 'id manquant' });

  try {
    // Lecture directe de la page : pas de limite des 100 premiers articles
    // et une seule requête Notion, même quand la sélection en déclenche plusieurs.
    let page;
    try {
      page = await notion.pages.retrieve({ page_id: id });
    } catch (err) {
      if (err.code === 'object_not_found' || err.code === 'validation_error') {
        return res.status(404).json({ erreur: 'article non trouvé' });
      }
      throw err;
    }

    const dbId = String(process.env.NOTION_DB_ID || '').replace(/-/g, '');
    const parentDb = String(page.parent?.database_id || '').replace(/-/g, '');
    const visible = page.properties?.['Visible sur le site']?.checkbox === true;
    if (page.archived || (dbId && parentDb !== dbId) || !visible) {
      return res.status(404).json({ erreur: 'article non trouvé' });
    }

    res.status(200).json(mapArticle(page));
  } catch (err) {
    res.status(err.status === 429 ? 503 : 500).json({ erreur: err.message, code: err.code });
  }
};
