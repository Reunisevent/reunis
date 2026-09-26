const { Client } = require('@notionhq/client');
const { queryAll } = require('./_notion');
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

// Catégorie de l'événement (mariage, anniversaire…) — accepte select, multi-select ou texte
function getCategorie(props) {
  const key = Object.keys(props).find(k =>
    k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '').startsWith('categorie')
  );
  const p = key && props[key];
  if (!p) return '';
  if (p.type === 'select') return p.select?.name || '';
  if (p.type === 'multi_select') return (p.multi_select || []).map(o => o.name).join(' · ');
  if (p.type === 'status') return p.status?.name || '';
  if (p.type === 'rich_text') return (p.rich_text || []).map(t => t.plain_text).join('');
  if (p.type === 'formula') return p.formula?.string || '';
  return '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const pages = await queryAll(notion, {
      database_id: GALERIE_DB,
      filter: {
        property: 'Publié @',
        checkbox: { equals: true }
      }
    });

    const evenements = [];

    for (const page of pages) {
      const props = page.properties;

      // Titre — apostrophe typographique
      const titleProp = props['Nom de l\u2019\u00e9v\u00e9nement'];
      const titre = titleProp?.title?.[0]?.plain_text || '';

      const cover = getFileUrl(props['Cover']);
      const photos = getAllFileUrls(props['Photos']);
      const description = props['Description @']?.rich_text?.[0]?.plain_text || '';
      const categorie = getCategorie(props);
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
        evenements.push({ id: page.id, titre, categorie, cover, photos, description, articles });
      }
    }

    res.status(200).json(evenements);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
};
