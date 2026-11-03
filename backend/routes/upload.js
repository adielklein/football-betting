const express = require('express');
const { requireAdmin } = require('../middleware/requireAdmin');
const router = express.Router();

// ImgBB API Key - מ-.env
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

if (!IMGBB_API_KEY) {
  console.warn('⚠️ [UPLOAD] IMGBB_API_KEY not configured');
}

/**
 * POST /api/upload/notification-image
 * מעלה תמונה ל-ImgBB (משתמש ב-fetch המובנה של Node.js 18+)
 */
// רק אדמין - בלי זה כל אחד יכול היה להעלות תמונות על חשבון מפתח ה-ImgBB
router.post('/notification-image', requireAdmin, async (req, res) => {
  try {
    if (!IMGBB_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'ImgBB API key not configured'
      });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }

    console.log('📤 [UPLOAD] Uploading image to ImgBB...');

    // הסר את ה-prefix של Base64 אם קיים
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // בניית URL עם query params
    const uploadUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

    // יצירת form data
    const formData = new URLSearchParams();
    formData.append('image', base64Data);

    // העלאה ל-ImgBB
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [UPLOAD] ImgBB error:', errorText);
      throw new Error(`ImgBB upload failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    // ImgBB מחזיר מספר URLs - נשתמש ב-display_url
    const imageUrl = data.data.display_url;

    console.log('✅ [UPLOAD] Image uploaded successfully:', imageUrl);

    res.json({
      success: true,
      url: imageUrl,
      delete_url: data.data.delete_url, // לינק למחיקה אם צריך
      message: 'התמונה הועלתה בהצלחה'
    });

  } catch (error) {
    console.error('❌ [UPLOAD] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/upload/status
 * בדיקת סטטוס API
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: !!IMGBB_API_KEY,
    service: 'ImgBB',
    message: IMGBB_API_KEY ? 'ImgBB configured' : 'ImgBB API key missing'
  });
});

module.exports = router;