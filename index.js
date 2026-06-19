const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
console.log('Supabase Connected');

const CATEGORIES = {
  "Electronics": ["Mobile", "Laptop", "TV", "AC", "Refrigerator", "Washing Machine", "Headphones", "Camera"],
  "Grocery": ["Vegetables", "Fruits", "Dairy", "Snacks", "Beverages", "Spices", "Oil", "Rice & Flour"],
  "Clothes": ["Men Wear", "Women Wear", "Kids Wear", "Saree", "Shoes", "Jeans", "T-Shirts", "Winter Wear"],
  "Services": ["Plumber", "Electrician", "Carpenter", "Painter", "AC Repair", "Mobile Repair", "Tutor"],
  "Restaurant": ["North Indian", "South Indian", "Chinese", "Fast Food", "Sweets", "Bakery", "Cafe"],
  "Medical": ["Pharmacy", "Clinic", "Hospital", "Lab Test", "Dentist", "Veterinary"]
};

const userState = {};
const pendingRequests = {}; // buyer_id: { sellers: [], subcategory: '', buyerLocation: {} }
const activeChats = {}; // seller_id: buyer_id OR buyer_id: seller_id

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
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const msgBody = message.text?.body;
      const location = message.location;
      const buttonReply = message.interactive?.button_reply?.id;
      const listReply = message.interactive?.list_reply?.id;
      const context = message.context; // Reply to message wala

      console.log('Message from:', from);

      // 1. Active Chat - Message relay
      if (activeChats[from] && msgBody && context) {
        await relayMessage(from, activeChats[from], msgBody);
        return res.status(200).send('EVENT_RECEIVED');
      }

      // 2. Seller ne "Available" button dabaya
      if (buttonReply === 'available_btn' && context) {
        await connectBuyerSeller(from, context.id);
        return res.status(200).send('EVENT_RECEIVED');
      }

      // 3. Normal flow
      if (buttonReply) {
        await handleButtonClick(from, buttonReply);
      }
      else if (listReply) {
        await handleListClick(from, listReply);
      }
      else if (userState[from]) {
        await handleFlow(from, msgBody, location);
      }
      else if (msgBody) {
        if (msgBody.toLowerCase() === 'hi' || msgBody.toLowerCase() === 'hello') {
          await sendMainMenu(from);
        }
        else if (msgBody.toLowerCase() === 'seller') {
          await startSellerRegistration(from);
        }
        else if (msgBody.toLowerCase() === 'buyer') {
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
          body: { text: 'Hi! NearMe me apka swagat hai 👋\n\nKya karna chahte ho?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'seller_btn', title: 'Seller Register' } },
              { type: 'reply', reply: { id: 'buyer_btn', title: 'Buyer Search' } }
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
      await sendSubcategoryList(from, category, 'seller');
    }
    else if (listId.startsWith('subcat_')) {
      const subcategory = listId.replace('subcat_', '');
      userState[from].data.subcategory = subcategory;
      userState[from].step = 'name';
      await sendMessage(from, `Subcategory: ${subcategory} ✅\n\nAb apna naam bhejo:`);
    }
  }

  if (state.flow === 'buyer') {
    if (listId.startsWith('bcat_')) {
      const category = listId.replace('bcat_', '');
      userState[from].data.category = category;
      userState[from].step = 'subcategory';
      await sendSubcategoryList(from, category, 'buyer');
    }
    else if (listId.startsWith('bsubcat_')) {
      const subcategory = listId.replace('bsubcat_', '');
      userState[from].data.subcategory = subcategory;
      userState[from].step = 'location';
      await sendMessage(from, `Subcategory: ${subcategory} ✅\n\nAb apni location bhejo 📍`);
    }
  }
}

// Start Seller Registration - Check duplicate
async function startSellerRegistration(to) {
  // CHECK: Kya ye number already registered hai?
  const { data: existing } = await supabase
  .from('sellers')
  .select('id')
  .eq('whatsapp_id', to)
  .single();

  if (existing) {
    await sendMessage(to, 'Aap is number se already register ho ❌\n\nEk WhatsApp number se ek hi seller register ho sakta hai.');
    return;
  }

  userState[to] = { flow: 'seller', step: 'category', data: {} };
  await sendCategoryList(to, 'seller');
}

// Start Buyer Search
async function startBuyerSearch(to) {
  userState[to] = { flow: 'buyer', step: 'category', data: {} };
  await sendCategoryList(to, 'buyer');
}

// Send Category List
async function sendCategoryList(to, flowType) {
  const prefix = flowType === 'buyer'? 'bcat_' : 'cat_';
  const text = flowType === 'buyer'
  ? 'Buyer Search shuru karte hain.\n\nKis category me search karna hai?'
    : 'Seller Registration shuru karte hain.\n\nApni category chuno:';

  const categoryRows = Object.keys(CATEGORIES).map(cat => ({
    id: `${prefix}${cat}`,
    title: cat,
    description: `${CATEGORIES[cat].length} options`
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
            button: 'Categories',
            sections: [{ title: 'Select Category', rows: categoryRows }]
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
  ? `${category} me kya chahiye?`
    : `${category} me apni subcategory chuno:`;

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
            button: 'Subcategories',
            sections: [{ title: `${category} Options`, rows: subcatRows }]
          }
        }
      }
    });
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

// Flow Handler
async function handleFlow(from, msgBody, location) {
  const state = userState[from];
  if (!state) return;

  // SELLER FLOW
  if (state.flow === 'seller') {
    if (state.step === 'name') {
      userState[from].data.name = msgBody;
      userState[from].step = 'phone';
      await sendMessage(from, 'Naam save ho gaya ✅\n\nAb apna phone number bhejo:');
    }
    else if (state.step === 'phone') {
      userState[from].data.phone = msgBody;
      userState[from].step = 'location';
      await sendMessage(from, 'Phone save ho gaya ✅\n\nAb WhatsApp ka Location button dabake apni location bhejo 📍');
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

          await sendMessage(from, `🎉 Badhai ho! Aap NearMe par register ho gaye.\n\nCategory: ${userState[from].data.category}\nSubcategory: ${userState[from].data.subcategory}\n\nAb buyers ki request aapko milegi.`);
          console.log('New Seller Saved:', data);
        } catch (error) {
          console.log('DB Save Error:', error);
          await sendMessage(from, 'Kuch error aa gaya. Baad me try karna.');
        }
        delete userState[from];
      } else {
        await sendMessage(from, 'Location nahi mili. 📍 button se location bhejo.');
      }
    }
  }

  // BUYER FLOW - Broadcast to Sellers
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
            await sendMessage(from, `Aas-paas koi ${subcategory} nahi mila 😔`);
            return delete userState[from];
          }

          const nearby = sellers.filter(s => getDistance(latitude, longitude, s.latitude, s.longitude) <= 5);

          if (!nearby.length) {
            await sendMessage(from, '5km ke andar koi seller nahi mila 😔');
            return delete userState[from];
          }

          // Save request for tracking
          pendingRequests[from] = {
            subcategory,
            buyerLocation: { latitude, longitude },
            sellers: nearby.map(s => s.whatsapp_id)
          };

          // Broadcast to all nearby sellers
          let sentCount = 0;
          for (const seller of nearby) {
            const sentMsg = await sendRequestToSeller(seller.whatsapp_id, subcategory, from);
            if (sentMsg) sentCount++;
          }

          await sendMessage(from, `✅ ${sentCount} sellers ko request bhej di gayi hai.\n\nJo seller "Available" bolega, usse aapki chat start ho jayegi.\n\nReply karne ke liye seller ke message ko swipe karke reply kare.`);
        } catch (error) {
          console.log('Search Error:', error);
          await sendMessage(from, 'Search me error aa gaya. Baad me try karna.');
        }
        delete userState[from];
      } else {
        await sendMessage(from, 'Location nahi mili. 📍 button se location bhejo.');
      }
    }
  }
}

// Send Request to Seller
async function sendRequestToSeller(sellerId, subcategory, buyerId) {
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
            text: `🔔 Nayi Request!\n\nEk customer ko ${subcategory} chahiye aapke area me.\n\nKya aap available ho?`
          },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'available_btn', title: 'Available Hoon' } }
            ]
          }
        }
      }
    });
    return response.data.messages[0].id; // Message ID for context
  } catch (error) {
    console.log('Error sending to seller:', error.response?.data || error.message);
    return null;
  }
}

// Connect Buyer & Seller
async function connectBuyerSeller(sellerId, messageId) {
  // Find which buyer sent this request
  let buyerId = null;
  for (const [buyer, req] of Object.entries(pendingRequests)) {
    if (req.sellers.includes(sellerId)) {
      buyerId = buyer;
      break;
    }
  }

  if (!buyerId) {
    await sendMessage(sellerId, 'Ye request expire ho gayi hai.');
    return;
  }

  // Create active chat
  activeChats[sellerId] = buyerId;
  activeChats[buyerId] = sellerId;

  await sendMessage(sellerId, '✅ Aap buyer se connect ho gaye!\n\nAb aap direct baat kar sakte ho.\n\n⚠️ Reply karne ke liye buyer ka message swipe karke reply kare.');
  await sendMessage(buyerId, '✅ Seller available hai!\n\nAb aap direct baat kar sakte ho.\n\n⚠️ Reply karne ke liye seller ka message swipe karke reply kare.');

  // Delete pending request
  delete pendingRequests[buyerId];
}

// Relay Message Between Buyer & Seller
async function relayMessage(from, to, text) {
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
        text: { body: text }
      }
    });
    console.log(`Relayed: ${from} -> ${to}`);
  } catch (error) {
    console.log('Relay Error:', error.response?.data || error.message);
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
        text: { body: text }
      }
    });
    console.log('Message sent to:', to);
  } catch (error) {
    console.log('Error sending message:', error.response?.data || error.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
