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

  try {
    const response = await notion.databases.query({
      database_id: GALERIE_DB,
      filter: {
        property: 'Publié @',
        checkbox: { equals: true }
      }
    });

    const evenements = [];

    for (const page of response.results) {
      const props = page.properties;

      // Titre — apostrophe typographique
      const titleProp = props['Nom de l\u2019\u00e9v\u00e9nement'];
      const titre = titleProp?.title?.[0]?.plain_text || '';

      const cover = getFileUrl(props['Cover']);
      const photos = getAllFileUrls(props['Photos']);
      const description = props['Description @']?.rich_text?.[0]?.plain_text || '';
      const inventaireIds = (props['Inventaire']?.relation || []).map(r => r.id);

      const articles = [];
      for (const id of inventaireIds.slice(0, 12)) {
        try {
          const articlePage = await notion.pages.retrieve({ page_id: id });
          const ap = articlePage.properties;
          const nomProp = Object.values(ap).find(p => p.type === 'title');
          const nom = nomProp?.title?.[0]?.plain_text || '';
          const photo = getFileUrl(ap['Photo principale'] || ap['Photo'] || ap['Photos']);
          const prix = ap['Prix location']?.number || ap['Prix']?.number || null;
          if (nom) articles.push({ id, nom, photo, prix });
        } catch(e) {}
      }

      if (titre && cover) {
        evenements.push({ id: page.id, titre, cover, photos, description, articles });
      }
    }

    res.status(200).json(evenements);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
};
