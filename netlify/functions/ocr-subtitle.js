
// OCR Subtitle extraction function using Tesseract.js
const fetch = require('node-fetch');
const { createWorker } = require('tesseract.js');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Convert fs.readFile to Promise-based
const readFile = util.promisify(fs.readFile);

// Function to handle multipart form data
const parseMultipartForm = (event) => {
  return new Promise((resolve, reject) => {
    // Create a temporary directory for uploaded files
    const tmpDir = path.join('/tmp', 'uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const form = formidable({
      multiples: false,
      uploadDir: tmpDir,
      keepExtensions: true,
    });

    form.parse(event, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

exports.handler = async function(event, context) {
  try {
    // Determine request type (JSON or form data)
    const isFormData = event.headers['content-type']?.includes('multipart/form-data');
    
    let url, language, imageBuffer;
    
    if (isFormData) {
      // Handle file upload
      try {
        const { fields, files } = await parseMultipartForm(event);
        language = fields.language || 'ind';
        
        // Read the uploaded file
        const file = files.file;
        
        if (!file) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: "File tidak ditemukan. Silahkan upload file gambar atau video." })
          };
        }

        // For now, we're handling the file as an image directly
        // In a production app, you'd process video files to extract frames with subtitles
        imageBuffer = await readFile(file.filepath);
        
        // Clean up temporary file
        fs.unlinkSync(file.filepath);
      } catch (formError) {
        console.error("Form processing error:", formError);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Gagal memproses file upload: " + formError.message })
        };
      }
    } else {
      // Handle JSON request with URL
      if (event.httpMethod !== "POST") {
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method Not Allowed" })
        };
      }

      // Get video/image URL from request body
      const requestBody = JSON.parse(event.body || '{}');
      url = requestBody.url;
      language = requestBody.language || 'ind';
      
      if (!url) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "URL tidak ada. Silahkan masukkan URL gambar atau video." })
        };
      }

      console.log(`Processing OCR on ${url} with language: ${language || 'ind'}`);
      
      // Download the image
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      imageBuffer = await imageResponse.buffer();
    }
    
    // Process using Tesseract
    try {      
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
          source_url: url || "uploaded_file"
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
