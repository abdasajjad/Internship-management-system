const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate an internship completion certificate PDF.
 * @param {Object} params
 * @param {string} params.outputPath - filesystem path to write PDF
 * @param {string} params.certificateId - unique certificate id (typically Application _id)
 * @param {Date} params.completedAt - completion date
 * @param {Object} params.student
 * @param {string} params.student.name
 * @param {string} [params.student.email]
 * @param {string} [params.student.department]
 * @param {Object} params.internship
 * @param {string} params.internship.title
 * @param {string} [params.internship.company]
 * @param {Object} [params.signedBy]
 * @param {string} [params.signedBy.name]
 * @param {string} [params.signedBy.email]
 * @param {Date} [params.signedAt]
 */
exports.generateInternshipCompletionCertificatePdf = async ({
  outputPath,
  certificateId,
  completedAt,
  student,
  internship,
  signedBy,
  signedAt
}) => {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const pageW = doc.page.width;
  const pageH = doc.page.height;

  // Border
  doc.save();
  doc.lineWidth(2).rect(30, 30, pageW - 60, pageH - 60).stroke('#4f46e5'); // indigo
  doc.lineWidth(1).rect(38, 38, pageW - 76, pageH - 76).stroke('#c7d2fe');
  doc.restore();

  // Header
  doc
    .fillColor('#111827')
    .fontSize(26)
    .font('Helvetica-Bold')
    .text('INTERNSHIP COMPLETION CERTIFICATE', { align: 'center' });

  doc.moveDown(0.6);
  doc
    .fillColor('#4b5563')
    .fontSize(11)
    .font('Helvetica')
    .text(`Certificate ID: ${certificateId}`, { align: 'center' });

  doc.moveDown(1.8);
  doc.fillColor('#111827').fontSize(12).text('This is to certify that', { align: 'center' });

  doc.moveDown(0.7);
  doc
    .fillColor('#111827')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(student?.name || 'Student', { align: 'center' });

  doc.moveDown(0.6);
  doc.fillColor('#374151').fontSize(12).font('Helvetica').text('has successfully completed the internship', { align: 'center' });

  doc.moveDown(0.7);
  doc
    .fillColor('#111827')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(internship?.title || 'Internship', { align: 'center' });

  if (internship?.company) {
    doc.moveDown(0.3);
    doc.fillColor('#374151').fontSize(12).font('Helvetica').text(`Company: ${internship.company}`, { align: 'center' });
  }

  if (student?.department) {
    doc.moveDown(0.2);
    doc.fillColor('#6b7280').fontSize(10).text(`Department: ${student.department}`, { align: 'center' });
  }

  if (student?.email) {
    doc.moveDown(0.2);
    doc.fillColor('#6b7280').fontSize(10).text(`Email: ${student.email}`, { align: 'center' });
  }

  doc.moveDown(2);
  const dateStr = completedAt instanceof Date ? completedAt.toLocaleDateString() : new Date().toLocaleDateString();
  doc.fillColor('#111827').fontSize(12).text(`Date of Completion: ${dateStr}`, { align: 'center' });

  // Signature line
  doc.moveDown(3);
  const sigY = doc.y;
  doc.save();
  doc.strokeColor('#9ca3af').lineWidth(1);
  doc.moveTo(pageW / 2 - 140, sigY).lineTo(pageW / 2 + 140, sigY).stroke();
  doc.restore();
  doc.moveDown(0.5);

  const signerName = signedBy?.name || 'Faculty / Program Coordinator';
  const signerEmail = signedBy?.email || null;
  const sigDate = signedAt instanceof Date ? signedAt : (completedAt instanceof Date ? completedAt : new Date());
  const verificationPayload = `${certificateId}|${signerEmail || signerName}|${sigDate.toISOString()}`;
  const verificationCode = crypto.createHash('sha256').update(verificationPayload).digest('hex').slice(0, 14).toUpperCase();

  doc.fillColor('#374151').fontSize(11).text(`Digitally signed by ${signerName}`, { align: 'center' });
  if (signerEmail) {
    doc.fillColor('#6b7280').fontSize(9).text(`${signerEmail}`, { align: 'center' });
  }
  doc.moveDown(0.25);
  doc.fillColor('#6b7280').fontSize(9).text(`Verification Code: ${verificationCode}`, { align: 'center' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
};

