export default async function handler(req, res) {
  try {
    const token = process.env.NUVEMSHOP_ACCESS_TOKEN;
    const userId = process.env.NUVEMSHOP_USER_ID;

    if (!token || !userId) {
      return res.status(500).json({
        error: "Faltam variáveis de ambiente",
        hasToken: !!token,
        hasUserId: !!userId,
      });
    }

    const { page = "1", per_page = "30" } = req.query;

    const url = `https://api.nuvemshop.com.br/v1/${userId}/products?page=${page}&per_page=${per_page}`;

    const response = await fetch(url, {
      headers: {
        Authentication: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ellas-nuvemshop-api (Vercel)",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Resposta inválida (não-JSON) da Nuvemshop",
        raw: text?.slice?.(0, 1000) ?? text,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao buscar produtos na Nuvemshop",
        details: data,
      });
    }

    // ✅ Garantir que é array
    const products = Array.isArray(data) ? data : [];

    // ✅ “Enxugar” para o FlutterFlow (sem quebrar imagem)
    const mapped = products.map((p) => {
      const name =
        (p?.name && (p.name.pt || p.name["pt-BR"] || p.name.es || p.name.en)) ||
        "";

      const firstVariant = p?.variants?.[0] ?? null;

      // preços geralmente vêm como string, mas garantimos string
      const price = firstVariant?.price != null ? String(firstVariant.price) : "";
      const promotional_price =
        firstVariant?.promotional_price != null
          ? String(firstVariant.promotional_price)
          : "";

      // ✅ Nunca quebra: se não tiver imagem, vira ""
      const image_url = p?.images?.[0]?.src ? String(p.images[0].src) : "";

      // link do produto na loja (quando existir)
      const productUrl = p?.canonical_url ? String(p.canonical_url) : "";

      // estoque simples (somatório do primeiro variant, se existir)
      // obs: inventory_levels pode não vir sempre
      let stock = null;
      if (Array.isArray(firstVariant?.inventory_levels)) {
        stock = firstVariant.inventory_levels.reduce((acc, it) => {
          const s = Number(it?.stock);
          return acc + (Number.isFinite(s) ? s : 0);
        }, 0);
      }

      return {
        id: p?.id ?? null,
        name,
        price,
        promotional_price,
        image_url,
        url: productUrl,
        stock, // pode vir null
      };
    });

    return res.status(200).json({
      page: Number(page),
      per_page: Number(per_page),
      count: mapped.length,
      products: mapped,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno", message: String(err?.message || err) });
  }
}
