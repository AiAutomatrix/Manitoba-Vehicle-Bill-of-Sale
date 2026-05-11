/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
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

import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { signIn, signOut, useAuth, db, handleFirestoreError, OperationType } from './services/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, arrayUnion, collection } from 'firebase/firestore';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-4">MB</div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-center">Manitoba Bill of Sale Assistant</h1>
        <p className="text-slate-600 mb-4 text-center max-w-sm">Sign in to create, edit, and share your vehicle bill of sale securely.</p>
        <Button onClick={() => signIn().catch((e) => toast.error(e.message))} className="bg-blue-600 hover:bg-blue-700">
          Sign In with Google
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthWrapper>
      <Routes>
        <Route path="/" element={<BillOfSaleEditor />} />
        <Route path="/:id" element={<BillOfSaleEditor />} />
      </Routes>
    </AuthWrapper>
  );
}

const defaultFormData = {
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
};

function BillOfSaleEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (!id || !user) {
      if (!id) {
        setFormData({ ...defaultFormData });
        setIsLoaded(true); // New document
      }
      return;
    }
    
    const docRef = doc(db, 'billsOfSale', id);
    let unsubscribe = () => {};

    const joinAndWatch = async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (!data.participants.includes(user.uid)) {
            if (data.participants.length < 2) {
              await updateDoc(docRef, {
                participants: arrayUnion(user.uid),
                updatedAt: serverTimestamp()
              });
              toast.success('Joined document successfully');
            } else {
              toast.error('This document already has 2 participants and is full.');
              navigate('/');
              return;
            }
          }
        } else {
          toast.error('Document not found');
          navigate('/');
          return;
        }

        // Watch for real-time updates
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const serverData = docSnap.data();
            setFormData(prev => ({
              ...prev,
              date: serverData.date ?? prev.date,
              sellerName: serverData.sellerName ?? prev.sellerName,
              price: serverData.price ?? prev.price,
              buyerName: serverData.buyerName ?? prev.buyerName,
              year: serverData.year ?? prev.year,
              make: serverData.make ?? prev.make,
              model: serverData.model ?? prev.model,
              vin: serverData.vin ?? prev.vin,
              mileage: serverData.mileage ?? prev.mileage,
              conditionType: serverData.conditionType ?? prev.conditionType,
              customConditions: serverData.customConditions ?? prev.customConditions,
              sellerSignature: serverData.sellerSignature ?? prev.sellerSignature,
              buyerSignature: serverData.buyerSignature ?? prev.buyerSignature,
            }));
            setIsLoaded(true);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `billsOfSale/${id}`);
        });

      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `billsOfSale/${id}`);
      }
    };

    joinAndWatch();

    return () => unsubscribe();
  }, [id, user, navigate]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!user || !id || !isLoaded) return;
    
    const timeout = setTimeout(async () => {
      try {
        const docRef = doc(db, 'billsOfSale', id);
        await updateDoc(docRef, {
          ...formData, // Note we overwrite all fields
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        // Silently let it fail or log
        console.error('Auto-save error', e);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [formData, id, user, isLoaded]);

  const handleCreateDocument = async () => {
    if (!user) return null;
    try {
      const newRef = doc(collection(db, 'billsOfSale'));
      await setDoc(newRef, {
        ...formData,
        participants: [user.uid],
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate(`/${newRef.id}`);
      return newRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'billsOfSale');
      toast.error('Failed to create document');
      return null;
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      let docId = id;
      if (!docId) {
        docId = await handleCreateDocument();
        if (docId) toast.success('Draft saved to cloud.');
      } else {
        const docRef = doc(db, 'billsOfSale', docId);
        await updateDoc(docRef, { ...formData, updatedAt: serverTimestamp() });
        toast.success('Draft updated in cloud.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

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

  const handleSaveAndEmail = async () => {
    setLoading(true);
    toast.info('Preparing to share...');
    try {
      let docId = id;
      if (!docId) {
        docId = await handleCreateDocument();
      } else {
        // Force save current data
        const docRef = doc(db, 'billsOfSale', docId);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      }

      if (docId) {
        const shareLink = `https://manitoba-vehicle-bill-of-sale.vercel.app/${docId}`;
        const subject = encodeURIComponent('Manitoba Vehicle Bill of Sale - Please Review and Sign');
        const body = encodeURIComponent(`I've started a bill of sale for our vehicle transaction. Please tap the link below on your device to open it, review the details, and add your signature.\n\n${shareLink}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        toast.success('Email opened to share link.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to prepare document for sharing.');
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center gap-4">
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
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>New Bill of Sale</Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>Sign Out</Button>
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
                initialSignature={formData.sellerSignature}
                onEnd={(data) => setFormData(prev => ({ ...prev, sellerSignature: data }))} 
              />
              <SignaturePad 
                label="Buyer's Signature" 
                initialSignature={formData.buyerSignature}
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
          Saved automatically to Cloud <span className="font-medium">• Ready to share</span>
        </div>
        <div className="flex gap-4 w-full sm:w-auto justify-end sm:justify-between flex-wrap">
          <button onClick={handleSaveDraft} disabled={loading || saving} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors flex items-center justify-center flex-1 sm:flex-none">
             Save Draft
          </button>
          <button onClick={handleSaveAndEmail} disabled={loading || saving} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-transparent transition-colors flex items-center justify-center flex-1 sm:flex-none">
            <Mail className="w-4 h-4 mr-2" /> Share Link
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

