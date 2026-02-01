// ============================================================
// Supabase Edge Function: process-invoice
// Path: supabase/functions/process-invoice/index.ts
// ============================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ---------------------------
// Helper Functions
// ---------------------------

// Document Classification
function classifyDocument(text: string) {
  const t = text.toLowerCase();

  if (t.includes("prescription") || t.includes("doctor"))
    return { doc_class: "prescription", confidence: 0.9 };

  if (t.includes("sick note") || t.includes("medical leave"))
    return { doc_class: "sick_note", confidence: 0.9 };

  if (t.includes("receipt") || t.includes("paid"))
    return { doc_class: "receipt", confidence: 0.85 };

  if (t.includes("offer") || t.includes("quotation"))
    return { doc_class: "offer", confidence: 0.8 };

  if (t.includes("invoice") || t.includes("vat"))
    return { doc_class: "invoice", confidence: 0.95 };

  return { doc_class: "other", confidence: 0.5 };
}

// Incoming vs Outgoing
function classifyDirection(text: string) {
  const t = text.toLowerCase();

  if (t.includes("bill to") || t.includes("customer"))
    return { direction: "outgoing", confidence: 0.75 };

  if (t.includes("supplier") || t.includes("payable"))
    return { direction: "incoming", confidence: 0.75 };

  return { direction: "unknown", confidence: 0.4 };
}

// VAT Compliance
function vatCompliance(total: number, tax: number) {
  const issues: any[] = [];
  let vat_rate = 0;

  if (total > 0 && tax > 0) {
    vat_rate = +(tax / total).toFixed(2);
  }

  if (vat_rate > 0.25) {
    issues.push({
      severity: "HIGH",
      message: "VAT rate unusually high",
    });
  }

  if (tax === 0) {
    issues.push({
      severity: "MEDIUM",
      message: "No VAT detected (check compliance)",
    });
  }

  return {
    vat_rate,
    vat_amount_computed: tax,
    compliance_issues: issues,
  };
}

// Fraud Score
function fraudDetection(total: number) {
  let score = 0;

  if (total > 10000) score += 0.5;
  if (total > 50000) score += 0.8;

  return {
    fraud_score: Math.min(score, 1.0),
    anomaly_flags: {
      high_amount: total > 10000,
    },
  };
}

// Approval Agent
function approvalAgent(fraud_score: number, compliance_issues: any[]) {
  if (fraud_score > 0.7) {
    return {
      approval: "FAIL",
      confidence: 0.9,
      reasons: ["Fraud score too high"],
      needs_info_fields: [],
    };
  }

  if (compliance_issues.length > 0) {
    return {
      approval: "NEEDS_INFO",
      confidence: 0.75,
      reasons: compliance_issues.map((i) => i.message),
      needs_info_fields: ["tax_amount"],
    };
  }

  return {
    approval: "PASS",
    confidence: 0.95,
    reasons: ["Invoice looks valid"],
    needs_info_fields: [],
  };
}

// ESG Mapping
function esgMapping(vendor: string) {
  if (vendor.toLowerCase().includes("energy")) {
    return { category: "High Emissions", co2e: 120 };
  }
  return { category: "General", co2e: 25 };
}

// QR Payment Payload
function generatePaymentQR(amount: number, invoice_number: string) {
  return {
    payload: {
      amount,
      reference: invoice_number,
      currency: "EUR",
    },
    qr_string: `PAYMENT|AMOUNT:${amount}|REF:${invoice_number}`,
  };
}

// ---------------------------
// MAIN FUNCTION
// ---------------------------

serve(async (req) => {
  try {
    const body = await req.json();

    // Input text from OCR (frontend sends)
    const text: string = body.text || "";
    const filename: string = body.filename || "unknown.pdf";

    // ---------------------------
    // Basic Extraction (Demo)
    // ---------------------------
    const vendor_name = "Demo Vendor GmbH";
    const invoice_number = "INV-2026-001";
    const invoice_date = "2026-02-01";

    const total_amount = 1200;
    const tax_amount = 228;

    // ---------------------------
    // Classification
    // ---------------------------
    const docResult = classifyDocument(text);
    const dirResult = classifyDirection(text);

    // ---------------------------
    // VAT Compliance
    // ---------------------------
    const vatResult = vatCompliance(total_amount, tax_amount);

    // ---------------------------
    // Fraud Detection
    // ---------------------------
    const fraudResult = fraudDetection(total_amount);

    // ---------------------------
    // Approval Agent
    // ---------------------------
    const approvalResult = approvalAgent(
      fraudResult.fraud_score,
      vatResult.compliance_issues,
    );

    // ---------------------------
    // ESG Mapping
    // ---------------------------
    const esgResult = esgMapping(vendor_name);

    // ---------------------------
    // Payment QR
    // ---------------------------
    const qrResult = generatePaymentQR(total_amount, invoice_number);

    // ---------------------------
    // Field Confidence (Demo)
    // ---------------------------
    const field_confidence = {
      vendor_name: 0.9,
      invoice_number: 0.85,
      invoice_date: 0.95,
      total_amount: 0.8,
      tax_amount: 0.75,
    };

    // ---------------------------
    // Response JSON
    // ---------------------------
    return new Response(
      JSON.stringify({
        vendor_name,
        invoice_number,
        invoice_date,
        total_amount,
        tax_amount,
        currency: "EUR",

        // Advanced AI Outputs
        doc_class: docResult.doc_class,
        doc_class_confidence: docResult.confidence,

        direction: dirResult.direction,
        direction_confidence: dirResult.confidence,

        field_confidence,

        jurisdiction: "EU",
        vat_rate: vatResult.vat_rate,
        vat_amount_computed: vatResult.vat_amount_computed,
        compliance_issues: vatResult.compliance_issues,

        fraud_score: fraudResult.fraud_score,
        anomaly_flags: fraudResult.anomaly_flags,

        approval: approvalResult.approval,
        approval_confidence: approvalResult.confidence,
        approval_reasons: approvalResult.reasons,
        needs_info_fields: approvalResult.needs_info_fields,

        esg_category: esgResult.category,
        co2e_estimate: esgResult.co2e,

        payment_payload: qrResult.payload,
        payment_qr_string: qrResult.qr_string,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Processing failed",
        details: String(err),
      }),
      { status: 500 },
    );
  }
});
