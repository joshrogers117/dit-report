DELETE FROM projects;

INSERT INTO projects (id, title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone)
VALUES (1, 'Winter 2026 Tech Release', 'Ridge Studios', 'Flexport', 'John David Wright', 'Josh Ferrara', 'Cole Sullivan', 'Andrew Friedrichs', 'Josh Rogers', 'dit@example.com', '+1 (555) 000-0000');

-- Day 1
INSERT INTO shoot_days (id, project_id, day_number, date, sort_order) VALUES (1, 1, 1, '2024-11-13', 1);
INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (1, 'Echo_01', 879.8, 671.0, '4TB', 'APFS', 'SanDisk Extreme 55AE', 1);
INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (1, 'Echo_02', 878.7, 668.8, '4TB', 'APFS', 'SanDisk Extreme 55AE', 2);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (1, 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'ACAM', '', 1);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (1, 'KOMODO X', '6K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'BCAM', '', 2);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (1, 'ALEXA 35', '4.6K 3:2', 'ARRIRAW HDE', 'LogC4', 'ALF-4 Rec709', '23.976', 'CCAM', '', 3);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (1, 'B001_1113PV', 0, 'AOGPAWF', 267.75, '00:26:35:14', 38294, 1, 1, '', 1);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (1, 'C001_1113RK', 0, 'CDX-38147', 42.61, '00:03:23:01', 4873, 1, 1, 'Codex Compact Drive', 2);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (1, 'A001_11121K', 0, 'ARB4BYL', 1004.87, '00:56:17:00', 81048, 1, 1, '', 3);

-- Day 2
INSERT INTO shoot_days (id, project_id, day_number, date, sort_order) VALUES (2, 1, 2, '2024-11-14', 2);
INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (2, 'Echo_01', 879.8, 671.0, '4TB', 'APFS', 'SanDisk Extreme 55AE', 1);
INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (2, 'Echo_02', 878.7, 668.8, '4TB', 'APFS', 'SanDisk Extreme 55AE', 2);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (2, 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'ACAM', '', 1);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (2, 'KOMODO X', '6K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'BCAM', '', 2);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (2, 'ALEXA 35', '4.6K 3:2', 'ARRIRAW HDE', 'LogC4', 'ALF-4 Rec709', '23.976', 'CCAM', '', 3);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A002_1114F4', 0, 'AR2JAQY', 613.14, '00:34:20:10', 49450, 1, 1, '478 MB/s READ', 1);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'B002_1114N0', 0, 'AU4YPWD', 305.65, '00:30:22:21', 43749, 1, 1, '474 MB/s READ', 2);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A003_1114MX', 0, 'AW6PKEB', 542.77, '00:30:23:22', 43774, 1, 1, '477 MB/s READ', 3);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'LUNCH', 1, '', 0, '00:00:00:00', 0, 0, 0, '', 4);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A004_1114WR', 0, 'AWIGXJC', 313.53, '00:17:33:15', 25287, 1, 1, '475 MB/s READ', 5);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A005_1114XR', 0, 'ARB4BYL', 163.03, '00:09:07:20', 13148, 1, 1, '470 MB/s READ', 6);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A006_1114SC', 0, 'AR2JAQY', 69.32, '00:03:52:22', 5590, 1, 1, '473 MB/s READ', 7);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'C002_1114FY', 0, 'CDX-38291', 18.44, '00:01:28:06', 2118, 1, 1, 'Codex Compact Drive', 8);

-- Day 3
INSERT INTO shoot_days (id, project_id, day_number, date, sort_order) VALUES (3, 1, 3, '2024-11-15', 3);
INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (3, 'Frank_01', 2668.9, 2669.2, '4TB', 'APFS', 'PCIe SSD Media - Glyph', 1);
INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (3, 'Frank_02', 2639.6, 2674.2, '4TB', 'APFS', 'PCIe SSD Media - Glyph', 2);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (3, 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'ACAM', '', 1);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (3, 'KOMODO X', '6K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'BCAM', '', 2);
INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (3, 'ALEXA 35', '4.6K 3:2', 'ARRIRAW HDE', 'LogC4', 'ALF-4 Rec709', '23.976', 'CCAM', '', 3);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'C003_1115SJ', 0, 'CDX-38503', 35.82, '00:02:51:10', 4114, 1, 1, 'Codex Compact Drive', 1);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A007_1115XD', 0, 'AW6PKEB', 226.4, '00:12:40:20', 18260, 1, 1, '683 MB/s READ burst, then slows down to 370 MB/s', 2);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'B003_1115TZ', 0, 'APLCHRY', 178.68, '00:17:45:18', 25578, 1, 1, '', 3);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A008_1115EP', 0, 'AWIGXJC', 267.46, '00:14:58:19', 21571, 1, 1, '', 4);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'LUNCH', 1, '', 0, '00:00:00:00', 0, 0, 0, '', 5);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A009_1115W8', 0, 'ARB4BYL', 531.7, '00:29:46:18', 42882, 1, 1, '', 6);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A010_1115LD', 0, 'AR2JAQY', 20.74, '00:01:09:16', 1672, 1, 1, 'Final portrait', 7);
INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'B004_1115MP', 0, 'AOGPAWF', 177.6, '00:17:38:16', 25408, 1, 1, '', 8);
