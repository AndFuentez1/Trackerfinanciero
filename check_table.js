
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    // Try to select from pending_invoices
    const { data, error } = await supabase
        .from('pending_invoices')
        .select('count', { count: 'exact', head: true });

    if (error) {
        if (error.code === '42P01') { // undefined_table
            console.log('Table pending_invoices does NOT exist.');
        } else {
            console.error('Error checking table:', error);
        }
    } else {
        console.log('Table pending_invoices EXISTS.');
    }
}

checkTable();
