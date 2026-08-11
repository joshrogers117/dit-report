// Creates a demo project with sample data for new users
export async function seedDemoProject(db, userId) {
  const result = await db.prepare(`
    INSERT INTO projects (user_id, title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone, checksum_type)
    VALUES (?, 'Demo Project — Meridian Launch Film', 'Coldwater Pictures', 'Meridian Sportswear', 'Elena Vasquez', 'Tom Hargrove', 'Nina Okoro', 'Sam Whitfield', 'Your Name', 'dit@example.com', '+1 (555) 000-0000', 'xxHash64')
  `).bind(userId).run();
  const projectId = result.meta.last_row_id;

  const cam = (dayId, type, name, res, codec, cs, gamma, lut, fps, audio, label, notes, order) =>
    db.prepare('INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, gamma, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(dayId, type, name, res, codec, cs, gamma, lut, fps, audio, label, notes, order);
  const bench = (dayId, drive, w, r, cap, fmt, notes, order) =>
    db.prepare('INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)')
      .bind(dayId, drive, w, r, cap, fmt, notes, order);
  const roll = (dayId, name, serial, gb, tc, camId, m, b, notes, order) =>
    db.prepare('INSERT INTO rolls (day_id, roll_name, card_serial, gb, duration_tc, camera_id, master, backup, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(dayId, name, serial, gb, tc, camId, m, b, notes, order);

  // Inserts the standard 4-camera + sound cast for a day and returns their row ids
  const seedCameras = async dayId => {
    const results = await db.batch([
      cam(dayId, 'camera', 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'REDWideGamutRGB', 'Log3G10', 'IPP2 Rec709', '23.976', 'Onboard Scratch', 'ACAM', 'Main unit', 1),
      cam(dayId, 'camera', 'ALEXA 35', '4.6K 3:2 Open Gate', 'ARRIRAW HDE', 'AWG4', 'LogC4', 'ALF-4 Rec709', '23.976', 'Onboard Scratch', 'BCAM', 'Steadicam', 2),
      cam(dayId, 'camera', 'VENICE 2', '6K 3:2', 'X-OCN ST', 'S-Gamut3.Cine', 'S-Log3', 'LC-709TypeA', '23.976', 'Onboard 4ch', 'CCAM', 'Crane', 3),
      cam(dayId, 'camera', 'C500 Mark II', '5.9K', 'Cinema RAW Light HQ', 'Cinema Gamut', 'Canon Log 2', 'Rec709', '23.976', '', 'DCAM', 'Gimbal', 4),
      cam(dayId, 'audio', 'Sound Devices Scorpio', '48kHz', '24-bit', 'BWF Poly', '', '', '', '16 ISO tracks + LR mix', 'SOUND', 'TC synced to ACAM', 5),
    ]);
    const [aCam, bCam, cCam, dCam, sCam] = results.map(r => r.meta.last_row_id);
    return { aCam, bCam, cCam, dCam, sCam };
  };

  // ===== Day 1 =====
  const d1 = await db.prepare(
    'INSERT INTO shoot_days (project_id, day_number, date, sort_order) VALUES (?, 1, ?, 1)'
  ).bind(projectId, '2025-03-10').run();
  const day1 = d1.meta.last_row_id;

  await db.batch([
    bench(day1, 'Master', 879.8, 671.0, '4TB', 'APFS', 'Glyph Atom PRO — Thunderbolt 3', 1),
    bench(day1, 'Backup', 878.7, 668.8, '4TB', 'APFS', 'Glyph Atom PRO — Thunderbolt 3', 2),
  ]);
  const cams1 = await seedCameras(day1);

  await db.batch([
    roll(day1, 'A001_0310RK', 'ARB4BYL', 687.50, '00:38:27:12', cams1.aCam, 1, 1, '', 1),
    roll(day1, 'B001_0310PV', 'XR-K6821', 312.40, '00:24:52:08', cams1.bCam, 1, 1, '', 2),
    roll(day1, 'C001_0310MX', 'SXS-4091', 198.30, '00:15:44:20', cams1.cCam, 1, 1, '', 3),
    roll(day1, 'D001_0310FK', 'CFX-2847', 142.15, '00:11:16:03', cams1.dCam, 1, 1, '', 4),
    roll(day1, 'S001_0310', 'SD-A128', 28.60, '01:12:00:00', cams1.sCam, 1, 1, 'Audio — 16 ISO + mix', 5),
  ]);

  // ===== Day 2 =====
  const d2 = await db.prepare(
    'INSERT INTO shoot_days (project_id, day_number, date, sort_order) VALUES (?, 2, ?, 2)'
  ).bind(projectId, '2025-03-11').run();
  const day2 = d2.meta.last_row_id;

  await db.batch([
    bench(day2, 'Master', 879.8, 671.0, '4TB', 'APFS', 'Glyph Atom PRO — Thunderbolt 3', 1),
    bench(day2, 'Backup', 878.7, 668.8, '4TB', 'APFS', 'Glyph Atom PRO — Thunderbolt 3', 2),
  ]);
  const cams2 = await seedCameras(day2);

  await db.batch([
    roll(day2, 'A002_0311F4', 'AR2JAQY', 613.14, '00:34:20:10', cams2.aCam, 1, 1, '478 MB/s READ', 1),
    roll(day2, 'B002_0311N0', 'XR-K6821', 305.65, '00:24:18:21', cams2.bCam, 1, 1, '', 2),
    roll(day2, 'C002_0311MX', 'SXS-4091', 224.80, '00:17:49:14', cams2.cCam, 1, 1, '', 3),
    roll(day2, 'A003_0311WR', 'AWIGXJC', 313.53, '00:17:33:15', cams2.aCam, 1, 1, '', 4),
    roll(day2, 'B003_0311XR', 'XR-K7104', 163.03, '00:12:56:20', cams2.bCam, 1, 1, '', 5),
    roll(day2, 'D002_0311SC', 'CFX-2903', 89.32, '00:07:04:22', cams2.dCam, 1, 1, '', 6),
    roll(day2, 'S002_0311', 'SD-A128', 31.20, '01:18:30:00', cams2.sCam, 1, 1, 'Audio — 16 ISO + mix', 7),
  ]);

  // ===== Day 3 =====
  const d3 = await db.prepare(
    'INSERT INTO shoot_days (project_id, day_number, date, sort_order) VALUES (?, 3, ?, 3)'
  ).bind(projectId, '2025-03-12').run();
  const day3 = d3.meta.last_row_id;

  await db.batch([
    bench(day3, 'Master', 879.8, 671.0, '4TB', 'APFS', 'Glyph Atom PRO — Thunderbolt 3', 1),
    bench(day3, 'Backup', 878.7, 668.8, '4TB', 'APFS', 'Glyph Atom PRO — Thunderbolt 3', 2),
  ]);
  const cams3 = await seedCameras(day3);

  await db.batch([
    roll(day3, 'A004_0312XD', 'AW6PKEB', 456.40, '00:25:32:20', cams3.aCam, 1, 1, '', 1),
    roll(day3, 'B004_0312TZ', 'XR-K7104', 278.68, '00:22:05:18', cams3.bCam, 1, 1, '', 2),
    roll(day3, 'C003_0312SJ', 'SXS-4215', 185.20, '00:14:41:10', cams3.cCam, 1, 1, '', 3),
    roll(day3, 'D003_0312EP', 'CFX-2903', 167.46, '00:13:16:19', cams3.dCam, 1, 1, '', 4),
    roll(day3, 'A005_0312W8', 'ARB4BYL', 531.70, '00:29:46:18', cams3.aCam, 1, 1, '', 5),
    roll(day3, 'B005_0312MP', 'XR-K6821', 277.60, '00:22:02:16', cams3.bCam, 1, 1, '', 6),
    roll(day3, 'C004_0312LD', 'SXS-4091', 120.74, '00:09:34:16', cams3.cCam, 1, 1, 'Final setup — talent portrait', 7),
    roll(day3, 'S003_0312', 'SD-B064', 34.50, '01:26:15:00', cams3.sCam, 1, 1, 'Audio — 16 ISO + mix', 8),
  ]);
}
