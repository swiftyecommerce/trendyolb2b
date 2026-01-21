import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://btmofcirhoremttsmawo.supabase.co';
const SUPABASE_KEY = 'sb_secret__no6391b4QREilyyU0OI2w_rUevkEd2';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log('Checking data for user: serhat...');

    const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('username', 'serhat');

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Data FOUND for serhat!');
        console.log('Updated At:', data[0].updated_at);
        console.log('Data Preview:', JSON.stringify(data[0].data).substring(0, 200) + '...');
    } else {
        console.log('❌ No data found for serhat.');
    }
}

checkData();
