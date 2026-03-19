import { createClient } from './src/utils/supabase/client';

async function checkSchema() {
  const supabase = createClient();
  
  console.log('Checking purchases table...');
  const { data: pData, error: pError } = await (supabase.from('purchases') as any).select('*').limit(1);
  if (pError) {
    console.error('Error selecting from purchases:', pError);
  } else {
    console.log('Purchases table exists and is accessible.');
  }

  console.log('Checking assets table...');
  const { data: aData, error: aError } = await (supabase.from('assets') as any).select('*').limit(1);
  if (aError) {
    console.error('Error selecting from assets:', aError);
  } else {
    console.log('Assets table exists and is accessible.');
  }
}

checkSchema();
