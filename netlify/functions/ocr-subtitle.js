
// OCR Subtitle extraction function using Tesseract.js
const fetch = require('node-fetch');
const { createWorker } = require('tesseract.js');

exports.handler = async function(event, context) {
  try {
    // Ensure request is POST method
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      };
    }

    // Get video/image URL from request body
    const { url, language } = JSON.parse(event.body || '{}');
    
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "URL tidak ada. Silahkan masukkan URL gambar atau video." })
      };
    }

    console.log(`Processing OCR on ${url} with language: ${language || 'ind'}`);
    
    let imageUrl = url;
    
    // If video URL, we need to get screenshot first
    // This is a simplified approach - in production you'd use video frame extraction
    if (url.match(/\.(mp4|webm|mov|avi)$/i)) {
      // For demo, we'll assume URL is direct to an image frame with subtitles
      console.log("Video URL detected. In production, this would extract a frame.");
      // Here you would implement video frame extraction
    }
    
    // Perform OCR using Tesseract.js
    try {
      // Download the image first
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.buffer();
      
      // Initialize Tesseract worker
      const worker = await createWorker();
      
      // Set language - default to Indonesian if not specified
      const langCode = language || 'ind';
      await worker.loadLanguage(langCode);
      await worker.initialize(langCode);
      
      // Optimize for subtitle text
      await worker.setParameters({
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?!\'"-:;()[] ',
        tessjs_create_pdf: '0',
        tessjs_create_hocr: '0',
      });
      
      // Recognize text from image
      const { data } = await worker.recognize(imageBuffer);
      await worker.terminate();
      
      // Process the text - clean up common OCR issues for subtitles
      let subtitleText = data.text
        .replace(/\s+/g, ' ')           // Remove excess whitespace
        .replace(/([.?!])\s*(?=[A-Z])/g, '$1\n') // Add newlines after sentences
        .trim();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          detected_text: subtitleText,
          confidence: data.confidence,
          language: langCode,
          source_url: url
        })
      };
    } catch (ocrError) {
      console.error("OCR processing error:", ocrError);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: "OCR processing failed", 
          details: ocrError.message,
          suggestion: "Coba gunakan gambar dengan resolusi lebih tinggi atau pastikan subtitle terlihat jelas."
        })
      };
    }
  } catch (error) {
    console.error("Server error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error: " + error.message })
    };
  }
};
