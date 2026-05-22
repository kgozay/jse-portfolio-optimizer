import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function downloadCSV(result) {
  const headers = ['Ticker','Weight (%)','Contribution to Return (%)','Contribution to Risk (%)'];
  const rows = result.weights.map(w => [
    w.ticker,
    (w.weight * 100).toFixed(2),
    (w.contribution_to_return * 100).toFixed(4),
    (w.contribution_to_risk * 100).toFixed(4),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'portfolio.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF() {
  const node = document.getElementById('stage-output');
  if (!node) return;
  const canvas = await html2canvas(node, { backgroundColor: '#0C0C0D', scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save('portfolio.pdf');
}

export function ExportButton({ result }) {
  return (
    <div data-html2canvas-ignore="true" className="flex gap-2 mt-4 pt-4 border-t-2 border-nb-border">
      <button onClick={() => downloadCSV(result)}
              className="flex-1 border-2 border-nb-border font-mono text-[9px] tracking-widest
                         py-2 text-nb-muted hover:border-nb-border-bright hover:text-nb-text transition-all nb-pop-btn bg-nb-bg">
        DOWNLOAD CSV
      </button>
      <button onClick={downloadPDF}
              className="flex-1 border-2 border-nb-border font-mono text-[9px] tracking-widest
                         py-2 text-nb-muted hover:border-nb-border-bright hover:text-nb-text transition-all nb-pop-btn bg-nb-bg">
        DOWNLOAD PDF
      </button>
    </div>
  );
}
