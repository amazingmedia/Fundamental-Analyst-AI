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

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        
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
            throw new Error(errorData.error ? errorData.error.message : 'Google API request failed');
        }

        const result = await geminiResponse.json();
        const candidate = result.candidates?.[0];

        // === ဒီနေရာက အဓိက ပြင်ဆင်ချက်ပါ ===
        if (candidate && candidate.content?.parts?.[0]?.text) {
            // အောင်မြင်ရင် စာသားကိုပြန်ပို့မယ်
            response.status(200).json({ text: candidate.content.parts[0].text });
        } else {
            // စာသားမပါရင် ဘာကြောင့်လဲဆိုတာကို error message အဖြစ်ပြန်ပို့မယ်
            const reason = candidate?.finishReason || result.promptFeedback?.blockReason || 'UNKNOWN_REASON';
            console.error(`No text in response. Finish Reason: ${reason}`);
            response.status(200).json({ error: `API မှ အဖြေရသော်လည်း စာသားမပါဝင်ပါ။ အကြောင်းအရင်း: ${reason}` });
        }

    } catch (error) {
        console.error("Server-side Catch Block Error:", error);
        response.status(500).json({ error: error.message });
    }
}
