import React from 'react';

interface PdfTemplateProps {
  data: any;
  isPreview?: boolean;
}

export const PdfTemplate = React.forwardRef<HTMLDivElement, PdfTemplateProps>(({ data, isPreview }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: '816px', // 8.5 inches * 96 DPI
        minHeight: '1056px', // 11 inches * 96 DPI
        padding: '48px',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'serif',
        position: 'relative',
        boxSizing: 'border-box'
      }}
      className="pdf-template"
    >
      <div style={{ fontStyle: 'italic', marginBottom: '24px', fontSize: '14px', lineHeight: '1.5' }}>
        The following form fulfills the basic, mandatory requirements of a bill of sale. If the buyer and seller wish to add any additional clauses or special conditions, it can be done at the discretion of both parties involved. The buyer and seller should both retain a copy for their records.
      </div>

      <h1 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '24px' }}>Bill of Sale</h1>

      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <span>Date:</span>
        <div style={{ borderBottom: '1px solid black', width: '200px', paddingBottom: '2px' }}>{data.date}</div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '16px' }}>
          <span>I, the undersigned seller, [print full legal name or names]</span>
          <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.sellerName}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '16px' }}>
          <span>for the sum of $</span>
          <div style={{ borderBottom: '1px solid black', width: '200px', paddingBottom: '2px' }}>{data.price}</div>
          <span>,</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '24px' }}>
          <span>sell to the undersigned buyer, [print full legal name or names]</span>
          <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.buyerName}</div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '16px' }}>the following vehicle:</p>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flex: 1 }}>
            <span style={{ fontWeight: 'bold' }}>Year</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.year}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flex: 1 }}>
            <span style={{ fontWeight: 'bold' }}>Make</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.make}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flex: 1 }}>
            <span style={{ fontWeight: 'bold' }}>Model</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.model}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flex: 2 }}>
            <span style={{ fontWeight: 'bold' }}>VIN</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.vin}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flex: 1 }}>
            <span style={{ fontWeight: 'bold' }}>Mileage (KM)</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, paddingBottom: '2px' }}>{data.mileage}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ marginBottom: '16px' }}>Please check the applicable statement:</p>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {data.conditionType === 'asis' && 'X'}
          </div>
          <p>
            The undersigned <span style={{ fontWeight: 'bold' }}>buyer(s)</span> accepts receipt of this Bill of Sale and understands that the above vehicle is sold in "as is" condition with no guarantees or warranties, either expressed or implied, for the vehicle.
          </p>
        </div>
        
        <p style={{ marginBottom: '16px', marginLeft: '48px' }}>OR</p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {data.conditionType === 'custom' && 'X'}
          </div>
          <p>
            The undersigned <span style={{ fontWeight: 'bold' }}>buyer(s)</span> accepts receipt of this Bill of Sale and the <span style={{ fontWeight: 'bold' }}>buyer</span> and <span style={{ fontWeight: 'bold' }}>seller</span> expressly agree that the vehicle is sold with the following conditions/guarantees/warranties (please attach additional information as required):
          </p>
        </div>
        <div style={{ marginLeft: '48px', borderBottom: '1px solid black', minHeight: '24px', paddingBottom: '2px', whiteSpace: 'pre-wrap' }}>
          {data.conditionType === 'custom' ? data.customConditions : ''}
        </div>
      </div>

      <p style={{ marginBottom: '32px' }}>
        The undersigned seller affirms that the above information about this vehicle is accurate to the best of his/her knowledge.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, paddingRight: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '24px', minHeight: '60px' }}>
            <span>Seller's signature(s)</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, position: 'relative', height: '60px' }}>
              {data.sellerSignature && <img src={data.sellerSignature} style={{ position: 'absolute', bottom: 0, left: 0, maxHeight: '60px', maxWidth: '100%' }} />}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', minHeight: '60px' }}>
            <span>Buyer's signature(s)</span>
            <div style={{ borderBottom: '1px solid black', flex: 1, position: 'relative', height: '60px' }}>
              {data.buyerSignature && <img src={data.buyerSignature} style={{ position: 'absolute', bottom: 0, left: 0, maxHeight: '60px', maxWidth: '100%' }} />}
            </div>
          </div>
        </div>

        <div style={{ width: '250px', border: '1px solid black', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Important</div>
          <div>All sellers and buyers must sign the bill of sale to allow the new owner(s) to register the vehicle.</div>
        </div>
      </div>
    </div>
  );
});

PdfTemplate.displayName = 'PdfTemplate';
