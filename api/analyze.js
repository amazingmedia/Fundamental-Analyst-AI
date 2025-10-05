export default async function handler(request, response) {
    console.log("Executing final version with original v1beta settings.");

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return response.status(500).json({ error: 'API key is not configured on the server.' });
    }

    try {
        const { asset } = request.body;
        if (!asset) {
            return response.status(400).json({ error: 'Asset is required.' });
        }

        // === အဓိက ပြင်ဆင်ချက် ===
        // ခင်ဗျားရဲ့ မူလ code မှာ အလုပ်လုပ်တဲ့ API URL ကို ပြန်သုံးပါမယ်။
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        
        const prompt = `
            Professional Financial Analyst တစ်ယောက်အနေဖြင့် အောက်ပါအချက်များကို တိကျစွာသုံးသပ်ပေးပါ။ အဖြေအားလုံးကို မြန်မာဘာသာဖြင့်သာ ပြန်လည်ဖြေကြားပါ။ အရေးကြီးသော အဖြစ်အပျက်တိုင်းတွင် နေ့စွဲ (Date) ကို ထည့်သွင်းဖော်ပြပါ။
            Asset: ${asset}
            (Your full prompt text here...)
        `;

        // === အဓိက ပြင်ဆင်ချက် ===
        // "tools" parameter ကို ပြန်ထည့်ပါမယ်။ v1beta မှာ အလုပ်လုပ်ပါတယ်။
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
            throw new Error(errorData.error ? errorData.error.message : 'Google API request failed');
        }

        const result = await geminiResponse.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            response.status(200).json({ text: candidate.content.parts[0].text });
        } else {
             const feedback = result.promptFeedback || { blockReason: 'No content in Google API response.'};
             throw new Error(feedback.blockReason);
        }

    } catch (error) {
        console.error("Server-side Catch Block Error:", error);
        response.status(500).json({ error: error.message });
    }
}
