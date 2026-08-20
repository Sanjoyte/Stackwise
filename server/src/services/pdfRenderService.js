import PDFDocument from "pdfkit";

/**
 * Generate a PDF document buffer for a TaxReport.
 * @param {Object} report TaxReport document
 * @param {Object} user User document
 * @returns {Promise<Buffer>} PDF Buffer
 */
export function generateTaxReportPDF(report, user = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        info: {
          Title: `Tax Report - ${report.taxYear} (${report.jurisdictionCode})`,
          Author: "Stackwise Tax Generator",
          Subject: "Tax Estimate & Breakdown",
        },
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#1E293B"; // Slate 800
      const accentColor = "#2563EB"; // Blue 600
      const textMuted = "#64748B"; // Slate 500
      const borderColor = "#E2E8F0"; // Slate 200
      const lightBg = "#F8FAFC"; // Slate 50

      const formatCurrency = (amount, curr = report.currency || "BDT") => {
        const val = Number(amount || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return curr === "BDT" ? `BDT ${val}` : `${curr} ${val}`;
      };

      const formatDate = (d) => {
        if (!d) return "N/A";
        return new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      // Header Brand
      doc
        .fillColor(accentColor)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("STACKWISE", 40, 40);

      doc
        .fillColor(textMuted)
        .fontSize(10)
        .font("Helvetica")
        .text("Tax Report & Liability Estimate (Phase 1)", 40, 65);

      // Report Metadata Box (Right aligned)
      doc
        .fillColor(primaryColor)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("TAX REPORT DETAILS", 350, 40, { align: "right" });

      doc
        .fillColor(textMuted)
        .fontSize(9)
        .font("Helvetica")
        .text(`Tax Year: ${report.taxYear}`, 350, 54, { align: "right" })
        .text(`Jurisdiction: ${report.jurisdictionCode} (Bangladesh)`, 350, 67, { align: "right" })
        .text(`Category: ${report.taxpayerCategory || "general"}`, 350, 80, { align: "right" })
        .text(`Generated: ${formatDate(report.createdAt || new Date())}`, 350, 93, { align: "right" });

      // Horizontal Divider
      doc
        .moveTo(40, 115)
        .lineTo(555, 115)
        .strokeColor(borderColor)
        .lineWidth(1)
        .stroke();

      // Taxpayer Information Section
      doc
        .fillColor(primaryColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Taxpayer & Assessment Period", 40, 125);

      doc
        .fillColor(textMuted)
        .fontSize(9)
        .font("Helvetica")
        .text(`Taxpayer Name: ${user.name || user.email || "Valued User"}`, 40, 142)
        .text(`Assessment Period: ${formatDate(report.periodStart)} to ${formatDate(report.periodEnd)}`, 40, 155)
        .text(`Reporting Currency: ${report.currency || "BDT"}`, 40, 168);

      // Section: Summary Financial Highlights Box
      const summaryY = 190;
      doc
        .rect(40, summaryY, 515, 65)
        .fillColor(lightBg)
        .fillAndStroke(lightBg, borderColor);

      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold");

      // Column 1: Gross Income
      doc.text("GROSS INCOME", 55, summaryY + 12);
      doc
        .fillColor("#059669")
        .fontSize(12)
        .text(formatCurrency(report.summary?.grossIncome), 55, summaryY + 30);

      // Column 2: Total Deductions
      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold");
      doc.text("TOTAL DEDUCTIONS", 185, summaryY + 12);
      doc
        .fillColor("#DC2626")
        .fontSize(12)
        .text(formatCurrency(report.summary?.totalDeductions), 185, summaryY + 30);

      // Column 3: Taxable Income
      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold");
      doc.text("TAXABLE INCOME", 315, summaryY + 12);
      doc
        .fillColor(primaryColor)
        .fontSize(12)
        .text(formatCurrency(report.summary?.estimatedTaxableIncome), 315, summaryY + 30);

      // Column 4: Estimated Tax
      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold");
      doc.text("ESTIMATED TAX", 435, summaryY + 12);
      doc
        .fillColor(accentColor)
        .fontSize(12)
        .text(formatCurrency(report.summary?.estimatedTax), 435, summaryY + 30);

      let currentY = 270;

      // Table Helper Function
      const renderTable = (title, items, columns) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 40;
        }

        doc
          .fillColor(primaryColor)
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${title} (${items.length})`, 40, currentY);

        currentY += 18;

        // Table Header Line
        doc
          .rect(40, currentY, 515, 20)
          .fillColor("#F1F5F9")
          .fill();

        doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold");

        columns.forEach((col) => {
          doc.text(col.header, col.x, currentY + 6, { width: col.width, align: col.align || "left" });
        });

        currentY += 20;

        if (items.length === 0) {
          doc
            .fillColor(textMuted)
            .fontSize(8)
            .font("Helvetica-Oblique")
            .text("No items recorded for this section.", 45, currentY + 5);
          currentY += 20;
          return;
        }

        doc.font("Helvetica").fontSize(8);

        items.forEach((item, index) => {
          if (currentY > 740) {
            doc.addPage();
            currentY = 40;
          }

          if (index % 2 === 1) {
            doc.rect(40, currentY, 515, 18).fillColor("#FAFAFA").fill();
          }

          doc.fillColor("#334155");

          columns.forEach((col) => {
            const val = col.accessor(item);
            doc.text(String(val), col.x, currentY + 4, {
              width: col.width,
              align: col.align || "left",
              ellipsis: true,
            });
          });

          currentY += 18;
        });

        currentY += 15;
      };

      // 1. Business Income Table
      const incomeItems = (report.lineItems || []).filter((i) => i.sourceType === "income");
      renderTable("Business Income", incomeItems, [
        { header: "DESCRIPTION / SOURCE", x: 45, width: 220, accessor: (i) => i.description || "Income" },
        { header: "CATEGORY", x: 270, width: 100, accessor: (i) => i.category || "Business" },
        { header: "ORIGINAL", x: 375, width: 80, align: "right", accessor: (i) => `${i.originalCurrency || "BDT"} ${i.originalAmount}` },
        { header: "CONVERTED (BDT)", x: 460, width: 90, align: "right", accessor: (i) => i.convertedAmount?.toFixed(2) },
      ]);

      // 2. Deductible Expenses Table
      const expenseItems = (report.lineItems || []).filter((i) => i.sourceType === "expense" && i.deductible);
      renderTable("Deductible Business Expenses", expenseItems, [
        { header: "DESCRIPTION", x: 45, width: 180, accessor: (i) => i.description || "Expense" },
        { header: "CATEGORY", x: 230, width: 90, accessor: (i) => i.category || "General" },
        { header: "CONFIDENCE", x: 325, width: 60, accessor: (i) => (i.confidence || "high").toUpperCase() },
        { header: "ORIGINAL", x: 390, width: 75, align: "right", accessor: (i) => `${i.originalCurrency || "BDT"} ${i.originalAmount}` },
        { header: "DEDUCTIBLE (BDT)", x: 470, width: 80, align: "right", accessor: (i) => i.convertedAmount?.toFixed(2) },
      ]);

      // 3. Work-Related Subscriptions Table
      const subItems = (report.lineItems || []).filter((i) => i.sourceType === "subscription");
      renderTable("Work-Related Subscriptions", subItems, [
        { header: "SUBSCRIPTION NAME", x: 45, width: 200, accessor: (i) => i.description || "Software Subscription" },
        { header: "CONFIDENCE", x: 250, width: 90, accessor: (i) => (i.confidence || "medium").toUpperCase() },
        { header: "ORIGINAL", x: 345, width: 100, align: "right", accessor: (i) => `${i.originalCurrency || "BDT"} ${i.originalAmount}` },
        { header: "CONVERTED (BDT)", x: 450, width: 100, align: "right", accessor: (i) => i.convertedAmount?.toFixed(2) },
      ]);

      // 4. Uncategorized Items Table
      if (report.uncategorizedItems && report.uncategorizedItems.length > 0) {
        renderTable("Uncategorized Items (Requires Review)", report.uncategorizedItems, [
          { header: "DESCRIPTION", x: 45, width: 220, accessor: (i) => i.description || "Item" },
          { header: "SOURCE TYPE", x: 270, width: 90, accessor: (i) => (i.sourceType || "expense").toUpperCase() },
          { header: "AMOUNT (BDT)", x: 365, width: 80, align: "right", accessor: (i) => i.amount?.toFixed(2) },
          { header: "REASON", x: 450, width: 100, accessor: (i) => i.reason || "No rule match" },
        ]);
      }

      // Disclaimer Footer (Always present)
      if (currentY > 720) {
        doc.addPage();
        currentY = 40;
      } else {
        currentY += 10;
      }

      doc
        .moveTo(40, currentY)
        .lineTo(555, currentY)
        .strokeColor(borderColor)
        .stroke();

      currentY += 10;

      doc
        .fillColor(textMuted)
        .fontSize(7.5)
        .font("Helvetica-Oblique")
        .text(
          `DISCLAIMER: This document is an automated tax estimate for planning purposes only, generated using TaxBracketSet version ${
            report.taxYear || "2025-26"
          } rules effective for jurisdiction ${
            report.jurisdictionCode || "BD"
          }. It is not a certified tax filing or official audit document. Please consult a licensed professional tax consultant before submitting filings to National Board of Revenue (NBR) or tax authorities.`,
          40,
          currentY,
          { width: 515, align: "justify" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
