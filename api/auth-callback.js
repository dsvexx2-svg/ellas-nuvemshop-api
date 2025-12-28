export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Parâmetro ?code não encontrado" });
    }

    const clientId = process.env.NUVEMSHOP_APP_ID;
    const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET;
    const redirectUri = process.env.NUVEMSHOP_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({
        error: "Variáveis de ambiente não configuradas",
      });
    }

    const tokenUrl = "https://www.nuvemshop.com.br/apps/authorize/token";

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro ao gerar token",
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      access_token: data.access_token,
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
