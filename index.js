const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');
const qrcode = require('qrcode-terminal');

// ===== SIRF YE 3 CHEEZ EDIT KARNA BAAKI LIFE ME =====
const SUPABASE_URL = 'https://nlilaesjxxbblqjhlzik.supabase.co'; // Tera Supabase URL
const SUPABASE_KEY = 'sb_secret_snWXKa4slAD78Ykx0wsKKA_IZUN3smF'; // Tera Supabase Anon Key
const CATEGORIES = {
    "Services": ["Electrician", "Plumber", "Carpenter", "AC Repair", "Painter"],
    "Food": ["Tiffin Service", "Restaurant", "Caterer", "Bakery"],
    "Shopping": ["Kirana Store", "Medical Store", "Mobile Shop", "Clothes"]
};
// ===== EDIT KHATAM - AB NEECHE KUCH MAT CHHEDNA =====

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

const userStates = {};

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    const userState = userStates[msg.from];
    const text = msg.body.trim();

    // Start Message
    if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello') {
        await client.sendMessage(msg.from, 'NearMe me swagat hai! 🙏\n\n1. Seller Register\n2. Buyer Search\n\nKripya 1 ya 2 type kare');
        userStates[msg.from] = { step: 'main_menu' };
        return;
    }

    // ===== SELLER REGISTER FLOW =====
    if (text === '1' || text === 'Seller Register') {
        let reply = 'Category chuno:\n';
        Object.keys(CATEGORIES).forEach((cat, i) => reply += `${i+1}. ${cat}\n`);
        await client.sendMessage(msg.from, reply);
        userStates[msg.from] = { step: 'seller_cat' };
        return;
    }

    else if (userState?.step === 'seller_cat') {
        const catIndex = parseInt(text) - 1;
        const catList = Object.keys(CATEGORIES);
        if (catIndex < 0 || catIndex >= catList.length) return client.sendMessage(msg.from, 'Galat number. Phir se chuno.');

        const selectedCat = catList[catIndex];
        userStates[msg.from] = { step: 'seller_subcat', category: selectedCat };

        let reply = `${selectedCat} me kya kaam karte ho?\n`;
        CATEGORIES[selectedCat].forEach((sub, i) => reply += `${i+1}. ${sub}\n`);
        await client.sendMessage(msg.from, reply);
        return;
    }

    else if (userState?.step === 'seller_subcat') {
        const { category } = userState;
        const subIndex = parseInt(text) - 1;
        if (subIndex < 0 || subIndex >= CATEGORIES[category].length) return client.sendMessage(msg.from, 'Galat number');

        userStates[msg.from].subcategory = CATEGORIES[category][subIndex];
        userStates[msg.from].step = 'seller_name';
        await client.sendMessage(msg.from, 'Apna naam bataye:');
        return;
    }

    else if (userState?.step === 'seller_name') {
        userStates[msg.from].name = text;
        userStates[msg.from].step = 'seller_phone';
        await client.sendMessage(msg.from, 'Apna phone number daale:');
        return;
    }

    else if (userState?.step === 'seller_phone') {
        userStates[msg.from].phone = text;
        userStates[msg.from].step = 'seller_location';
        await client.sendMessage(msg.from, 'Apni dukaan/kaam ki location bheje 📍');
        return;
    }

    else if (msg.type === 'location' && userState?.step === 'seller_location') {
        const { latitude, longitude } = msg.location;
        const { category, subcategory, name, phone } = userState;

        const { error } = await supabase.from('sellers').insert([{
            name, phone, category, subcategory, latitude, longitude,
            whatsapp_id: msg.from.replace('@c.us', '')
        }]);

        if (error) {
            console.log('Supabase Error:', error);
            await client.sendMessage(msg.from, 'Registration fail ho gaya 😔 Dobara try kare');
        } else {
            console.log('New Seller Saved:', { name, phone, category, subcategory });
            await client.sendMessage(msg.from, `Badhai ho! Aap NearMe par register ho gaye ✅\n\nNaam: ${name}\nKaam: ${subcategory}\nPhone: ${phone}`);
        }
        delete userStates[msg.from];
        return;
    }

    // ===== BUYER SEARCH FLOW =====
    else if (text === '2' || text === 'Buyer Search') {
        let reply = 'Category chuno:\n';
        Object.keys(CATEGORIES).forEach((cat, i) => reply += `${i+1}. ${cat}\n`);
        await client.sendMessage(msg.from, reply);
        userStates[msg.from] = { step: 'buyer_cat' };
        return;
    }

    else if (userState?.step === 'buyer_cat') {
        const catIndex = parseInt(text) - 1;
        const catList = Object.keys(CATEGORIES);
        if (catIndex < 0 || catIndex >= catList.length) return client.sendMessage(msg.from, 'Galat number');

        const selectedCat = catList[catIndex];
        userStates[msg.from] = { step: 'buyer_subcat', category: selectedCat };

        let reply = `${selectedCat} me kya chahiye?\n`;
        CATEGORIES[selectedCat].forEach((sub, i) => reply += `${i+1}. ${sub}\n`);
        await client.sendMessage(msg.from, reply);
        return;
    }

    else if (userState?.step === 'buyer_subcat') {
        const { category } = userState;
        const subIndex = parseInt(text) - 1;
        if (subIndex < 0 || subIndex >= CATEGORIES[category].length) return client.sendMessage(msg.from, 'Galat number');

        userStates[msg.from].subcategory = CATEGORIES[category][subIndex];
        userStates[msg.from].step = 'buyer_loc';
        await client.sendMessage(msg.from, 'Apni location bhejo 📍\nTaaki aas-paas ke sellers dhoond saku');
        return;
    }

    else if (msg.type === 'location' && userState?.step === 'buyer_loc') {
        const { category, subcategory } = userState;
        const { latitude, longitude } = msg.location;

        const { data: sellers, error } = await supabase.from('sellers').select('*')
          .eq('category', category).eq('subcategory', subcategory);

        if (error ||!sellers?.length) {
            await client.sendMessage(msg.from, `Aas-paas koi ${subcategory} nahi mila 😔`);
            return delete userStates[msg.from];
        }

        const nearby = sellers.filter(s => getDistance(latitude, longitude, s.latitude, s.longitude) <= 5);
        if (!nearby.length) {
            await client.sendMessage(msg.from, '5km ke andar koi nahi mila 😔');
            return delete userStates[msg.from];
        }

        let reply = `Aapke aas-paas ke ${subcategory}:\n\n`;
        nearby.slice(0, 5).forEach((s, i) => {
            const dist = getDistance(latitude, longitude, s.latitude, s.longitude).toFixed(1);
            reply += `${i+1}. ${s.name}\n📞 ${s.phone}\n📍 ${dist}km door\n\n`;
        });
        await client.sendMessage(msg.from, reply);
        delete userStates[msg.from];
        return;
    }
});

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

client.initialize();
