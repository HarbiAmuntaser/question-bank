// src/components/public/quiz/result/result-print-styles.tsx
"use client";

export function ResultPrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        header,
        nav,
        .no-print {
          display: none !important;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .shadow-lg,
        .shadow-md,
        .shadow-sm {
          box-shadow: none !important;
        }
        .container {
          max-width: 100% !important;
        }
      }
    `}</style>
  );
}
