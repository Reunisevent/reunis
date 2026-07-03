const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const GALERIE_DB = '33be9b0ba25480fab0c2ed465b599176';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const response = await notion.databases.query({ database_id: GALERIE_DB });
    // Retourner les props brutes du premier résultat pour debug
    if (response.results.length === 0) return res.status(200).json({ debug: 'aucun résultat' });
    const first = response.results[0];
    const propNames = Object.keys(first.properties);
    const propTypes = {};
    propNames.forEach(k => { propTypes[k] = first.properties[k].type; });
    return res.status(200).json({ 
      nb_total: response.results.length,
      prop_names: propNames,
      prop_types: propTypes,
      titre_test: first.properties['Nom de l\'événement']?.title?.[0]?.plain_text || 'non trouvé',
      publie_test: first.properties['Publié @']?.checkbox
    });
  } catch(err) {
    return res.status(500).json({ erreur: err.message });
  }
};