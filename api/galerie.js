const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });

const GALERIE_DB = '33be9b0ba25480fab0c2ed465b599176';

function getFileUrl(prop) {
  if (!prop) return null;
  const files = prop.files || [];
  if (!files.length) return null;
  const f = files[0];
  return f.file?.url || f.external?.url || null;
}

function getAllFileUrls(prop) {
  if (!prop) return [];
  return (prop.files || []).map(f => f.file?.url || f.external?.url).filter(Boolean);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120');

  try {
    // 1. Récupérer les événements publiés
    const response = await notion.databases.query({
      database_id: GALERIE_DB
    });

    const evenements = [];

    // DEBUG : retourner les noms des propriétés du premier résultat
    if (response.results.length > 0) {
      const debugProps = Object.keys(response.results[0].properties);
      console.log('Propriétés disponibles:', debugProps);
    }

    for (const page of response.results) {
      const props = page.properties;

      // Titre
      const titre = props['Name']?.title?.[0]?.plain_text || '';

      // Cover
      const cover = getFileUrl(props['Cover']);

      // Photos
      const photos = getAllFileUrls(props['Photos']);

      // Description
      const description = props['Description @']?.rich_text?.[0]?.plain_text || '';

      // Relation inventaire → IDs
      const inventaireIds = (props['Inventaire']?.relation || []).map(r => r.id);

      // Récupérer les articles liés
      const articles = [];
      for (const id of inventaireIds.slice(0, 12)) {
        try {
          const articlePage = await notion.pages.retrieve({ page_id: id });
          const ap = articlePage.properties;
          const nom = ap['Nom']?.title?.[0]?.plain_text || ap['Name']?.title?.[0]?.plain_text || '';
          const photo = getFileUrl(ap['Photo principale'] || ap['Photo'] || ap['Photos']);
          const prix = ap['Prix location']?.number || ap['Prix']?.number || null;
          if (nom) articles.push({ id, nom, photo, prix });
        } catch(e) {}
      }

      // Debug : pousser même sans cover
      evenements.push({ id: page.id, titre: titre||'(sans titre)', cover: cover||'', photos, description, articles, debug_publié: props['Publié @']?.checkbox });
    }

    res.status(200).json(evenements);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
};
