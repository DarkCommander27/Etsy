import { PDFDocument, rgb, StandardFonts } from 'pdf-lib/cjs';

export interface ColorScheme {
  id?: string;
  name?: string;
  background: string;
  primary: string;
  secondary: string;
  text: string;
  accent: string;
}

export interface PDFOptions {
  pageSize: 'letter' | 'a4' | 'a5';
  colorScheme: ColorScheme;
  title: string;
  nicheId: string;
  productTypeId: string;
  content: Record<string, unknown>;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
}

function safeText(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[^\x20-\x7E]/g, '').substring(0, 200);
}

export async function generatePDF(options: PDFOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let pageWidth: number, pageHeight: number;
  if (options.pageSize === 'a4') { pageWidth = 595.28; pageHeight = 841.89; }
  else if (options.pageSize === 'a5') { pageWidth = 419.53; pageHeight = 595.28; }
  else { pageWidth = 612; pageHeight = 792; }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const bg = hexToRgb(options.colorScheme.background || '#FFFFFF');
  const primary = hexToRgb(options.colorScheme.primary || '#2563EB');
  const secondary = hexToRgb(options.colorScheme.secondary || '#DBEAFE');
  const textColor = hexToRgb(options.colorScheme.text || '#111827');
  const accent = hexToRgb(options.colorScheme.accent || '#60A5FA');

  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(...bg) });
  page.drawRectangle({ x: 0, y: pageHeight - 75, width: pageWidth, height: 75, color: rgb(...primary) });

  const titleText = safeText(options.content?.title || options.title) || 'Untitled';
  page.drawText(titleText.substring(0, 40), { x: 30, y: pageHeight - 45, size: 22, font: bold, color: rgb(1, 1, 1) });

  const subtitle = safeText(options.content?.subtitle);
  if (subtitle) page.drawText(subtitle.substring(0, 60), { x: 30, y: pageHeight - 62, size: 9, font: regular, color: rgb(0.9, 0.9, 0.9) });

  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  let y = pageHeight - 90;

  const content = options.content;

  if (content?.date_label) {
    page.drawText(safeText(content.date_label), { x: margin, y, size: 10, font: regular, color: rgb(...textColor) });
    page.drawLine({ start: { x: margin + 55, y: y - 1 }, end: { x: margin + 200, y: y - 1 }, thickness: 1, color: rgb(...primary) });
    y -= 22;
  }

  if (Array.isArray(content?.top_3_priorities)) {
    y -= 4;
    page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
    page.drawText('TOP 3 PRIORITIES', { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
    y -= 22;
    (content.top_3_priorities as string[]).forEach((p, i) => {
      page.drawRectangle({ x: margin, y: y - 2, width: 16, height: 16, borderColor: rgb(...primary), borderWidth: 1.5, color: rgb(...bg) });
      page.drawText(safeText(`${i + 1}. ${p}`).substring(0, 55), { x: margin + 22, y: y + 1, size: 9, font: regular, color: rgb(...textColor) });
      page.drawLine({ start: { x: margin + 22, y: y - 4 }, end: { x: margin + contentWidth, y: y - 4 }, thickness: 0.4, color: rgb(...accent) });
      y -= 20;
    });
    y -= 8;
  }

  if (Array.isArray(content?.time_blocks)) {
    page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
    page.drawText('SCHEDULE', { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
    y -= 22;
    const blocks = (content.time_blocks as Array<{time: string; task: string}>).slice(0, 10);
    blocks.forEach((block, i) => {
      const rowBg = i % 2 === 0 ? rgb(...bg) : rgb(...secondary);
      page.drawRectangle({ x: margin, y: y - 14, width: contentWidth, height: 18, color: rowBg });
      page.drawText(safeText(block.time).substring(0, 10), { x: margin + 4, y: y - 9, size: 8, font: bold, color: rgb(...primary) });
      page.drawLine({ start: { x: margin + 68, y }, end: { x: margin + 68, y: y - 14 }, thickness: 0.8, color: rgb(...accent) });
      y -= 18;
    });
    y -= 8;
  }

  if (Array.isArray(content?.categories)) {
    (content.categories as Array<{name: string; icon: string; lines: number}>).forEach((cat) => {
      if (y < 70) return;
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
      page.drawText(safeText(`${cat.icon || ''} ${cat.name}`).substring(0, 40), { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
      y -= 22;
      const lines = Math.min(cat.lines || 4, Math.floor((y - 60) / 16));
      for (let i = 0; i < lines; i++) {
        page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.4, color: rgb(...accent) });
        y -= 16;
      }
      y -= 6;
    });
  }

  if (Array.isArray(content?.sections)) {
    (content.sections as Array<{name: string; description: string; items: string[]}>).forEach((sec) => {
      if (y < 80) return;
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
      page.drawText(safeText(sec.name).substring(0, 45), { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
      y -= 22;
      (sec.items || []).slice(0, 5).forEach((item) => {
        if (y < 60) return;
        page.drawRectangle({ x: margin + 5, y: y - 2, width: 7, height: 7, color: rgb(...accent) });
        page.drawText(safeText(item).substring(0, 70), { x: margin + 17, y, size: 9, font: regular, color: rgb(...textColor) });
        y -= 16;
      });
      y -= 6;
    });
  }

  if (Array.isArray(content?.steps)) {
    (content.steps as Array<{number: number; sense: string; icon: string; instruction: string}>).forEach((step) => {
      if (y < 90) return;
      page.drawCircle({ x: margin + 14, y: y - 8, size: 14, color: rgb(...primary) });
      page.drawText(String(step.number), { x: margin + 10, y: y - 13, size: 11, font: bold, color: rgb(1, 1, 1) });
      page.drawText(safeText(`${step.icon || ''} ${step.sense}`).substring(0, 20), { x: margin + 33, y, size: 11, font: bold, color: rgb(...primary) });
      page.drawText(safeText(step.instruction).substring(0, 60), { x: margin + 33, y: y - 14, size: 8, font: regular, color: rgb(...textColor) });
      for (let i = 0; i < 3; i++) {
        page.drawLine({ start: { x: margin + 33, y: y - 22 - i * 14 }, end: { x: margin + contentWidth, y: y - 22 - i * 14 }, thickness: 0.4, color: rgb(...accent) });
      }
      y -= 68;
    });
  }

  if (Array.isArray(content?.prompts)) {
    (content.prompts as string[]).forEach((prompt) => {
      if (y < 80) return;
      page.drawText(safeText(prompt).substring(0, 60), { x: margin, y, size: 9, font: bold, color: rgb(...textColor) });
      y -= 14;
      for (let i = 0; i < 3; i++) {
        page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.4, color: rgb(...accent) });
        y -= 15;
      }
      y -= 5;
    });
  }

  if (Array.isArray(content?.columns)) {
    const cols = content.columns as Array<{name: string; prompt: string}>;
    const colW = (contentWidth - 8) / cols.length;
    cols.forEach((col, i) => {
      const x = margin + i * colW;
      page.drawRectangle({ x, y: y - 4, width: colW - 3, height: 20, color: rgb(...secondary) });
      page.drawText(safeText(col.name).substring(0, 12), { x: x + 3, y, size: 7, font: bold, color: rgb(...primary) });
    });
    y -= 22;
    for (let row = 0; row < 4; row++) {
      cols.forEach((_, i) => {
        const x = margin + i * colW;
        for (let line = 0; line < 4; line++) {
          page.drawLine({ start: { x: x + 3, y: y - row * 65 - line * 15 }, end: { x: x + colW - 5, y: y - row * 65 - line * 15 }, thickness: 0.4, color: rgb(...accent) });
        }
        if (i < cols.length - 1) {
          page.drawLine({ start: { x: x + colW - 1, y: y - row * 65 + 4 }, end: { x: x + colW - 1, y: y - row * 65 - 62 }, thickness: 0.4, color: rgb(...accent) });
        }
      });
    }
    y -= 280;
  }

  const bottomText = safeText(
    (content?.affirmation || content?.reminder || content?.after_instruction || content?.note) as string
  ).substring(0, 90);
  if (bottomText && y > 50) {
    page.drawRectangle({ x: margin, y: 18, width: contentWidth, height: 32, color: rgb(...secondary) });
    page.drawText(bottomText, { x: margin + 8, y: 33, size: 8, font: regular, color: rgb(...textColor) });
  }

  page.drawText('1', { x: pageWidth / 2 - 4, y: 8, size: 8, font: regular, color: rgb(...textColor) });
  return pdfDoc.save();
}
