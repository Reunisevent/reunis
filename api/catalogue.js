export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch('https://httpbin.org/get');
    const text = await response.text();
    res.status(200).json({ test: text });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
}
