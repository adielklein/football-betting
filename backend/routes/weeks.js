const express = require('express');
const Week = require('../models/Week');
const Match = require('../models/Match');
const { sendWeekActivationNotification } = require('../services/pushNotifications');
const router = express.Router();

// Get all weeks
router.get('/', async (req, res) => {
  try {
    const weeks = await Week.find().sort({ createdAt: 1 });
    res.json(weeks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get week by ID with matches
router.get('/:id', async (req, res) => {
  try {
    const week = await Week.findById(req.params.id);
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    const matches = await Match.find({ weekId: req.params.id });
    
    res.json({ week, matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new week
router.post('/', async (req, res) => {
  try {
    const { name, month, season } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Week name is required' });
    }
    
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }
    
    const week = new Week({ 
      name, 
      month: parseInt(month),
      season: season || '2025-26'
    });
    await week.save();
    
    console.log('Created new week:', week);
    res.status(201).json(week);
  } catch (error) {
    console.error('Error creating week:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update week
router.patch('/:id', async (req, res) => {
  try {
    const weekId = req.params.id;
    const { name, month, season } = req.body;
    
    console.log(`Updating week ${weekId} with:`, { name, month, season });
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Week name is required and cannot be empty' });
    }
    
    const updateData = { name: name.trim() };
    if (month !== undefined) updateData.month = parseInt(month);
    if (season) updateData.season = season.trim();
    
    const week = await Week.findByIdAndUpdate(
      weekId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!week) {
      console.log('Week not found:', weekId);
      return res.status(404).json({ message: 'Week not found' });
    }
    
    console.log('Week updated successfully:', week);
    res.json(week);
  } catch (error) {
    console.error('Error updating week:', error);
    res.status(500).json({ message: error.message });
  }
});

// Activate week with optional notifications
router.patch('/:id/activate', async (req, res) => {
  try {
    const { lockTime, sendNotifications, notificationTitle, notificationBody, imageUrl } = req.body;
    
    console.log('📥 Received activation request with:', {
      lockTime,
      sendNotifications,
      notificationTitle: notificationTitle ? `"${notificationTitle}"` : 'undefined',
      notificationBody: notificationBody ? `"${notificationBody}"` : 'undefined',
      imageUrl: imageUrl ? `Base64 (${imageUrl.length} chars)` : 'undefined'
    });
    
    if (!lockTime) {
      return res.status(400).json({ message: 'Lock time is required' });
    }
    
    const week = await Week.findByIdAndUpdate(
      req.params.id,
      {
        active: true,
        locked: false,
        lockTime: new Date(lockTime)
      },
      { new: true }
    );
    
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    console.log(`✅ Week ${week.name} activated with lock time: ${lockTime}`);
    
    // שלח התראות אם התבקש
    let notificationResult = null;
    if (sendNotifications) {
      console.log('📢 Sending activation notifications...');
      console.log('📢 Parameters:', {
        customTitle: notificationTitle,
        customBody: notificationBody,
        imageUrl: imageUrl ? 'present' : 'none'
      });
      
      notificationResult = await sendWeekActivationNotification(week, {
        customTitle: notificationTitle,
        customBody: notificationBody,
        imageUrl: imageUrl
      });
      
      console.log('📢 Notification result:', notificationResult);
    } else {
      console.log('⏭️ Skipping notifications (sendNotifications = false)');
    }
    
    res.json({ 
      week, 
      notificationResult,
      message: 'Week activated successfully' 
    });
  } catch (error) {
    console.error('Error activating week:', error);
    res.status(500).json({ message: error.message });
  }
});

// Deactivate week
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const week = await Week.findByIdAndUpdate(
      req.params.id,
      {
        active: false,
        locked: false,
        lockTime: null
      },
      { new: true }
    );
    
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    console.log(`Week ${week.name} deactivated`);
    res.json(week);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete week
router.delete('/:id', async (req, res) => {
  try {
    const week = await Week.findById(req.params.id);
    
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    // Delete all matches for this week
    await Match.deleteMany({ weekId: req.params.id });
    
    // Delete the week
    await Week.findByIdAndDelete(req.params.id);
    
    console.log(`Week ${week.name} and its matches deleted`);
    res.json({ message: 'Week deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;