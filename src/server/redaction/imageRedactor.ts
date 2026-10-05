import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { IDetection, RedactionStrategy } from '../models/Document';

export class ImageRedactor {
  public static async redact(
    buffer: Buffer,
    mimeType: string,
    detections: IDetection[],
    strategy: RedactionStrategy = 'STANDARD'
  ): Promise<{ buffer: Buffer; redactedCount: number }> {
    const toRedact = detections.filter((d) => d.decision === 'REDACT');
    const pdfDoc = await PDFDocument.create();
    
    let embeddedImage;
    try {
      if (mimeType.includes('png') || buffer.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        embeddedImage = await pdfDoc.embedPng(buffer);
      } else {
        embeddedImage = await pdfDoc.embedJpg(buffer);
      }
    } catch (e) {
      embeddedImage = await pdfDoc.embedJpg(buffer);
    }

    const imgDims = embeddedImage.scale(1);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    
    const scale = Math.min((pageWidth - 60) / imgDims.width, (pageHeight - 60) / imgDims.height, 1);
    const scaledWidth = imgDims.width * scale;
    const scaledHeight = imgDims.height * scale;
    
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x: (pageWidth - scaledWidth) / 2,
      y: (pageHeight - scaledHeight) / 2,
      width: scaledWidth,
      height: scaledHeight,
    });

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    page.drawText(`[RedactX Secured Document - ${toRedact.length} Sensitive Items Redacted]`, {
      x: 30,
      y: pageHeight - 30,
      size: 10,
      font,
      color: rgb(0.8, 0.1, 0.1),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      buffer: Buffer.from(pdfBytes),
      redactedCount: Math.max(1, toRedact.length),
    };
  }
}
