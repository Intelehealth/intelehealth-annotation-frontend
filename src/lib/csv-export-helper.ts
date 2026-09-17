/**
 * CSV Export Helper Functions
 * Handles CSV generation, HTML cleaning, and file downloads
 */

export interface ExportData {
  headers: string[];
  rows: Record<string, any>[];
}

/**
 * Clean HTML content and convert to plain text
 */
export function cleanHtmlContent(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // Handle objects that might contain structured data
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      const cleanedArray = value
        .map((item) => cleanHtmlContent(item))
        .filter((item) => item !== '');
      return cleanedArray.length > 0 ? cleanedArray.join('\n') : '';
    }

    // Try to extract meaningful data from objects
    const urlKeys = ['url', 'href', 'src', 'link', 'value'];
    for (const key of urlKeys) {
      if (value[key] && typeof value[key] === 'string') {
        return cleanHtmlContent(value[key]);
      }
    }

    if (value.toString && value.toString() !== '[object Object]') {
      stringValue = value.toString();
    } else {
      return '';
    }
  }

  // Clean HTML tags and entities
  stringValue = stringValue
    // Remove HTML tags but preserve content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
    .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
    
    // Clean HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    
    // UTF-8 BOM handles Unicode encoding properly, no manual character replacement needed
    
    // Preserve original line breaks and spacing
    
    // Remove null bytes and control characters except newlines
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return stringValue;
}

/**
 * Format a value for CSV export with proper quoting
 */
export function formatCsvValue(value: any, cleanHtml: boolean = true): string {
  // Always apply HTML cleaning by default to ensure consistent output
  const stringValue = cleanHtml ? cleanHtmlContent(value) : String(value || '');
  
  if (stringValue === '') {
    return '';
  }
  
  // Check if the value looks like a large number that Excel might convert to scientific notation
  const isLargeNumber = /^\d{15,}$/.test(stringValue); // 15+ digits
  const needsQuoting = 
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    isLargeNumber; // Quote large numbers to preserve them as strings
  
  if (needsQuoting) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Convert export data to CSV content
 */
export function generateCsvContent(
  data: ExportData, 
  options: { cleanHtml?: boolean } = {}
): string {
  const { cleanHtml = true } = options;
  const { headers, rows } = data;
  
  if (rows.length === 0) {
    return headers.join(',');
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => formatCsvValue(row[header], cleanHtml))
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCsv(
  csvContent: string, 
  filename: string,
  options: { 
    showSuccess?: boolean;
    onSuccess?: (message: string) => void;
    onError?: (error: string) => void;
    actualRowCount?: number; // Add parameter to pass actual row count
  } = {}
): void {
  const { showSuccess = true, onSuccess, onError, actualRowCount } = options;
  
  try {
    // Add UTF-8 BOM to ensure proper encoding in Excel and other programs
    // This fixes Unicode character display issues (ı,ü,ö,ğ,ş showing as Ä± Ã¼ Ã¶ ÄŸ ÅŸ)
    const universalBOM = '\uFEFF';
    const csvWithBOM = universalBOM + csvContent;
    
    // Create and download CSV file
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (showSuccess && onSuccess) {
      const lines = csvContent.split('\n');
      const columnCount = lines[0] ? lines[0].split(',').length : 0;
      
      // Use actualRowCount if provided, otherwise fall back to line counting
      const rowCount = actualRowCount !== undefined ? actualRowCount : lines.filter(line => line.trim() !== '').length - 1;
      
      onSuccess(`Exported ${columnCount} columns with ${rowCount} rows successfully`);
    }
  } catch (error) {
    console.error('Error downloading CSV:', error);
    if (onError) {
      onError(`Failed to download CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * All-in-one CSV export function
 */
export function exportToCsv(
  data: ExportData,
  filename: string,
  options: {
    cleanHtml?: boolean;
    showSuccess?: boolean;
    onSuccess?: (message: string) => void;
    onError?: (error: string) => void;
    actualRowCount?: number; // Add parameter to pass actual row count
  } = {}
): void {
  const csvContent = generateCsvContent(data, { cleanHtml: options.cleanHtml });
  downloadCsv(csvContent, filename, {
    showSuccess: options.showSuccess,
    onSuccess: options.onSuccess,
    onError: options.onError,
    actualRowCount: options.actualRowCount, // Pass the actual row count
  });
}
