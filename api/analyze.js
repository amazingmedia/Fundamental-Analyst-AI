export default async function handler(request, response) {
    // Log message ထည့်ပြီး ဘယ် version run နေလဲ စစ်ပါမယ်
    console.log("Executing analyze.js version with gemini-1.5-pro-latest.");

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured.");
        return response.status(500).json({ error: 'API key is not configured on the server.' });
    }

    try {
        const { asset } = request.body;
        if (!asset) {
            return response.status(400).json({ error: 'Asset is required.' });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
        console.log(`Sending request to: ${API_URL.split('?')[0]}`); // URL ကို log မှာပြပါမယ်

        // ... (prompt code is the same, no need to copy it here again, just use the file)
        const prompt = `
            Professional Financial Analyst တစ်ယောက်အနေဖြင့် အောက်ပါအချက်များကို တိကျစွာသုံးသပ်ပေးပါ။ အဖြေအားလုံးကို မြန်မာဘာသာဖြင့်သာ ပြန်လည်ဖြေကြားပါ။ အရေးကြီးသော အဖြစ်အပျက်တိုင်းတွင် နေ့စွဲ (Date) ကို ထည့်သွင်းဖော်ပြပါ။
            Asset: ${asset}
            (Your full prompt text here...)
        `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ "google_search": {} }]
        };

        const geminiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Error from Google API:", errorData);
            throw new Error(errorData.error ? errorData.error.message : 'Google API request failed');
        }

        const result = await geminiResponse.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            response.status(200).json({ text: candidate.content.parts[0].text });
        } else {
             const feedback = result.promptFeedback || { blockReason: 'No content in Google API response.'};
             console.error("No valid candidate found. Feedback:", feedback);
             throw new Error(feedback.blockReason);
        }

    } catch (error) {
        console.error("Server-side Catch Block Error:", error);
        response.status(500).json({ error: error.message });
    }
}
