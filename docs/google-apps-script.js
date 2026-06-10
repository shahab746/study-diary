/**
 * Google Apps Script — Study Diary User Registration
 *
 * Deploy this script in your Google Sheet to enable the registration feature
 * to write new users directly to the "Users" sheet.
 *
 * SETUP INSTRUCTIONS:
 * ==================
 * 1. Open your Study Diary Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click "Deploy" → "New deployment"
 * 5. Choose type: "Web app"
 * 6. Set "Execute as" to "Me" (your Google account)
 * 7. Set "Who has access" to "Anyone"
 * 8. Click "Deploy" and authorize when prompted
 * 9. Copy the Web App URL
 * 10. Add it to your .env as GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
 *
 * SHEET STRUCTURE (auto-setup):
 * =============================
 * The script will automatically add missing column headers if they don't exist.
 * Expected columns after setup:
 * A: Name | B: Phone | C: Grade | D: Board | E: Field | F: is_paid
 * G: Start_Date | H: Target_Date | I: CurrentDay | J: TotalDays
 * K: PacingGoal | L: TopicsDone | M: DaysLeft
 * N: AcademicGroup | O: TopicsPerDay | P: PIN
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Users sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Auto-setup: ensure all column headers exist ──
    ensureHeaders(sheet);

    var data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.name || !data.phone || !data.pin) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Missing required fields: name, phone, pin' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Check for duplicate phone number
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var phoneColumn = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var i = 0; i < phoneColumn.length; i++) {
        if (phoneColumn[i][0].toString().trim() === data.phone.toString().trim()) {
          return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: 'Phone number already exists' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // ── Map status to is_paid ──
    // The sheet uses "is_paid" (TRUE/FALSE) in column F
    // The app sends "status" ('free'/'paid') — we convert it
    var isPaid = false;
    if (data.status) {
      isPaid = data.status.toString().toLowerCase() === 'paid';
    }
    if (data.is_paid !== undefined) {
      isPaid = data.is_paid === true || data.is_paid === 'TRUE' || data.is_paid === 'true';
    }

    // ── Append the new user row (16 columns) ──
    sheet.appendRow([
      data.name,                          // A: Name
      data.phone,                         // B: Phone
      data.grade || 10,                   // C: Grade
      data.board || 'BISE Abbottabad',    // D: Board
      data.field || 'Science',            // E: Field
      isPaid,                             // F: is_paid (TRUE/FALSE)
      data.startDate || '',               // G: Start_Date
      data.targetDate || '',              // H: Target_Date
      data.currentDay || 1,               // I: CurrentDay
      data.totalDays || 438,              // J: TotalDays
      data.pacingGoal || '',              // K: PacingGoal
      data.topicsDone || 0,               // L: TopicsDone
      data.daysLeft || data.totalDays || 438, // M: DaysLeft
      data.academicGroup || '',           // N: AcademicGroup
      data.topicsPerDay || 4,             // O: TopicsPerDay
      data.pin,                           // P: PIN
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Ensure all required column headers exist in the sheet.
 * Adds missing columns (I-P) if the sheet only has the basic 8 columns.
 * Does NOT overwrite existing headers or data.
 */
function ensureHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  var headerRow = 1;

  // Expected headers in order (A through P)
  var expectedHeaders = [
    'Name',           // A
    'Phone',          // B
    'Grade',          // C
    'Board',          // D
    'Field',          // E
    'is_paid',        // F - matches user's existing column
    'Start_Date',     // G
    'Target_Date',    // H
    'CurrentDay',     // I
    'TotalDays',      // J
    'PacingGoal',     // K
    'TopicsDone',     // L
    'DaysLeft',       // M
    'AcademicGroup',  // N
    'TopicsPerDay',   // O
    'PIN',            // P
  ];

  // If no headers at all, set all of them
  if (lastCol === 0) {
    sheet.getRange(headerRow, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  // Read existing headers
  var existingHeaders = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

  // Check if we need to add more columns
  if (lastCol < expectedHeaders.length) {
    // Add the missing columns
    var newHeaders = expectedHeaders.slice(lastCol);
    sheet.getRange(headerRow, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
  }

  // Also fix any mismatched header names for existing columns
  // Only update if the existing header is empty or doesn't match
  for (var col = 0; col < Math.min(existingHeaders.length, expectedHeaders.length); col++) {
    var currentHeader = existingHeaders[col].toString().trim();
    var expectedHeader = expectedHeaders[col].trim();
    // Don't overwrite custom headers like "is_paid" — they're intentional
    // Only fill in empty ones
    if (!currentHeader && expectedHeader) {
      sheet.getRange(headerRow, col + 1).setValue(expectedHeader);
    }
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Study Diary Registration API is running',
      version: '2.0.0'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
