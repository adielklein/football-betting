// שם משתמש שמוקלד בטלפון אחד צריך להתאים לאותו שם שהוקלד בטלפון אחר.
//
// בעברית זה נשבר בשקט בשני מקומות, בלי שום הבדל שרואים בעין:
// - תווי כיווניות בלתי נראים (RLM/LRM ודומיהם) שמקלדות ו-WhatsApp מוסיפים
// - גרש וגרשיים: ' במכשיר אחד, ׳ או ’ במכשיר אחר (ג'ורג', צ'רלי)
// לכן השם עובר נרמול זהה גם בשמירה וגם בכניסה.

const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;
const APOSTROPHES = /[׳‘’ʼ´`]/g; // ׳ ‘ ’ ʼ ´ `
const QUOTES = /[״“”]/g;                    // ״ “ ”

const normalizeUsername = (value) =>
  String(value == null ? '' : value)
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(APOSTROPHES, "'")
    .replace(QUOTES, '"')
    .replace(/\s+/g, ' ')
    .trim();

module.exports = { normalizeUsername };
