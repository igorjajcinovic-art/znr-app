import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

export type WorkEquipmentLabelItem = {
  id: string;
  firmaId: string;
  naziv: string;
  serijskiBroj: string | null;
  inventarniBroj: string | null;
};

const MM_TO_PT = 72 / 25.4;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const LABEL_WIDTH_MM = 90;
const LABEL_HEIGHT_MM = 60;
const LABELS_PER_PAGE = 8;
const LABEL_X_MM = [10, 110];
const LABEL_Y_MM = [18, 85, 152, 219];

function mm(value: number) {
  return value * MM_TO_PT;
}

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function wrapSerialNumber(value: string) {
  const text = normalized(value);
  const chunks: string[] = [];
  const chunkLength = 22;

  for (let index = 0; index < text.length && chunks.length < 2; index += chunkLength) {
    chunks.push(text.slice(index, index + chunkLength));
  }

  if (text.length > chunkLength * 2 && chunks.length > 0) {
    const lastIndex = chunks.length - 1;
    chunks[lastIndex] = `${chunks[lastIndex].slice(0, chunkLength - 1)}…`;
  }

  return chunks.join("\n");
}

export function wrapLabelText(value: string, maxCharactersPerLine: number) {
  const text = normalized(value);
  if (!text) return "";

  const lines: string[] = [];
  let remaining = text;

  while (remaining && lines.length < 2) {
    if (remaining.length <= maxCharactersPerLine) {
      lines.push(remaining);
      remaining = "";
      break;
    }

    let splitAt = remaining.lastIndexOf(" ", maxCharactersPerLine);
    if (splitAt < Math.floor(maxCharactersPerLine * 0.55)) {
      splitAt = maxCharactersPerLine;
    }

    lines.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining && lines.length > 0) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex]
      .slice(0, Math.max(1, maxCharactersPerLine - 1))
      .trimEnd()}…`;
  }

  return lines.join("\n");
}

export function inventoryNumberForLabel(value: string | null) {
  return value ? value.replace(/^RO-/i, "") : "BEZ BROJA";
}

export function inventoryNumberFontSize(value: string) {
  const availableWidthPoints = mm(35);
  const estimatedCharacterWidth = 0.58;
  return Math.max(
    4.5,
    Math.min(21, availableWidthPoints / (Math.max(1, value.length) * estimatedCharacterWidth))
  );
}

function labelContents(input: {
  item: WorkEquipmentLabelItem;
  companyName: string;
  detailUrl: string;
  xMm: number;
  yMm: number;
}) {
  const { item, companyName, detailUrl, xMm, yMm } = input;
  const inventoryNumber = inventoryNumberForLabel(item.inventarniBroj);
  const contents: Content[] = [];

  contents.push({
    canvas: [
      {
        type: "rect",
        x: 0,
        y: 0,
        w: mm(LABEL_WIDTH_MM),
        h: mm(LABEL_HEIGHT_MM),
        lineWidth: mm(0.15),
        lineColor: "#777777",
      },
    ],
    absolutePosition: { x: mm(xMm), y: mm(yMm) },
  } as Content);

  contents.push({
    canvas: [
      {
        type: "rect",
        x: 0,
        y: 0,
        w: mm(43),
        h: mm(43),
        color: "#ffffff",
        lineColor: "#ffffff",
      },
    ],
    absolutePosition: { x: mm(xMm + 3.5), y: mm(yMm + 8.5) },
  } as Content);

  contents.push({
    qr: detailUrl,
    fit: mm(35),
    eccLevel: "M",
    foreground: "#000000",
    background: "#ffffff",
    absolutePosition: { x: mm(xMm + 7.5), y: mm(yMm + 12.5) },
  } as Content);

  contents.push({
    text: wrapLabelText(companyName, 25),
    width: mm(35),
    fontSize: 8,
    bold: true,
    lineHeight: 1,
    absolutePosition: { x: mm(xMm + 50), y: mm(yMm + 7) },
  } as Content);

  contents.push({
    text: inventoryNumber,
    width: mm(35),
    fontSize: inventoryNumberFontSize(inventoryNumber),
    bold: true,
    noWrap: true,
    lineHeight: 1,
    absolutePosition: { x: mm(xMm + 50), y: mm(yMm + 19) },
  } as Content);

  contents.push({
    text: wrapLabelText(item.naziv, 25),
    width: mm(35),
    fontSize: 9.5,
    bold: true,
    lineHeight: 1.05,
    absolutePosition: { x: mm(xMm + 50), y: mm(yMm + 31) },
  } as Content);

  if (item.serijskiBroj) {
    contents.push({
      text: `Tvornički broj:\n${wrapSerialNumber(item.serijskiBroj)}`,
      width: mm(35),
      fontSize: 6.5,
      lineHeight: 0.95,
      absolutePosition: { x: mm(xMm + 50), y: mm(yMm + 47) },
    } as Content);
  }

  return contents;
}

export function buildWorkEquipmentLabelPdf(input: {
  companyName: string;
  companyId: string;
  origin: string;
  items: WorkEquipmentLabelItem[];
}): TDocumentDefinitions {
  const content: Content[] = [];
  const pages = Math.ceil(input.items.length / LABELS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    if (pageIndex > 0) {
      content.push({ text: "", pageBreak: "before", fontSize: 1 });
    }

    const pageItems = input.items.slice(
      pageIndex * LABELS_PER_PAGE,
      (pageIndex + 1) * LABELS_PER_PAGE
    );

    pageItems.forEach((item, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const detailUrl = `${input.origin}/tvrtke/${encodeURIComponent(input.companyId)}/radna-oprema/${encodeURIComponent(item.id)}`;

      content.push(
        ...labelContents({
          item,
          companyName: input.companyName,
          detailUrl,
          xMm: LABEL_X_MM[column],
          yMm: LABEL_Y_MM[row],
        })
      );
    });
  }

  return {
    info: {
      title: `QR naljepnice - ${input.companyName}`,
      subject: "QR naljepnice radne opreme",
      creator: "ZNR aplikacija",
    },
    pageSize: { width: mm(PAGE_WIDTH_MM), height: mm(PAGE_HEIGHT_MM) },
    pageMargins: [0, 0, 0, 0],
    defaultStyle: { font: "Roboto", color: "#000000" },
    content,
  };
}

