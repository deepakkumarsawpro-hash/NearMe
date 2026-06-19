const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// 0. Supabase Connect
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log('Supabase Connected');

// 1. Categories + Subcategories
const CATEGORIES = {
  "Electronics": ["Mobile", "Laptop", "TV", "AC", "Refrigerator", "Washing Machine", "Headphones", "Camera"],
  "Grocery": ["Vegetables", "Fruits", "Dairy", "Snacks", "Beverages", "Spices", "Oil", "Rice & Flour"],
  "Clothes": ["Men Wear", "Women Wear", "Kids Wear", "Saree", "Shoes", "Jeans", "T-Shirts", "Winter Wear"],
  "Services": ["Plumber", "Electrician", "Carpenter", "Painter", "AC Repair", "Mobile Repair", "Tutor"],
  "Restaurant": ["North Indian", "South Indian", "Chinese", "Fast Food", "Sweets", "Bakery", "Cafe"],
  "Medical": ["Pharmacy", "Clinic", "Hospital", "Lab Test", "Dentist", "Veterinary"]
};

// 2. Temporary storage for flows
const userState = {};

// 3. Webhook Verification - GET
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

// 4. Webhook for Messages - POST
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

      console.log('Message from:', from);

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

// 5. Send Main Menu with Buttons
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
          body: {
            text: 'Hi! NearMe me apka swagat hai 👋\n\nKya karna chahte ho?'
          },
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

// 6. Handle Button Clicks
async function handleButtonClick(from, buttonId) {
  if (buttonId === 'seller_btn') {
    await startSellerRegistration(from);
  } else if (buttonId === 'buyer_btn') {
    await startBuyerSearch(from);
  }
}

// 7. Handle List Clicks - Seller + Buyer Dono
async function handleListClick(from, listId) {
  const state = userState[from];
  if (!state) return;

  // Seller Flow
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

  // Buyer Flow
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
      await sendMessage(from, `Subcategory: ${subcategory} ✅\n\nAb apni location bhejo 📍\nTaaki aas-paas ke sellers dhoond saku`);
    }
  }
}

// 8. Start Seller Registration
async function startSellerRegistration(to) {
  userState[to] = { flow: 'seller', step: 'category', data: {} };
  await sendCategoryList(to, 'seller');
}

// 9. Start Buyer Search
async function startBuyerSearch(to) {
  userState[to] = { flow: 'buyer', step: 'category', data: {} };
  await sendCategoryList(to, 'buyer');
}

// 10. Send Category List - Universal
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

// 11. Send Subcategory List - Universal
async function sendSubcategoryList(to, category, flowType) {
  const subcats = CATEGORIES[category];
  if (!subcats) {
    await sendMessage(to, 'Galat category. Phir se try karo.');
    return;
  }

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

// 12. Flow Handler - Seller + Buyer Dono
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

          await sendMessage(from, `🎉 Badhai ho! Aap NearMe par register ho gaye.\n\nCategory: ${userState[from].data.category}\nSubcategory: ${userState[from].data.subcategory}\n\nAb buyers aapko dhoond payenge.`);
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
            await sendMessage(from, `Aas-paas koi ${subcategory} nahi mila 😔`);
            return delete userState[from];
          }

          const nearby = sellers.filter(s => getDistance(latitude, longitude, s.latitude, s.longitude) <= 5);

          if (!nearby.length) {
            await sendMessage(from, '5km ke andar koi nahi mila 😔');
            return delete userState[from];
          }

          let reply = `Aapke aas-paas ke ${subcategory}:\n\n`;
          nearby.slice(0, 5).forEach((s, i) => {
            const dist = getDistance(latitude, longitude, s.latitude, s.longitude).toFixed(1);
            reply += `${i+1}. ${s.name}\n📞 ${s.phone}\n📍 ${dist}km door\n\n`;
          });

          await sendMessage(from, reply);
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

// 13. Distance Calculator
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 14. Send Simple Text Message
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

// 15. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
