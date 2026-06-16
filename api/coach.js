export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  let body = req.body;
  if(typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) { return res.status(400).json({error:'Invalid JSON'}); }
  }

  const { messages, context } = body || {};
  if(!messages || !Array.isArray(messages)) {
    return res.status(400).json({error:'Missing or invalid messages'});
  }

  const systemPrompt = `You are a knowledgeable, encouraging personal fitness and nutrition coach for Andy Martin.
You have access to Andy's current fitness data:

${context || 'No context available'}

Goals: 2,400 cal/day · 175g protein · 190g carbs · 100g fat (body recomposition)
Current approach: 1g protein per 10 calories eaten as efficiency target.

Give concise, practical, personalized advice based on Andy's actual data.
Be direct and specific — reference his real numbers when relevant.
Keep responses focused and mobile-friendly (not too long).

IMPORTANT: If Andy asks about a specific meal, food, or what to eat, and you can estimate its macros, 
append a JSON block at the very end of your response in this exact format (nothing after it):
<mealdata>{"name":"meal name","calories":0,"protein":0,"carbs":0,"fat":0}</mealdata>

Only include this if you are reasonably confident in the macro estimates for a specific meal.
Do not include it for general advice, questions about workouts, weight, or vague food discussions.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    if(data.error) return res.status(400).json({error: data.error.message});
    if(!data.content || !data.content[0]) return res.status(500).json({error:'Empty response from API'});

    const fullText = data.content[0].text;

    // Extract meal data if present
    const mealMatch = fullText.match(/<mealdata>(.*?)<\/mealdata>/s);
    let mealData = null;
    let replyText = fullText;

    if(mealMatch) {
      try {
        mealData = JSON.parse(mealMatch[1]);
        replyText = fullText.replace(/<mealdata>.*?<\/mealdata>/s, '').trim();
      } catch(e) {}
    }

    return res.status(200).json({ reply: replyText, mealData });
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}
