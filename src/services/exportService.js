const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Clean & Format Strings for Document Generators
 */
function cleanText(text) {
  if (!text) return '';
  return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Generate Executive ATS-Friendly DOCX Resume
 * @param {Object} data 
 * @returns {Promise<Buffer>}
 */
async function generateResumeDocx(data = {}) {
  const {
    name = 'Candidate Name',
    title = 'Professional Title',
    email = '',
    phone = '',
    location = '',
    linkedIn = '',
    summary = '',
    skills = [],
    experience = '',
    education = '',
    projects = ''
  } = data;

  const contactParts = [email, phone, location, linkedIn].filter(Boolean);
  const contactLine = contactParts.join('  |  ');

  const children = [];

  // 1. Header: Candidate Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: (name || 'Candidate Name').toUpperCase(),
          bold: true,
          size: 32, // 16pt
          font: 'Calibri',
          color: '111111'
        })
      ]
    })
  );

  // 2. Sub-header: Title / Profession
  if (title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 24, // 12pt
            font: 'Calibri',
            color: '243E36' // Rankly Forest Green
          })
        ]
      })
    );
  }

  // 3. Contact Line
  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactLine,
            size: 19, // ~9.5pt
            font: 'Calibri',
            color: '555555'
          })
        ]
      })
    );
  }

  // Helper: Section Heading
  const addSectionHeading = (headingText) => {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        border: {
          bottom: {
            color: '243E36',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 12
          }
        },
        children: [
          new TextRun({
            text: headingText.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            font: 'Calibri',
            color: '243E36'
          })
        ]
      })
    );
  };

  // 4. Professional Summary
  const cleanSummary = cleanText(summary);
  if (cleanSummary) {
    addSectionHeading('Professional Summary');
    children.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: cleanSummary,
            size: 20, // 10pt
            font: 'Calibri',
            color: '222222'
          })
        ]
      })
    );
  }

  // 5. Technical & Core Skills
  let skillsList = Array.isArray(skills) ? skills : String(skills || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  if (skillsList.length > 0) {
    addSectionHeading('Technical & Professional Competencies');
    children.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: skillsList.join('  •  '),
            size: 20,
            font: 'Calibri',
            color: '222222'
          })
        ]
      })
    );
  }

  // 6. Professional Experience
  const cleanExp = cleanText(experience);
  if (cleanExp) {
    addSectionHeading('Professional Experience');
    const expLines = cleanExp.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of expLines) {
      const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
      const textContent = isBullet ? line.replace(/^[-•*]\s*/, '') : line;
      children.push(
        new Paragraph({
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: isBullet ? 50 : 100 },
          children: [
            new TextRun({
              text: textContent,
              size: 20,
              font: 'Calibri',
              bold: !isBullet && (line.includes('|') || line.length < 50),
              color: '222222'
            })
          ]
        })
      );
    }
  }

  // 7. Education
  const cleanEdu = cleanText(education);
  if (cleanEdu) {
    addSectionHeading('Education & Credentials');
    const eduLines = cleanEdu.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of eduLines) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: line,
              size: 20,
              font: 'Calibri',
              color: '222222'
            })
          ]
        })
      );
    }
  }

  // 8. Key Projects
  const cleanProj = cleanText(projects);
  if (cleanProj) {
    addSectionHeading('Key Projects & Portfolio');
    const projLines = cleanProj.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of projLines) {
      const isBullet = line.startsWith('-') || line.startsWith('•');
      children.push(
        new Paragraph({
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: isBullet ? line.replace(/^[-•]\s*/, '') : line,
              size: 20,
              font: 'Calibri',
              color: '222222'
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 in
            bottom: 720,
            left: 720,
            right: 720
          }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generate Cover Letter DOCX
 * @param {Object} data 
 * @returns {Promise<Buffer>}
 */
async function generateCoverLetterDocx(data = {}) {
  const {
    candidateName = 'Candidate Name',
    candidateEmail = '',
    candidatePhone = '',
    targetRole = 'Target Role',
    companyName = 'Target Company',
    letterContent = ''
  } = data;

  const children = [];

  // Header
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: candidateName,
          bold: true,
          size: 26,
          font: 'Calibri',
          color: '111111'
        })
      ]
    })
  );

  const contactStr = [candidateEmail, candidatePhone].filter(Boolean).join('  |  ');
  if (contactStr) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: contactStr,
            size: 19,
            font: 'Calibri',
            color: '666666'
          })
        ]
      })
    );
  }

  // Date
  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          size: 20,
          font: 'Calibri',
          color: '444444'
        })
      ]
    })
  );

  // Recipient
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: 'Hiring Team',
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '222222'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${companyName || 'Company'} Recruitment Team`,
          size: 20,
          font: 'Calibri',
          color: '444444'
        })
      ]
    })
  );

  // Subject Line
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `Application for ${targetRole || 'Open Position'}`,
          bold: true,
          size: 21,
          font: 'Calibri',
          color: '243E36'
        })
      ]
    })
  );

  // Body Paragraphs
  const paragraphs = cleanText(letterContent).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: para.replace(/\n/g, ' '),
            size: 21, // ~10.5pt
            font: 'Calibri',
            color: '222222'
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generate Executive ATS-Friendly PDF Resume using pdf-lib
 * @param {Object} data 
 * @returns {Promise<Buffer>}
 */
async function generateResumePdf(data = {}) {
  const {
    name = 'Candidate Name',
    title = 'Professional Title',
    email = '',
    phone = '',
    location = '',
    summary = '',
    skills = [],
    experience = '',
    education = ''
  } = data;

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4: 595 x 842 points
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const contentWidth = 595.28 - (margin * 2);
  let y = 841.89 - margin;

  const checkPageBreak = (neededHeight = 30) => {
    if (y - neededHeight < margin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    }
  };

  // 1. Candidate Name
  page.drawText((name || 'Candidate Name').toUpperCase(), {
    x: margin,
    y: y - 18,
    size: 20,
    font: fontBold,
    color: rgb(0.07, 0.07, 0.07)
  });
  y -= 30;

  // 2. Title
  if (title) {
    page.drawText(title, {
      x: margin,
      y: y - 12,
      size: 13,
      font: fontBold,
      color: rgb(0.14, 0.24, 0.21) // #243E36
    });
    y -= 20;
  }

  // 3. Contact Line
  const contact = [email, phone, location].filter(Boolean).join('   |   ');
  if (contact) {
    page.drawText(contact, {
      x: margin,
      y: y - 10,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35)
    });
    y -= 25;
  }

  // Draw Divider Line
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + contentWidth, y },
    thickness: 1.5,
    color: rgb(0.14, 0.24, 0.21)
  });
  y -= 15;

  const drawSectionTitle = (titleText) => {
    checkPageBreak(40);
    page.drawText(titleText.toUpperCase(), {
      x: margin,
      y: y - 12,
      size: 11,
      font: fontBold,
      color: rgb(0.14, 0.24, 0.21)
    });
    y -= 16;
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + contentWidth, y },
      thickness: 0.75,
      color: rgb(0.8, 0.8, 0.8)
    });
    y -= 12;
  };

  // Helper for word wrapping
  const wrapText = (text, maxWidth, fontSize, font) => {
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Summary
  if (summary) {
    drawSectionTitle('Professional Summary');
    const summaryLines = wrapText(cleanText(summary), contentWidth, 9.5, fontRegular);
    for (const line of summaryLines) {
      checkPageBreak(15);
      page.drawText(line, { x: margin, y: y - 10, size: 9.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
    }
    y -= 8;
  }

  // Skills
  const skillsArr = Array.isArray(skills) ? skills : String(skills || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  if (skillsArr.length > 0) {
    drawSectionTitle('Technical Competencies');
    const skillsText = skillsArr.join('   •   ');
    const skillLines = wrapText(skillsText, contentWidth, 9.5, fontRegular);
    for (const line of skillLines) {
      checkPageBreak(15);
      page.drawText(line, { x: margin, y: y - 10, size: 9.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
    }
    y -= 8;
  }

  // Experience
  if (experience) {
    drawSectionTitle('Work Experience');
    const expLines = cleanText(experience).split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of expLines) {
      const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
      const cleanLine = isBullet ? line.replace(/^[-•*]\s*/, '') : line;
      const wrapped = wrapText(cleanLine, contentWidth - (isBullet ? 15 : 0), 9.5, fontRegular);
      for (let i = 0; i < wrapped.length; i++) {
        checkPageBreak(15);
        if (isBullet && i === 0) {
          page.drawText('•', { x: margin, y: y - 10, size: 10, font: fontBold, color: rgb(0.14, 0.24, 0.21) });
          page.drawText(wrapped[i], { x: margin + 12, y: y - 10, size: 9.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
        } else {
          page.drawText(wrapped[i], { x: isBullet ? margin + 12 : margin, y: y - 10, size: 9.5, font: isBullet ? fontRegular : fontBold, color: rgb(0.15, 0.15, 0.15) });
        }
        y -= 13;
      }
      y -= 3;
    }
    y -= 5;
  }

  // Education
  if (education) {
    drawSectionTitle('Education & Credentials');
    const eduLines = cleanText(education).split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of eduLines) {
      const wrapped = wrapText(line, contentWidth, 9.5, fontRegular);
      for (const wl of wrapped) {
        checkPageBreak(15);
        page.drawText(wl, { x: margin, y: y - 10, size: 9.5, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
        y -= 13;
      }
      y -= 2;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateResumeDocx,
  generateCoverLetterDocx,
  generateResumePdf
};
