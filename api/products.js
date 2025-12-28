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

    // ✅ Endpoint padrão de produtos
    const url = `https://api.nuvemshop.com.br/v1/${userId}/products?page=${page}&per_page=${per_page}`;

    const response = await fetch(url, {
      headers: {
        "Authentication": `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ellas-nuvemshop-api (Vercel)",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Erro ao buscar produtos na Nuvemshop",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
