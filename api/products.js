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

    const page = String(req.query.page ?? "1").trim();
    const per_page = String(req.query.per_page ?? "30").trim();

    const url = `https://api.nuvemshop.com.br/v1/${userId}/products?page=${encodeURIComponent(
      page
    )}&per_page=${encodeURIComponent(per_page)}`;

    const response = await fetch(url, {
      headers: {
        // Nuvemshop usa "Authentication: bearer <token>" (como você já está usando)
        Authentication: `bearer ${String(token).trim()}`,
        "Content-Type": "application/json",
        "User-Agent": "ellas-nuvemshop-api (Vercel)",
      },
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        error: "Resposta inválida (não-JSON) da Nuvemshop",
        raw: rawText?.slice?.(0, 1000) ?? rawText,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao buscar produtos na Nuvemshop",
        details: data,
      });
    }

    // A API de produtos retorna array
    const products = Array.isArray(data) ? data : [];

    // Helpers de limpeza
    const cleanString = (v) =>
      v == null ? "" : String(v).replace(/\s+/g, " ").trim();

    const cleanUrl = (v) => {
      let s = cleanString(v);

      // remove colchetes e aspas se vierem colados (ex: "[https://...]" ou "\"https://...\"")
      s = s.replace(/^\[+/, "").replace(/\]+$/, "");
      s = s.replace(/^"+/, "").replace(/"+$/, "");
      s = s.replace(/^'+/, "").replace(/'+$/, "");

      // valida esquema
      if (!/^https?:\/\//i.test(s)) return "";
      return s;
    };

    const pickName = (p) => {
      const n = p?.name;
      if (!n) return "";
      if (typeof n === "string") return cleanString(n);
      // tenta PT primeiro
      return cleanString(n.pt || n["pt-BR"] || n.es || n.en || "");
    };

    const sumStock = (variant) => {
      if (!Array.isArray(variant?.inventory_levels)) return null;
      return variant.inventory_levels.reduce((acc, it) => {
        const s = Number(it?.stock);
        return acc + (Number.isFinite(s) ? s : 0);
      }, 0);
    };

    const mapped = products.map((p) => {
      const name = pickName(p);

      const firstVariant = p?.variants?.[0] ?? null;

      const price =
        firstVariant?.price != null ? cleanString(firstVariant.price) : "";

      const promotional_price =
        firstVariant?.promotional_price != null
          ? cleanString(firstVariant.promotional_price)
          : "";

      // ✅ pega imagem e "higieniza"
      const image_url = cleanUrl(p?.images?.[0]?.src);

      // ✅ url do produto e "higieniza"
      const productUrl = cleanUrl(p?.canonical_url);

      const stock = sumStock(firstVariant);

      return {
        id: p?.id ?? null,
        name,
        price,
        promotional_price,
        image_url, // ✅ sem espaços/colchetes/aspas e sempre http(s) ou ""
        url: productUrl,
        stock, // null ou número
      };
    });

    return res.status(200).json({
      page: Number(page) || 1,
      per_page: Number(per_page) || 30,
      count: mapped.length,
      products: mapped,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Erro interno",
      message: String(err?.message || err),
    });
  }
}
