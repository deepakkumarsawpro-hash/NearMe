const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'deepak_webhook_123';

// User sessions + Seller database
const users = {};
const sellers = {}; // { '91756xxx': { name: 'Ram Kirana', cat: 'भोजन Food', sub: 'अनाज दालें', lat: 25.4, lon: 85.5 } }

const CATS = [
  { id: 'food', title: 'भोजन Food', subs: ['अनाज दालें','सब्जी फल','दूध डेयरी','मीट चिकन','तेल घी','मसाले सॉस','स्नैक्स','बेकरी','ड्रिंक्स','आर्गेनिक'] },
  { id: 'fashion', title: 'कपड़ा Fashion', subs: ['पुरुषों के','महिलाओं के','बच्चों के','फॉर्मल','एथनिक','स्पोर्ट्स','जूते चप्पल','बैग वॉलेट','घड़ियां','सिलाई'] },
  { id: 'housing', title: 'घर मकान Housing', subs: ['प्लॉट जमीन','फ्लैट विला','दुकान ऑफिस','रेंटल','सीमेंट बालू','ईंट ब्लॉक','टाइल्स मार्बल','पेंट','प्लंबिंग','इंटीरियर'] },
  { id: 'health', title: 'सेहत Health', subs: ['दवाइयां','आयुर्वेदिक','डॉक्टर','अस्पताल','लैब टेस्ट','एम्बुलेंस','डेंटल केयर','आँखों का','फिजियो','जिम फिटनेस'] },
  { id: 'transport', title: 'गाड़ी सफर Transport', subs: ['टू-व्हीलर','कार','कमर्शियल','स्पेयर पार्ट्स','रिपेयर','रेलवे टिकट','फ्लाइट','बस कैब','पैकर्स मूवर्स','इंश्योरेंस'] },
  { id: 'education', title: 'पढ़ाई Education', subs: ['स्कूल','कॉलेज डिग्री','कोचिंग','किताबें','स्टेशनरी','ई-लर्निंग','होम ट्यूटर','कंप्यूटर क्लास','भाषा कोर्स','लाइब्रेरी'] },
  { id: 'entertain', title: 'मनोरंजन Entertain', subs: ['सिनेमा','OTT','DTH केबल','म्यूजिक','गेमिंग','होटल','रेस्टोरेंट','इवेंट्स','फोटोग्राफी','खिलौने'] },
  { id: 'utility', title: 'बिजली पानी Utility', subs: ['घरेलू बिजली','कमर्शियल','पानी सप्लाई','टैंकर','गैस सिलेंडर','PNG गैस','सोलर पैनल','इन्वर्टर','जनरेटर','RO सर्विस'] },
  { id: 'techfin', title: 'मोबाइल पैसा Tech', subs: ['स्मार्टफोन','लैपटॉप','रिचार्ज','रिपेयरिंग','बैंक अकाउंट','लोन','क्रेडिट कार्ड','इंश्योरेंस','म्यूचुअल फंड','वॉलेट'] },
  { id: 'govtbiz', title: 'सरकारी बिजनेस', subs: ['वकील','नोटरी','रजिस्ट्री','आधार पैन','पासपोर्ट वीजा','कंपनी','लाइसेंस','फैक्ट्री मशीन','सोना चांदी','गहने'] }
];

async function sendWA(to, data) {
  try {
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to,...data
    }, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
  } catch (e) {
    console.error('WA Error:', e.response?.data?.error?.message);
  }
}

// Step 0: Welcome - Customer ya Seller
function sendWelcome(to) {
  return sendWA(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: 'NearMe Services' },
      body: { text: 'Namaste! 🙏\n\nAap kaun hain?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'role_customer', title: '🛒 Customer' } },
          { type: 'reply', reply: { id: 'role_seller', title: '🏪 Seller/Service' } }
        ]
      }
    }
  });
}

function sendMainList(to, role) {
  const rows = CATS.map(c => ({ id: `${role}_${c.id}`, title: c.title }));
  return sendWA(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: role === 'cust'? 'Customer' : 'Seller Registration' },
      body: { text: 'Category chune:' },
      action: { button: 'Categories', sections: [{ title: 'Categories', rows }] }
    }
  });
}

function sendSubList(to, role, catId) {
  const cat = CATS.find(c => c.id === catId);
  const rows = cat.subs.map((s, i) => ({ id: `${role}_${catId}_${i}`, title: s }));
  return sendWA(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: cat.title },
      body: { text: role === 'cust'? 'Kya chahiye?' : 'Aap kya bechte/service dete hain?' },
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
  const btnId = msg.interactive?.button_reply?.id;
  const listId = msg.interactive?.list_reply?.id;
  const listTitle = msg.interactive?.list_reply?.title;
  const image = msg.image;
  const location = msg.location;
  
  if (!users[from]) users[from] = { step: 'start' };
  const u = users[from];
  
  console.log('From:', from, '| Step:', u.step, '| Input:', btnId || listId || text || 'media');

  // Check if seller already registered
  if (sellers[from] && btnId === 'role_seller') {
    const s = sellers[from];
    return sendWA(from, { 
      type: 'text', 
      text: { body: `⚠️ Aap already registered hain!\n\n🏪 Naam: ${s.name}\n📦 Category: ${s.cat}\n📋 Service: ${s.sub}\n📞 No: ${s.waNum}\n\nEk number se ek hi registration hota hai.` }
    });
  }

  // Step 1: Hi → Welcome
  if (text === 'hi' || text === 'hello' || text === 'hey') {
    users[from] = { step: 'welcome' };
    await sendWelcome(from);
  }
  
  // Step 2: Role Select
  else if (btnId === 'role_customer') {
    users[from] = { step: 'cust_main', role: 'cust' };
    await sendMainList(from, 'cust');
  }
  else if (btnId === 'role_seller') {
    users[from] = { step: 'sell_main', role: 'sell' };
    await sendMainList(from, 'sell');
  }
  
  // Step 3: Main Category - Customer
  else if (listId && listId.startsWith('cust_') && u.step === 'cust_main') {
    const catId = listId.replace('cust_', '');
    users[from] = {...u, step: 'cust_sub', catId, catTitle: CATS.find(c => c.id === catId).title };
    await sendSubList(from, 'cust', catId);
  }
  
  // Step 3: Main Category - Seller
  else if (listId && listId.startsWith('sell_') && u.step === 'sell_main') {
    const catId = listId.replace('sell_', '');
    users[from] = {...u, step: 'sell_sub', catId, catTitle: CATS.find(c => c.id === catId).title };
    await sendSubList(from, 'sell', catId);
  }
  
  // Step 4: Sub Category - Customer
  else if (listId && listId.startsWith('cust_') && u.step === 'cust_sub') {
    users[from] = {...u, step: 'cust_details', subTitle: listTitle };
    await sendWA(from, { type: 'text', text: { body: `📝 Apni requirement detail me likhe:\n\nYa photo bhej sakte hain 📷` }});
  }
  
  // Step 4: Sub Category - Seller
  else if (listId && listId.startsWith('sell_') && u.step === 'sell_sub') {
    users[from] = {...u, step: 'sell_name', subTitle: listTitle };
    await sendWA(from, { type: 'text', text: { body: `🏪 Apni dukan/service ka naam likhe:\n\nJaise: "Ram Kirana Store"` }});
  }
  
  // Step 5: Customer Details
  else if (u.step === 'cust_details' && (text || image)) {
    users[from] = {...u, step: 'cust_radius', details: text || 'Photo', hasImage:!!image };
    await sendWA(from, {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: '📏 Kitne KM ke dayre me provider chahiye?' },
        action: {
          button: 'Radius',
          sections: [{ rows: [
            { id: 'rad_1', title: '1 KM ke andar' },
            { id: 'rad_3', title: '3 KM ke andar' },
            { id: 'rad_5', title: '5 KM ke andar' },
            { id: 'rad_10', title: '10 KM ke andar' },
            { id: 'rad_any', title: 'Kahin se bhi' }
          ]}]
        }
      }
    });
  }
  
  // Step 5: Seller Name
  else if (u.step === 'sell_name' && text) {
    users[from] = {...u, step: 'sell_wa', shopName: text };
    await sendWA(from, { type: 'text', text: { body: `📞 Apna WhatsApp number likhe:\n\nJaise: 9876543210` }});
  }
  
  // Step 6: Customer Radius
  else if (listId && listId.includes('rad_') && u.step === 'cust_radius') {
    users[from] = {...u, step: 'cust_location', radius: listTitle };
    await sendWA(from, { type: 'text', text: { body: `📍 Ab location share kare:\n\n📎 → Location → "Current location" bheje` }});
  }
  
  // Step 6: Seller WhatsApp Number
  else if (u.step === 'sell_wa' && text) {
    users[from] = {...u, step: 'sell_location', waNum: text };
    await sendWA(from, { type: 'text', text: { body: `📍 Dukan/Service ka location share kare:\n\n📎 → Location → "Current location" bheje` }});
  }
  
  // Step 7: Customer Location - Done
  else if (u.step === 'cust_location' && location) {
    const finalMsg = `✅ Request Complete!\n\n📦 ${u.catTitle}\n📋 ${u.subTitle}\n📝 ${u.details}\n📏 ${u.radius}\n📍 Location: OK\n\nProvider jald contact karega.`;
    await sendWA(from, { type: 'text', text: { body: finalMsg }});
    console.log('CUSTOMER ORDER:', u, location);
    users[from] = { step: 'start' };
  }
  
  // Step 7: Seller Location - Register Done
  else if (u.step === 'sell_location' && location) {
    sellers[from] = {
      name: u.shopName,
      waNum: u.waNum,
      cat: u.catTitle,
      sub: u.subTitle,
      lat: location.latitude,
      lon: location.longitude
    };
    const finalMsg = `✅ Registration Successful!\n\n🏪 ${u.shopName}\n📞 ${u.waNum}\n📦 ${u.catTitle}\n📋 ${u.subTitle}\n📍 Location: Saved\n\nAb customers aapko dhund sakte hain!`;
    await sendWA(from, { type: 'text', text: { body: finalMsg }});
    console.log('NEW SELLER:', sellers[from]);
    users[from] = { step: 'start' };
  }
  
  else {
    await sendWA(from, { type: 'text', text: { body: `Shuru karne ke liye 'Hi' bheje.` }});
  }
});

app.get('/', (req, res) => res.send('NearMe Bot Live'));
app.listen(process.env.PORT || 10000, () => console.log('Server running'));
