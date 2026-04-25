const { Client } = require(’@notionhq/client’);
const notion = new Client({ auth: process.env.NOTION_TOKEN });

module.exports = async function handler(req, res) {
res.setHeader(‘Access-Control-Allow-Origin’, ‘*’);
res.setHeader(‘Access-Control-Allow-Methods’, ‘GET’);
res.setHeader(‘Access-Control-Allow-Headers’, ‘Content-Type’);

const { id } = req.query;
if (!id) return res.status(400).json({ erreur: ‘id manquant’ });

try {
const page = await notion.pages.retrieve({ page_id: id });
const p = page.properties;
const titleProp = Object.keys(p).find(k => p[k].type === ‘title’);
const article = {
id: page.id,
nom: p[titleProp]?.title?.[0]?.plain_text ?? ‘’,
photo: p[‘Photo principale’]?.files?.[0]?.file?.url
?? p[‘Photo principale’]?.files?.[0]?.external?.url
?? null,
photos_ambiance: (p[‘Photos d'ambiance’]?.files ?? []).map(f =>
f?.file?.url ?? f?.external?.url ?? null
).filter(Boolean),
prix_location: p[‘Prix location’]?.number ?? null,
qtite_en_ligne: p[‘Qtité en ligne’]?.number ?? 0,
};
res.status(200).json(article);
} catch (err) {
res.status(500).json({ erreur: err.message });
}
};