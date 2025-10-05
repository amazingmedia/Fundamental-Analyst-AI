export default async function handler(request, response) {
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
        
        // === ဒီနေရာက အဓိက ပြင်ဆင်ချက်ပါ ===
        // Prompt ကို ပိုပြီးအသေးစိတ်ကျတဲ့ ညွှန်ကြားချက်တွေနဲ့ အစားထိုးလိုက်ပါတယ်။
        const today = new Date().toLocaleDateString('en-CA'); // Gets today's date as YYYY-MM-DD
        const prompt = `
            You are a top-tier financial analyst for a major news outlet like Bloomberg. Your analysis must be precise, data-driven, and written in Burmese. Today's date is ${today}.

            Asset to analyze: ${asset}

            Provide a detailed analysis structured exactly as follows. You MUST include specific dates and data points in your reasoning.

            ### သတင်းအကျဉ်းချုပ်
            - Find the single most impactful news story for "${asset}" from the last 24 hours using Google Search.
            - Start with the date of the news (e.g., "အောက်တိုဘာ ၄၊ ၂၀၂၅:").
            - Summarize the news in 2-3 key bullet points. Mention specific figures or data if available.

            ### အရေးကြီးသော စီးပွားရေးသတင်းများ
            - Find the 1 or 2 most important upcoming economic events that will impact "${asset}" in the next 72 hours from the economic calendar.
            - For each event, provide:
              - **Event Name:** (in Burmese and English)
              - **Date & Time:** (Must include date, time, and timezone like GMT+0)
              - **Potential Impact:** (Detailed explanation of the potential bullish or bearish impact).

            ### ဈေးကွက်၏ ခံစားချက်
            - **Sentiment:** State clearly if it's Bullish, Bearish, or Neutral.
            - **Reasoning:** This is the most important part. Your reasoning MUST connect the sentiment to the specific, DATED events you mentioned in the "News Summary" and "Economic Calendar" sections. Explain WHY those events create the current sentiment. Use dates to support your claims (e.g., "အောက်တိုဘာ ၄ ရက်နေ့က အစိုးရရပ်ဆိုင်းမှုကြောင့်...").

            Your entire response must be in Burmese.
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

        if (candidate && candidate.content?.parts?.[0]?.text) {
            response.status(200).json({ text: candidate.content.parts[0].text });
        } else {
            const reason = candidate?.finishReason || result.promptFeedback?.blockReason || 'UNKNOWN_REASON';
            console.error(`No text in response. Finish Reason: ${reason}`);
            response.status(200).json({ error: `API မှ အဖြေရသော်လည်း စာသားမပါဝင်ပါ။ အကြောင်းအရင်း: ${reason}` });
        }

    } catch (error) {
        console.error("Server-side Catch Block Error:", error);
        response.status(500).json({ error: error.message });
    }
}
