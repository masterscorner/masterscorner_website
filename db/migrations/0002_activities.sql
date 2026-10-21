-- Activity list: category > discipline > style. Reference data needed in every environment.

insert into activity_nodes (kind, slug, name, emoji, sort) values
	('category', 'martial-arts', 'Martial arts', '🥋', 0),
	('category', 'dance', 'Dance', '💃', 1),
	('category', 'music', 'Music', '🎵', 2),
	('category', 'yoga', 'Yoga', '🧘', 3),
	('category', 'fitness', 'Fitness', '🏋️', 4),
	('category', 'team-sports', 'Team sports', '⚽', 5),
	('category', 'racket-sports', 'Racket sports', '🏸', 6),
	('category', 'water-sports', 'Swimming', '🏊', 7),
	('category', 'athletics', 'Athletics and outdoor', '🏃', 8),
	('category', 'arts', 'Art and craft', '🎨', 9),
	('category', 'mind-games', 'Chess and mind games', '♟️', 10);

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'karate', 'Karate', '🥋', 0),
	('discipline', 'taekwondo', 'Taekwondo', '🥋', 1),
	('discipline', 'judo', 'Judo', '🥋', 2),
	('discipline', 'kung-fu', 'Kung fu', '🥋', 3),
	('discipline', 'wushu', 'Wushu', '🥋', 4),
	('discipline', 'kickboxing', 'Kickboxing', '🥊', 5),
	('discipline', 'boxing', 'Boxing', '🥊', 6),
	('discipline', 'muay-thai', 'Muay Thai', '🥊', 7),
	('discipline', 'mma', 'Mixed martial arts (MMA)', '🥊', 8),
	('discipline', 'bjj', 'Brazilian jiu-jitsu', '🥋', 9),
	('discipline', 'aikido', 'Aikido', '🥋', 10),
	('discipline', 'kalaripayattu', 'Kalaripayattu', '⚔️', 11),
	('discipline', 'silambam', 'Silambam', '🪵', 12),
	('discipline', 'gatka', 'Gatka', '⚔️', 13),
	('discipline', 'thang-ta', 'Thang-Ta', '⚔️', 14),
	('discipline', 'wrestling', 'Wrestling (Kushti)', '🤼', 15),
	('discipline', 'self-defence', 'Self-defence', '🛡️', 16),
	('discipline', 'fencing', 'Fencing', '🤺', 17)
) as v(kind, slug, name, emoji, sort) where c.slug = 'martial-arts';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select d.id, 'style', v.slug, v.name, null, v.sort from activity_nodes d, (values
	('shotokan', 'Shotokan', 0),
	('shito-ryu', 'Shito-Ryu', 1),
	('goju-ryu', 'Goju-Ryu', 2),
	('wado-ryu', 'Wado-Ryu', 3),
	('kyokushin', 'Kyokushin', 4),
	('isshin-ryu', 'Isshin-Ryu', 5)
) as v(slug, name, sort) where d.slug = 'karate';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select d.id, 'style', v.slug, v.name, null, v.sort from activity_nodes d, (values
	('taekwondo-wt', 'World Taekwondo (WT)', 0),
	('taekwondo-itf', 'ITF Taekwon-Do', 1)
) as v(slug, name, sort) where d.slug = 'taekwondo';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select d.id, 'style', v.slug, v.name, null, v.sort from activity_nodes d, (values
	('shaolin', 'Shaolin', 0),
	('wing-chun', 'Wing Chun', 1)
) as v(slug, name, sort) where d.slug = 'kung-fu';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select d.id, 'style', v.slug, v.name, null, v.sort from activity_nodes d, (values
	('kalari-vadakkan', 'Northern (Vadakkan)', 0),
	('kalari-thekkan', 'Southern (Thekkan)', 1)
) as v(slug, name, sort) where d.slug = 'kalaripayattu';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'bharatanatyam', 'Bharatanatyam', '💃', 0),
	('discipline', 'kathak', 'Kathak', '💃', 1),
	('discipline', 'odissi', 'Odissi', '💃', 2),
	('discipline', 'kuchipudi', 'Kuchipudi', '💃', 3),
	('discipline', 'mohiniyattam', 'Mohiniyattam', '💃', 4),
	('discipline', 'manipuri', 'Manipuri', '💃', 5),
	('discipline', 'sattriya', 'Sattriya', '💃', 6),
	('discipline', 'kathakali', 'Kathakali', '🎭', 7),
	('discipline', 'folk-dance', 'Folk dance (Bhangra, Garba...)', '🪘', 8),
	('discipline', 'bollywood', 'Bollywood', '🕺', 9),
	('discipline', 'hip-hop', 'Hip-hop', '🕺', 10),
	('discipline', 'contemporary', 'Contemporary', '💃', 11),
	('discipline', 'ballet', 'Ballet', '🩰', 12),
	('discipline', 'salsa', 'Salsa', '💃', 13)
) as v(kind, slug, name, emoji, sort) where c.slug = 'dance';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select d.id, 'style', v.slug, v.name, null, v.sort from activity_nodes d, (values
	('pandanallur', 'Pandanallur', 0),
	('vazhuvoor', 'Vazhuvoor', 1),
	('kalakshetra', 'Kalakshetra', 2)
) as v(slug, name, sort) where d.slug = 'bharatanatyam';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select d.id, 'style', v.slug, v.name, null, v.sort from activity_nodes d, (values
	('kathak-jaipur', 'Jaipur gharana', 0),
	('kathak-lucknow', 'Lucknow gharana', 1),
	('kathak-banaras', 'Banaras gharana', 2)
) as v(slug, name, sort) where d.slug = 'kathak';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'carnatic-vocal', 'Carnatic vocal', '🎤', 0),
	('discipline', 'hindustani-vocal', 'Hindustani vocal', '🎤', 1),
	('discipline', 'western-vocal', 'Western vocal', '🎤', 2),
	('discipline', 'veena', 'Veena', '🪕', 3),
	('discipline', 'sitar', 'Sitar', '🪕', 4),
	('discipline', 'mridangam', 'Mridangam', '🪘', 5),
	('discipline', 'tabla', 'Tabla', '🪘', 6),
	('discipline', 'flute', 'Flute', '🪈', 7),
	('discipline', 'violin', 'Violin', '🎻', 8),
	('discipline', 'guitar', 'Guitar', '🎸', 9),
	('discipline', 'keyboard', 'Keyboard and piano', '🎹', 10),
	('discipline', 'drums', 'Drums', '🥁', 11)
) as v(kind, slug, name, emoji, sort) where c.slug = 'music';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'hatha-yoga', 'Hatha yoga', '🧘', 0),
	('discipline', 'ashtanga-yoga', 'Ashtanga yoga', '🧘', 1),
	('discipline', 'iyengar-yoga', 'Iyengar yoga', '🧘', 2),
	('discipline', 'power-yoga', 'Power yoga', '🧘', 3),
	('discipline', 'kids-yoga', 'Yoga for kids', '🧘', 4)
) as v(kind, slug, name, emoji, sort) where c.slug = 'yoga';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'gym-training', 'Gym training', '🏋️', 0),
	('discipline', 'zumba', 'Zumba', '💃', 1),
	('discipline', 'aerobics', 'Aerobics', '🤸', 2),
	('discipline', 'gymnastics', 'Gymnastics', '🤸', 3),
	('discipline', 'mallakhamb', 'Mallakhamb', '🤸', 4),
	('discipline', 'calisthenics', 'Calisthenics', '💪', 5),
	('discipline', 'pilates', 'Pilates', '🧘', 6)
) as v(kind, slug, name, emoji, sort) where c.slug = 'fitness';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'cricket', 'Cricket', '🏏', 0),
	('discipline', 'football', 'Football', '⚽', 1),
	('discipline', 'basketball', 'Basketball', '🏀', 2),
	('discipline', 'volleyball', 'Volleyball', '🏐', 3),
	('discipline', 'kabaddi', 'Kabaddi', '🤼', 4),
	('discipline', 'kho-kho', 'Kho-kho', '🏃', 5),
	('discipline', 'hockey', 'Hockey', '🏑', 6),
	('discipline', 'throwball', 'Throwball', '🏐', 7)
) as v(kind, slug, name, emoji, sort) where c.slug = 'team-sports';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'badminton', 'Badminton', '🏸', 0),
	('discipline', 'tennis', 'Tennis', '🎾', 1),
	('discipline', 'table-tennis', 'Table tennis', '🏓', 2),
	('discipline', 'squash', 'Squash', '🎾', 3),
	('discipline', 'pickleball', 'Pickleball', '🏓', 4)
) as v(kind, slug, name, emoji, sort) where c.slug = 'racket-sports';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'swimming', 'Swimming', '🏊', 0),
	('discipline', 'water-polo', 'Water polo', '🤽', 1)
) as v(kind, slug, name, emoji, sort) where c.slug = 'water-sports';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'running', 'Running and athletics', '🏃', 0),
	('discipline', 'skating', 'Skating', '🛼', 1),
	('discipline', 'cycling', 'Cycling', '🚴', 2),
	('discipline', 'archery', 'Archery', '🏹', 3),
	('discipline', 'shooting', 'Shooting', '🎯', 4),
	('discipline', 'horse-riding', 'Horse riding', '🏇', 5)
) as v(kind, slug, name, emoji, sort) where c.slug = 'athletics';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'drawing', 'Drawing', '🖍️', 0),
	('discipline', 'painting', 'Painting', '🎨', 1),
	('discipline', 'clay', 'Clay and pottery', '🏺', 2),
	('discipline', 'calligraphy', 'Calligraphy', '✒️', 3)
) as v(kind, slug, name, emoji, sort) where c.slug = 'arts';

insert into activity_nodes (parent_id, kind, slug, name, emoji, sort)
select c.id, v.kind, v.slug, v.name, v.emoji, v.sort from activity_nodes c, (values
	('discipline', 'chess', 'Chess', '♟️', 0),
	('discipline', 'carrom', 'Carrom', '🎯', 1),
	('discipline', 'abacus', 'Abacus', '🧮', 2)
) as v(kind, slug, name, emoji, sort) where c.slug = 'mind-games';

-- Ready-made level lists a class can copy.
with s as (insert into level_systems (activity_id, name) values ((select id from activity_nodes where slug = 'karate'), 'Karate belts (kyu)') returning id)
insert into levels (system_id, position, name, color) select s.id, v.p, v.n, v.c from s, (values
	(0, 'White', '#F4F4F4'),
	(1, 'Yellow', '#F5C400'),
	(2, 'Orange', '#F08A00'),
	(3, 'Green', '#2E9E4F'),
	(4, 'Blue', '#2563C9'),
	(5, 'Purple', '#7B3FB3'),
	(6, 'Brown', '#7A4A21'),
	(7, 'Black', '#111111')
) as v(p, n, c);

with s as (insert into level_systems (activity_id, name) values ((select id from activity_nodes where slug = 'taekwondo'), 'Taekwondo belts') returning id)
insert into levels (system_id, position, name, color) select s.id, v.p, v.n, v.c from s, (values
	(0, 'White', '#F4F4F4'),
	(1, 'Yellow', '#F5C400'),
	(2, 'Green', '#2E9E4F'),
	(3, 'Blue', '#2563C9'),
	(4, 'Red', '#C8102E'),
	(5, 'Black', '#111111')
) as v(p, n, c);

with s as (insert into level_systems (activity_id, name) values ((select id from activity_nodes where slug = 'judo'), 'Judo belts') returning id)
insert into levels (system_id, position, name, color) select s.id, v.p, v.n, v.c from s, (values
	(0, 'White', '#F4F4F4'),
	(1, 'Yellow', '#F5C400'),
	(2, 'Orange', '#F08A00'),
	(3, 'Green', '#2E9E4F'),
	(4, 'Blue', '#2563C9'),
	(5, 'Brown', '#7A4A21'),
	(6, 'Black', '#111111')
) as v(p, n, c);

with s as (insert into level_systems (activity_id, name) values ((select id from activity_nodes where slug = 'bjj'), 'BJJ belts') returning id)
insert into levels (system_id, position, name, color) select s.id, v.p, v.n, v.c from s, (values
	(0, 'White', '#F4F4F4'),
	(1, 'Blue', '#2563C9'),
	(2, 'Purple', '#7B3FB3'),
	(3, 'Brown', '#7A4A21'),
	(4, 'Black', '#111111')
) as v(p, n, c);

with s as (insert into level_systems (activity_id, name) values (null, 'Beginner to advanced') returning id)
insert into levels (system_id, position, name, color) select s.id, v.p, v.n, v.c from s, (values
	(0, 'Beginner', '#C9CEE6'),
	(1, 'Intermediate', '#7F8BC7'),
	(2, 'Advanced', '#22307A')
) as v(p, n, c);
