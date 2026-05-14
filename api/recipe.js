export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ingredients, brand } = req.body || {};

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length !== 3 || !brand) {
    return res.status(400).json({ error: 'Se necesitan exactamente 3 ingredientes y nombre de marca.' });
  }

  const prompt =
    'Eres un chef creativo y apasionado. Crea una receta original y apetecible usando estos 3 ingredientes: ' +
    ingredients.join(', ') +
    '. Incorpora de forma natural y destacada el producto de la marca ' + brand + '.\n\n' +
    'Responde UNICAMENTE con este JSON sin markdown ni texto adicional:\n' +
    '{"nombre":"Nombre creativo del plato",' +
    '"descripcion":"2 frases descriptivas y apetecibles",' +
    '"ingredientes":["ingrediente con cantidad","ingrediente con cantidad","..."],' +
    '"elaboracion":"Paso 1. Descripcion | Paso 2. Descripcion | Paso 3. Descripcion"}';

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error('Anthropic error:', err);
      return res.status(502).json({ error: 'Error en la IA. Intentalo de nuevo.' });
    }

    const data = await anthropicRes.json();
    const raw = (data.content && data.content[0] && data.content[0].text) || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const recipe = JSON.parse(clean);

    /* Guardar receta en Upstash con ID corto (7 dias de expiry) */
    const id = Math.random().toString(36).substring(2, 10);
    const compact = {
      n: recipe.nombre,
      i: recipe.ingredientes,
      e: recipe.elaboracion,
      b: brand
    };

    await fetch(process.env.UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.UPSTASH_REDIS_REST_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', 'recipe_' + id, JSON.stringify(compact), 'EX', 604800])
    });

    const baseUrl = 'https://playmo-receta-proxy.vercel.app';
    const pdfUrl = baseUrl + '/api/recipe-pdf?id=' + id;

    return res.status(200).json({ ...recipe, pdfUrl });

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
