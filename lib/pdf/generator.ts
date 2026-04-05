import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib/cjs';

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
  return text
    .replace(/[\u2018\u2019]/g, "'")   // curly single quotes → straight
    .replace(/[\u201C\u201D]/g, '"')   // curly double quotes → straight
    .replace(/\u2014/g, ' - ')         // em dash → spaced hyphen
    .replace(/\u2013/g, '-')           // en dash → hyphen
    .replace(/\u2026/g, '...')         // ellipsis → three dots
    .replace(/\u2022/g, '-')           // bullet point → hyphen
    .replace(/[^\x20-\x7E]/g, '')      // strip any remaining non-ASCII
    .trim()
    .substring(0, 400);
}

function wrapText(text: string, maxWidth: number, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  lines.push(current);
  return lines;
}

function drawWrappedText(args: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  size: number;
  minSize: number;
  maxLines: number;
  lineHeight: number;
  font: PDFFont;
  color: ReturnType<typeof rgb>;
}): { linesUsed: number; finalY: number } {
  const {
    page, text, x, y, maxWidth, size, minSize, maxLines, lineHeight, font, color,
  } = args;

  let currentSize = size;
  let lines = wrapText(text, maxWidth, font, currentSize);
  while (currentSize > minSize && lines.length > maxLines) {
    currentSize -= 1;
    lines = wrapText(text, maxWidth, font, currentSize);
  }

  const finalLines = lines.slice(0, maxLines);
  let currentY = y;
  for (const line of finalLines) {
    page.drawText(line, { x, y: currentY, size: currentSize, font, color });
    currentY -= lineHeight;
  }

  return { linesUsed: finalLines.length, finalY: currentY };
}

export async function generatePDF(options: PDFOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let pageWidth: number, pageHeight: number;
  if (options.pageSize === 'a4') { pageWidth = 595.28; pageHeight = 841.89; }
  else if (options.pageSize === 'a5') { pageWidth = 419.53; pageHeight = 595.28; }
  else { pageWidth = 612; pageHeight = 792; }

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const bg = hexToRgb(options.colorScheme.background || '#FFFFFF');
  const primary = hexToRgb(options.colorScheme.primary || '#2563EB');
  const secondary = hexToRgb(options.colorScheme.secondary || '#DBEAFE');
  const textColor = hexToRgb(options.colorScheme.text || '#111827');
  const accent = hexToRgb(options.colorScheme.accent || '#60A5FA');

  const titleText = safeText(options.content?.title || options.title) || 'Untitled';
  const subtitle = safeText(options.content?.subtitle);
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const footerY = 8;
  const minBottomY = 50;
  const pages: Array<ReturnType<PDFDocument['addPage']>> = [];

  function addStyledPage() {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(...bg) });
    page.drawRectangle({ x: 0, y: pageHeight - 75, width: pageWidth, height: 75, color: rgb(...primary) });

    const titleDraw = drawWrappedText({
      page,
      text: titleText,
      x: 30,
      y: pageHeight - 45,
      maxWidth: pageWidth - 60,
      size: 22,
      minSize: 16,
      maxLines: 1,
      lineHeight: 24,
      font: bold,
      color: rgb(1, 1, 1),
    });

    if (subtitle) {
      drawWrappedText({
        page,
        text: subtitle,
        x: 30,
        y: titleDraw.finalY - 1,
        maxWidth: pageWidth - 60,
        size: 9,
        minSize: 8,
        maxLines: 1,
        lineHeight: 10,
        font: regular,
        color: rgb(0.9, 0.9, 0.9),
      });
    }

    return page;
  }

  let page = addStyledPage();
  let y = pageHeight - 90;

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < minBottomY) {
      page = addStyledPage();
      y = pageHeight - 90;
    }
  }

  const content = options.content;

  // Instructions block — e.g. brain-dump "Set a 10-minute timer..."
  if (content?.instructions) {
    const instrText = safeText(content.instructions as string);
    if (instrText) {
      ensureSpace(48);
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
      page.drawText('HOW TO USE', { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
      y -= 22;
      const instrWrapped = drawWrappedText({
        page,
        text: instrText,
        x: margin + 5,
        y,
        maxWidth: contentWidth - 10,
        size: 9,
        minSize: 8,
        maxLines: 5,
        lineHeight: 12,
        font: regular,
        color: rgb(...textColor),
      });
      y = instrWrapped.finalY - 10;
    }
  }

  if (content?.date_label) {
    ensureSpace(24);
    page.drawText(safeText(content.date_label), { x: margin, y, size: 10, font: regular, color: rgb(...textColor) });
    page.drawLine({ start: { x: margin + 55, y: y - 1 }, end: { x: margin + 200, y: y - 1 }, thickness: 1, color: rgb(...primary) });
    y -= 22;
  }

  if (Array.isArray(content?.top_3_priorities)) {
    const priorities = (content.top_3_priorities as string[]).slice(0, 5);
    ensureSpace(36 + priorities.length * 26);
    y -= 4;
    page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
    page.drawText('TOP 3 PRIORITIES', { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
    y -= 22;
    priorities.forEach((p, i) => {
      page.drawRectangle({ x: margin, y: y - 2, width: 16, height: 16, borderColor: rgb(...primary), borderWidth: 1.5, color: rgb(...bg) });
      const wrapped = drawWrappedText({
        page,
        text: safeText(`${i + 1}. ${p}`),
        x: margin + 22,
        y: y + 1,
        maxWidth: contentWidth - 24,
        size: 9,
        minSize: 8,
        maxLines: 2,
        lineHeight: 10,
        font: regular,
        color: rgb(...textColor),
      });
      const lineY = y - Math.max(8, wrapped.linesUsed * 10 + 2);
      page.drawLine({ start: { x: margin + 22, y: lineY }, end: { x: margin + contentWidth, y: lineY }, thickness: 0.4, color: rgb(...accent) });
      y -= Math.max(20, wrapped.linesUsed * 12 + 8);
    });
    y -= 8;
  }

  if (Array.isArray(content?.time_blocks)) {
    const blocks = (content.time_blocks as Array<{time: string; task: string}>).slice(0, 24);
    ensureSpace(36 + blocks.length * 18);
    page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
    page.drawText('SCHEDULE', { x: margin + 5, y, size: 9, font: bold, color: rgb(...primary) });
    y -= 22;
    blocks.forEach((block, i) => {
      const rowBg = i % 2 === 0 ? rgb(...bg) : rgb(...secondary);
      page.drawRectangle({ x: margin, y: y - 14, width: contentWidth, height: 18, color: rowBg });
      page.drawText(safeText(block.time).substring(0, 10), { x: margin + 4, y: y - 9, size: 8, font: bold, color: rgb(...primary) });
      page.drawLine({ start: { x: margin + 68, y }, end: { x: margin + 68, y: y - 14 }, thickness: 0.8, color: rgb(...accent) });
      const taskText = safeText(block.task);
      if (taskText) {
        drawWrappedText({
          page,
          text: taskText,
          x: margin + 72,
          y: y - 5,
          maxWidth: contentWidth - 72,
          size: 8,
          minSize: 8,
          maxLines: 1,
          lineHeight: 10,
          font: regular,
          color: rgb(...textColor),
        });
      }
      y -= 18;
    });
    y -= 8;
  }

  // Daily planner wellness fields
  if (content?.win_of_day) {
    const wodText = safeText(content.win_of_day as string);
    if (wodText) {
      ensureSpace(26);
      page.drawText(wodText, { x: margin, y, size: 9, font: regular, color: rgb(...textColor) });
      const labelWidth = regular.widthOfTextAtSize(wodText, 9);
      page.drawLine({ start: { x: margin + labelWidth + 6, y: y - 1 }, end: { x: margin + contentWidth, y: y - 1 }, thickness: 0.8, color: rgb(...primary) });
      y -= 20;
    }
  }
  if (content?.energy_check) {
    const eText = safeText(content.energy_check as string);
    if (eText) {
      ensureSpace(22);
      const ecWrapped = drawWrappedText({
        page,
        text: eText,
        x: margin,
        y,
        maxWidth: contentWidth,
        size: 8,
        minSize: 8,
        maxLines: 2,
        lineHeight: 10,
        font: regular,
        color: rgb(...textColor),
      });
      y = ecWrapped.finalY - 6;
    }
  }
  if (content?.water_check) {
    const wText = safeText(content.water_check as string);
    if (wText) {
      ensureSpace(22);
      const wcWrapped = drawWrappedText({
        page,
        text: wText,
        x: margin,
        y,
        maxWidth: contentWidth,
        size: 8,
        minSize: 8,
        maxLines: 2,
        lineHeight: 10,
        font: regular,
        color: rgb(...textColor),
      });
      y = wcWrapped.finalY - 10;
    }
  }

  if (Array.isArray(content?.categories)) {
    (content.categories as Array<{name: string; icon: string; lines: number}>).forEach((cat) => {
      const lines = Math.min(cat.lines || 4, 8);
      ensureSpace(30 + lines * 16);
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
      drawWrappedText({
        page,
        text: safeText(`${cat.icon || ''} ${cat.name}`),
        x: margin + 5,
        y,
        maxWidth: contentWidth - 10,
        size: 9,
        minSize: 8,
        maxLines: 1,
        lineHeight: 10,
        font: bold,
        color: rgb(...primary),
      });
      y -= 22;
      for (let i = 0; i < lines; i++) {
        page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.4, color: rgb(...accent) });
        y -= 16;
      }
      y -= 6;
    });
  }

  if (Array.isArray(content?.sections)) {
    const mutedColor = rgb(
      textColor[0] * 0.55 + bg[0] * 0.45,
      textColor[1] * 0.55 + bg[1] * 0.45,
      textColor[2] * 0.55 + bg[2] * 0.45
    );
    (content.sections as Array<{name: string; description: string; items: string[]}>).forEach((sec) => {
      const items = (sec.items || []).slice(0, 16);
      const descText = safeText(sec.description);
      // Reserve space for header + optional description + first few items; per-item breaks handle the rest
      ensureSpace(34 + (descText ? 22 : 0) + Math.min(items.length, 3) * 22);
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(...secondary) });
      drawWrappedText({
        page,
        text: safeText(sec.name),
        x: margin + 5,
        y,
        maxWidth: contentWidth - 10,
        size: 9,
        minSize: 8,
        maxLines: 1,
        lineHeight: 10,
        font: bold,
        color: rgb(...primary),
      });
      y -= 22;
      if (descText) {
        const descWrapped = drawWrappedText({
          page,
          text: descText,
          x: margin + 5,
          y,
          maxWidth: contentWidth - 10,
          size: 8,
          minSize: 8,
          maxLines: 2,
          lineHeight: 10,
          font: regular,
          color: mutedColor,
        });
        y = descWrapped.finalY - 5;
      }
      items.forEach((item) => {
        ensureSpace(24);
        page.drawRectangle({ x: margin + 5, y: y - 2, width: 7, height: 7, color: rgb(...accent) });
        const wrapped = drawWrappedText({
          page,
          text: safeText(item),
          x: margin + 17,
          y,
          maxWidth: contentWidth - 20,
          size: 9,
          minSize: 8,
          maxLines: 2,
          lineHeight: 10,
          font: regular,
          color: rgb(...textColor),
        });
        y -= Math.max(16, wrapped.linesUsed * 11);
      });
      y -= 6;
    });
  }

  if (Array.isArray(content?.steps)) {
    (content.steps as Array<{number: number; sense: string; icon: string; instruction: string}>).forEach((step) => {
      ensureSpace(72);
      page.drawCircle({ x: margin + 14, y: y - 8, size: 14, color: rgb(...primary) });
      page.drawText(String(step.number), { x: margin + 10, y: y - 13, size: 11, font: bold, color: rgb(1, 1, 1) });
      drawWrappedText({
        page,
        text: safeText(`${step.icon || ''} ${step.sense}`),
        x: margin + 33,
        y,
        maxWidth: contentWidth - 35,
        size: 11,
        minSize: 9,
        maxLines: 1,
        lineHeight: 12,
        font: bold,
        color: rgb(...primary),
      });
      drawWrappedText({
        page,
        text: safeText(step.instruction),
        x: margin + 33,
        y: y - 14,
        maxWidth: contentWidth - 35,
        size: 8,
        minSize: 8,
        maxLines: 2,
        lineHeight: 9,
        font: regular,
        color: rgb(...textColor),
      });
      for (let i = 0; i < 3; i++) {
        page.drawLine({ start: { x: margin + 33, y: y - 22 - i * 14 }, end: { x: margin + contentWidth, y: y - 22 - i * 14 }, thickness: 0.4, color: rgb(...accent) });
      }
      y -= 68;
    });
  }

  // Brain-dump closing prompt — e.g. "Now circle ONE thing to act on first."
  if (content?.after_dump_prompt) {
    const adpText = safeText(content.after_dump_prompt as string);
    if (adpText) {
      ensureSpace(52);
      y -= 4;
      page.drawRectangle({ x: margin, y: y - 6, width: contentWidth, height: 30, color: rgb(...primary) });
      drawWrappedText({
        page,
        text: adpText,
        x: margin + 8,
        y: y + 8,
        maxWidth: contentWidth - 16,
        size: 9,
        minSize: 8,
        maxLines: 2,
        lineHeight: 11,
        font: bold,
        color: rgb(1, 1, 1),
      });
      y -= 46;
    }
  }

  if (Array.isArray(content?.prompts)) {
    (content.prompts as string[]).forEach((prompt) => {
      ensureSpace(66);
      const wrapped = drawWrappedText({
        page,
        text: safeText(prompt),
        x: margin,
        y,
        maxWidth: contentWidth,
        size: 9,
        minSize: 8,
        maxLines: 2,
        lineHeight: 10,
        font: bold,
        color: rgb(...textColor),
      });
      y = wrapped.finalY - 2;
      for (let i = 0; i < 3; i++) {
        page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.4, color: rgb(...accent) });
        y -= 15;
      }
      y -= 5;
    });
  }

  if (Array.isArray(content?.columns)) {
    const cols = (content.columns as Array<{name: string; prompt: string}>).slice(0, 4);
    // Header height: 20pt for name + 22pt for prompt = 42pt rectangle
    const colHeaderH = 42;
    const colRowH = 18;  // height of each write-in line row
    const colRowLines = 4; // write-in lines per entry row
    const colEntryRows = 3; // number of fill-in entry blocks per column
    const colEntryH = colRowLines * colRowH + 8; // 80pt per entry block
    const totalColHeight = colHeaderH + 6 + colEntryRows * colEntryH;
    ensureSpace(totalColHeight + 20);
    const colW = (contentWidth - 8) / cols.length;
    // Draw column headers with name + prompt
    cols.forEach((col, i) => {
      const x = margin + i * colW;
      page.drawRectangle({ x, y: y - colHeaderH + 16, width: colW - 3, height: colHeaderH, color: rgb(...secondary) });
      drawWrappedText({
        page,
        text: safeText(col.name),
        x: x + 4,
        y,
        maxWidth: colW - 8,
        size: 8,
        minSize: 7,
        maxLines: 1,
        lineHeight: 9,
        font: bold,
        color: rgb(...primary),
      });
      const promptText = safeText(col.prompt);
      if (promptText) {
        drawWrappedText({
          page,
          text: promptText,
          x: x + 4,
          y: y - 11,
          maxWidth: colW - 8,
          size: 6,
          minSize: 6,
          maxLines: 3,
          lineHeight: 8,
          font: regular,
          color: rgb(
            textColor[0] * 0.6 + bg[0] * 0.4,
            textColor[1] * 0.6 + bg[1] * 0.4,
            textColor[2] * 0.6 + bg[2] * 0.4
          ),
        });
      }
    });
    y -= colHeaderH + 6;
    // Draw write-in rows for each entry block
    for (let row = 0; row < colEntryRows; row++) {
      const rowTopY = y - row * colEntryH;
      cols.forEach((_, i) => {
        const x = margin + i * colW;
        for (let line = 0; line < colRowLines; line++) {
          page.drawLine({
            start: { x: x + 3, y: rowTopY - line * colRowH },
            end: { x: x + colW - 5, y: rowTopY - line * colRowH },
            thickness: 0.4,
            color: rgb(...accent),
          });
        }
        if (i < cols.length - 1) {
          page.drawLine({
            start: { x: x + colW - 1, y: rowTopY + 4 },
            end: { x: x + colW - 1, y: rowTopY - colEntryH + 8 },
            thickness: 0.4,
            color: rgb(...accent),
          });
        }
      });
    }
    y -= colEntryRows * colEntryH;
  }

  const bottomText = safeText(
    (content?.affirmation || content?.reminder || content?.after_instruction || content?.note) as string
  );
  if (bottomText) {
    ensureSpace(42);
    page.drawRectangle({ x: margin, y: 18, width: contentWidth, height: 32, color: rgb(...secondary) });
    drawWrappedText({
      page,
      text: bottomText,
      x: margin + 8,
      y: 33,
      maxWidth: contentWidth - 16,
      size: 8,
      minSize: 8,
      maxLines: 2,
      lineHeight: 9,
      font: regular,
      color: rgb(...textColor),
    });
  }

  pages.forEach((p, index) => {
    p.drawText(String(index + 1), { x: pageWidth / 2 - 4, y: footerY, size: 8, font: regular, color: rgb(...textColor) });
  });

  return pdfDoc.save();
}
