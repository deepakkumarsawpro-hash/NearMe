const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// 0. Supabase Connect - Bas ye 2 lines
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log('Supabase Connected');

// 1. Categories + Subcategories - Sab yahi hai
const CATEGORIES = {
  "Electronics": [
    "Mobile", "Laptop", "TV", "AC", "Refrigerator", "Washing Machine", "Headphones", "Camera"
  ],
  "Grocery": [
    "Vegetables", "Fruits", "Dairy", "Snacks", "Beverages", "Spices", "Oil", "Rice & Flour"
  ],
  "Clothes": [
    "Men Wear", "Women Wear", "Kids Wear", "Saree", "Shoes", "Jeans", "T-Shirts", "Winter Wear"
  ],
  "Services": [
    "Plumber", "Electrician", "Carpenter", "Painter", "AC Repair", "Mobile Repair", "Tutor"
  ],
  "Restaurant": [
    "North Indian", "South Indian", "Chinese", "Fast Food", "Sweets", "Bakery", "Cafe"
  ],
  "Medical": [
    "Pharmacy", "Clinic", "Hospital", "Lab Test", "Dentist", "Veterinary"
  ]
};

// 2. Temporary storage for registration flow
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
        await handleRegistration(from, msgBody, location);
      }
      else if (msgBody) {
        if (msgBody.toLowerCase() === 'hi' || msgBody.toLowerCase() === 'hello') {
          await sendMainMenu(from);
        }
        else if (msgBody.toLowerCase() === 'seller') {
          await startSellerRegistration(from);
        }
        else if (msgBody.toLowerCase() === 'buyer') {
          await sendMessage(from, 'Buyer feature jald aa raha hai. Abhi Seller register kar sakte ho.');
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
    await sendMessage(from, 'Buyer feature jald aa raha hai.');
  }
}

// 7. Handle List Clicks
async function handleListClick(from, listId) {
  if (listId.startsWith('cat_')) {
    const category = listId.replace('cat_', '');
    userState[from].data.category = category;
    userState[from].step = 'subcategory';
    await sendSubcategoryList(from, category);
  }
  else if (listId.startsWith('subcat_')) {
    const subcategory = listId.replace('subcat_', '');
    userState[from].data.subcategory = subcategory;
    userState[from].step = 'name';
    await sendMessage(from, `Subcategory: ${subcategory} ✅\n\nAb apna naam bhejo:`);
  }
}

// 8. Start Seller Registration
async function startSellerRegistration(to) {
  userState[to] = { step: 'category', data: {} };

  const categoryRows = Object.keys(CATEGORIES).map(cat => ({
    id: `cat_${cat}`,
    title: cat,
    description: `${CATEGORIES[cat].length} subcategories`
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
          body: {
            text: 'Seller Registration shuru karte hain.\n\nApni category chuno:'
          },
          action: {
            button: 'Categories',
            sections: [{
              title: 'Select Category',
              rows: categoryRows
            }]
          }
        }
      }
    });
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

// 9. Send Subcategory List
async function sendSubcategoryList(to, category) {
  const subcats = CATEGORIES[category];
  if (!subcats) {
    await sendMessage(to, 'Galat category. Phir se try karo.');
    return;
  }

  const subcatRows = subcats.map(sub => ({
    id: `subcat_${sub}`,
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
          body: {
            text: `${category} me apni subcategory chuno:`
          },
          action: {
            button: 'Subcategories',
            sections: [{
              title: `${category} Options`,
              rows: subcatRows
            }]
          }
        }
      }
    });
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

// 10. Registration Handler Function - Supabase me Save
async function handleRegistration(from, msgBody, location) {
  const currentStep = userState[from].step;

  if (currentStep === 'category') {
    if (CATEGORIES[msgBody]) {
      userState[from].data.category = msgBody;
      userState[from].step = 'subcategory';
      await sendSubcategoryList(from, msgBody);
    } else {
      await sendMessage(from, 'Ye category available nahi hai. List se chuno.');
    }
  }
  else if (currentStep === 'subcategory') {
    userState[from].data.subcategory = msgBody;
    userState[from].step = 'name';
    await sendMessage(from, `Subcategory: ${msgBody} ✅\n\nAb apna naam bhejo:`);
  }
  else if (currentStep === 'name') {
    userState[from].data.name = msgBody;
    userState[from].step = 'phone';
    await sendMessage(from, 'Naam save ho gaya ✅\n\nAb apna phone number bhejo:');
  }
  else if (currentStep === 'phone') {
    userState[from].data.phone = msgBody;
    userState[from].step = 'location';
    await sendMessage(from, 'Phone save ho gaya ✅\n\nAb WhatsApp ka Location button dabake apni location bhejo 📍');
  }
  else if (currentStep === 'location') {
    if (location) {
      userState[from].data.latitude = location.latitude;
      userState[from].data.longitude = location.longitude;
      userState[from].data.whatsapp_id = from;

      // Save to Supabase
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

// 11. Send Simple Text Message
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

// 12. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
