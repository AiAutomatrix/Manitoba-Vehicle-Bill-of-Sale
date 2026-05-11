import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './ui/button';

interface SignaturePadProps {
  onEnd: (dataUrl: string | null) => void;
  label: string;
  initialSignature?: string | null;
}

export function SignaturePad({ onEnd, label, initialSignature }: SignaturePadProps) {
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (initialSignature && sigPad.current && sigPad.current.isEmpty()) {
      sigPad.current.fromDataURL(initialSignature);
    }
  }, [initialSignature]);

  const clear = () => {
    sigPad.current?.clear();
    onEnd(null);
  };

  const handleEnd = () => {
    if (sigPad.current?.isEmpty()) {
      onEnd(null);
    } else {
      onEnd(sigPad.current?.getCanvas().toDataURL('image/png') || null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium">{label}</label>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>Clear</Button>
      </div>
      <div className="border rounded-md bg-white">
        <SignatureCanvas
          ref={sigPad}
          onEnd={handleEnd}
          penColor="black"
          canvasProps={{ className: 'w-full h-32 rounded-md' }}
        />
      </div>
    </div>
  );
}
