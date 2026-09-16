import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

// Helper to remove emojis and replace rupee symbols to prevent jsPDF Helvetica encoding bugs
const cleanText = (text) => {
  if (typeof text !== "string") return text;
  // Replace Rupee symbol with Rs.
  let cleaned = text.replace(/₹/g, "Rs. ");
  // Strip emojis and non-ASCII characters that standard Helvetica doesn't support
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, "");
  return cleaned.trim();
};

// ================= CSV =================
export const exportToCSV = (transactions = [], filename = "transactions.csv") => {
  if (!transactions.length) {
    console.warn("⚠ No transactions to export");
    return;
  }

  const headers = ["Date", "Type", "Category", "Amount", "Description"];

  const rows = transactions.map((tx) => [
    new Date(tx?.date || Date.now()).toLocaleDateString("en-IN"),
    tx?.type || "-",
    cleanText(tx?.category || tx?.source || "-"),
    tx?.amount || 0,
    cleanText(tx?.description || "-")
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
};

// ================= PDF =================
export const exportToPDF = async (
  user = {},
  transactions = [],
  summary = {},
  aiAdvisor = {}
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // ===== THEME COLORS =====
    const PRIMARY_COLOR = [79, 70, 229]; // Indigo-600
    const TEXT_MAIN = [30, 41, 59]; // Slate-800
    const TEXT_MUTED = [100, 116, 139]; // Slate-500

    // ===== HEADER & BORDER =====
    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(1.5);
    doc.line(15, 15, pageWidth - 15, 15); // Top Border
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text("EXPENSE TRACKER", 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("PREMIUM FINANCIAL STATEMENT", 20, 38);
    doc.text(`Generated on: ${new Date().toLocaleString("en-IN")}`, pageWidth - 20, 38, { align: "right" });

    // ===== USER PROFILE & ACCOUNT INFO =====
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(15, 45, pageWidth - 30, 30, "F");
    
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_MAIN);
    doc.text(`Account Holder: ${cleanText(user?.fullName || "Valued User")}`, 25, 55);
    doc.text(`Email: ${cleanText(user?.email || "N/A")}`, 25, 62);
    
    if (user?.bankAccount?.accountNumber) {
      doc.text(`Linked Bank: ${cleanText(user.bankAccount.bankName)}`, pageWidth / 2 + 10, 55);
      doc.text(`Account No: ****${user.bankAccount.accountNumber.slice(-4)}`, pageWidth / 2 + 10, 62);
    } else {
      doc.text("Linked Bank: None", pageWidth / 2 + 10, 55);
      doc.text("Account No: N/A", pageWidth / 2 + 10, 62);
    }

    // ===== FINANCIAL OVERVIEW & SAVINGS % =====
    const totalIncome = summary?.totalIncome || 0;
    const totalExpense = summary?.totalExpense || 0;
    const balance = totalIncome - totalExpense;
    const savingsPercent = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text("Financial Overview", 20, 90);

    autoTable(doc, {
      startY: 95,
      theme: "grid",
      head: [["Total Income", "Total Expense", "Net Balance", "Savings %"]],
      body: [[
        `Rs. ${totalIncome.toLocaleString()}`,
        `Rs. ${totalExpense.toLocaleString()}`,
        `Rs. ${balance.toLocaleString()}`,
        `${savingsPercent}%`
      ]],
      headStyles: { fillColor: PRIMARY_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 11, halign: "center", font: "helvetica" },
      columnStyles: { 3: { textColor: balance >= 0 ? [16, 185, 129] : [239, 68, 68] } }
    });

    // ===== CATEGORY BREAKDOWN / SPENDING ANALYSIS =====
    if (summary?.categoryData && summary.categoryData.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text("Spending Analysis by Category", 20, doc.lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [["Category", "Amount Spent", "Percentage of Total"]],
        body: summary.categoryData.map(cat => [
          cleanText(cat.name),
          `Rs. ${cat.value.toLocaleString()}`,
          `${((cat.value / totalExpense) * 100).toFixed(1)}%`
        ]),
        styles: { fontSize: 10, font: "helvetica" },
        headStyles: { fillColor: [100, 116, 139] }
      });
    }

    // ===== AI FINANCIAL ADVISOR SECTION =====
    if (aiAdvisor?.summary || aiAdvisor?.financialHealth || aiAdvisor?.forecast || aiAdvisor?.recommendations?.length) {
      doc.setFontSize(14);
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text("AI Financial Advisor Report", 20, doc.lastAutoTable.finalY + 15);

      const aiY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_MAIN);
      doc.text(`Financial Health Score: ${aiAdvisor?.financialHealth?.score ?? "N/A"}/100 (${aiAdvisor?.financialHealth?.status || "Evaluating"})`, 20, aiY);
      doc.text(`Forecasted End-of-Month Expense: Rs. ${(aiAdvisor?.forecast?.projectedExpense || 0).toLocaleString()}`, 20, aiY + 7);
      doc.text(`Expected Savings: Rs. ${(aiAdvisor?.forecast?.expectedSavings || 0).toLocaleString()}`, 20, aiY + 14);
      doc.text(`Top Recommendation: ${aiAdvisor?.recommendations?.[0]?.title || "No recommendation yet"}`, 20, aiY + 21);
      doc.text(`Primary Category: ${aiAdvisor?.summary?.biggestExpenseCategory?.category || "N/A"}`, 20, aiY + 28);
    }

    // ===== RECENT TRANSACTIONS TABLE =====
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.text("Recent Activity (Recent Transactions Table)", 20, doc.lastAutoTable.finalY + 45);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [["Date", "Description", "Category", "Type", "Amount"]],
      body: transactions.slice(0, 20).map((tx) => [
        new Date(tx?.date || Date.now()).toLocaleDateString("en-IN"),
        cleanText(tx?.description || "-"),
        cleanText(tx?.category || tx?.source || "-"),
        tx?.type?.toUpperCase() || "-",
        { content: `Rs. ${tx?.amount || 0}`, styles: { fontStyle: "bold", textColor: tx.type === "income" ? [16, 185, 129] : [239, 68, 68] } }
      ]),
      styles: { fontSize: 9, font: "helvetica" },
      headStyles: { fillColor: [51, 65, 85] }
    });

    // ===== FOOTER =====
    const finalY = doc.lastAutoTable.finalY;
    if (finalY < doc.internal.pageSize.getHeight() - 20) {
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text("Thank you for choosing Expense Tracker Premium. This is a computer generated financial statement.", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save(`Financial_Report_${new Date().getTime()}.pdf`);

  } catch (err) {
    console.error("❌ PDF Export Error:", err);
  }
};

// ================= PIE CHART =================
export const generatePieChartPDF = async (categoryData = []) => {
  try {
    if (!categoryData.length) {
      console.warn("⚠ No category data");
      return;
    }

    const canvas = document.createElement("canvas");

    const imageCanvas = await html2canvas(canvas);
    const imgData = imageCanvas.toDataURL("image/png");

    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 20, 20);
    pdf.save("category_breakdown.pdf");

  } catch (err) {
    console.error("❌ Pie Chart PDF Error:", err);
  }
};