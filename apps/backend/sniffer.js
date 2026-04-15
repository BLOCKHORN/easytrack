const puppeteer = require('puppeteer');

const TARGET = 'inpost';

const URLS = {
  inpost: 'https://www.inpost.es/buscar-el-punto-pack-mas-cercano/',
  gls: 'https://gls-spain.es/es/ayuda/buscador-puntos-parcelshop/',
  dhl: 'https://www.dhl.com/es-es/home/nuestras-divisiones/paqueteria/clientes-particulares/puntos-de-entrega.html',
  nacex: 'https://www.nacex.com/puntos-nacex-shop',
  mrw: 'https://www.mrw.es/oficina-transporte-urgente/mrw-buscador-oficinas/',
  celeritas: 'https://celeritastransporte.com/puntos-punto-y-pack/',
  correos: 'https://www.correosexpress.com/web/correosexpress/oficinas',
  ups: 'https://www.ups.com/dropoff?loc=es_ES'
};

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'] 
  }); 
  const page = await browser.newPage();

  page.on('response', async (response) => {
    const request = response.request();
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      const url = response.url();
      if (url.includes('google') || url.includes('facebook') || url.includes('metrics')) return;

      try {
        const json = await response.json();
        const dump = JSON.stringify(json).toLowerCase();
        
        if ((dump.includes('lat') && (dump.includes('lon') || dump.includes('lng'))) || dump.includes('pudo') || dump.includes('points') || dump.includes('parcel')) {
            console.log(`\nAPI DETECTADA: ${TARGET.toUpperCase()}`);
            console.log("=================================================");
            console.log("URL:", url);
            console.log("METODO:", request.method());
            
            const postData = request.postData();
            if (postData) console.log("PAYLOAD:", postData);
            
            console.log("\nJSON:");
            console.log(JSON.stringify(json, null, 2).substring(0, 1000));
            console.log("=================================================\n");
        }
      } catch(e) {}
    }
  });

  const url = URLS[TARGET];
  if (!url) {
    await browser.close();
    return;
  }

  await page.goto(url, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 120000)); 
  await browser.close();
})();