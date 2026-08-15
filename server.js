require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY;

// Check if credentials are set
if (!supabaseUrl || supabaseUrl === 'xxxxxxxx' || !supabaseKey || supabaseKey === 'sxxxxxxxx' || supabaseKey === 'xxxxxxxx') {
  console.warn('⚠️ Warning: Supabase credentials are not configured in your .env file!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint for receiving temperature data from ESP32
app.post('/api/temp', async (req, res) => {
  const { temperature } = req.body;

  if (temperature === undefined) {
    return res.status(400).json({ error: 'Please provide a temperature value' });
  }

  // Insert temperature data into the 'sensor_logs' table in Supabase
  const { data, error } = await supabase
    .from('sensor_logs')
    .insert([
      { temperature: temperature }
    ])
    .select();

  // Check for any errors from Supabase
  if (error) {
    console.error('❌ Failed to save data to Supabase:', error.message);
    return res.status(500).json({ error: 'Database server error' });
  }
  
  console.log(`📥 Received and saved temperature to Cloud: ${temperature} °C`);
  res.status(201).json({ 
    message: 'Temperature successfully saved to Supabase!', 
    data: data 
  });
});

// Endpoint for reading temperature history from Supabase
app.get('/api/temp', async (req, res) => {
  try {
    let query = supabase.from('sensor_logs').select('*');

    // If a limit query param is provided (and not 'all'), fetch the newest 'limit' records
    if (req.query.limit && req.query.limit !== 'all') {
      const limit = parseInt(req.query.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return res.status(200).json({ data: data.reverse() });
      }
    }

    // Otherwise, bring all data ordered chronologically
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    res.status(200).json({ data: data });
  } catch (error) {
    console.error('❌ Failed to read data from Supabase:', error.message);
    res.status(500).json({ error: 'Database server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server API (Supabase version) running at http://localhost:${port}`);
});