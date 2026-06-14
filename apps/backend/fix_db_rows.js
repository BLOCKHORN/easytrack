const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  console.log('Añadiendo columna rows a ubicaciones_meta...');
  
  // Supabase JS no tiene un método directo para ALTER TABLE.
  // Pero podemos intentar crearlo via una migración o simplemente 
  // rezar para que el usuario lo haga en el panel.
  // ESPERA, tengo el PAT del usuario! 
  
  const ref = 'isffcijmzmdzrnsubdeg'; // Proyecto LAB
  const url = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  const pat = 'sbp_v0_84d135b2e0c949053080733dd568ce61c385778a';

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: "ALTER TABLE ubicaciones_meta ADD COLUMN IF NOT EXISTS rows integer DEFAULT 5;"
    })
  });
  
  const result = await resp.json();
  console.log('Resultado:', result);
}

fix();
