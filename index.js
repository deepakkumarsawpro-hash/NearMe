const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'deepak_webhook_123';

const CATEGORIES_DATA = [
  { id: 'food', title: 'भोजन', subs: ['अनाज दालें','सब्जियां फल','दूध डेयरी','मीट चिकन','तेल घी','मसाले सॉस','पैकेट स्नैक्स','बेकरी','पानी ड्रिंक्स','चाय कॉफी','रेडी टू ईट','ड्राई फ्रूट्स','बच्चों का फूड','आर्गेनिक फूड'] },
  { id: 'clothing', title: 'कपड़ा', subs: ['पुरुषों के कपड़े','महिलाओं के कपड़े','बच्चों के कपड़े','कैजुअल वियर','फॉर्मल वियर','एथनिक वियर','स्पोर्ट्स वियर','इनरवियर','जूते चप्पल','बैग वॉलेट','बेल्ट घड़ियां','बिना सिला कपड़ा','विंटर जैकेट्स','सिलाई लॉन्ड्री'] },
  { id: 'housing', title: 'मकान', subs: ['प्लॉट जमीन','फ्लैट विला','दुकान ऑफिस','रेंटल प्रॉपर्टी','सीमेंट बालू','ईंट ब्लॉक','सरिया लोहा','टाइल्स मार्बल','पेंट पुट्टी','प्लंबिंग पाइप्स','इंटीरियर डिजाइन','लेबर ठेकेदारी','आर्किटेक्ट','ब्रोकरेज'] },
  { id: 'health', title: 'दवा इलाज', subs: ['एलोपैथिक दवा','आयुर्वेदिक दवा','सर्जिकल उपकरण','डॉक्टर','अस्पताल','लैब टेस्ट','एम्बुलेंस','होम हेल्थकेयर','डेंटल केयर','आँखों का इलाज','फिजियोथेरेपी','मेडिकल इंश्योरेंस','फिटनेस जिम','मानसिक स्वास्थ्य'] },
  { id: 'transport', title: 'गाड़ी सफर', subs: ['टू-व्हीलर','कार','कमर्शियल गाड़ी','स्पेयर पार्ट्स','टायर ट्यूब','रिपेयर सर्विस','रेलवे टिकट','फ्लाइट टिकट','बस कैब','पैकर्स मूवर्स','ड्राइविंग स्कूल','क्रेन टोइंग','गाड़ी इंश्योरेंस','टूर पैकेज'] },
  { id: 'education', title: 'पढ़ाई', subs: ['स्कूल','कॉलेज डिग्री','कोचिंग','किताबें','स्टेशनरी','ई-लर्निंग','ट्रेनिंग','होम ट्यूटर','कंप्यूटर क्लास','भाषा कोर्स','लाइब्रेरी','एडमिशन गाइड','बैग यूनिफॉर्म','डिप्लोमा'] },
  { id: 'entertainment', title: 'मनोरंजन', subs: ['सिनेमा','OTT','केबल DTH','म्यूजिक','गेमिंग','होटल','रेस्टोरेंट','पार्क','इवेंट्स','पब','फोटोग्राफी','न्यूजपेपर','खिलौने','सोशल मीडिया'] },
  { id: 'utilities', title: 'बिजली पानी', subs: ['घरेलू बिजली','कमर्शियल बिजली','पानी सप्लाई','पानी टैंकर','जार पानी','गैस सिलेंडर','PNG गैस','सोलर पैनल','इन्वर्टर','जनरेटर','कचरा मैनेजमेंट','सीवेज','बायोगैस','RO सर्विस'] },
  { id: 'tech', title: 'मोबाइल इंटरनेट', subs: ['स्मार्टफोन','लैपटॉप','रिचार्ज','एक्सेसरीज','रिपेयरिंग','क्लाउड','ऐप्स','एंटीवायरस','वेबसाइट','सोशल मीडिया','डेटा रिकवरी','IT कंसल्टिंग','प्रिंटर','AI टूल्स'] },
  { id: 'finance', title: 'पैसा बैंक', subs: ['बैंक अकाउंट','होम लोन','बिजनेस लोन','क्रेडिट कार्ड','लाइफ इंश्योरेंस','जनरल इंश्योरेंस','म्यूचुअल फंड','शेयर मार्केट','CA टैक्स','लोन कंसल्टेंसी','एकाउंटिंग','वॉलेट','मनी ट्रांसफर','गोल्ड लोन'] },
  { id: 'household', title: 'घर का सामान', subs: ['टीवी','फ्रिज','वाशिंग मशीन','AC कूलर','मिक्सर','बेड सोफा','गद्दे चादर','बर्तन','क्लीनिंग','वाशिंग पाउडर','साबुन शैम्पू','LED बल्ब','पेस्ट कंट्रोल','रिपेयर'] },
  { id: 'industry', title: 'फैक्ट्री मशीन', subs: ['मशीनें','कच्चा माल','क्रेन','बेयरिंग','बेल्ट','वेल्डिंग','हाइड्रोलिक','सेफ्टी गियर','जनरेटर','बॉयलर','टूलकिट','मेंटेनेंस','केमिकल','वेयरहाउस'] },
  { id: 'luxury', title: 'सोना श्रृंगार', subs: ['सोने गहने','चांदी','हीरे रत्न','स्किनकेयर','हेयरकेयर','परफ्यूम','मेकअप','पार्लर','स्पा','ग्रूमिंग','घड़ियां','सनग्लासेस','टैटू','गिफ्ट'] },
  { id: 'govt', title: 'सरकारी कानूनी', subs: ['वकील','नोटरी','रजिस्ट्री','आधार पैन','पासपोर्ट वीजा','ट्रेडमार्क','कंपनी','लाइसेंस','बर्थ सर्टिफिकेट','टेंडर','वेरिफिकेशन','RTI','विवाह रजिस्ट्रेशन','विवाद'] }
];

async function sendWhatsApp(to, data) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to,...data
    }, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
  } catch (e) {
    console.error('WA Error:', e.response?.data?.error?.message);
  }
}

function sendMainList(to) {
  const rows1 = CATEGORIES_DATA.slice(0, 10).map(c => ({ id: c.id, title: c.title }));
  const rows2 = CATEGORIES_DATA.slice(10, 14).map(c => ({ id: c.id, title: c.title }));
  
  return sendWhatsApp(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: 'Namaste! Category chune:' },
      action: {
        button: 'Categories',
        sections: [
          { title: 'List 1', rows: rows1 },
          { title: 'List 2', rows: rows2 }
        ]
      }
    }
  });
}

function sendSubList(to, catId) {
  const cat = CATEGORIES_DATA.find(c => c.id === catId);
  if (!cat) return;
  
  const rows1 = cat.subs.slice(0, 10).map((s, i) => ({ id: `${catId}_${i}`, title: s }));
  const rows2 = cat.subs.slice(10, 14).map((s, i) => ({ id: `${catId}_${i+10}`, title: s }));
  
  const sections = [{ title: 'Options', rows: rows1 }];
  if (rows2.length) sections.push({ title: 'More', rows: rows2 });

  return sendWhatsApp(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: cat.title },
      body: { text: 'Sub-category chune:' },
      action: { button: 'Sub-Categories', sections }
    }
  });
}

app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': ch } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.send(ch);
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return;
  
  const from = msg.from;
  const text = msg.text?.body?.toLowerCase();
  const listId = msg.interactive?.list_reply?.id;
  const listTitle = msg.interactive?.list_reply?.title;

  if (text === 'hi' || text === 'hello') {
    await sendMainList(from);
  } else if (listId) {
    if (CATEGORIES_DATA.find(c => c.id === listId)) {
      await sendSubList(from, listId);
    } else {
      await sendWhatsApp(from, { type: 'text', text: { body: `Request note ho gayi: ${listTitle}. Provider jald contact karega.` }});
    }
  }
});

app.get('/', (req, res) => res.send('Live'));
app.listen(process.env.PORT || 10000, () => console.log('Running'));
