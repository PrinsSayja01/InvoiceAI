/* ============================================================
   FULL FILE: src/pages/Invoices.tsx
   ============================================================ */

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type InvoiceRow = {
  id: string;
  file_name: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  currency: string;

  // Advanced AI fields
  doc_class: string;
  fraud_score: number;
  approval: string;
  vat_rate: number;
  co2e_estimate: number;
};

export default function Invoices() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  /* ---------------- Load invoices ---------------- */

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          id,
          file_name,
          vendor_name,
          invoice_number,
          invoice_date,
          total_amount,
          currency,
          doc_class,
          fraud_score,
          approval,
          vat_rate,
          co2e_estimate
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Invoice load error:", error.message);
      }

      setInvoices((data as any) || []);
      setLoading(false);
    };

    fetchInvoices();
  }, []);

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-gray-600">
          All uploaded invoices with AI classification, fraud, compliance, and ESG metadata.
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading invoices...
          </div>
        )}

        {/* Empty */}
        {!loading && invoices.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No invoices uploaded yet.
            </CardContent>
          </Card>
        )}

        {/* Invoice List */}
        <div className="space-y-4">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{inv.vendor_name || "Unknown Vendor"}</span>

                  {/* Approval Badge */}
                  <Badge
                    variant={
                      inv.approval === "PASS"
                        ? "default"
                        : inv.approval === "FAIL"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {inv.approval}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>File:</strong> {inv.file_name}
                </p>

                <p>
                  <strong>Invoice No:</strong> {inv.invoice_number}
                </p>

                <p>
                  <strong>Date:</strong> {inv.invoice_date}
                </p>

                <p>
                  <strong>Total:</strong> {inv.total_amount} {inv.currency}
                </p>

                {/* Advanced Metadata */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline">
                    Type: {inv.doc_class}
                  </Badge>

                  <Badge variant="outline">
                    Fraud Score: {inv.fraud_score?.toFixed(2)}
                  </Badge>

                  <Badge variant="outline">
                    VAT Rate: {(inv.vat_rate * 100).toFixed(0)}%
                  </Badge>

                  <Badge variant="outline">
                    CO₂e: {inv.co2e_estimate} kg
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
