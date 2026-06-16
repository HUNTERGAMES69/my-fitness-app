export default async function handler(req, res) {
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  const { messages, context } = req.body;
  if(!messages) return res.status(400).json({error:'Missing messages'});

  const systemPrompt = `You are a knowledgeable, encouraging personal fitness and nutrition coach for Andy Martin. 
You have access to Andy's current fitness data:

${context}

Goals: 2,400 cal/day · 175g protein · 190g carbs · 100g fat (body recomposition)
Current approach: 1g protein per 10 calories eaten as efficiency target.

Give concise, practical, personalized advice based on Andy's actual data. 
Be direct and specific — reference his real numbers when relevant.
Keep responses focused and mobile-friendly (not too long).`;

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
    res.status(200).json({reply: data.content[0].text});
  } catch(e) {
    res.status(500).json({error: e.message});
  }
}
