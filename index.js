const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'deepak_webhook_123';

// 10 Main Categories x 10 Sub = 100% WhatsApp Safe
const CATS = [
  { 
    id: 'food', 
    title: 'भोजन Food', 
    subs: ['अनाज दालें','सब्जी फल','दूध डेयरी','मीट चिकन','तेल घी','मसाले सॉस','स्नैक्स','बेकरी','ड्रिंक्स','आर्गेनिक'] 
  },
  { 
    id: 'fashion', 
    title: 'कपड़ा Fashion', 
    subs: ['पुरुषों के','महिलाओं के','बच्चों के','फॉर्मल','एथनिक','स्पोर्ट्स','जूते चप्पल','बैग वॉलेट','घड़ियां','सिलाई'] 
  },
  { 
    id: 'housing', 
    title: 'घर मकान Housing', 
    subs: ['प्लॉट जमीन','फ्लैट विला','दुकान ऑफिस','रेंटल','सीमेंट बालू','ईंट ब्लॉक','टाइल्स मार्बल','पेंट','प्लंबिंग','इंटीरियर'] 
  },
  { 
    id: 'health', 
    title: 'सेहत Health', 
    subs: ['दवाइयां','आयुर्वेदिक','डॉक्टर','अस्पताल','लैब टेस्ट','एम्बुलेंस','डेंटल केयर','आँखों का','फिजियो','जिम फिटनेस'] 
  },
  { 
    id: 'transport', 
    title: 'गाड़ी सफर Transport', 
    subs: ['टू-व्हीलर','कार','कमर्शियल','स्पेयर पार्ट्स','रिपेयर','रेलवे टिकट','फ्लाइट','बस कैब','पैकर्स मूवर्स','इंश्योरेंस'] 
  },
  { 
    id: 'education', 
    title: 'पढ़ाई Education', 
    subs: ['स्कूल','कॉलेज डिग्री','कोचिंग','किताबें','स्टेशनरी','ई-लर्निंग','होम ट्यूटर','कंप्यूटर क्लास','भाषा कोर्स','लाइब्रेरी'] 
  },
  { 
    id: 'entertain', 
    title: 'मनोरंजन Entertain', 
    subs: ['सिनेमा','OTT','DTH केबल','म्यूजिक','गेमिंग','होटल','रेस्टोरेंट','इवेंट्स','फोटोग्राफी','खिलौने'] 
  },
  { 
    id: 'utility', 
    title: 'बिजली पानी Utility', 
    subs: ['घरेलू बिजली','कमर्शियल','पानी सप्लाई','टैंकर','गैस सिलेंडर','PNG गैस','सोलर पैनल','इन्वर्टर','जनरेटर','RO सर्विस'] 
  },
  { 
    id: 'techfin', 
    title: 'मोबाइल पैसा Tech', 
    subs: ['स्मार्टफोन','लैपटॉप','रिचार्ज','रिपेयरिंग','बैंक अकाउंट','लोन','क्रेडिट कार्ड','इंश्योरेंस','म्यूचुअल फंड','वॉलेट'] 
  },
  { 
    id: 'govtbiz', 
    title: 'सरकारी बिजनेस', 
    subs: ['वकील','नोटरी','रजिस्ट्री','आधार पैन','पासपोर्ट वीजा','कंपनी','लाइसेंस','फैक्ट्री मशीन','सोना चांदी','गहने'] 
  }
];

async function sendWA(to, data) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to,...data
    }, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
  } catch (e) {
    console.error('Error:', e.response?.data?.error?.message);
  }
}

function sendMainList(to) {
  const rows = CATS.map(c => ({ id: c.id, title: c.title })); // 10 rows only
  console.log('Main count:', rows.length); // Debug: 10 hona chahiye
  
  return sendWA(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'NearMe Services' },
      body: { text: 'Namaste! Kya chahiye? Category chune:' },
      action: { button: 'Categories', sections: [{ title: 'Main Categories', rows }] }
    }
  });
}

function sendSubList(to, catId) {
  const cat = CATS.find(c => c.id === catId);
  if (!cat) return;
  
  const rows = cat.subs.map((s, i) => ({ id: `${catId}_${i}`, title: s })); // 10 rows only
  console.log('Sub count:', catId, rows.length); // Debug: 10 hona chahiye
  
  return sendWA(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: cat.title },
      body: { text: 'Kya chahiye? Option chune:' },
      action: { button: 'Options', sections: [{ title: 'Sub-Categories', rows }] }
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
  const text = msg.text?.body?.toLowerCase().trim();
  const listId = msg.interactive?.list_reply?.id;
  const listTitle = msg.interactive?.list_reply?.title;
  
  console.log('User:', from, '| Msg:', text, '| Click:', listId);

  if (text === 'hi' || text === 'hello' || text === 'hey') {
    await sendMainList(from);
  } else if (listId) {
    if (CATS.find(c => c.id === listId)) {
      await sendSubList(from, listId);
    } else {
      await sendWA(from, { 
        type: 'text', 
        text: { body: `✅ Request note ho gayi: ${listTitle}\n\nAapke area ka provider jald contact karega.` }
      });
    }
  } else {
    await sendWA(from, { 
      type: 'text', 
      text: { body: `Namaste! Shuru karne ke liye 'Hi' bheje.` }
    });
  }
});

app.get('/', (req, res) => res.send('NearMe Bot Live'));
app.listen(process.env.PORT || 10000, () => console.log('Server running'));
