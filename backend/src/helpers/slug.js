function slugifyBase(txt='') {
  return txt.toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)+/g,'')
    .slice(0,48) || 'negocio';
}
async function uniqueSlug(supabase, base) {
  let slug = base; let i = 0;
  // evita colisiones por tu constraint NOT NULL UNIQUE
  while (true) {
    const { data } = await supabase.from('tenants').select('id').eq('slug', slug).limit(1);
    if (!data || data.length === 0) return slug;
    i += 1;
    slug = (base + '-' + i).slice(0,60);
  }
}
module.exports = { slugifyBase, uniqueSlug };
