/* Keepalive: Vercel Cron llama aqui 1 vez al dia para que Upstash
   no borre la base por inactividad (plan Free = 14 dias). No usa IA. */
export default async function handler(req, res) {
  try {
    const r = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.UPSTASH_REDIS_REST_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', 'keepalive', new Date().toISOString()])
    });
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error || 'HTTP ' + r.status);
    return res.status(200).json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    console.error('Keepalive error:', e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
