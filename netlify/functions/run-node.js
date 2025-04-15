
// Fungsi Netlify untuk menjalankan kode Node.js
exports.handler = async function(event, context) {
  try {
    // Memastikan request adalah POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    // Mendapatkan kode dari body request
    const { code } = JSON.parse(event.body || '{}');
    
    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No code provided" })
      };
    }

    // Menjalankan kode dengan Function constructor
    // Catatan: Ini memiliki batasan keamanan
    let result;
    let output = [];
    
    // Meng-override console.log untuk menangkap output
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      output.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '));
    };
    
    try {
      // Menjalankan kode dengan timeout 5 detik untuk keamanan
      const asyncFunction = new Function('return (async () => { ' + code + ' })()');
      result = await Promise.race([
        asyncFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timed out')), 5000)
        )
      ]);
    } catch (error) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          error: error.message,
          output: output.join('\n')
        })
      };
    } finally {
      // Mengembalikan console.log ke fungsi asli
      console.log = originalConsoleLog;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        result: result !== undefined ? String(result) : undefined,
        output: output.join('\n')
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error: " + error.message })
    };
  }
};
