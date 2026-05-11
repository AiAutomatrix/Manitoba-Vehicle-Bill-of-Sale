/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';
import { RadioGroup, RadioGroupItem } from './components/ui/radio-group';
import { Textarea } from './components/ui/textarea';
import { SignaturePad } from './components/SignaturePad';
import { PdfTemplate } from './components/PdfTemplate';
import { extractVehicleInfo } from './services/ai';
import { Upload, FileText, Loader2, Download, Mail } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [loading, setLoading] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sellerName: '',
    price: '',
    buyerName: '',
    year: '',
    make: '',
    model: '',
    vin: '',
    mileage: '',
    conditionType: 'asis', // 'asis' or 'custom'
    customConditions: '',
    sellerSignature: null as string | null,
    buyerSignature: null as string | null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConditionChange = (value: string) => {
    setFormData((prev) => ({ ...prev, conditionType: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // remove data:image/...;base64,
        const base64Data = base64String.split(',')[1];
        
        const extracted = await extractVehicleInfo(base64Data, file.type);
        if (extracted) {
          setFormData((prev) => ({
            ...prev,
            year: extracted.year || prev.year,
            make: extracted.make || prev.make,
            model: extracted.model || prev.model,
            vin: extracted.vin || prev.vin,
            mileage: extracted.mileage || prev.mileage,
          }));
          toast.success('Successfully extracted vehicle information!');
        } else {
          toast.error('Could not extract information from the image.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during extraction.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    
    // Make template visible momentarily but offscreen
    const el = pdfRef.current;
    
    try {
      const imgData = await htmlToImage.toJpeg(el, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (el.offsetHeight * pdfWidth) / el.offsetWidth;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      return pdf;
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
      return null;
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    toast.info('Generating PDF...');
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save(`bill-of-sale-${formData.vin || 'vehicle'}.pdf`);
      toast.success('PDF Downloaded successfully!');
    }
    setLoading(false);
  };

  const handleEmail = async () => {
    setLoading(true);
    toast.info('Generating PDF...');
    const pdf = await generatePDF();
    if (pdf) {
      toast.success('File generated.');
      alert('File generated. To email, please download the PDF and attach it to your email client.');
    }
    setLoading(false);
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* Header Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">MB</div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 hidden sm:block">Manitoba Bill of Sale Assistant</h1>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:hidden">MB Bill of Sale</h1>
        </div>
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span> Vehicle Data
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 opacity-40">
            <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs">2</span> Signatures
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 opacity-40">
            <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs">3</span> Finalize
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden flex-col md:flex-row relative">
        {/* Left Pane: Input Form */}
        <div className="w-full md:w-[480px] lg:w-[500px] xl:w-[600px] border-r border-slate-200 bg-white p-6 md:p-8 overflow-y-auto flex flex-col gap-8 pb-32">
          
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Smart Vehicle Entry</h2>
            <div 
              onClick={() => !loading && fileInputRef.current?.click()} 
              className={`border-2 border-dashed ${loading ? 'border-slate-300 bg-slate-50' : 'border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer'} rounded-xl p-6 text-center transition-colors group relative`}
            >
              <div className="w-12 h-12 bg-white rounded-full shadow-sm mx-auto mb-3 flex items-center justify-center group-hover:scale-105 transition-transform">
                {loading ? <Loader2 className="w-6 h-6 text-slate-400 animate-spin" /> : <Upload className="w-6 h-6 text-blue-600" />}
              </div>
              <p className="text-sm font-semibold text-blue-900">{loading ? 'Extracting details...' : 'Upload Vehicle Registration'}</p>
              <p className="text-xs text-blue-700 mt-1">AI will extract VIN, Year, Make, and Model</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
                disabled={loading}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Sale Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Date of Sale</label>
                <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="w-full h-10 px-3 bg-white border border-slate-300 rounded text-sm focus-visible:ring-blue-500" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Sale Price (CAD)</label>
                <Input id="price" name="price" placeholder="e.g. 12500" value={formData.price} onChange={handleInputChange} className="w-full h-10 px-3 bg-white border border-slate-300 rounded text-sm focus-visible:ring-blue-500" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Vehicle Information</h2>
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                 <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">VIN Number</label>
                 <Input id="vin" name="vin" placeholder="17-character VIN" value={formData.vin} onChange={handleInputChange} className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded text-sm font-mono focus-visible:ring-blue-500" />
               </div>
               <div>
                 <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Year</label>
                 <Input id="year" name="year" placeholder="yyyy" value={formData.year} onChange={handleInputChange} className="w-full h-10 px-3 border border-slate-300 rounded text-sm focus-visible:ring-blue-500" />
               </div>
               <div>
                 <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Mileage (KM)</label>
                 <Input id="mileage" name="mileage" placeholder="e.g. 142000" value={formData.mileage} onChange={handleInputChange} className="w-full h-10 px-3 border border-slate-300 rounded text-sm focus-visible:ring-blue-500" />
               </div>
               <div>
                 <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Make</label>
                 <Input id="make" name="make" placeholder="e.g. Honda" value={formData.make} onChange={handleInputChange} className="w-full h-10 px-3 border border-slate-300 rounded text-sm focus-visible:ring-blue-500" />
               </div>
               <div>
                 <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Model</label>
                 <Input id="model" name="model" placeholder="e.g. Civic" value={formData.model} onChange={handleInputChange} className="w-full h-10 px-3 border border-slate-300 rounded text-sm focus-visible:ring-blue-500" />
               </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Party Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Seller</h3>
                <Input id="sellerName" name="sellerName" placeholder="Full Legal Name" value={formData.sellerName} onChange={handleInputChange} className="w-full h-10 px-3 border border-slate-300 rounded text-sm font-medium focus-visible:ring-blue-500" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Buyer</h3>
                <Input id="buyerName" name="buyerName" placeholder="Full Legal Name" value={formData.buyerName} onChange={handleInputChange} className="w-full h-10 px-3 border border-slate-300 rounded text-sm font-medium focus-visible:ring-blue-500" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Conditions / Warranties</h2>
            <RadioGroup value={formData.conditionType} onValueChange={handleConditionChange} className="space-y-3">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="asis" id="asis" className="mt-1" />
                <Label htmlFor="asis" className="leading-snug cursor-pointer font-normal text-sm text-slate-700">
                  Sold in <strong>"as is"</strong> condition with no guarantees or warranties.
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="custom" id="custom" className="mt-1" />
                <Label htmlFor="custom" className="leading-snug cursor-pointer font-normal text-sm text-slate-700">
                  Sold with specific <strong>conditions/guarantees/warranties</strong>.
                </Label>
              </div>
            </RadioGroup>
            {formData.conditionType === 'custom' && (
              <div className="pt-2 pl-7">
                <Textarea 
                  name="customConditions" 
                  placeholder="Enter explicit conditions..." 
                  value={formData.customConditions}
                  onChange={handleInputChange}
                  className="min-h-[100px] bg-white border-slate-300 focus-visible:ring-blue-500"
                />
              </div>
            )}
          </section>

          <section className="space-y-4 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Signatures</h2>
            <div className="grid grid-cols-1 gap-6">
              <SignaturePad 
                label="Seller's Signature" 
                onEnd={(data) => setFormData(prev => ({ ...prev, sellerSignature: data }))} 
              />
              <SignaturePad 
                label="Buyer's Signature" 
                onEnd={(data) => setFormData(prev => ({ ...prev, buyerSignature: data }))} 
              />
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mt-2">All parties must sign.</p>
          </section>

        </div>

        {/* Right Pane: Document Preview */}
        <div className="hidden md:flex flex-1 bg-slate-100 p-4 lg:p-10 justify-center items-start overflow-y-auto w-full relative h-full">
          <div className="origin-top relative shadow-2xl rounded-sm overflow-hidden border border-slate-200 bg-white" style={{ transform: 'scale(0.8)', marginBottom: '80px' }}>
            <div className="pointer-events-none select-none">
              <PdfTemplate data={formData} isPreview={true} />
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Controls */}
      <footer className="h-16 bg-white border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 z-20 absolute bottom-0 left-0 w-[100%] md:w-[480px] lg:w-[500px] xl:w-[600px]">
        <div className="text-xs text-slate-500 hidden sm:block">
          Saved locally <span className="font-medium">• Ready to export</span>
        </div>
        <div className="flex gap-4 w-full sm:w-auto justify-end sm:justify-between">
          <button onClick={handleEmail} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-transparent transition-colors flex items-center justify-center flex-1 sm:flex-none">
            <Mail className="w-4 h-4 mr-2" /> Email Draft
          </button>
          <button onClick={handleDownload} disabled={loading} className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </footer>

      {/* Hidden PDF template for direct html-to-image export */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, opacity: 0.001, pointerEvents: 'none' }}>
        <PdfTemplate ref={pdfRef} data={formData} />
      </div>
    </div>
  );
}

