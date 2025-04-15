
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Image } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Index = () => {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('ind');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [activeTab, setActiveTab] = useState('file');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileType, setFileType] = useState<'video' | 'image' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const languages = [
    { value: 'ind', label: 'Indonesia' },
    { value: 'eng', label: 'English' },
    { value: 'jpn', label: 'Japanese' },
    { value: 'kor', label: 'Korean' },
    { value: 'chi_sim', label: 'Chinese (Simplified)' },
    { value: 'chi_tra', label: 'Chinese (Traditional)' }
  ];

  const handleProcessUrl = async () => {
    if (!url) {
      toast.error("URL tidak boleh kosong");
      return;
    }

    setIsProcessing(true);
    setResult('');
    setConfidence(0);

    try {
      const response = await fetch('/api/ocr-subtitle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url,
          language: language 
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setResult(data.detected_text);
      setConfidence(data.confidence || 0);
      
      toast.success("Subtitle berhasil dideteksi");
    } catch (error) {
      console.error("OCR error:", error);
      toast.error(error.message || "Tidak dapat memproses OCR. Coba lagi dengan gambar yang berbeda.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'mp4' || fileExt === 'webm' || fileExt === 'mov' || fileExt === 'avi') {
      setFileType('video');
    } else if (fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png' || fileExt === 'gif') {
      setFileType('image');
    } else {
      toast.error("Format file tidak didukung. Gunakan video (mp4, webm, mov, avi) atau gambar (jpg, png)");
      return;
    }

    handleUploadFile(file);
  };

  const handleUploadFile = async (file: File) => {
    setIsProcessing(true);
    setResult('');
    setConfidence(0);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            setResult(data.detected_text);
            setConfidence(data.confidence || 0);
            toast.success("Subtitle berhasil dideteksi");
          } else {
            console.error("Error response:", xhr.responseText);
            let errorMsg = "Gagal memproses file";
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMsg = errorData.error || errorMsg;
            } catch (e) {}
            toast.error(errorMsg);
          }
          setIsProcessing(false);
          setUploadProgress(0);
        }
      };
      
      xhr.open('POST', '/api/ocr-subtitle', true);
      xhr.send(formData);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload file");
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success("Subtitle berhasil disalin ke clipboard");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">OCR Subtitle Extractor</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ekstrak subtitle dari video atau gambar dengan teknologi OCR
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="url">URL Gambar</TabsTrigger>
            <TabsTrigger value="about">Tentang</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file">
            <Card>
              <CardHeader>
                <CardTitle>Upload Video atau Gambar</CardTitle>
                <CardDescription>
                  Upload file video atau gambar untuk ekstrak subtitle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="video/mp4,video/webm,video/mov,video/avi,image/jpeg,image/png,image/gif"
                    className="hidden"
                  />
                  <Button 
                    onClick={handleButtonClick} 
                    className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    variant="outline"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                    ) : fileType === 'video' ? (
                      <video className="h-16 w-16 mb-2" />
                    ) : fileType === 'image' ? (
                      <Image className="h-10 w-10 mb-2" />
                    ) : (
                      <Upload className="h-10 w-10 mb-2" />
                    )}
                    <span>
                      {isProcessing 
                        ? "Memproses..." 
                        : fileType 
                          ? `File ${fileType} terpilih` 
                          : "Klik untuk pilih file video atau gambar"}
                    </span>
                  </Button>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="language" className="text-sm font-medium">
                    Bahasa Subtitle
                  </label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bahasa" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="url">
            <Card>
              <CardHeader>
                <CardTitle>Ekstrak Subtitle dari Gambar</CardTitle>
                <CardDescription>
                  Masukkan URL gambar yang memiliki subtitle dan pilih bahasa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="image-url" className="text-sm font-medium">
                    URL Gambar
                  </label>
                  <Input
                    id="image-url"
                    placeholder="https://example.com/image-with-subtitles.jpg"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Gunakan URL langsung ke gambar frame video dengan subtitle
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="language" className="text-sm font-medium">
                    Bahasa Subtitle
                  </label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bahasa" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleProcessUrl}
                  disabled={isProcessing || !url}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : "Proses OCR"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>Tentang OCR Subtitle Extractor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  OCR Subtitle Extractor adalah aplikasi yang memungkinkan Anda mengekstrak teks subtitle dari video atau gambar menggunakan teknologi OCR (Optical Character Recognition).
                </p>
                <h3 className="text-lg font-medium">Cara Penggunaan</h3>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Upload file video atau gambar yang memiliki subtitle</li>
                  <li>Atau masukkan URL gambar dengan subtitle</li>
                  <li>Pilih bahasa subtitle yang sesuai</li>
                  <li>Tunggu proses OCR selesai</li>
                  <li>Salin hasil subtitle ke clipboard jika diperlukan</li>
                </ol>
                <h3 className="text-lg font-medium">Tips untuk Hasil Terbaik</h3>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Gunakan video atau gambar dengan resolusi tinggi</li>
                  <li>Pastikan subtitle terlihat jelas dengan kontras yang baik</li>
                  <li>Untuk video, aplikasi akan mengekstrak frame yang memiliki subtitle</li>
                  <li>Pilih bahasa yang tepat untuk meningkatkan akurasi</li>
                  <li>Jika hasil tidak akurat, coba gunakan gambar frame berbeda</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {(result || isProcessing) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Hasil OCR</span>
                {confidence > 0 && (
                  <span className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">
                    Confidence: {confidence.toFixed(1)}%
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={10}
                  className="font-mono"
                />
              )}
            </CardContent>
            {result && (
              <CardFooter>
                <Button onClick={handleCopy} className="ml-auto">
                  Salin ke Clipboard
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
