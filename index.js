const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'deepak_webhook_123';

// ===== TERE CATEGORIES =====
const CATEGORIES_DATA = {
  customer: {
    main_categories: [
      { id: 'food', title: 'भोजन (Food & Beverages)' },
      { id: 'clothing', title: 'कपड़ा (Clothing & Fashion)' },
      { id: 'housing', title: 'मकान (Housing & Real Estate)' },
      { id: 'health', title: 'दवा और इलाज (Health & Medical)' },
      { id: 'transport', title: 'गाड़ी और सफर (Transport & Travel)' },
      { id: 'education', title: 'पढ़ाई (Education & Training)' },
      { id: 'entertainment', title: 'मनोरंजन (Entertainment & Media)' },
      { id: 'utilities', title: 'बिजली और पानी (Utilities)' },
      { id: 'tech', title: 'मोबाइल और इंटरनेट (Tech & Telecom)' },
      { id: 'finance', title: 'पैसा और बैंक (Finance & Insurance)' }
    ]
  }
};

const users = {};

async function sendMessage(to, messageData) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to: to,...messageData },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
  } catch (err) {
    console.error('Send Error:', err.response?.data);
  }
}

function sendText(to, text) {
  return sendMessage(to, { type: 'text', text: { body: text } });
}

function sendCategoryButtons(to) {
  const buttons = CATEGORIES_DATA.customer.main_categories.slice(0, 3).map((cat, i) => ({
    type: 'reply',
    reply: { id: cat.id, title: cat.title.slice(0, 20) }
  }));

  return sendMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Namaste! Aapko kya chahiye? Category chune:' },
      action: { buttons }
    }
  });
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;

    const from = message.from;
    const msg = message.text?.body?.trim();
    const buttonId = message.interactive?.button_reply?.id;

    if (msg?.toLowerCase() === 'hi') {
      await sendCategoryButtons(from);
    } else if (buttonId) {
      await sendText(from, `Aapne chuna: ${buttonId}. Jaldi poori categories add karenge.`);
    }

  } catch (err) {
    console.error('Webhook Error:', err);
  }
});

app.get('/', (req, res) => res.send('Bot Live'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running`));
