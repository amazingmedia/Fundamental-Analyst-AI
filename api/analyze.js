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

        // === ဒီနေရာက URL ကို ပြင်ဆင်လိုက်ပါပြီ ===
        // v1beta အစား v1 ကိုသုံးပါမယ်
        const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const prompt = `
            Professional Financial Analyst တစ်ယောက်အနေဖြင့် အောက်ပါအချက်များကို တိကျစွာသုံးသပ်ပေးပါ။ အဖြေအားလုံးကို မြန်မာဘာသာဖြင့်သာ ပြန်လည်ဖြေကြားပါ။ အရေးကြီးသော အဖြစ်အပျက်တိုင်းတွင် နေ့စွဲ (Date) ကို ထည့်သွင်းဖော်ပြပါ။

            Asset: ${asset}

            1.  **သတင်းအကျဉ်းချုပ် (News Summary):** Google Search ကိုသုံး၍ ${asset} နှင့်ပတ်သက်သော နောက်ဆုံး 24-48 နာရီအတွင်း အရေးအကြီးဆုံး သတင်းတစ်ပုဒ်ကိုရှာပါ။ **ထိုသတင်းထွက်ခဲ့သည့် နေ့စွဲကို ဖော်ပြပြီး** အဓိကအချက် ၃ ချက်ဖြင့် အကျဉ်းချုပ်ပေးပါ။ ဥပမာ- "(အောက်တိုဘာ ၁) - Fed ဥက္ကဌ၏ မိန့်ခွန်းအရ..."

            2.  **အရေးကြီးသော စီးပွားရေးသတင်းများ (Economic Calendar):** Google Search ကိုသုံး၍ ${asset} အပေါ် သက်ရောက်မှုအရှိဆုံးဖြစ်မည့် လာမည့် 48-72 နာရီအတွင်းက Economic Calendar မှ အရေးကြီးဆုံး Event ၁ ခု သို့မဟုတ် ၂ ခုကို ဖော်ပြပါ။ Event တစ်ခုချင်းစီ၏ **ကျင်းပမည့် နေ့စွဲနှင့် အချိန် (သိနိုင်လျှင်)** ကို ထည့်သွင်းဖော်ပြပါ။ ထို့နောက် ဖြစ်နိုင်ခြေရှိသော သက်ရောက်မှု (ဥပမာ- Bullish/Bearish for the asset) ကိုပါ ရှင်းပြပါ။

            3.  **ဈေးကွက်၏ ခံစားချက် (Market Sentiment):** Google Search မှရသော နောက်ဆုံးရသတင်းများနှင့် **မကြာသေးမီက ဖြစ်ပျက်ခဲ့သော အဖြစ်အပျက်များ (ဥပမာ- မနေ့က NFP data အရ...)** ကို အခြေခံ၍ ${asset} အတွက် လက်ရှိ Market Sentiment ကို (Bullish, Bearish, Neutral) စသဖြင့် သတ်မှတ်ပေးပါ။ သင်၏ သုံးသပ်ချက်အတွက် အကြောင်းผลကို နေ့စွဲများနှင့် ချိတ်ဆက်ပြီး အတိုချုပ်ရှင်းပြပါ။

            သင်၏အဖြေကို အောက်ပါပုံစံအတိုင်း ခေါင်းစဉ်များဖြင့် ရှင်းလင်းစွာဖွဲ့စည်းပေးပါ-
            ### သတင်းအကျဉ်းချုပ်
            - **[နေ့စွဲ]:** [အချက် ၁]
            - [အချက် ၂]
            - [အချက် ၃]

            ### အရေးကြီးသော စီးပွားရေးသတင်းများ
            **Event Name:** [Event ရဲ့ နာမည်]
            **Date & Time:** [နေ့စွဲနှင့် အချိန်]
            **Potential Impact:** [သက်ရောက်မှု ရှင်းလင်းချက်]

            ### ဈေးကွက်၏ ခံစားချက်
            **Sentiment:** [ဥပမာ- Bullish]
            **Reasoning:** [အကြောင်းผล ရှင်းလင်းချက် (နေ့စွဲများဖြင့်)]
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
            throw new Error("No content in Google API response.");
        }

    } catch (error) {
        console.error("Server-side Error:", error);
        response.status(500).json({ error: error.message });
    }
}
