
// Fungsi Netlify untuk OCR subtitle dari video
exports.handler = async function(event, context) {
  try {
    // Memastikan request adalah POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    // Mendapatkan URL video/gambar dari body request
    const { url, language } = JSON.parse(event.body || '{}');
    
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No URL provided" })
      };
    }

    // Simulasi OCR karena implementasi OCR yang sebenarnya 
    // akan memerlukan library tambahan seperti Tesseract.js
    // atau layanan OCR pihak ketiga seperti Google Cloud Vision
    console.log(`Attempting OCR on ${url} with language: ${language || 'eng'}`);
    
    // Demo response untuk simulasi
    let subtitleText;
    
    // Simulasi OCR proses sederhana untuk demo
    if (url.includes('example') || url.includes('demo')) {
      subtitleText = "Ini adalah teks subtitle yang terdeteksi.\nBaris kedua dari subtitle.\nTerimakasih telah menggunakan OCR.";
    } else {
      subtitleText = "Tidak dapat mendeteksi subtitle.\nPastikan URL video valid dan memiliki subtitle yang terlihat.";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        detected_text: subtitleText,
        language: language || 'eng',
        source_url: url,
        note: "Ini adalah simulasi OCR. Untuk implementasi nyata, perlu integrasi dengan API OCR."
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error: " + error.message })
    };
  }
};
