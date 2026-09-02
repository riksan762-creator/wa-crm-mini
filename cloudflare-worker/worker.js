// Cloudflare Worker — satu-satunya tempat API key WhatsApp benar-benar disimpan.
// Env vars (WA_API_KEY, ADMIN_TOKEN) diisi lewat dashboard Cloudflare (Settings -> Variables),
// BUKAN ditulis di file ini, jadi aman walau kode ini di-push ke GitHub publik.

export default {
  async fetch(request, env) {
    // Izinkan browser manggil dari domain admin panel lo (ganti sesuai domain GitHub Pages lo)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // ganti '*' dengan domain admin panel lo kalau sudah live
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Cek token admin — hanya admin panel yang tau token ini yang boleh kirim pesan
    const adminToken = request.headers.get('X-Admin-Token');
    if (!adminToken || adminToken !== env.ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      const { phone, message } = await request.json();
      if (!phone || !message) {
        return new Response(JSON.stringify({ error: 'phone dan message wajib diisi' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Contoh pakai provider Fonnte. Ganti sesuai provider yang lo pakai.
      const waResponse = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': env.WA_API_KEY, // <-- API key rahasia, cuma ada di sini
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ target: phone, message }),
      });

      const waResult = await waResponse.json();

      return new Response(JSON.stringify({ success: waResponse.ok, data: waResult }), {
        status: waResponse.ok ? 200 : 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
