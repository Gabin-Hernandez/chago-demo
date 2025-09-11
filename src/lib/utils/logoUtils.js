/**
 * Utility functions for handling logo in PDF generation
 */

/**
 * Convert image URL to base64 for PDF embedding with transparency handling
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string>} Base64 encoded image
 */
export const imageToBase64 = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Fill with white background first to handle transparency
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image on top
      ctx.drawImage(img, 0, 0);
      
      try {
        // Convert to PNG for better transparency support
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Add logo to PDF document
 * @param {jsPDF} doc - PDF document instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Logo width
 * @param {number} height - Logo height
 */
export const addLogoToPDF = async (doc, x = 15, y = 8, width = 25, height = 25) => {
  try {
    // Try multiple logo paths
    const logoUrls = [
      `${window.location.origin}/logo.webp`,
      '/logo.webp',
      './logo.webp',
      `${window.location.origin}/logo.png`,
      '/logo.png'
    ];
    
    let base64Logo = null;
    let logoLoaded = false;
    
    for (const logoUrl of logoUrls) {
      try {
        base64Logo = await imageToBase64(logoUrl);
        logoLoaded = true;
        console.log(`✅ Logo cargado exitosamente desde: ${logoUrl}`);
        break;
      } catch (error) {
        console.log(`❌ No se pudo cargar logo desde: ${logoUrl}`);
        continue;
      }
    }
    
    if (!logoLoaded) {
      throw new Error('No se pudo cargar el logo desde ninguna ubicación');
    }
    
    // Create a white background circle/rectangle for the logo to remove black background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Add the logo image to PDF with transparent background handling
    doc.addImage(base64Logo, 'PNG', x + 2, y + 2, width - 4, height - 4);
    
    console.log('✅ Logo añadido exitosamente al PDF');
    return true;
  } catch (error) {
    console.error('❌ Error adding logo to PDF:', error);
    console.log('🔄 Usando fallback de texto estilizado...');
    
    // Fallback: Create a styled text logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 107, 0); // Santiago FC orange
    doc.setFont('helvetica', 'bold');
    doc.text('SFC', x + width/2, y + height/2 + 2, { align: 'center' });
    
    console.log('⚠️ Logo fallback aplicado (texto SFC)');
    return false;
  }
};