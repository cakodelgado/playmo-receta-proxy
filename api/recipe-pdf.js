import PDFDocument from 'pdfkit';

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { d } = req.query;
  if (!d) return res.status(400).send('Falta parametro d');

  let recipe;
  try {
    recipe = JSON.parse(Buffer.from(d, 'base64url').toString('utf-8'));
  } catch (e) {
    return res.status(400).send('Parametro invalido');
  }

  const { nombre, descripcion, ingredientes, elaboracion, brand } = recipe;
  const stepsArr = (elaboracion || '').split('|').map(s => s.trim()).filter(Boolean);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="mi-receta.pdf"');

  const doc = new PDFDocument({ margin: 55, size: 'A4' });
  doc.pipe(res);

  const ORANGE = '#E8820C';
  const DARK   = '#1A1A2E';
  const MUTED  = '#666677';
  const WHITE  = '#FFFFFF';
  const LIGHT  = '#F8F4EF';

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(LIGHT);
  doc.rect(0, 0, doc.page.width, 110).fill(DARK);

  doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold')
     .text((brand || 'PLAYMO').toUpperCase(), 55, 28, { characterSpacing: 3 });

  doc.fontSize(24).fillColor(WHITE).font('Helvetica-Bold')
     .text(nombre || 'Tu receta', 55, 44, { width: doc.page.width - 110 });

  doc.rect(55, 98, 60, 3).fill(ORANGE);

  doc.moveDown(0.5);
  doc.fontSize(11).fillColor(MUTED).font('Helvetica-Oblique')
     .text(descripcion || '', 55, 128, { width: doc.page.width - 110, lineGap: 4 });

  const afterDesc = doc.y + 20;
  const colW = (doc.page.width - 110 - 20) / 2;
  const colL = 55;
  const colR = 55 + colW + 20;

  doc.fontSize(8).fillColor(ORANGE).font('Helvetica-Bold')
     .text('INGREDIENTES', colL, afterDesc, { characterSpacing: 2 });
  doc.moveTo(colL, doc.y + 4).lineTo(colL + colW, doc.y + 4).stroke(ORANGE);
  doc.moveDown(0.6);

  (ingredientes || []).forEach(ing => {
    doc.fontSize(10).fillColor(DARK).font('Helvetica')
       .text('- ' + ing, colL, doc.y, { width: colW, lineGap: 3 });
  });

  doc.fontSize(8).fillColor(ORANGE).font('Helvetica-Bold')
     .text('ELABORACION', colR, afterDesc, { characterSpacing: 2 });
  doc.moveTo(colR, doc.y + 4).lineTo(colR + colW, doc.y + 4).stroke(ORANGE);
  doc.moveDown(0.6);

  stepsArr.forEach((step, i) => {
    const stepY = doc.y;
    doc.circle(colR + 7, stepY + 5, 7).fill(ORANGE);
    doc.fontSize(9).fillColor(WHITE).font('Helvetica-Bold').text(String(i + 1), colR + 4, stepY + 1);
    doc.fontSize(10).fillColor(DARK).font('Helvetica')
       .text(step, colR + 20, stepY, { width: colW - 20, lineGap: 3 });
    doc.moveDown(0.4);
  });

  const footerY = doc.page.height - 50;
  doc.rect(0, footerY, doc.page.width, 50).fill(DARK);
  doc.fontSize(9).fillColor(MUTED).font('Helvetica')
     .text('Receta generada con IA · ' + (brand || 'Playmo'), 55, footerY + 18);

  doc.end();
}
