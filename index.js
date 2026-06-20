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
  "1. Electronics & Digital Tech": [
    "Personal Devices (Mobiles, Laptops, Tablets)",
    "Home Entertainment (TV, Speakers, Gaming Consoles)",
    "Home & Kitchen Appliances (AC, Fridge, Washing Machine)",
    "Smart Tech & Wearables (Smartwatches, IoT Devices)",
    "Cameras & Audio Equipment (DSL0R, Headphones, Mics)",
    "Computers, Network & Servers (Routers, Hard Disks)",
    "Industrial & Power Electronics (Generators, Inverters, Solar)",
    "Software, Apps & Digital Goods (OS, SaaS, Subscriptions)",
    "Electronic Components & Semis (Chips, Wires, PCB)",
    "Office Automation (Printers, Scanners, POS Systems)"
  ],
  "2. Food, Grocery & Consumables": [
    "Fresh Produce (Fruits, Vegetables, Herbs)",
    "Dairy, Eggs & Plant-Based Alternatives",
    "Staples & Grains (Atta, Rice, Pulses, Cereals)",
    "Oils, Spices, Condiments & Sauces",
    "Packaged Food, Snacks & Confectionery",
    "Beverages (Tea, Coffee, Juices, Water, Alcohol)",
    "Meat, Poultry, Seafood & Frozen Food",
    "Bakery, Desserts & Breakfast Items",
    "Pet Food & Animal Nutrition",
    "Baby Food & Infant Nutrition"
  ],
  "3. Fashion, Apparel & Personal Care": [
    "Men's Clothing & Western Wear",
    "Women's Clothing & Ethnic Wear",
    "Kids, Toddlers & Infant Wear",
    "Footwear (Casual, Formal, Sports, Boots)",
    "Innerwear, Sleepwear & Loungewear",
    "Jewellery, Watches & Premium Accessories",
    "Bags, Luggage, Wallets & Travel Gear",
    "Cosmetics, Makeup & Skin Care",
    "Fragrances, Perfumes & Deodorants",
    "Hair Care, Personal Hygiene & Grooming"
  ],
  "4. Home, Living & Industrial Infrastructure": [
    "Furniture (Home, Office, Outdoor)",
    "Home Decor, Lighting & Furnishing (Curtains, Rugs)",
    "Kitchenware, Cookware & Tableware",
    "Hardware, Tools & Building Materials (Cement, Bricks)",
    "Electrical, Plumbing & Sanitary Ware",
    "Heavy Machinery & Industrial Equipment (Conveyors, Sizers, Cranes)",
    "Raw Materials, Metals, Chemicals & Plastics",
    "Household Supplies (Cleaning, Laundry, Disinfectants)",
    "Gardening, Plants & Agricultural Supplies",
    "Safety & Security Systems (CCTV, Fire Alarms, PPE)"
  ],
  "5. Restaurants, Food Delivery & Catering": [
    "Regional & Traditional Indian Cuisine",
    "International & Continental Cuisine (Chinese, Italian)",
    "Fast Food, Burgers, Pizzas & Street Food",
    "Cafes, Breakfast Joints & Bakeries",
    "Biryani, Tandoor & Barbecue Specialists",
    "Sweet Shops, Ice Creams & Desserts",
    "Cloud Kitchens & Daily Meal Tiffins",
    "Bars, Pubs, Breweries & Lounges",
    "Catering Services for Events & Weddings",
    "Healthy, Diet, Vegan & Organic Food Outlets"
  ],
  "6. Medical, Health & Wellness": [
    "Allopathic Medicines & Pharmacy Items",
    "Ayurvedic, Herbal & Alternative Medicine",
    "Hospitals, Emergency Clinics & Nursing Homes",
    "Specialist Doctors & Consultations",
    "Diagnostic Labs, Scans & Blood Banks",
    "Medical Devices, Implants & Surgical Equipment",
    "Fitness Equipment, Gyms & Yoga Centers",
    "Nutritional Supplements, Vitamins & Proteins",
    "Dental, Eye (Opticians) & Hearing Care Centers",
    "Mental Health, Therapy & Rehab Services"
  ],
  "7. Education, Jobs & Knowledge Services": [
    "Schools, Pre-Schools & Daycare",
    "Higher Education, Universities & Colleges",
    "Competitive Exams & Test Prep Coaching",
    "K-12 Tuitions & Academic Classes",
    "Skill Development, Coding & Professional Courses",
    "Language, Arts, Music & Hobby Classes",
    "Books, Stationery, E-Books & Study Material",
    "Job Portals, Recruitment & Career Counselling",
    "Research, Consultancy & Advisory Services",
    "E-Learning Platforms & Educational Software"
  ],
  "8. Professional, Local & B2B Services": [
    "Essential Home Technicians (Electrician, Plumber, Carpenter)",
    "Home Cleaning, Pest Control & Laundry Services",
    "Packers & Movers, Logistics & Courier Services",
    "Legal, Accounting, Tax & CA Services",
    "IT Services, Web Development & Tech Support",
    "Marketing, Advertising & Event Management",
    "Banking, Insurance & Financial Services",
    "Architecture, Interior Design & Construction Services",
    "Beauty Salons, Spas & Bridal Makeup Artists",
    "Security Guards & Facility Management Services"
  ],
  "9. Automobile & Transportation": [
    "Two-Wheelers (Bikes, Scooters - Petrol & EV)",
    "Four-Wheelers (Cars, SUVs, Luxury Vehicles)",
    "Commercial & Heavy Vehicles (Trucks, Buses, HEMM)",
    "Auto Spare Parts, Components & Engine Oil",
    "Vehicle Servicing, Mechanics & Garages",
    "Car Wash, Detailing & Decals",
    "Tyres, Alloys & Battery Shops",
    "Travel Bookings, Cabs, Rentals & Logistics",
    "Electric Vehicle Charging & Battery Swapping Stations",
    "Aviation, Marine & Rail Transport Equipment"
  ],
  "10. Real Estate, Construction & Accommodation": [
    "Residential Properties for Sale (Flats, Villas)",
    "Residential Properties for Rent (Houses, Apartments)",
    "Paying Guest (PG), Co-living & Student Hostels",
    "Commercial Properties (Shops, Showrooms, Offices)",
    "Industrial Real Estate (Warehouses, Factories, Land)",
    "Agricultural Land & Open Plots",
    "Hotels, Resorts, Homestays & Guest Houses",
    "Real Estate Agents, Dealers & Brokers",
    "Property Management & Legal Documentation",
    "Co-working Spaces & Shared Offices"
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
      if (msgBody && ['cancel', 'stop', 'exit', 'menu', 'restart', 'home'].includes(msgBody.toLowerCase())) {
        if (activeChats[from]) {
          const otherUser = activeChats[from].with;
          delete activeChats[from];
          delete activeChats[otherUser];
          await sendMessage(from, 'Chat band kar di gayi ✅');
          await sendMessage(otherUser, 'Dusre user ne chat band kar di ❌');
          await sendMainMenu(otherUser);
        }
        delete userState[from];
        await sendMessage(from, 'Process cancel kar diya ✅');
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
              { type: 'reply', reply: { id: 'seller_btn', title: 'Sale/Service' } },
              { type: 'reply', reply: { id: 'buyer_btn', title: 'Customer' } }
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
      await sendMessage(from, `Subcategory: ${subcategory} ✅\n\nAb apna naam bhejo:`);
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
      await sendMessage(from, `Subcategory: ${subcategory} ✅\n\nAb apni location bhejo 📍`);
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
    await sendMessage(to, `Aap already register ho: ${existing.name} ✅\n\nEk WhatsApp number se ek hi seller register ho sakta hai.`);
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
? 'Buyer Search shuru karte hain.\n\nKis category me search karna hai?\n\n_Cancel karne ke liye "cancel" type kare_'
    : 'Seller Registration shuru karte hain.\n\nApni category chuno:\n\n_Cancel karne ke liye "cancel" type kare_';

  const allCategories = Object.keys(CATEGORIES);
  const sections = [];

  for (let i = 0; i < allCategories.length; i += 10) {
    const chunk = allCategories.slice(i, i + 10);
    sections.push({
      title: `Categories ${i + 1}-${i + chunk.length}`,
      rows: chunk.map(cat => ({
        id: `${prefix}${cat}`,
        title: cat.substring(0, 24),
        description: `${CATEGORIES[cat].length} options`
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
            button: 'Categories',
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
? `${category} me kya chahiye?\n\n_Cancel karne ke liye "cancel" type kare_`
    : `${category} me apni subcategory chuno:\n\n_Cancel karne ke liye "cancel" type kare_`;

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
async function handleFlow(from, msgBody, location, profileName) {
  const state = userState[from];
  if (!state) return;

  // Timeout check - 5 min
  if (state.timestamp && Date.now() - state.timestamp > 5 * 60 * 1000) {
    delete userState[from];
    await sendMessage(from, '5 minute tak koi reply nahi aaya. Session expire ho gaya ⏰\n\nDobara shuru karne ke liye "hi" bhejo.');
    return;
  }

  userState[from].timestamp = Date.now();

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
            await sendMessage(from, '5km ke andar koi seller nahi mila 😔');
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

          await sendMessage(from, `✅ ${sentCount} sellers ko request bhej di gayi hai.\n\nJo seller "Available" bolega, usse aapki chat start ho jayegi.\n\n⚠️ Reply karne ke liye seller ke message ko swipe karke reply kare.`);
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
            text: `🔔 Nayi Request!\n\n*${buyerName}* ko ${subcategory} chahiye aapke area me.\n\nKya aap available ho?`
          },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'available_btn', title: 'Available Hoon' } }
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
  let buyerName = 'Buyer';
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
    await sendMessage(sellerId, 'Ye request expire ho gayi hai.');
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

  const sellerMsg = await sendMessageWithId(sellerId, `✅ Aap *${buyerName}* se connect ho gaye!\n\nAb aap direct baat kar sakte ho.\n\n⚠️ Reply karne ke liye buyer ka message swipe karke reply kare.\n_Photo bhi bhej sakte ho_`);
  const buyerMsg = await sendMessageWithId(buyerId, `✅ *${sellerDbName}* available hai!\n\n📍 *Distance:* ${distance} km door\n🗺️ *Route:* ${mapsLink}\n\nAb aap direct baat kar sakte ho.\n\n⚠️ Reply karne ke liye seller ka message swipe karke reply kare.\n_Photo bhi bhej sakte ho_`);

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
