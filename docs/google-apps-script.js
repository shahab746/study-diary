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
 * The Users sheet should have these columns (in order):
 * A: Name | B: Phone | C: Grade | D: Board | E: Field | F: Status
 * G: StartDate | H: TargetDate | I: CurrentDay | J: TotalDays
 * K: (pacingGoal - optional) | L: TopicsDone | M: DaysLeft
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

    var data = JSON.parse(e.postData.contents);

    // Validate required fields
    if (!data.name || !data.phone || !data.pin) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Missing required fields' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Check for duplicate phone number
    var phoneColumn = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < phoneColumn.length; i++) {
      if (phoneColumn[i][0].toString().trim() === data.phone.toString().trim()) {
        return ContentService
          .createTextOutput(JSON.stringify({ success: false, error: 'Phone number already exists' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Append the new user row
    sheet.appendRow([
      data.name,                          // A: Name
      data.phone,                         // B: Phone
      data.grade || 10,                   // C: Grade
      data.board || 'BISE Abbottabad',    // D: Board
      data.field || 'Science',            // E: Field
      data.status || 'free',              // F: Status
      data.startDate || '',               // G: StartDate
      data.targetDate || '',              // H: TargetDate
      data.currentDay || 1,               // I: CurrentDay
      data.totalDays || 438,              // J: TotalDays
      '',                                 // K: pacingGoal (empty — set by app)
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

// Handle GET requests (for testing)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Study Diary Registration API is running',
      version: '1.0.0'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
