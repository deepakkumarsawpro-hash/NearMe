const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
console.log('Supabase Connected');

// Categories - Yahan add kar jitna chahiye
const CATEGORIES = {
  "इलेक्ट्रॉनिक्स": [
    "मोबाइल और टैबलेट",
    "लैपटॉप और कंप्यूटर",
    "टीवी और ऑडियो",
    "होम एप्लायंसेज",
    "स्मार्ट वॉच",
    "कैमरा और गियर",
    "राउटर और नेटवर्क",
    "सॉफ्टवेयर और ऐप्स",
    "इलेक्ट्रॉनिक पार्ट्स",
    "ऑफिस इलेक्ट्रॉनिक्स"
  ],
  "राशन और किराना": [
    "फल और सब्जियां",
    "डेयरी और बेकरी",
    "आटा, चावल, दाल",
    "तेल और मसाले",
    "स्नैक्स और पैक्ड",
    "जूस और ड्रिंक्स",
    "मीट और सीफूड",
    "मिठाई और डेसर्ट",
    "पालतू का सामान",
    "शिशु आहार"
  ],
  "फैशन और ब्यूटी": [
    "पुरुषों के कपड़े",
    "महिलाओं के कपड़े",
    "बच्चों के कपड़े",
    "जूते और चप्पल",
    "इनरवियर",
    "ज्वेलरी और घड़ियां",
    "बैग और सूटकेस",
    "मेकअप/कॉस्मेटिक",
    "इत्र और परफ्यूम",
    "पर्सनल ग्रूमिंग"
  ],
  "होम व इंडस्ट्रियल": [
    "फर्नीचर",
    "घर की सजावट",
    "बर्तन और किचन",
    "हार्डवेयर और टूल्स",
    "बिजली और प्लंबिंग",
    "भारी मशीनरी",
    "कच्चा माल",
    "सफाई का सामान",
    "खेती और बागवानी",
    "सुरक्षा और CCTV"
  ],
  "रेस्टोरेंट और फूड": [
    "भारतीय खाना",
    "इंटरनेशनल फूड",
    "फास्ट फूड",
    "कैफे और बेकरी",
    "बिरयानी और तंदूर",
    "आइसक्रीम/शेक्स",
    "टिफिन और किचन",
    "पब और लाउंज",
    "कैटरिंग सर्विस",
    "हेल्दी फूड"
  ],
  "स्वास्थ्य व मेडिकल": [
    "दवा/फार्मेसी",
    "क्लिनिक/डॉक्टर",
    "अस्पताल",
    "लैब टेस्ट/स्कैन",
    "दांत/देखभाल",
    "आंख/देखभाल",
    "फिटनेस",
    "हेल्थ सप्लीमेंट",
    "मेडिकल उपकरण",
    "मानसिक स्वास्थ्य"
  ],
  "शिक्षा और नौकरियां": [
    "स्कूल/डेकेयर",
    "कॉलेज/यूनिवर्सिटी",
    "कोचिंग",
    "होम ट्यूशन",
    "स्किल कोर्सेज",
    "हॉबी क्लासेस",
    "किताबें/स्टेशनरी",
    "नौकरी/वैकेंसी",
    "करियर गाइडेंस",
    "ऑनलाइन लर्निंग"
  ],
  "लोकल व B2B सेवाएं": [
    "घर के मिस्त्री",
    "सफाई और पेस्ट",
    "पैकर्स और मूवर्स",
    "लीगल/CA सर्विस",
    "IT व वेब एक्सपर्ट",
    "मार्केटिंग और इवेंट",
    "बैंकिंग, इंश्योरेंस",
    "इंटीरियर डिजाइन",
    "सैलून और स्पा",
    "सिक्योरिटी सर्विस"
  ],
  "ऑटोमोबाइल": [
    "बाइक और स्कूटर",
    "कार और SUV",
    "कमर्शियल गाड़ियां",
    "स्पेयर पार्ट्स",
    "गैराज/मैकेनिक",
    "कार वॉश/डेकोर",
    "टायर और बैटरी",
    "कैब और रेंटल",
    "EV चार्जिंग",
    "कूरियर व ट्रांसपोर्ट"
  ],
  "प्रॉपर्टी और स्टे": [
    "बिक्री की प्रॉपर्टी",
    "किराए का घर",
    "PG और हॉस्टल्स",
    "दुकानें और ऑफिस",
    "इंडस्ट्रियल जमीन",
    "प्लॉट और फार्म",
    "होटल/रिसॉर्ट्स",
    "प्रॉपर्टी डीलर",
    "लीगल पेपरवर्क",
    "को-वर्किंग स्पेस"
  ]
};

const userState = {};
const pendingRequests = {};
const activeChats = {};
const lastMessageId = {};

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const value = body.entry[0].changes[0].value;
      const message = value.messages[0];
      const from = message.from;
      const msgBody = message.text?.body;
      const location = message.location;
      const image = message.image;
      const buttonReply = message.interactive?.button_reply?.id;
      const listReply = message.interactive?.list_reply?.id;
      const context = message.context;
      const contacts = value.contacts?.[0];
      const profileName = contacts?.profile?.name || 'User';

      console.log('Message from:', from, 'Name:', profileName, 'Type:', message.type);

      // 1. Cancel/Restart check - sabse pehle
      if (msgBody && ['cancel', 'stop', 'exit', 'menu', 'restart', 'home', 'कैंसल', 'बंद'].includes(msgBody.toLowerCase())) {
        if (activeChats[from]) {
          const otherUser = activeChats[from].with;
          delete activeChats[from];
          delete activeChats[otherUser];
          await sendMessage(from, 'चैट बंद कर दी गई ✅');
          await sendMessage(otherUser, 'दूसरे यूजर ने चैट बंद कर दी ❌');
          await sendMainMenu(otherUser);
        }
        delete userState[from];
        await sendMessage(from, 'प्रोसेस कैंसल कर दिया गया ✅');
        await sendMainMenu(from);
        return res.status(200).send('EVENT_RECEIVED');
      }

      // 2. Active Chat - Text ya Image relay
      if (activeChats[from] && context) {
        if (msgBody) {
          await relayMessageWithQuote(from, activeChats[from].with, msgBody, profileName);
        } else if (image) {
          await relayImageWithQuote(from, activeChats[from].with, image, msgBody, profileName);
        }
        return res.status(200).send('EVENT_RECEIVED');
      }

      // 3. Seller ne "Available" button dabaya
      if (buttonReply === 'available_btn' && context) {
        await connectBuyerSeller(from, context.id, profileName);
        return res.status(200).send('EVENT_RECEIVED');
      }

      // 4. Normal flow
      if (buttonReply) {
        await handleButtonClick(from, buttonReply);
      }
      else if (listReply) {
        await handleListClick(from, listReply);
      }
      else if (userState[from]) {
        await handleFlow(from, msgBody, location, profileName);
      }
      else if (msgBody) {
        if (['hi', 'hello', 'हाय', 'हेलो', 'नमस्ते'].includes(msgBody.toLowerCase())) {
          await sendMainMenu(from);
        }
        else if (['seller', 'सेलर'].includes(msgBody.toLowerCase())) {
          await startSellerRegistration(from);
        }
        else if (['buyer', 'कस्टमर', 'बायर'].includes(msgBody.toLowerCase())) {
          await startBuyerSearch(from);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Send Main Menu
async function sendMainMenu(to) {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: 'नमस्ते! NearMe में आपका स्वागत है 👋\n\nआप क्या करना चाहते हैं?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'seller_btn', title: 'सेल/सर्विस' } },
              { type: 'reply', reply: { id: 'buyer_btn', title: 'कस्टमर' } }
            ]
          }
        }
      }
    });
  } catch (error) {
    console.log('Error sending menu:', error.response?.data || error.message);
  }
}

async function handleButtonClick(from, buttonId) {
  if (buttonId === 'seller_btn') {
    await startSellerRegistration(from);
  } else if (buttonId === 'buyer_btn') {
    await startBuyerSearch(from);
  }
}

// Handle List Clicks
async function handleListClick(from, listId) {
  const state = userState[from];
  if (!state) return;

  if (state.flow === 'seller') {
    if (listId.startsWith('cat_')) {
      const category = listId.replace('cat_', '');
      userState[from].data.category = category;
      userState[from].step = 'subcategory';
      userState[from].timestamp = Date.now();
      await sendSubcategoryList(from, category, 'seller');
    }
    else if (listId.startsWith('subcat_')) {
      const subcategory = listId.replace('subcat_', '');
      userState[from].data.subcategory = subcategory;
      userState[from].step = 'name';
      userState[from].timestamp = Date.now();
      await sendMessage(from, `कैटेगरी: ${subcategory} ✅\n\nअब अपना नाम बताइए:`);
    }
  }

  if (state.flow === 'buyer') {
    if (listId.startsWith('bcat_')) {
      const category = listId.replace('bcat_', '');
      userState[from].data.category = category;
      userState[from].step = 'subcategory';
      userState[from].timestamp = Date.now();
      await sendSubcategoryList(from, category, 'buyer');
    }
    else if (listId.startsWith('bsubcat_')) {
      const subcategory = listId.replace('bsubcat_', '');
      userState[from].data.subcategory = subcategory;
      userState[from].step = 'location';
      userState[from].timestamp = Date.now();
      await sendMessage(from, `कैटेगरी: ${subcategory} ✅\n\nअब अपनी लोकेशन भेजिए 📍`);
    }
  }
}

// Start Seller Registration
async function startSellerRegistration(to) {
  const { data: existing } = await supabase
.from('sellers')
.select('id, name')
.eq('whatsapp_id', to)
.single();

  if (existing) {
    await sendMessage(to, `आप पहले से रजिस्टर हैं: ${existing.name} ✅\n\nएक व्हाट्सएप नंबर से एक ही सेल/सर्विस रजिस्टर हो सकती है.`);
    return;
  }

  userState[to] = {
    flow: 'seller',
    step: 'category',
    data: {},
    timestamp: Date.now()
  };
  await sendCategoryList(to, 'seller');
}

// Start Buyer Search
async function startBuyerSearch(to) {
  userState[to] = {
    flow: 'buyer',
    step: 'category',
    data: {},
    timestamp: Date.now()
  };
  await sendCategoryList(to, 'buyer');
}

// Send Category List - 10-10 ke section
async function sendCategoryList(to, flowType) {
  const prefix = flowType === 'buyer'? 'bcat_' : 'cat_';
  const text = flowType === 'buyer'
? 'कस्टमर सर्च शुरू करें.\n\nआपको क्या चाहिए?\n\n_कैंसल करने के लिए "cancel" लिखें_'
    : 'सेलर रजिस्ट्रेशन शुरू करें.\n\nअपनी कैटेगरी चुनें:\n\n_कैंसल करने के लिए "cancel" लिखें_';

  const allCategories = Object.keys(CATEGORIES);
  const sections = [];

  for (let i = 0; i < allCategories.length; i += 10) {
    const chunk = allCategories.slice(i, i + 10);
    sections.push({
      title: `कैटेगरी ${i + 1}-${i + chunk.length}`,
      rows: chunk.map(cat => ({
        id: `${prefix}${cat}`,
        title: cat.substring(0, 24),
        description: `${CATEGORIES[cat].length} विकल्प`
      }))
    });
  }

  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text },
          action: {
            button: 'कैटेगरी',
            sections: sections
          }
        }
      }
    });
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

// Send Subcategory List
async function sendSubcategoryList(to, category, flowType) {
  const subcats = CATEGORIES[category];
  const prefix = flowType === 'buyer'? 'bsubcat_' : 'subcat_';
  const text = flowType === 'buyer'
? `${category} में क्या चाहिए?\n\n_कैंसल करने के लिए "cancel" लिखें_`
    : `${category} में अपनी कैटेगरी चुनें:\n\n_कैंसल करने के लिए "cancel" लिखें_`;

  const subcatRows = subcats.map(sub => ({
    id: `${prefix}${sub}`,
    title: sub.substring(0, 24),
    description: category
  }));

  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text },
          action: {
            button: 'सब-कैटेगरी',
            sections: [{ title: `${category} विकल्प`, rows: subcatRows }]
          }
        }
      }
    });
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

// Flow Handler
async function handleFlow(from, msgBody, location, profileName) {
  const state = userState[from];
  if (!state) return;

  // Timeout check - 5 min
  if (state.timestamp && Date.now() - state.timestamp > 5 * 60 * 1000) {
    delete userState[from];
    await sendMessage(from, '5 मिनट तक कोई जवाब नहीं आया। सेशन खत्म हो गया ⏰\n\nदोबारा शुरू करने के लिए "hi" भेजें।');
    return;
  }

  userState[from].timestamp = Date.now();

  // SELLER FLOW
  if (state.flow === 'seller') {
    if (state.step === 'name') {
      userState[from].data.name = msgBody;
      userState[from].step = 'phone';
      await sendMessage(from, 'नाम सेव हो गया ✅\n\nअब अपना फोन नंबर भेजें:');
    }
    else if (state.step === 'phone') {
      userState[from].data.phone = msgBody;
      userState[from].step = 'location';
      await sendMessage(from, 'फोन नंबर सेव हो गया ✅\n\nअब व्हाट्सएप का लोकेशन बटन दबाकर अपनी लोकेशन भेजें 📍');
    }
    else if (state.step === 'location') {
      if (location) {
        userState[from].data.latitude = location.latitude;
        userState[from].data.longitude = location.longitude;
        userState[from].data.whatsapp_id = from;

        try {
          const { data, error } = await supabase
    .from('sellers')
    .insert([userState[from].data])
    .select();

          if (error) throw error;

          await sendMessage(from, `🎉 बधाई हो! आप NearMe पर रजिस्टर हो गए।\n\nकैटेगरी: ${userState[from].data.category}\nसब-कैटेगरी: ${userState[from].data.subcategory}\n\nअब आपको कस्टमर्स की रिक्वेस्ट मिलेगी।`);
          console.log('New Seller Saved:', data);
        } catch (error) {
          console.log('DB Save Error:', error);
          await sendMessage(from, 'कुछ एरर आ गया। बाद में ट्राई करें।');
        }
        delete userState[from];
      } else {
        await sendMessage(from, 'लोकेशन नहीं मिली 📍 बटन से लोकेशन भेजें');
      }
    }
  }

  // BUYER FLOW
  if (state.flow === 'buyer') {
    if (state.step === 'location') {
      if (location) {
        const { category, subcategory } = state.data;
        const { latitude, longitude } = location;

        try {
          const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('category', category)
    .eq('subcategory', subcategory);

          if (error ||!sellers?.length) {
            await sendMessage(from, `आस-पास कोई ${subcategory} नहीं मिला 😔`);
            return delete userState[from];
          }

          const nearby = sellers.filter(s => getDistance(latitude, longitude, s.latitude, s.longitude) <= 5);

          if (!nearby.length) {
            await sendMessage(from, '5 km के अंदर कोई सेलर नहीं मिला 😔');
            return delete userState[from];
          }

          pendingRequests[from] = {
            subcategory,
            buyerLocation: { latitude, longitude },
            sellers: nearby.map(s => ({ id: s.whatsapp_id, name: s.name, lat: s.latitude, lon: s.longitude })),
            buyerName: profileName
          };

          let sentCount = 0;
          for (const seller of nearby) {
            const sentMsg = await sendRequestToSeller(seller.whatsapp_id, subcategory, from, profileName);
            if (sentMsg) sentCount++;
          }

          await sendMessage(from, `✅ ${sentCount} सेलर्स को रिक्वेस्ट भेज दी गई है।\n\nजो सेलर "Available" बोलेगा, उससे आपकी चैट शुरू हो जाएगी।\n\n⚠️ जवाब देने के लिए सेलर के मैसेज को स्वाइप करके रिप्लाई करें।`);
        } catch (error) {
          console.log('Search Error:', error);
          await sendMessage(from, 'सर्च में एरर आ गया। बाद में ट्राई करें।');
        }
        delete userState[from];
      } else {
        await sendMessage(from, 'लोकेशन नहीं मिली 📍 बटन से लोकेशन भेजें');
      }
    }
  }
}

// Send Request to Seller
async function sendRequestToSeller(sellerId, subcategory, buyerId, buyerName) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: sellerId,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: `🔔 नई रिक्वेस्ट!\n\n*${buyerName}* को ${subcategory} चाहिए आपके एरिया में।\n\nक्या आप अवेलेबल हैं?`
          },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'available_btn', title: 'हां, मैं उपलब्ध हूं' } }
            ]
          }
        }
      }
    });
    return response.data.messages[0].id;
  } catch (error) {
    console.log('Error sending to seller:', error.response?.data || error.message);
    return null;
  }
}

// Connect Buyer & Seller - Send Location to Buyer
async function connectBuyerSeller(sellerId, messageId, sellerProfileName) {
  let buyerId = null;
  let buyerName = 'कस्टमर';
  let sellerDbName = sellerProfileName;
  let sellerLocation = null;
  let buyerLocation = null;

  for (const [buyer, req] of Object.entries(pendingRequests)) {
    const seller = req.sellers.find(s => s.id === sellerId);
    if (seller) {
      buyerId = buyer;
      buyerName = req.buyerName;
      sellerDbName = seller.name;
      sellerLocation = { lat: seller.lat, lon: seller.lon };
      buyerLocation = req.buyerLocation;
      break;
    }
  }

  if (!buyerId) {
    await sendMessage(sellerId, 'ये रिक्वेस्ट एक्सपायर हो गई है।');
    return;
  }

  const { data: sellerData } = await supabase
.from('sellers')
.select('name, latitude, longitude')
.eq('whatsapp_id', sellerId)
.single();

  if (sellerData) {
    sellerDbName = sellerData.name;
    sellerLocation = { lat: sellerData.latitude, lon: sellerData.longitude };
  }

  activeChats[sellerId] = { with: buyerId, name: sellerDbName };
  activeChats[buyerId] = { with: sellerId, name: buyerName };

  const distance = getDistance(buyerLocation.latitude, buyerLocation.longitude, sellerLocation.lat, sellerLocation.lon).toFixed(1);
  const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${buyerLocation.latitude},${buyerLocation.longitude}&destination=${sellerLocation.lat},${sellerLocation.lon}`;

  const sellerMsg = await sendMessageWithId(sellerId, `✅ आप *${buyerName}* से कनेक्ट हो गए!\n\nअब आप सीधे बात कर सकते हैं।\n\n⚠️ जवाब देने के लिए कस्टमर के मैसेज को स्वाइप करके रिप्लाई करें।\n_फोटो भी भेज सकते हैं_`);
  const buyerMsg = await sendMessageWithId(buyerId, `✅ *${sellerDbName}* उपलब्ध है!\n\n📍 *दूरी:* ${distance} km दूर\n🗺️ *रास्ता:* ${mapsLink}\n\nअब आप सीधे बात कर सकते हैं।\n\n⚠️ जवाब देने के लिए सेलर के मैसेज को स्वाइप करके रिप्लाई करें।\n_फोटो भी भेज सकते हैं_`);

  lastMessageId[sellerId] = sellerMsg;
  lastMessageId[buyerId] = buyerMsg;

  delete pendingRequests[buyerId];
}

// Relay Text Message With Quote + Name
async function relayMessageWithQuote(from, to, text, fromName) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        context: lastMessageId[to]? { message_id: lastMessageId[to] } : undefined,
        text: { body: `*${fromName}*\n${text}` }
      }
    });

    lastMessageId[to] = response.data.messages[0].id;
    lastMessageId[from] = response.data.messages[0].id;

    console.log(`Relayed: ${fromName} -> ${to}`);
  } catch (error) {
    console.log('Relay Error:', error.response?.data || error.message);
  }
}

// Relay Image With Quote + Name
async function relayImageWithQuote(from, to, image, caption, fromName) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        context: lastMessageId[to]? { message_id: lastMessageId[to] } : undefined,
        type: 'image',
        image: {
          id: image.id,
          caption: `*${fromName}*\n${caption || ''}`
        }
      }
    });

    lastMessageId[to] = response.data.messages[0].id;
    lastMessageId[from] = response.data.messages[0].id;

    console.log(`Relayed Image: ${fromName} -> ${to}`);
  } catch (error) {
    console.log('Relay Image Error:', error.response?.data || error.message);
  }
}

// Distance Calculator
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Send Simple Message
async function sendMessage(to, text) {
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text }
      }
    });
    return response.data.messages[0].id;
  } catch (error) {
    console.log('Error sending message:', error.response?.data || error.message);
    return null;
  }
}

// Send Message and Return ID
async function sendMessageWithId(to, text) {
  return await sendMessage(to, text);
}

// Admin route - Manual seller add karne ke liye
app.post('/admin/add-seller', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey!== 'nearme_admin_2026') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
.from('sellers')
.insert([req.body])
.select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
