const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// ===== CONFIG - Environment se aayega =====
const WHATSAPP_TOKEN = process.env.EAAMEDcGznz0BRndchrv5ZAaxY91XZByHHlFufpcKnIZCTpqiW7ZC1Glm8BxG5LRCBZCjs9bqJBudMQj2NMZBZCyZCVmkdS5fCMoXbx8wXnpPwyZCttTSCfMqGLMWXE6eVJlzerhONIOBwATjIeTOroOm2aKA2188f5w2BoSZCAUKowlnY3jngxcMfRi3LyQGUQgZC7ijAZDZD;
const PHONE_NUMBER_ID = process.env.1060745180462931;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'deepak_webhook_123';
// ============================================

// ===== TERE CATEGORIES YAHAN FIX KAR DIYE =====
const CATEGORIES_DATA = {
  customer: {
    main_categories: [
      {
        id: 'food', title: 'भोजन (Food & Beverages)',
        sub_categories: [
          { id: 'food_1', title: 'अनाज और दालें' },
          { id: 'food_2', title: 'ताज़ी सब्जियां और फल' },
          { id: 'food_3', title: 'दूध और डेयरी प्रोडक्ट्स' },
          { id: 'food_4', title: 'मीट, चिकन और मछली' },
          { id: 'food_5', title: 'तेल और घी' },
          { id: 'food_6', title: 'मसाले और सॉस' },
          { id: 'food_7', title: 'पैकेट बंद स्नैक्स' },
          { id: 'food_8', title: 'बेकरी और कन्फेक्शनरी' },
          { id: 'food_9', title: 'पानी और कोल्ड ड्रिंक्स' },
          { id: 'food_10', title: 'चाय और कॉफी' },
          { id: 'food_11', title: 'रेडी-टू-ईट भोजन' },
          { id: 'food_12', title: 'ड्राई फ्रूट्स और सीड्स' },
          { id: 'food_13', title: 'बच्चों का दूध और फूड' },
          { id: 'food_14', title: 'आर्गेनिक हेल्थ फूड' }
        ]
      },
      {
        id: 'clothing', title: 'कपड़ा (Clothing & Fashion)',
        sub_categories: [
          { id: 'cloth_1', title: 'पुरुषों के कपड़े' },
          { id: 'cloth_2', title: 'महिलाओं के कपड़े' },
          { id: 'cloth_3', title: 'बच्चों के कपड़े' },
          { id: 'cloth_4', title: 'कैजुअल और डेली वियर' },
          { id: 'cloth_5', title: 'फॉर्मल और ऑफिस वियर' },
          { id: 'cloth_6', title: 'एथनिक और ट्रेडिशनल' },
          { id: 'cloth_7', title: 'स्पोर्ट्स और एक्टिव वियर' },
          { id: 'cloth_8', title: 'इनरवियर और नाइटवियर' },
          { id: 'cloth_9', title: 'जूते और चप्पल' },
          { id: 'cloth_10', title: 'बैग और वॉलेट' },
          { id: 'cloth_11', title: 'बेल्ट, चश्मे और घड़ियां' },
          { id: 'cloth_12', title: 'बिना सिला कपड़ा' },
          { id: 'cloth_13', title: 'विंटर वियर और जैकेट्स' },
          { id: 'cloth_14', title: 'सिलाई और लॉन्ड्री' }
        ]
      },
      {
        id: 'housing', title: 'मकान (Housing & Real Estate)',
        sub_categories: [
          { id: 'house_1', title: 'प्लॉट और खाली जमीन' },
          { id: 'house_2', title: 'आवासीय फ्लैट और विला' },
          { id: 'house_3', title: 'कमर्शियल दुकान ऑफिस' },
          { id: 'house_4', title: 'रेंटल प्रॉपर्टीज' },
          { id: 'house_5', title: 'सीमेंट और बालू' },
          { id: 'house_6', title: 'ईंट और ब्लॉक' },
          { id: 'house_7', title: 'सरिया और लोहा' },
          { id: 'house_8', title: 'टाइल्स और मार्बल' },
          { id: 'house_9', title: 'पेंट और पुट्टी' },
          { id: 'house_10', title: 'प्लंबिंग और पाइप्स' },
          { id: 'house_11', title: 'इंटीरियर डिजाइनिंग' },
          { id: 'house_12', title: 'लेबर और ठेकेदारी' },
          { id: 'house_13', title: 'आर्किटेक्ट सर्विस' },
          { id: 'house_14', title: 'प्रॉपर्टी ब्रोकरेज' }
        ]
      },
      {
        id: 'health', title: 'दवा और इलाज (Health & Medical)',
        sub_categories: [
          { id: 'health_1', title: 'एलोपैथिक दवाइयां' },
          { id: 'health_2', title: 'आयुर्वेदिक दवाइयां' },
          { id: 'health_3', title: 'सर्जिकल उपकरण' },
          { id: 'health_4', title: 'डॉक्टर कंसल्टेशन' },
          { id: 'health_5', title: 'अस्पताल और बेड' },
          { id: 'health_6', title: 'लैब टेस्ट' },
          { id: 'health_7', title: 'एम्बुलेंस सर्विस' },
          { id: 'health_8', title: 'होम हेल्थकेयर' },
          { id: 'health_9', title: 'डेंटल केयर' },
          { id: 'health_10', title: 'आँखों का इलाज' },
          { id: 'health_11', title: 'फिजियोथेरेपी' },
          { id: 'health_12', title: 'मेडिकल इंश्योरेंस' },
          { id: 'health_13', title: 'फिटनेस और जिम' },
          { id: 'health_14', title: 'मानसिक स्वास्थ्य' }
        ]
      },
      {
        id: 'transport', title: 'गाड़ी और सफर (Transport & Travel)',
        sub_categories: [
          { id: 'trans_1', title: 'टू-व्हीलर' },
          { id: 'trans_2', title: 'फोर-व्हीलर/कार' },
          { id: 'trans_3', title: 'कमर्शियल गाड़ियां' },
          { id: 'trans_4', title: 'स्पेयर पार्ट्स' },
          { id: 'trans_5', title: 'टायर और ट्यूब' },
          { id: 'trans_6', title: 'रिपेयर और सर्विस' },
          { id: 'trans_7', title: 'रेलवे टिकट' },
          { id: 'trans_8', title: 'फ्लाइट टिकट' },
          { id: 'trans_9', title: 'बस और कैब' },
          { id: 'trans_10', title: 'पैकर्स-मूवर्स' },
          { id: 'trans_11', title: 'ड्राइविंग स्कूल' },
          { id: 'trans_12', title: 'क्रेन और टोइंग' },
          { id: 'trans_13', title: 'गाड़ियों का इंश्योरेंस' },
          { id: 'trans_14', title: 'टूर पैकेज' }
        ]
      },
      {
        id: 'education', title: 'पढ़ाई (Education & Training)',
        sub_categories: [
          { id: 'edu_1', title: 'स्कूल एजुकेशन' },
          { id: 'edu_2', title: 'कॉलेज डिग्री' },
          { id: 'edu_3', title: 'एग्जाम कोचिंग' },
          { id: 'edu_4', title: 'स्कूल की किताबें' },
          { id: 'edu_5', title: 'कॉपियां और स्टेशनरी' },
          { id: 'edu_6', title: 'ई-लर्निंग कोर्सेज' },
          { id: 'edu_7', title: 'वोकेशनल ट्रेनिंग' },
          { id: 'edu_8', title: 'ट्यूशन और होम ट्यूटर' },
          { id: 'edu_9', title: 'कंप्यूटर क्लासेज' },
          { id: 'edu_10', title: 'भाषा कोर्स' },
          { id: 'edu_11', title: 'लाइब्रेरी' },
          { id: 'edu_12', title: 'एडमिशन गाइड' },
          { id: 'edu_13', title: 'स्कूल बैग यूनिफॉर्म' },
          { id: 'edu_14', title: 'डिप्लोमा कोर्सेज' }
        ]
      },
      {
        id: 'entertainment', title: 'मनोरंजन (Entertainment & Media)',
        sub_categories: [
          { id: 'ent_1', title: 'सिनेमा हॉल' },
          { id: 'ent_2', title: 'OTT सब्सक्रिप्शन' },
          { id: 'ent_3', title: 'केबल और DTH' },
          { id: 'ent_4', title: 'म्यूजिक स्ट्रीमिंग' },
          { id: 'ent_5', title: 'वीडियो गेमिंग' },
          { id: 'ent_6', title: 'होटल बुकिंग' },
          { id: 'ent_7', title: 'रेस्टोरेंट और कैफ़े' },
          { id: 'ent_8', title: 'अम्यूजमेंट पार्क' },
          { id: 'ent_9', title: 'इवेंट्स और कॉन्सर्ट' },
          { id: 'ent_10', title: 'पब और नाइटलाइफ़' },
          { id: 'ent_11', title: 'फोटोग्राफी' },
          { id: 'ent_12', title: 'न्यूजपेपर' },
          { id: 'ent_13', title: 'खिलौने और गेम्स' },
          { id: 'ent_14', title: 'सोशल मीडिया सर्विस' }
        ]
      },
      {
        id: 'utilities', title: 'बिजली और पानी (Utilities)',
        sub_categories: [
          { id: 'util_1', title: 'घरेलू बिजली' },
          { id: 'util_2', title: 'कमर्शियल बिजली' },
          { id: 'util_3', title: 'सरकारी पानी सप्लाई' },
          { id: 'util_4', title: 'पानी के टैंकर' },
          { id: 'util_5', title: 'जार वाला पानी' },
          { id: 'util_6', title: 'रसोई गैस सिलेंडर' },
          { id: 'util_7', title: 'पाइप्ड नेचुरल गैस' },
          { id: 'util_8', title: 'सोलर पैनल' },
          { id: 'util_9', title: 'इन्वर्टर और बैटरी' },
          { id: 'util_10', title: 'जनरेटर रेंटल' },
          { id: 'util_11', title: 'कचरा मैनेजमेंट' },
          { id: 'util_12', title: 'सीवेज सफाई' },
          { id: 'util_13', title: 'बायोगैस प्लांट' },
          { id: 'util_14', title: 'RO सर्विस' }
        ]
      },
      {
        id: 'tech', title: 'मोबाइल और इंटरनेट (Tech & Telecom)',
        sub_categories: [
          { id: 'tech_1', title: 'स्मार्टफोन' },
          { id: 'tech_2', title: 'लैपटॉप और कंप्यूटर' },
          { id: 'tech_3', title: 'रिचार्ज' },
          { id: 'tech_4', title: 'एक्सेसरीज' },
          { id: 'tech_5', title: 'रिपेयरिंग' },
          { id: 'tech_6', title: 'क्लाउड स्टोरेज' },
          { id: 'tech_7', title: 'मोबाइल ऐप्स' },
          { id: 'tech_8', title: 'एंटीवायरस' },
          { id: 'tech_9', title: 'वेबसाइट डेवलपमेंट' },
          { id: 'tech_10', title: 'सोशल मीडिया मैनेजमेंट' },
          { id: 'tech_11', title: 'डेटा रिकवरी' },
          { id: 'tech_12', title: 'आईटी कंसल्टिंग' },
          { id: 'tech_13', title: 'प्रिंटर और स्कैनर्स' },
          { id: 'tech_14', title: 'एआई टूल्स' }
        ]
      },
      {
        id: 'finance', title: 'पैसा और बैंक (Finance & Insurance)',
        sub_categories: [
          { id: 'fin_1', title: 'बैंक अकाउंट' },
          { id: 'fin_2', title: 'पर्सनल और होम लोन' },
          { id: 'fin_3', title: 'बिजनेस लोन' },
          { id: 'fin_4', title: 'क्रेडिट कार्ड' },
          { id: 'fin_5', title: 'लाइफ इंश्योरेंस' },
          { id: 'fin_6', title: 'जनरल इंश्योरेंस' },
          { id: 'fin_7', title: 'म्यूचुअल फंड' },
          { id: 'fin_8', title: 'शेयर मार्केट' },
          { id: 'fin_9', title: 'सीए और टैक्स फाइलिंग' },
          { id: 'fin_10', title: 'लोन कंसल्टेंसी' },
          { id: 'fin_11', title: 'एकाउंटिंग सर्विस' },
          { id: 'fin_12', title: 'डिजिटल वॉलेट' },
          { id: 'fin_13', title: 'मनी ट्रांसफर' },
          { id: 'fin_14', title: 'गोल्ड लोन' }
        ]
      },
      {
        id: 'household', title: 'घर का सामान (Household Goods)',
        sub_categories: [
          { id: 'home_1', title: 'टीवी और होम थिएटर' },
          { id: 'home_2', title: 'फ्रिज' },
          { id: 'home_3', title: 'वाशिंग मशीन' },
          { id: 'home_4', title: 'AC और कूलर' },
          { id: 'home_5', title: 'मिक्सर, ओवन' },
          { id: 'home_6', title: 'बेड, सोफा, अलमारी' },
          { id: 'home_7', title: 'गद्दे, चादर, पर्दे' },
          { id: 'home_8', title: 'बर्तन और क्रॉकरी' },
          { id: 'home_9', title: 'क्लीनिंग टूल्स' },
          { id: 'home_10', title: 'वाशिंग पाउडर' },
          { id: 'home_11', title: 'साबुन, शैम्पू' },
          { id: 'home_12', title: 'LED बल्ब' },
          { id: 'home_13', title: 'पेस्ट कंट्रोल' },
          { id: 'home_14', title: 'अप्लायंसेज रिपेयर' }
        ]
      },
      {
        id: 'industry', title: 'फैक्ट्री और मशीन (Industry & Machinery)',
        sub_categories: [
          { id: 'ind_1', title: 'इंडस्ट्रियल मशीनें' },
          { id: 'ind_2', title: 'कच्चा माल' },
          { id: 'ind_3', title: 'क्रेन, फोर्कलिफ्ट' },
          { id: 'ind_4', title: 'बेयरिंग, गियरबॉक्स' },
          { id: 'ind_5', title: 'कनवर्टर बेल्ट' },
          { id: 'ind_6', title: 'वेल्डिंग टूल्स' },
          { id: 'ind_7', title: 'हाइड्रोलिक सिस्टम' },
          { id: 'ind_8', title: 'सेफ्टी गियर' },
          { id: 'ind_9', title: 'जनरेटर ट्रांसफार्मर' },
          { id: 'ind_10', title: 'बॉयलर सिस्टम' },
          { id: 'ind_11', title: 'टूलकिट' },
          { id: 'ind_12', title: 'फैक्ट्री मेंटेनेंस' },
          { id: 'ind_13', title: 'इंडस्ट्रियल केमिकल' },
          { id: 'ind_14', title: 'वेयरहाउस रेंटल' }
        ]
      },
      {
        id: 'luxury', title: 'सोना और श्रृंगार (Luxury & Personal Care)',
        sub_categories: [
          { id: 'lux_1', title: 'सोने के गहने' },
          { id: 'lux_2', title: 'चांदी के बर्तन' },
          { id: 'lux_3', title: 'हीरे और रत्न' },
          { id: 'lux_4', title: 'स्किनकेयर क्रीम' },
          { id: 'lux_5', title: 'हेयरकेयर प्रोडक्ट' },
          { id: 'lux_6', title: 'परफ्यूम' },
          { id: 'lux_7', title: 'मेकअप प्रोडक्ट' },
          { id: 'lux_8', title: 'ब्यूटी पार्लर' },
          { id: 'lux_9', title: 'स्पा और मसाज' },
          { id: 'lux_10', title: 'मेन्स ग्रूमिंग' },
          { id: 'lux_11', title: 'डिज़ाइनर घड़ियां' },
          { id: 'lux_12', title: 'ब्रांडेड सनग्लासेस' },
          { id: 'lux_13', title: 'टैटू सर्विस' },
          { id: 'lux_14', title: 'गिफ्ट हैंपर्स' }
        ]
      },
      {
        id: 'govt', title: 'सरकारी व कानूनी (Govt & Legal Services)',
        sub_categories: [
          { id: 'govt_1', title: 'वकील कंसल्टेशन' },
          { id: 'govt_2', title: 'नोटरी एफ़िडेविट' },
          { id: 'govt_3', title: 'जमीन की रजिस्ट्री' },
          { id: 'govt_4', title: 'आधार, पैन सर्विस' },
          { id: 'govt_5', title: 'पासपोर्ट वीजा' },
          { id: 'govt_6', title: 'ट्रेडमार्क रजिस्ट्रेशन' },
          { id: 'govt_7', title: 'कंपनी रजिस्ट्रेशन' },
          { id: 'govt_8', title: 'ड्राइविंग लाइसेंस' },
          { id: 'govt_9', title: 'बर्थ सर्टिफिकेट' },
          { id: 'govt_10', title: 'सरकारी टेंडर' },
          { id: 'govt_11', title: 'पुलिस वेरिफिकेशन' },
          { id: 'govt_12', title: 'RTI फाइलिंग' },
          { id: 'govt_13', title: 'विवाह रजिस्ट्रेशन' },
          { id: 'govt_14', title: 'विवाद निपटारा' }
        ]
      }
    ]
  }
};

CATEGORIES_DATA.provider = JSON.parse(JSON.stringify(CATEGORIES_DATA.customer));

const users = {};
const providersDB = [];
const activeRequests = {};
const messageToRequestMap = {};

function normalizeNumber(num) {
  if (!num) return '';
  return num.toString().replace(/\D/g, '').slice(-10);
}

async function sendMessage(to, messageData) {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
      ...messageData
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    const msgId = res.data.messages[0].id;
    console.log(`✅ Sent to ${to}, ID: ${msgId}`);
    return msgId;
  } catch (err) {
    console.error('❌ Send Error:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

function sendText(to, text) {
  return sendMessage(to, { type: 'text', text: { body: text } });
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    if (!message) return;

    const from = normalizeNumber(message.from);
    const msg = message.text?.body?.trim();

    console.log(`📩 Message from ${from}: ${msg}`);

    if (msg?.toLowerCase() === 'hi') {
      await sendText(from, 'Namaste! Main NearMe Bot hun. Main aapki kya madad kar sakta hun?');
    }

  } catch (err) {
    console.error('Webhook Error:', err);
  }
});

app.get('/', (req, res) => {
  res.send('WhatsApp Webhook is live');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
