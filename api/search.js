export default async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short', foods: [] });
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured', foods: [] });
  }

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&dataType=Branded,Survey%20(FNDDS),Foundation&pageSize=8&api_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`USDA responded with ${response.status}`);
    }

    const data = await response.json();

    const foods = (data.foods || []).map(f => {
      const getNutrient = (...ids) => {
        for (const id of ids) {
          const n = (f.foodNutrients || []).find(
            x => x.nutrientId === id || x.nutrientNumber === String(id)
          );
          if (n && n.value != null) return Math.round(n.value * 10) / 10;
        }
        return 0;
      };

      return {
        name:     f.description,
        brand:    f.brandOwner || f.brandName || '',
        serving:  f.servingSize || 100,
        unit:     f.servingSizeUnit || 'g',
        calories: getNutrient(1008, 208),
        protein:  getNutrient(1003, 203),
        carbs:    getNutrient(1005, 205),
        fat:      getNutrient(1004, 204),
        fiber:    getNutrient(1079, 291),
      };
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json({ foods });

  } catch (err) {
    console.error('USDA proxy error:', err.message);
    return res.status(500).json({ error: 'Search failed', foods: [] });
  }
}