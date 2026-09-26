// Conversion d'une page Notion en article pour le site.
// Partagé par /api/catalogue et /api/article pour que la fiche article
// reçoive toujours les mêmes champs, quelle que soit la page d'où l'on vient.
// (Le préfixe « _ » empêche Vercel d'en faire une route.)
function mapArticle(page, newIds) {
  const p = page.properties;
  const titleProp = Object.keys(p).find(k => p[k].type === 'title');
  const date_ajout = p['Date ajout']?.date?.start ?? null;
  return {
    id: page.id,
    nom: p[titleProp]?.title?.[0]?.plain_text ?? '',
    reference: p['Référence']?.rich_text?.[0]?.plain_text ?? '',
    date_ajout,
    is_new: !!(newIds && newIds.has(page.id)),
    mots_cles: p['Mots clés']?.multi_select?.map(function(m){ return m.name; }).join(' ') ?? '',
    categorie: p['Catégorie']?.select?.name ?? '',
    sous_categorie: p['Sous catégorie']?.select?.name ?? '',
    sous_sous_categorie: p['Sous-sous catégorie']?.select?.name ?? '',
    description: p['Description']?.rich_text?.[0]?.plain_text ?? '',
    dimensions: p['Dimensions']?.rich_text?.[0]?.plain_text ?? '',
    couleurs: p['Couleurs']?.multi_select?.map(c => c.name) ?? [],
    materiaux: p['Matière']?.multi_select?.map(m => m.name) ?? [],
    lies: p['Lié aux articles']?.relation?.map(r => r.id) ?? [],
    statut_stock: p['Statut stock']?.select?.name ?? '',
    qtite_en_ligne: p['Qtité en ligne']?.number ?? 0,
    personnalisable: p['Personnalisable']?.select?.name ?? '',
    prix_location: p['Prix location']?.number ?? null,
    photo: p['Photo principale']?.files?.[0]?.file?.url
        ?? p['Photo principale']?.files?.[0]?.external?.url
        ?? null,
    photos_ambiance: (p['Photos d\'ambiance']?.files ?? []).map(f =>
        f?.file?.url ?? f?.external?.url ?? null
    ).filter(Boolean),
  };
}

module.exports = { mapArticle };
