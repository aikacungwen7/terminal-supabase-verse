
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('ind');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [activeTab, setActiveTab] = useState('url');
  
  const languages = [
    { value: 'ind', label: 'Indonesia' },
    { value: 'eng', label: 'English' },
    { value: 'jpn', label: 'Japanese' },
    { value: 'kor', label: 'Korean' },
    { value: 'chi_sim', label: 'Chinese (Simplified)' },
    { value: 'chi_tra', label: 'Chinese (Traditional)' }
  ];

  const handleProcess = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "URL tidak boleh kosong",
        variant: "destructive"
      });
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
      
      toast({
        title: "Sukses",
        description: "Subtitle berhasil dideteksi",
      });
    } catch (error) {
      console.error("OCR error:", error);
      toast({
        title: "Gagal Memproses",
        description: error.message || "Tidak dapat memproses OCR. Coba lagi dengan gambar yang berbeda.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast({
        title: "Tersalin",
        description: "Subtitle berhasil disalin ke clipboard"
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">OCR Subtitle Extractor</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ekstrak subtitle dari frame video atau gambar dengan teknologi OCR
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL Gambar</TabsTrigger>
            <TabsTrigger value="about">Tentang</TabsTrigger>
          </TabsList>
          
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
                  onClick={handleProcess}
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
          </TabsContent>
          
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>Tentang OCR Subtitle Extractor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  OCR Subtitle Extractor adalah aplikasi yang memungkinkan Anda mengekstrak teks subtitle dari frame video atau gambar menggunakan teknologi OCR (Optical Character Recognition).
                </p>
                <h3 className="text-lg font-medium">Cara Penggunaan</h3>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Ambil tangkapan layar (screenshot) dari video yang memiliki subtitle</li>
                  <li>Upload gambar ke layanan hosting atau gunakan URL gambar langsung</li>
                  <li>Masukkan URL gambar ke dalam form di atas</li>
                  <li>Pilih bahasa subtitle yang sesuai</li>
                  <li>Klik "Proses OCR" dan tunggu hasilnya</li>
                </ol>
                <h3 className="text-lg font-medium">Tips untuk Hasil Terbaik</h3>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Gunakan gambar dengan resolusi tinggi</li>
                  <li>Pastikan subtitle terlihat jelas dengan kontras yang baik</li>
                  <li>Pilih frame tanpa banyak interferensi visual di sekitar subtitle</li>
                  <li>Pilih bahasa yang tepat untuk meningkatkan akurasi</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
