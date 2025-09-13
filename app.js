(function () {
	// Simple SPA Router and State using localStorage
	const app = document.getElementById('app');
	const nav = document.getElementById('nav');
	const logoutBtn = document.getElementById('logoutBtn');

	const STORAGE_KEYS = {
		users: 'spa_users',
		session: 'spa_session',
		groups: 'spa_groups',
		exams: 'spa_exams',
		results: 'spa_results',
		ai: 'spa_ai',
		documents: 'spa_documents',
		sync: 'spa_sync'
	};

	// Cấu hình đồng bộ dữ liệu
	const SYNC_CONFIG = {
		apiUrl: 'https://api.jsonbin.io/v3/b',
		apiKey: '$2a$10$abc123def456ghi789jkl012mno345pqr678stu901vwx234yz', // API key mẫu
		bins: {
			users: '65f1234567890abcdef12345',
			exams: '65f1234567890abcdef12346', 
			documents: '65f1234567890abcdef12347',
			results: '65f1234567890abcdef12348'
		}
	};

	function getStore(key, fallback) {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : (fallback ?? null);
		} catch (_) { return fallback ?? null; }
	}
	function setStore(key, value) { 
		localStorage.setItem(key, JSON.stringify(value)); 
		// Tự động đồng bộ dữ liệu quan trọng
		if (['users', 'exams', 'documents', 'results'].includes(key)) {
			syncToCloud(key, value);
		}
	}

	// Hàm đồng bộ dữ liệu lên cloud
	async function syncToCloud(key, data) {
		try {
			const binId = SYNC_CONFIG.bins[key];
			if (!binId) return;

			const response = await fetch(`${SYNC_CONFIG.apiUrl}/${binId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'X-Master-Key': SYNC_CONFIG.apiKey
				},
				body: JSON.stringify(data)
			});

			if (response.ok) {
				console.log(`✅ Đồng bộ ${key} thành công`);
				// Lưu thời gian sync cuối
				const syncData = getStore(STORAGE_KEYS.sync, {});
				syncData[key] = { lastSync: Date.now(), status: 'success' };
				localStorage.setItem(STORAGE_KEYS.sync, JSON.stringify(syncData));
			}
		} catch (error) {
			console.error(`❌ Lỗi đồng bộ ${key}:`, error);
		}
	}

	// Hàm tải dữ liệu từ cloud
	async function syncFromCloud(key) {
		try {
			const binId = SYNC_CONFIG.bins[key];
			if (!binId) return null;

			const response = await fetch(`${SYNC_CONFIG.apiUrl}/${binId}/latest`, {
				headers: {
					'X-Master-Key': SYNC_CONFIG.apiKey
				}
			});

			if (response.ok) {
				const result = await response.json();
				const data = result.record;
				
				// Lưu vào localStorage
				localStorage.setItem(key, JSON.stringify(data));
				
				// Cập nhật trạng thái sync
				const syncData = getStore(STORAGE_KEYS.sync, {});
				syncData[key] = { lastSync: Date.now(), status: 'success' };
				localStorage.setItem(STORAGE_KEYS.sync, JSON.stringify(syncData));
				
				console.log(`✅ Tải ${key} từ cloud thành công`);
				return data;
			}
		} catch (error) {
			console.error(`❌ Lỗi tải ${key} từ cloud:`, error);
		}
		return null;
	}

	// Hàm đồng bộ tất cả dữ liệu
	async function syncAllData() {
		const syncPromises = ['users', 'exams', 'documents', 'results'].map(key => 
			syncFromCloud(STORAGE_KEYS[key])
		);
		
		try {
			await Promise.all(syncPromises);
			return true;
		} catch (error) {
			console.error('❌ Lỗi đồng bộ tất cả dữ liệu:', error);
			return false;
		}
	}

	// Seed data if empty
	const users = getStore(STORAGE_KEYS.users, []);
	if (users.length === 0) {
		// Thêm tài khoản admin mặc định
		const adminUser = {
			id: 'admin-001',
			name: 'Administrator',
			email: 'admin@hoc12.com',
			password: 'admin123',
			role: 'admin',
			createdAt: Date.now()
		};
		setStore(STORAGE_KEYS.users, [adminUser]);
	}
	if (!getStore(STORAGE_KEYS.groups)) setStore(STORAGE_KEYS.groups, []);
	if (!getStore(STORAGE_KEYS.exams)) setStore(STORAGE_KEYS.exams, []);
	if (!getStore(STORAGE_KEYS.results)) setStore(STORAGE_KEYS.results, []);
	if (!getStore(STORAGE_KEYS.ai)) setStore(STORAGE_KEYS.ai, { openaiKey: '' });
	if (!getStore(STORAGE_KEYS.documents)) setStore(STORAGE_KEYS.documents, []);

	function currentUser() {
		const session = getStore(STORAGE_KEYS.session);
		if (!session) return null;
		const users = getStore(STORAGE_KEYS.users, []);
		return users.find(u => u.id === session.userId) || null;
	}

	function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

	function navigate(route) {
		window.location.hash = '#' + route;
	}

	function updateNavAuthState() {
		const isAuthed = !!currentUser();
		Array.from(document.querySelectorAll('.authed-only')).forEach(el => {
			el.classList.toggle('hidden', !isAuthed);
		});
		document.getElementById('nav-login').classList.toggle('hidden', isAuthed);
		document.getElementById('nav-signup').classList.toggle('hidden', isAuthed);
	}

	function pageHome() {
		const user = currentUser();
		app.innerHTML = `
			<section class="panel">
				<h2>Chào mừng đến với Học 12</h2>
				<p class="muted">Nền tảng tự học và luyện đề cho học sinh lớp 12.</p>
				<div class="spacer"></div>
				<div class="card">
					<h4>🚀 Tính năng chính:</h4>
					<ul>
						<li><strong>Kiến thức:</strong> Toán 12, Vật lý 12, Lịch sử 12 (xem trực tiếp)</li>
						<li><strong>Thư viện tài liệu:</strong> Xem và tải về tài liệu từ cộng đồng (miễn phí)</li>
						<li><strong>Đồng bộ dữ liệu:</strong> Dữ liệu được đồng bộ tự động giữa các thiết bị (cần đăng nhập)</li>
						<li><strong>Tạo đề thi:</strong> Tạo đề thủ công hoặc bằng AI (cần đăng nhập)</li>
						<li><strong>Upload tài liệu:</strong> Chia sẻ tài liệu với cộng đồng (cần đăng nhập)</li>
						<li><strong>Bảng thành tích:</strong> Theo dõi kết quả học tập (cần đăng nhập)</li>
					</ul>
				</div>
				<div class="spacer"></div>
				<div class="card">
					<h4>👤 Tài khoản mặc định:</h4>
					<p><strong>Email:</strong> admin@hoc12.com</p>
					<p><strong>Mật khẩu:</strong> admin123</p>
					<p class="muted">Sử dụng tài khoản này để truy cập đầy đủ tính năng.</p>
				</div>
			</section>
		`;
	}

	function pageLogin() {
		if (currentUser()) { navigate('home'); return; }
		app.innerHTML = `
			<section class="panel" style="max-width:520px;margin:auto;">
				<h2>Đăng nhập</h2>
				<form id="loginForm">
					<div class="row">
						<label>Email</label>
						<input type="email" name="email" required />
					</div>
					<div class="row">
						<label>Mật khẩu</label>
						<input type="password" name="password" required minlength="4" />
					</div>
					<button class="btn" type="submit">Đăng nhập</button>
				</form>
			</section>
		`;
		document.getElementById('loginForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const data = new FormData(e.target);
			const email = String(data.get('email')).trim().toLowerCase();
			const password = String(data.get('password'));
			const users = getStore(STORAGE_KEYS.users, []);
			const user = users.find(u => u.email === email && u.password === password);
			if (!user) { alert('Sai email hoặc mật khẩu'); return; }
			setStore(STORAGE_KEYS.session, { userId: user.id, at: Date.now() });
			updateNavAuthState();
			navigate('home');
		});
	}

	function pageSignup() {
		if (currentUser()) { navigate('home'); return; }
		app.innerHTML = `
			<section class="panel" style="max-width:520px;margin:auto;">
				<h2>Tạo tài khoản</h2>
				<form id="signupForm">
					<div class="row">
						<label>Họ tên</label>
						<input name="name" required />
					</div>
					<div class="row">
						<label>Email</label>
						<input type="email" name="email" required />
					</div>
					<div class="row">
						<label>Mật khẩu</label>
						<input type="password" name="password" required minlength="4" />
					</div>
					<button class="btn" type="submit">Đăng ký</button>
				</form>
			</section>
		`;
		document.getElementById('signupForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const data = new FormData(e.target);
			const name = String(data.get('name')).trim();
			const email = String(data.get('email')).trim().toLowerCase();
			const password = String(data.get('password'));
			const users = getStore(STORAGE_KEYS.users, []);
			if (users.some(u => u.email === email)) { alert('Email đã tồn tại'); return; }
			const newUser = { id: uid(), name, email, password, createdAt: Date.now() };
			users.push(newUser); setStore(STORAGE_KEYS.users, users);
			setStore(STORAGE_KEYS.session, { userId: newUser.id, at: Date.now() });
			updateNavAuthState();
			navigate('home');
		});
	}


	function renderAccordion(targetId, sections) {
		const host = document.getElementById(targetId);
		host.innerHTML = sections.map((s, idx) => `
			<div class="accordion-item" data-idx="${idx}">
				<button class="accordion-header">
					<span>${s.title}</span>
					<span class="chevron">▶</span>
				</button>
				<div class="accordion-content"><div>${s.content}</div></div>
			</div>
		`).join('');
		host.querySelectorAll('.accordion-item').forEach(item => {
			const header = item.querySelector('.accordion-header');
			const content = item.querySelector('.accordion-content');
			header.addEventListener('click', () => {
				const isOpen = item.classList.toggle('open');
				content.style.maxHeight = isOpen ? content.scrollHeight + 'px' : '0px';
			});
		});
	}

	function pageMath() {
		app.innerHTML = `
			<section class="panel">
				<h2>Kiến thức Toán 12 - Kết nối tri thức với cuộc sống</h2>
				<div class="spacer"></div>
				<div id="mathAccordion" class="accordion"></div>
			</section>
		`;
		const sections = [
			{ 
				title: '1. Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số', 
				content: `
					<h4>Đạo hàm cơ bản:</h4>
					<ul>
						<li>(x^n)' = n.x^(n-1)</li>
						<li>(√x)' = 1/(2√x)</li>
						<li>(1/x)' = -1/x²</li>
						<li>(sin x)' = cos x</li>
						<li>(cos x)' = -sin x</li>
						<li>(tan x)' = 1/cos²x</li>
						<li>(e^x)' = e^x</li>
						<li>(ln x)' = 1/x</li>
					</ul>
					<h4>Quy tắc đạo hàm:</h4>
					<ul>
						<li>(u ± v)' = u' ± v'</li>
						<li>(u.v)' = u'.v + u.v'</li>
						<li>(u/v)' = (u'.v - u.v')/v²</li>
						<li>(u^n)' = n.u^(n-1).u'</li>
					</ul>
					<h4>Ứng dụng đạo hàm:</h4>
					<ul>
						<li>Khảo sát sự biến thiên của hàm số</li>
						<li>Tìm cực trị của hàm số</li>
						<li>Tìm tiệm cận của đồ thị</li>
						<li>Vẽ đồ thị hàm số</li>
						<li>Giải bài toán thực tế</li>
					</ul>
					<h4>Khảo sát hàm số:</h4>
					<ul>
						<li>Tập xác định</li>
						<li>Giới hạn và tiệm cận</li>
						<li>Đạo hàm và sự biến thiên</li>
						<li>Cực trị</li>
						<li>Đồ thị</li>
					</ul>
				`
			},
			{ 
				title: '2. Hàm số lũy thừa, hàm số mũ và hàm số logarit', 
				content: `
					<h4>Hàm số lũy thừa:</h4>
					<ul>
						<li>y = x^α (α ∈ ℝ)</li>
						<li>Tập xác định: D = ℝ (α nguyên dương), D = ℝ\{0} (α nguyên âm), D = [0,+∞) (α không nguyên)</li>
						<li>Đạo hàm: (x^α)' = α.x^(α-1)</li>
						<li>Đồ thị qua điểm (1,1)</li>
					</ul>
					<h4>Hàm số mũ:</h4>
					<ul>
						<li>y = a^x (a > 0, a ≠ 1)</li>
						<li>Tập xác định: D = ℝ</li>
						<li>Tập giá trị: T = (0,+∞)</li>
						<li>Đạo hàm: (a^x)' = a^x.ln a</li>
						<li>Đặc biệt: (e^x)' = e^x</li>
						<li>Đồ thị luôn nằm phía trên trục Ox</li>
					</ul>
					<h4>Hàm số logarit:</h4>
					<ul>
						<li>y = log_a(x) (a > 0, a ≠ 1)</li>
						<li>Tập xác định: D = (0,+∞)</li>
						<li>Tập giá trị: T = ℝ</li>
						<li>Đạo hàm: (log_a x)' = 1/(x.ln a)</li>
						<li>Đặc biệt: (ln x)' = 1/x</li>
						<li>Đồ thị luôn nằm bên phải trục Oy</li>
					</ul>
					<h4>Tính chất lũy thừa:</h4>
					<ul>
						<li>a^x.a^y = a^(x+y)</li>
						<li>a^x/a^y = a^(x-y)</li>
						<li>(a^x)^y = a^(xy)</li>
						<li>(ab)^x = a^x.b^x</li>
					</ul>
					<h4>Tính chất logarit:</h4>
					<ul>
						<li>log_a(xy) = log_a(x) + log_a(y)</li>
						<li>log_a(x/y) = log_a(x) - log_a(y)</li>
						<li>log_a(x^y) = y.log_a(x)</li>
						<li>log_a(x) = log_b(x)/log_b(a)</li>
					</ul>
					<h4>Phương trình và bất phương trình:</h4>
					<ul>
						<li>a^x = b ⇔ x = log_a(b)</li>
						<li>log_a(x) = b ⇔ x = a^b</li>
						<li>a^x > a^y ⇔ x > y (nếu a > 1)</li>
						<li>a^x > a^y ⇔ x < y (nếu 0 < a < 1)</li>
					</ul>
				`
			},
			{ 
				title: '3. Nguyên hàm và tích phân', 
				content: `
					<h4>Nguyên hàm cơ bản:</h4>
					<ul>
						<li>∫x^n dx = x^(n+1)/(n+1) + C (n ≠ -1)</li>
						<li>∫1/x dx = ln|x| + C</li>
						<li>∫e^x dx = e^x + C</li>
						<li>∫a^x dx = a^x/ln a + C</li>
						<li>∫sin x dx = -cos x + C</li>
						<li>∫cos x dx = sin x + C</li>
						<li>∫1/cos²x dx = tan x + C</li>
						<li>∫1/sin²x dx = -cot x + C</li>
						<li>∫1/√(1-x²) dx = arcsin x + C</li>
						<li>∫1/(1+x²) dx = arctan x + C</li>
					</ul>
					<h4>Tính chất nguyên hàm:</h4>
					<ul>
						<li>∫[f(x) ± g(x)]dx = ∫f(x)dx ± ∫g(x)dx</li>
						<li>∫k.f(x)dx = k.∫f(x)dx</li>
						<li>∫f'(x)dx = f(x) + C</li>
					</ul>
					<h4>Phương pháp tính nguyên hàm:</h4>
					<ul>
						<li>Phương pháp đổi biến số</li>
						<li>Phương pháp tích phân từng phần</li>
						<li>Phương pháp phân tích thành tổng</li>
					</ul>
					<h4>Tích phân xác định:</h4>
					<ul>
						<li>∫[a→b] f(x)dx = F(b) - F(a)</li>
						<li>∫[a→b] f(x)dx = -∫[b→a] f(x)dx</li>
						<li>∫[a→c] f(x)dx = ∫[a→b] f(x)dx + ∫[b→c] f(x)dx</li>
						<li>∫[a→b] k.f(x)dx = k.∫[a→b] f(x)dx</li>
					</ul>
					<h4>Ứng dụng tích phân:</h4>
					<ul>
						<li>Diện tích hình phẳng giới hạn bởi đồ thị</li>
						<li>Thể tích khối tròn xoay</li>
						<li>Quãng đường và vận tốc</li>
						<li>Giải bài toán thực tế</li>
					</ul>
				`
			},
			{ 
				title: '4. Số phức', 
				content: `
					<h4>Định nghĩa:</h4>
					<ul>
						<li>z = a + bi (a, b ∈ ℝ, i² = -1)</li>
						<li>a: phần thực, b: phần ảo</li>
					</ul>
					<h4>Dạng lượng giác:</h4>
					<ul>
						<li>z = r(cos φ + i.sin φ)</li>
						<li>r = |z| = √(a² + b²)</li>
						<li>φ = arg(z)</li>
					</ul>
					<h4>Phép toán:</h4>
					<ul>
						<li>(a + bi) + (c + di) = (a + c) + (b + d)i</li>
						<li>(a + bi) - (c + di) = (a - c) + (b - d)i</li>
						<li>(a + bi)(c + di) = (ac - bd) + (ad + bc)i</li>
						<li>(a + bi)/(c + di) = [(ac + bd) + (bc - ad)i]/(c² + d²)</li>
					</ul>
					<h4>Công thức Moivre:</h4>
					<ul>
						<li>[r(cos φ + i.sin φ)]^n = r^n(cos nφ + i.sin nφ)</li>
					</ul>
				`
			},
			{ 
				title: '5. Khối đa diện và thể tích', 
				content: `
					<h4>Khối chóp:</h4>
					<ul>
						<li>V = (1/3).S.h</li>
						<li>S: diện tích đáy, h: chiều cao</li>
					</ul>
					<h4>Khối lăng trụ:</h4>
					<ul>
						<li>V = S.h</li>
						<li>S: diện tích đáy, h: chiều cao</li>
					</ul>
					<h4>Khối nón:</h4>
					<ul>
						<li>V = (1/3).π.r².h</li>
						<li>Sxq = π.r.l</li>
						<li>Stp = π.r(r + l)</li>
					</ul>
					<h4>Khối trụ:</h4>
					<ul>
						<li>V = π.r².h</li>
						<li>Sxq = 2π.r.h</li>
						<li>Stp = 2π.r(r + h)</li>
					</ul>
					<h4>Khối cầu:</h4>
					<ul>
						<li>V = (4/3).π.r³</li>
						<li>S = 4π.r²</li>
					</ul>
				`
			},
			{ 
				title: '4. Vectơ và hệ trục tọa độ trong không gian', 
				content: `
					<h4>Hệ trục tọa độ Oxyz:</h4>
					<ul>
						<li>Ba trục Ox, Oy, Oz vuông góc với nhau</li>
						<li>Điểm O là gốc tọa độ</li>
						<li>Vectơ đơn vị: i⃗, j⃗, k⃗</li>
						<li>M(x,y,z): tọa độ điểm M</li>
					</ul>
					<h4>Tọa độ vectơ:</h4>
					<ul>
						<li>u⃗ = (x, y, z) = xi⃗ + yj⃗ + zk⃗</li>
						<li>|u⃗| = √(x² + y² + z²)</li>
						<li>u⃗ + v⃗ = (x₁ + x₂, y₁ + y₂, z₁ + z₂)</li>
						<li>k.u⃗ = (kx, ky, kz)</li>
						<li>u⃗.v⃗ = x₁x₂ + y₁y₂ + z₁z₂</li>
						<li>cos(u⃗,v⃗) = (u⃗.v⃗)/(|u⃗|.|v⃗|)</li>
					</ul>
					<h4>Tích có hướng:</h4>
					<ul>
						<li>[u⃗,v⃗] = (y₁z₂ - y₂z₁, z₁x₂ - z₂x₁, x₁y₂ - x₂y₁)</li>
						<li>|[u⃗,v⃗]| = |u⃗|.|v⃗|.sin(u⃗,v⃗)</li>
						<li>[u⃗,v⃗] ⊥ u⃗ và [u⃗,v⃗] ⊥ v⃗</li>
					</ul>
					<h4>Khoảng cách và góc:</h4>
					<ul>
						<li>d(A,B) = √[(x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²]</li>
						<li>Góc giữa hai vectơ: cos φ = (u⃗.v⃗)/(|u⃗|.|v⃗|)</li>
						<li>Khoảng cách từ điểm đến mặt phẳng</li>
					</ul>
				`
			},
			{ 
				title: '5. Phương pháp tọa độ trong không gian', 
				content: `
					<h4>Phương trình mặt phẳng:</h4>
					<ul>
						<li>Ax + By + Cz + D = 0</li>
						<li>n⃗ = (A, B, C): vectơ pháp tuyến</li>
						<li>Phương trình mặt phẳng qua 3 điểm</li>
						<li>Phương trình mặt phẳng theo đoạn chắn</li>
					</ul>
					<h4>Phương trình đường thẳng:</h4>
					<ul>
						<li>Tham số: x = x₀ + at, y = y₀ + bt, z = z₀ + ct</li>
						<li>Chính tắc: (x - x₀)/a = (y - y₀)/b = (z - z₀)/c</li>
						<li>u⃗ = (a, b, c): vectơ chỉ phương</li>
						<li>Phương trình đường thẳng qua 2 điểm</li>
					</ul>
					<h4>Phương trình mặt cầu:</h4>
					<ul>
						<li>(x - a)² + (y - b)² + (z - c)² = r²</li>
						<li>Tâm I(a, b, c), bán kính r</li>
						<li>x² + y² + z² + 2Ax + 2By + 2Cz + D = 0</li>
					</ul>
					<h4>Vị trí tương đối:</h4>
					<ul>
						<li>Hai mặt phẳng: song song, cắt nhau, trùng nhau</li>
						<li>Đường thẳng và mặt phẳng: song song, cắt nhau, nằm trong</li>
						<li>Hai đường thẳng: song song, cắt nhau, chéo nhau</li>
					</ul>
					<h4>Khoảng cách và góc:</h4>
					<ul>
						<li>Khoảng cách từ điểm đến mặt phẳng</li>
						<li>Khoảng cách từ điểm đến đường thẳng</li>
						<li>Khoảng cách giữa hai đường thẳng chéo nhau</li>
						<li>Góc giữa hai mặt phẳng</li>
						<li>Góc giữa đường thẳng và mặt phẳng</li>
					</ul>
				`
			},
			{ 
				title: '6. Số phức', 
				content: `
					<h4>Định nghĩa:</h4>
					<ul>
						<li>z = a + bi (a, b ∈ ℝ, i² = -1)</li>
						<li>a: phần thực, b: phần ảo</li>
						<li>z = a - bi: số phức liên hợp</li>
						<li>|z| = √(a² + b²): môđun</li>
					</ul>
					<h4>Dạng lượng giác:</h4>
					<ul>
						<li>z = r(cos φ + i.sin φ)</li>
						<li>r = |z| = √(a² + b²)</li>
						<li>φ = arg(z): argument</li>
						<li>a = r.cos φ, b = r.sin φ</li>
					</ul>
					<h4>Phép toán:</h4>
					<ul>
						<li>(a + bi) + (c + di) = (a + c) + (b + d)i</li>
						<li>(a + bi) - (c + di) = (a - c) + (b - d)i</li>
						<li>(a + bi)(c + di) = (ac - bd) + (ad + bc)i</li>
						<li>(a + bi)/(c + di) = [(ac + bd) + (bc - ad)i]/(c² + d²)</li>
					</ul>
					<h4>Công thức Moivre:</h4>
					<ul>
						<li>[r(cos φ + i.sin φ)]^n = r^n(cos nφ + i.sin nφ)</li>
						<li>z^n = r^n(cos nφ + i.sin nφ)</li>
					</ul>
					<h4>Căn bậc n của số phức:</h4>
					<ul>
						<li>n căn bậc n của z = r(cos φ + i.sin φ)</li>
						<li>w_k = r^(1/n)[cos(φ + 2kπ)/n + i.sin(φ + 2kπ)/n]</li>
						<li>k = 0, 1, 2, ..., n-1</li>
					</ul>
				`
			},
			{ 
				title: '7. Xác suất có điều kiện', 
				content: `
					<h4>Xác suất có điều kiện:</h4>
					<ul>
						<li>P(A|B) = P(A∩B)/P(B) (P(B) > 0)</li>
						<li>P(A∩B) = P(A|B).P(B) = P(B|A).P(A)</li>
					</ul>
					<h4>Công thức xác suất toàn phần:</h4>
					<ul>
						<li>P(A) = P(A|B₁).P(B₁) + P(A|B₂).P(B₂) + ... + P(A|Bₙ).P(Bₙ)</li>
						<li>Với B₁, B₂, ..., Bₙ là hệ đầy đủ các biến cố</li>
					</ul>
					<h4>Công thức Bayes:</h4>
					<ul>
						<li>P(Bᵢ|A) = P(A|Bᵢ).P(Bᵢ)/P(A)</li>
						<li>Ứng dụng trong y học, kinh tế, khoa học</li>
					</ul>
					<h4>Biến cố độc lập:</h4>
					<ul>
						<li>A và B độc lập ⇔ P(A∩B) = P(A).P(B)</li>
						<li>A và B độc lập ⇔ P(A|B) = P(A)</li>
					</ul>
					<h4>Ứng dụng thực tế:</h4>
					<ul>
						<li>Chẩn đoán y tế</li>
						<li>Kiểm tra chất lượng sản phẩm</li>
						<li>Dự báo thời tiết</li>
						<li>Phân tích rủi ro tài chính</li>
					</ul>
				`
			}
		];
		renderAccordion('mathAccordion', sections);
	}

	function pagePhysics() {
		app.innerHTML = `
			<section class="panel">
				<h2>Kiến thức Vật lý 12 - Kết nối tri thức với cuộc sống</h2>
				<div class="spacer"></div>
				<div id="physAccordion" class="accordion"></div>
			</section>
		`;
		const sections = [
			{ 
				title: '1. Vật lý nhiệt', 
				content: `
					<h4>Cấu trúc của chất:</h4>
					<ul>
						<li>Chất rắn: cấu trúc tinh thể, liên kết mạnh</li>
						<li>Chất lỏng: cấu trúc vô định hình, liên kết yếu</li>
						<li>Chất khí: phân tử tự do, chuyển động hỗn loạn</li>
					</ul>
					<h4>Sự chuyển thể:</h4>
					<ul>
						<li>Nóng chảy: rắn → lỏng</li>
						<li>Đông đặc: lỏng → rắn</li>
						<li>Bay hơi: lỏng → khí</li>
						<li>Ngưng tụ: khí → lỏng</li>
						<li>Thăng hoa: rắn → khí</li>
					</ul>
					<h4>Nội năng:</h4>
					<ul>
						<li>U = W + Q (định luật I nhiệt động lực học)</li>
						<li>ΔU = ΔW + ΔQ</li>
						<li>W: công, Q: nhiệt lượng</li>
					</ul>
					<h4>Nhiệt độ và thang nhiệt độ:</h4>
					<ul>
						<li>Nhiệt kế: đo nhiệt độ</li>
						<li>Thang Celsius: 0°C (nước đá), 100°C (nước sôi)</li>
						<li>Thang Kelvin: T(K) = t(°C) + 273.15</li>
					</ul>
					<h4>Nhiệt dung và nhiệt chuyển thể:</h4>
					<ul>
						<li>Q = mcΔt (nhiệt dung riêng)</li>
						<li>Q = mL (nhiệt nóng chảy/hóa hơi)</li>
						<li>c: nhiệt dung riêng, L: nhiệt chuyển thể riêng</li>
					</ul>
				`
			},
			{ 
				title: '2. Khí lý tưởng', 
				content: `
					<h4>Mô hình động học phân tử:</h4>
					<ul>
						<li>Phân tử chuyển động hỗn loạn</li>
						<li>Va chạm đàn hồi</li>
						<li>Kích thước phân tử << khoảng cách</li>
						<li>Không có lực tương tác xa</li>
					</ul>
					<h4>Định luật Boyle:</h4>
					<ul>
						<li>pV = const (T = const)</li>
						<li>p₁V₁ = p₂V₂</li>
						<li>Áp suất tỉ lệ nghịch với thể tích</li>
					</ul>
					<h4>Định luật Charles:</h4>
					<ul>
						<li>V/T = const (p = const)</li>
						<li>V₁/T₁ = V₂/T₂</li>
						<li>Thể tích tỉ lệ thuận với nhiệt độ tuyệt đối</li>
					</ul>
					<h4>Phương trình trạng thái khí lý tưởng:</h4>
					<ul>
						<li>pV = nRT</li>
						<li>pV = (m/M)RT</li>
						<li>R = 8.314 J/(mol.K): hằng số khí</li>
						<li>n: số mol, m: khối lượng, M: khối lượng mol</li>
					</ul>
					<h4>Áp suất theo mô hình động học:</h4>
					<ul>
						<li>p = (1/3)nmv²</li>
						<li>n: mật độ phân tử</li>
						<li>m: khối lượng phân tử</li>
						<li>v²: vận tốc bình phương trung bình</li>
					</ul>
					<h4>Động năng phân tử và nhiệt độ:</h4>
					<ul>
						<li>W_đ = (3/2)kT</li>
						<li>k = R/N_A: hằng số Boltzmann</li>
						<li>N_A: số Avogadro</li>
					</ul>
				`
			},
			{ 
				title: '3. Từ trường', 
				content: `
					<h4>Từ trường:</h4>
					<ul>
						<li>B⃗: vectơ cảm ứng từ</li>
						<li>Đơn vị: Tesla (T)</li>
						<li>Đường sức từ: đường cong kín</li>
						<li>Chiều: từ cực Bắc đến cực Nam</li>
					</ul>
					<h4>Lực từ tác dụng lên dây dẫn:</h4>
					<ul>
						<li>F = BIl.sin α</li>
						<li>F = BIl (α = 90°)</li>
						<li>I: cường độ dòng điện</li>
						<li>l: chiều dài dây dẫn</li>
					</ul>
					<h4>Lực Lorentz:</h4>
					<ul>
						<li>F = qvB.sin α</li>
						<li>F = qvB (α = 90°)</li>
						<li>q: điện tích, v: vận tốc</li>
						<li>Quỹ đạo: đường tròn</li>
					</ul>
					<h4>Từ thông:</h4>
					<ul>
						<li>Φ = BS.cos α</li>
						<li>Φ = B⃗.S⃗</li>
						<li>Đơn vị: Weber (Wb)</li>
					</ul>
					<h4>Hiện tượng cảm ứng điện từ:</h4>
					<ul>
						<li>Định luật Faraday: e = -dΦ/dt</li>
						<li>Định luật Lenz: dòng điện cảm ứng chống lại nguyên nhân sinh ra nó</li>
						<li>Suất điện động cảm ứng</li>
					</ul>
					<h4>Máy phát điện xoay chiều:</h4>
					<ul>
						<li>e = E₀.sin(ωt + φ)</li>
						<li>E₀ = NBSω</li>
						<li>N: số vòng dây, S: diện tích khung</li>
					</ul>
					<h4>Điện từ trường và sóng điện từ:</h4>
					<ul>
						<li>Điện trường biến thiên → từ trường</li>
						<li>Từ trường biến thiên → điện trường</li>
						<li>Sóng điện từ: lan truyền trong không gian</li>
						<li>c = 1/√(ε₀μ₀) = 3×10⁸ m/s</li>
					</ul>
				`
			},
			{ 
				title: '4. Dao động cơ', 
				content: `
					<h4>Dao động điều hòa:</h4>
					<ul>
						<li>x = A.cos(ωt + φ)</li>
						<li>v = -ωA.sin(ωt + φ)</li>
						<li>a = -ω²A.cos(ωt + φ) = -ω²x</li>
						<li>ω = 2π/T = 2πf</li>
						<li>A: biên độ, φ: pha ban đầu</li>
					</ul>
					<h4>Con lắc lò xo:</h4>
					<ul>
						<li>T = 2π√(m/k)</li>
						<li>f = 1/T = (1/2π)√(k/m)</li>
						<li>ω = √(k/m)</li>
						<li>W = (1/2)kA² = (1/2)mv² + (1/2)kx²</li>
						<li>W_đ = (1/2)mv², W_t = (1/2)kx²</li>
					</ul>
					<h4>Con lắc đơn:</h4>
					<ul>
						<li>T = 2π√(l/g)</li>
						<li>f = (1/2π)√(g/l)</li>
						<li>ω = √(g/l)</li>
						<li>s = s₀.cos(ωt + φ)</li>
						<li>Điều kiện: góc nhỏ (α < 10°)</li>
					</ul>
					<h4>Dao động tắt dần:</h4>
					<ul>
						<li>x = A₀.e^(-γt).cos(ωt + φ)</li>
						<li>γ = b/(2m): hệ số tắt dần</li>
						<li>Biên độ giảm dần theo thời gian</li>
					</ul>
					<h4>Dao động cưỡng bức và cộng hưởng:</h4>
					<ul>
						<li>Dao động cưỡng bức: tần số bằng tần số ngoại lực</li>
						<li>Cộng hưởng: f = f₀ (tần số riêng)</li>
						<li>Biên độ cực đại khi cộng hưởng</li>
					</ul>
				`
			},
			{ 
				title: '5. Sóng cơ và sóng âm', 
				content: `
					<h4>Sóng cơ:</h4>
					<ul>
						<li>u = A.cos(ωt - kx + φ)</li>
						<li>k = 2π/λ: số sóng</li>
						<li>v = λf = λ/T</li>
						<li>v = √(F/μ) (dây đàn hồi)</li>
						<li>v = √(E/ρ) (thanh đàn hồi)</li>
					</ul>
					<h4>Giao thoa sóng:</h4>
					<ul>
						<li>Δφ = 2πd/λ</li>
						<li>Cực đại: d = kλ (k ∈ ℤ)</li>
						<li>Cực tiểu: d = (k + 1/2)λ</li>
						<li>Khoảng cách giữa 2 cực đại: λ/2</li>
					</ul>
					<h4>Sóng dừng:</h4>
					<ul>
						<li>λ = 2l/n (n: số bụng)</li>
						<li>f = nv/(2l)</li>
						<li>Nút: u = 0, Bụng: u = ±A</li>
						<li>Khoảng cách nút-bụng: λ/4</li>
					</ul>
					<h4>Sóng âm:</h4>
					<ul>
						<li>I = P/(4πr²)</li>
						<li>L = 10.log(I/I₀) (dB)</li>
						<li>I₀ = 10⁻¹² W/m²: ngưỡng nghe</li>
						<li>f' = f(v ± v₀)/(v ∓ v_s) (hiệu ứng Doppler)</li>
						<li>Âm thanh: 16Hz - 20000Hz</li>
					</ul>
					<h4>Đặc trưng sinh lý của âm:</h4>
					<ul>
						<li>Độ cao: tần số</li>
						<li>Độ to: cường độ âm</li>
						<li>Âm sắc: dạng sóng</li>
					</ul>
				`
			},
			{ 
				title: '3. Dòng điện xoay chiều', 
				content: `
					<h4>Đại cương:</h4>
					<ul>
						<li>i = I₀.cos(ωt + φ)</li>
						<li>u = U₀.cos(ωt + φ)</li>
						<li>I = I₀/√2, U = U₀/√2</li>
					</ul>
					<h4>Mạch RLC:</h4>
					<ul>
						<li>Z = √(R² + (Z_L - Z_C)²)</li>
						<li>Z_L = ωL, Z_C = 1/(ωC)</li>
						<li>I = U/Z</li>
						<li>cos φ = R/Z</li>
					</ul>
					<h4>Công suất:</h4>
					<ul>
						<li>P = UI.cos φ = I²R</li>
						<li>Q = UI.sin φ</li>
						<li>S = UI = √(P² + Q²)</li>
					</ul>
					<h4>Cộng hưởng:</h4>
					<ul>
						<li>ω₀ = 1/√(LC)</li>
						<li>f₀ = 1/(2π√(LC))</li>
						<li>Z = R (min), I = U/R (max)</li>
					</ul>
				`
			},
			{ 
				title: '4. Dao động và sóng điện từ', 
				content: `
					<h4>Mạch LC:</h4>
					<ul>
						<li>q = Q₀.cos(ωt + φ)</li>
						<li>i = -ωQ₀.sin(ωt + φ)</li>
						<li>ω = 1/√(LC)</li>
						<li>W = (1/2)LI² + (1/2)q²/C</li>
					</ul>
					<h4>Sóng điện từ:</h4>
					<ul>
						<li>c = 1/√(ε₀μ₀) = 3.10⁸ m/s</li>
						<li>λ = c/f = cT</li>
						<li>E = E₀.cos(ωt - kx)</li>
						<li>B = B₀.cos(ωt - kx)</li>
					</ul>
					<h4>Truyền thông:</h4>
					<ul>
						<li>f = 1/(2π√(LC))</li>
						<li>λ = c/f</li>
						<li>Anten: λ/4, λ/2</li>
					</ul>
				`
			},
			{ 
				title: '5. Sóng ánh sáng', 
				content: `
					<h4>Giao thoa ánh sáng:</h4>
					<ul>
						<li>Δd = d₂ - d₁</li>
						<li>Cực đại: Δd = kλ</li>
						<li>Cực tiểu: Δd = (k + 1/2)λ</li>
						<li>i = λD/a (khoảng vân)</li>
					</ul>
					<h4>Nhiễu xạ:</h4>
					<ul>
						<li>a.sin θ = kλ</li>
						<li>D = 2.44λ/a (đĩa tròn)</li>
					</ul>
					<h4>Quang phổ:</h4>
					<ul>
						<li>d.sin θ = kλ</li>
						<li>Δλ = λ²/(2d.cos θ)</li>
					</ul>
					<h4>Tán sắc:</h4>
					<ul>
						<li>n = c/v</li>
						<li>n = sin i/sin r</li>
						<li>D = (n - 1)A (lăng kính)</li>
					</ul>
				`
			},
			{ 
				title: '6. Lượng tử ánh sáng', 
				content: `
					<h4>Hiệu ứng quang điện:</h4>
					<ul>
						<li>ε = hf = hc/λ</li>
						<li>W₀ = hf₀ = hc/λ₀</li>
						<li>ε = W₀ + W_đmax</li>
						<li>W_đmax = (1/2)mv²max</li>
					</ul>
					<h4>Bức xạ nhiệt:</h4>
					<ul>
						<li>M = σT⁴ (Stefan-Boltzmann)</li>
						<li>λ_max = b/T (Wien)</li>
						<li>σ = 5.67×10⁻⁸ W/m²K⁴</li>
					</ul>
					<h4>Mẫu nguyên tử Bohr:</h4>
					<ul>
						<li>r_n = n²r₁</li>
						<li>E_n = -13.6/n² eV</li>
						<li>hf = E_m - E_n</li>
					</ul>
				`
			},
			{ 
				title: '6. Vật lý hạt nhân', 
				content: `
					<h4>Cấu tạo hạt nhân:</h4>
					<ul>
						<li>Z: số proton, N: số neutron</li>
						<li>A = Z + N: số khối</li>
						<li>Ký hiệu: ᴬX (X: ký hiệu nguyên tố)</li>
						<li>Bán kính hạt nhân: R = R₀.A^(1/3)</li>
					</ul>
					<h4>Năng lượng liên kết:</h4>
					<ul>
						<li>E_lk = Δm.c²</li>
						<li>ε = E_lk/A: năng lượng liên kết riêng</li>
						<li>Δm = Zm_p + Nm_n - m</li>
						<li>Hạt nhân bền: ε lớn</li>
					</ul>
					<h4>Hiện tượng phóng xạ:</h4>
					<ul>
						<li>Phóng xạ α: hạt nhân mẹ → hạt nhân con + hạt α</li>
						<li>Phóng xạ β⁻: n → p + e⁻ + ν̄</li>
						<li>Phóng xạ β⁺: p → n + e⁺ + ν</li>
						<li>Phóng xạ γ: hạt nhân kích thích → hạt nhân bền + γ</li>
					</ul>
					<h4>Định luật phóng xạ:</h4>
					<ul>
						<li>N = N₀.e^(-λt)</li>
						<li>T = ln2/λ: chu kỳ bán rã</li>
						<li>H = λN = H₀.e^(-λt): độ phóng xạ</li>
						<li>m = m₀.e^(-λt): khối lượng còn lại</li>
					</ul>
					<h4>Phản ứng hạt nhân:</h4>
					<ul>
						<li>Phân hạch: hạt nhân nặng → hạt nhân nhẹ + năng lượng</li>
						<li>Nhiệt hạch: hạt nhân nhẹ → hạt nhân nặng + năng lượng</li>
						<li>Q = (m_trước - m_sau).c²</li>
						<li>Q > 0: tỏa năng lượng, Q < 0: thu năng lượng</li>
					</ul>
					<h4>Ứng dụng:</h4>
					<ul>
						<li>Năng lượng hạt nhân</li>
						<li>Y học hạt nhân</li>
						<li>Định tuổi bằng phóng xạ</li>
						<li>Chẩn đoán và điều trị</li>
					</ul>
				`
			},
			{ 
				title: '8. Từ vi mô đến vĩ mô', 
				content: `
					<h4>Các hạt cơ bản:</h4>
					<ul>
						<li>Lepton: e, μ, τ, ν</li>
						<li>Quark: u, d, s, c, b, t</li>
						<li>Boson: γ, W, Z, H</li>
					</ul>
					<h4>Thuyết tương đối:</h4>
					<ul>
						<li>E = mc²</li>
						<li>E² = (pc)² + (mc²)²</li>
						<li>Δt = γΔt₀</li>
					</ul>
					<h4>Vũ trụ học:</h4>
					<ul>
						<li>v = H₀.d (Hubble)</li>
						<li>H₀ ≈ 70 km/s/Mpc</li>
						<li>Tuổi vũ trụ ≈ 13.8 tỷ năm</li>
					</ul>
				`
			}
		];
		renderAccordion('physAccordion', sections);
	}

	function pageHistory() {
		app.innerHTML = `
			<section class="panel">
				<h2>Kiến thức Lịch sử 12 - Kết nối tri thức với cuộc sống</h2>
				<div class="spacer"></div>
				<div id="historyAccordion" class="accordion"></div>
			</section>
		`;
		const sections = [
			{ 
				title: '1. Lịch sử thế giới từ 1945 đến 2000', 
				content: `
					<h4>Trật tự thế giới mới sau Chiến tranh thế giới thứ hai:</h4>
					<ul>
						<li>Hội nghị Yalta (2/1945): Stalin, Roosevelt, Churchill</li>
						<li>Hội nghị Potsdam (7-8/1945): Truman, Stalin, Attlee</li>
						<li>Thành lập Liên Hợp Quốc (10/1945)</li>
						<li>Chiến tranh lạnh bắt đầu (1947-1991)</li>
					</ul>
					<h4>Chiến tranh lạnh:</h4>
					<ul>
						<li>Học thuyết Truman (1947): ngăn chặn chủ nghĩa cộng sản</li>
						<li>Kế hoạch Marshall (1947): viện trợ kinh tế cho Tây Âu</li>
						<li>Khối NATO (1949) vs Khối Hiệp ước Warsaw (1955)</li>
						<li>Cuộc khủng hoảng Berlin (1948-1949)</li>
						<li>Chiến tranh Triều Tiên (1950-1953)</li>
					</ul>
					<h4>Phong trào giải phóng dân tộc:</h4>
					<ul>
						<li>Châu Á: Ấn Độ (1947), Indonesia (1949), Việt Nam (1954)</li>
						<li>Châu Phi: Ghana (1957), Algeria (1962)</li>
						<li>Châu Mỹ Latin: Cuba (1959), Nicaragua (1979)</li>
					</ul>
					<h4>Cuộc cách mạng khoa học - kỹ thuật:</h4>
					<ul>
						<li>Đặc điểm: bùng nổ thông tin, tự động hóa</li>
						<li>Thành tựu: năng lượng nguyên tử, máy tính, vũ trụ</li>
						<li>Tác động: thay đổi cơ cấu kinh tế, xã hội</li>
					</ul>
				`
			},
			{ 
				title: '2. Lịch sử Việt Nam từ 1919 đến 1975', 
				content: `
					<h4>Phong trào dân tộc dân chủ (1919-1930):</h4>
					<ul>
						<li>Phong trào yêu nước của tư sản dân tộc</li>
						<li>Phong trào công nhân và nông dân</li>
						<li>Phong trào cách mạng theo khuynh hướng vô sản</li>
						<li>Nguyễn Ái Quốc và vai trò truyền bá chủ nghĩa Mác-Lênin</li>
					</ul>
					<h4>Đảng Cộng sản Việt Nam ra đời (1930):</h4>
					<ul>
						<li>Hội nghị thành lập Đảng (3/2/1930)</li>
						<li>Cương lĩnh chính trị đầu tiên</li>
						<li>Luận cương chính trị (10/1930)</li>
						<li>Phong trào Xô viết Nghệ Tĩnh (1930-1931)</li>
					</ul>
					<h4>Cuộc vận động dân chủ (1936-1939):</h4>
					<ul>
						<li>Chủ trương mới của Đảng</li>
						<li>Mặt trận Dân chủ Đông Dương</li>
						<li>Phong trào đấu tranh công khai, hợp pháp</li>
					</ul>
					<h4>Cách mạng tháng Tám (1945):</h4>
					<ul>
						<li>Hội nghị Trung ương 8 (5/1941)</li>
						<li>Việt Minh ra đời</li>
						<li>Cao trào kháng Nhật cứu nước</li>
						<li>Tổng khởi nghĩa tháng Tám</li>
						<li>Tuyên ngôn Độc lập (2/9/1945)</li>
					</ul>
					<h4>Cuộc kháng chiến chống Pháp (1945-1954):</h4>
					<ul>
						<li>Toàn quốc kháng chiến (19/12/1946)</li>
						<li>Chiến dịch Việt Bắc (1947)</li>
						<li>Chiến dịch Biên giới (1950)</li>
						<li>Chiến dịch Điện Biên Phủ (1954)</li>
						<li>Hiệp định Geneva (1954)</li>
					</ul>
				`
			},
			{ 
				title: '3. Xây dựng CNXH ở miền Bắc và đấu tranh thống nhất đất nước (1954-1975)', 
				content: `
					<h4>Xây dựng CNXH ở miền Bắc:</h4>
					<ul>
						<li>Khôi phục kinh tế (1954-1957)</li>
						<li>Cải tạo XHCN (1958-1960)</li>
						<li>Kế hoạch 5 năm lần thứ nhất (1961-1965)</li>
						<li>Chiến đấu chống chiến tranh phá hoại của Mỹ</li>
					</ul>
					<h4>Đấu tranh chống Mỹ ở miền Nam:</h4>
					<ul>
						<li>Phong trào Đồng khởi (1959-1960)</li>
						<li>Mặt trận Dân tộc Giải phóng miền Nam (1960)</li>
						<li>Chiến lược "Chiến tranh đặc biệt" của Mỹ (1961-1965)</li>
						<li>Chiến lược "Chiến tranh cục bộ" (1965-1968)</li>
						<li>Tổng tiến công và nổi dậy Tết Mậu Thân (1968)</li>
					</ul>
					<h4>Việt Nam hóa chiến tranh (1969-1973):</h4>
					<ul>
						<li>Chiến lược "Việt Nam hóa chiến tranh" của Nixon</li>
						<li>Đánh bại chiến lược này</li>
						<li>Hiệp định Paris (1973)</li>
					</ul>
					<h4>Giải phóng hoàn toàn miền Nam (1975):</h4>
					<ul>
						<li>Chiến dịch Tây Nguyên (3/1975)</li>
						<li>Chiến dịch Huế - Đà Nẵng (3-4/1975)</li>
						<li>Chiến dịch Hồ Chí Minh (4/1975)</li>
						<li>Thống nhất đất nước</li>
					</ul>
				`
			},
			{ 
				title: '4. Việt Nam trong những năm đầu sau đại thắng mùa Xuân 1975', 
				content: `
					<h4>Khôi phục và phát triển kinh tế - xã hội:</h4>
					<ul>
						<li>Khắc phục hậu quả chiến tranh</li>
						<li>Thống nhất đất nước về mặt nhà nước</li>
						<li>Đại hội Đảng lần thứ IV (1976)</li>
						<li>Kế hoạch 5 năm 1976-1980</li>
					</ul>
					<h4>Đấu tranh bảo vệ Tổ quốc:</h4>
					<ul>
						<li>Chiến tranh biên giới Tây Nam</li>
						<li>Chiến tranh biên giới phía Bắc</li>
						<li>Bảo vệ chủ quyền biển đảo</li>
					</ul>
					<h4>Đổi mới đất nước:</h4>
					<ul>
						<li>Đại hội Đảng lần thứ VI (1986)</li>
						<li>Đường lối đổi mới</li>
						<li>Thành tựu đổi mới</li>
						<li>Vai trò lãnh đạo của Đảng</li>
					</ul>
				`
			},
			{ 
				title: '5. Những kiến thức trọng tâm lịch sử 11-12', 
				content: `
					<h4>Các sự kiện lịch sử quan trọng:</h4>
					<ul>
						<li>Cách mạng tháng Mười Nga (1917)</li>
						<li>Chiến tranh thế giới thứ nhất (1914-1918)</li>
						<li>Chiến tranh thế giới thứ hai (1939-1945)</li>
						<li>Cách mạng tháng Tám (1945)</li>
						<li>Chiến dịch Điện Biên Phủ (1954)</li>
						<li>Chiến dịch Hồ Chí Minh (1975)</li>
					</ul>
					<h4>Đặc điểm các giai đoạn lịch sử:</h4>
					<ul>
						<li>Giai đoạn 1919-1930: phong trào dân tộc dân chủ</li>
						<li>Giai đoạn 1930-1945: cách mạng dân tộc dân chủ nhân dân</li>
						<li>Giai đoạn 1945-1975: kháng chiến chống ngoại xâm</li>
						<li>Giai đoạn 1975-nay: xây dựng và bảo vệ Tổ quốc</li>
					</ul>
					<h4>Vai trò của các nhân vật lịch sử:</h4>
					<ul>
						<li>Nguyễn Ái Quốc - Hồ Chí Minh</li>
						<li>Võ Nguyên Giáp</li>
						<li>Lê Duẩn</li>
						<li>Các anh hùng dân tộc khác</li>
					</ul>
				`
			},
			{ 
				title: '6. Sơ đồ tư duy lịch sử 12', 
				content: `
					<h4>Mô hình tư duy lịch sử:</h4>
					<ul>
						<li>Chủ thể: ai làm gì, khi nào, ở đâu</li>
						<li>Nguyên nhân: tại sao xảy ra sự kiện</li>
						<li>Diễn biến: quá trình diễn ra như thế nào</li>
						<li>Kết quả: kết cục ra sao</li>
						<li>Ý nghĩa: tác động và ảnh hưởng</li>
					</ul>
					<h4>Phương pháp học lịch sử hiệu quả:</h4>
					<ul>
						<li>Xây dựng sơ đồ tư duy</li>
						<li>Liên hệ thực tế</li>
						<li>So sánh các sự kiện</li>
						<li>Phân tích nguyên nhân - kết quả</li>
						<li>Ghi nhớ các mốc thời gian quan trọng</li>
					</ul>
					<h4>Các mối quan hệ lịch sử:</h4>
					<ul>
						<li>Quan hệ nhân - quả</li>
						<li>Quan hệ thời gian</li>
						<li>Quan hệ không gian</li>
						<li>Quan hệ giữa các sự kiện</li>
					</ul>
				`
			}
		];
		renderAccordion('historyAccordion', sections);
	}

	function pageLibrary() {
		const documents = getStore(STORAGE_KEYS.documents, []);
		const users = getStore(STORAGE_KEYS.users, []);
		
		app.innerHTML = `
			<section class="panel">
				<h2>📚 Thư viện tài liệu</h2>
				<p class="muted">Khám phá và tải về các tài liệu học tập từ cộng đồng</p>
				<div class="spacer"></div>
				
				<!-- Filter Controls -->
				<div class="card">
					<div class="flex">
						<div class="row" style="flex: 1; margin: 0;">
							<label>Lọc theo môn học:</label>
							<select id="subjectFilter">
								<option value="">Tất cả môn</option>
								<option value="toan">Toán</option>
								<option value="ly">Vật lý</option>
								<option value="su">Lịch sử</option>
								<option value="hoa">Hóa học</option>
								<option value="sinh">Sinh học</option>
								<option value="van">Ngữ văn</option>
								<option value="anh">Tiếng Anh</option>
								<option value="khac">Khác</option>
							</select>
						</div>
						<div class="row" style="flex: 1; margin: 0;">
							<label>Lọc theo loại:</label>
							<select id="typeFilter">
								<option value="">Tất cả loại</option>
								<option value="bai-giang">Bài giảng</option>
								<option value="de-thi">Đề thi</option>
								<option value="tai-lieu-tham-khao">Tài liệu tham khảo</option>
								<option value="so-do-tu-duy">Sơ đồ tư duy</option>
								<option value="tom-tat">Tóm tắt</option>
								<option value="khac">Khác</option>
							</select>
						</div>
						<div class="row" style="flex: 1; margin: 0;">
							<label>Tìm kiếm:</label>
							<input type="text" id="searchInput" placeholder="Tìm theo tên tài liệu..." />
						</div>
					</div>
				</div>
				<div class="spacer"></div>
				
				<!-- Documents Grid -->
				<div id="libraryList" class="grid cols-2"></div>
			</section>
		`;

		let filteredDocs = documents;

		function getSubjectName(subject) {
			const subjects = {
				'toan': 'Toán',
				'ly': 'Vật lý', 
				'su': 'Lịch sử',
				'hoa': 'Hóa học',
				'sinh': 'Sinh học',
				'van': 'Ngữ văn',
				'anh': 'Tiếng Anh',
				'khac': 'Khác'
			};
			return subjects[subject] || subject;
		}

		function getTypeName(type) {
			const types = {
				'bai-giang': 'Bài giảng',
				'de-thi': 'Đề thi',
				'tai-lieu-tham-khao': 'Tài liệu tham khảo',
				'so-do-tu-duy': 'Sơ đồ tư duy',
				'tom-tat': 'Tóm tắt',
				'khac': 'Khác'
			};
			return types[type] || type;
		}

		function formatFileSize(bytes) {
			if (bytes === 0) return '0 Bytes';
			const k = 1024;
			const sizes = ['Bytes', 'KB', 'MB', 'GB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
		}

		function getUserName(userId) {
			const user = users.find(u => u.id === userId);
			return user ? user.name : 'Người dùng ẩn danh';
		}

		function applyFilters() {
			const subjectFilter = document.getElementById('subjectFilter').value;
			const typeFilter = document.getElementById('typeFilter').value;
			const searchTerm = document.getElementById('searchInput').value.toLowerCase();

			filteredDocs = documents.filter(doc => {
				const matchesSubject = !subjectFilter || doc.subject === subjectFilter;
				const matchesType = !typeFilter || doc.type === typeFilter;
				const matchesSearch = !searchTerm || doc.title.toLowerCase().includes(searchTerm);
				
				return matchesSubject && matchesType && matchesSearch;
			});

			render();
		}

		function viewDocument(docId) {
			const doc = documents.find(d => d.id === docId);
			if (!doc) return;
			
			// Tạo URL để xem file
			const blob = new Blob([doc.content], { type: doc.mimeType });
			const url = URL.createObjectURL(blob);
			
			// Mở trong tab mới
			window.open(url, '_blank');
			
			// Cleanup
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}

		function downloadDocument(docId) {
			const doc = documents.find(d => d.id === docId);
			if (!doc) return;
			
			// Tạo blob và download
			const blob = new Blob([doc.content], { type: doc.mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = doc.filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}

		function render() {
			const list = document.getElementById('libraryList');
			
			if (filteredDocs.length === 0) {
				list.innerHTML = `
					<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
						<h4>Không tìm thấy tài liệu nào</h4>
						<p class="muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
					</div>
				`;
				return;
			}

			// Sắp xếp theo thời gian mới nhất
			const sortedDocs = filteredDocs.sort((a, b) => b.createdAt - a.createdAt);

			list.innerHTML = sortedDocs.map(doc => `
				<div class="card">
					<div class="flex">
						<div style="flex: 1;">
							<h4>${doc.title}</h4>
							<p class="muted">📚 Môn: ${getSubjectName(doc.subject)}</p>
							<p class="muted">📄 Loại: ${getTypeName(doc.type)}</p>
							${doc.description ? `<p class="muted">💭 ${doc.description}</p>` : ''}
							<p class="muted">👤 Tác giả: ${getUserName(doc.ownerId)}</p>
							<p class="muted">📅 Ngày: ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
							<p class="muted">💾 Kích thước: ${formatFileSize(doc.size)}</p>
						</div>
						<div class="flex" style="flex-direction: column; gap: 4px;">
							<button class="btn secondary" data-view="${doc.id}">👁️ Xem</button>
							<button class="btn" data-download="${doc.id}">⬇️ Tải về</button>
						</div>
					</div>
				</div>
			`).join('');

			// Event listeners
			list.querySelectorAll('[data-view]').forEach(btn => {
				btn.addEventListener('click', () => viewDocument(btn.getAttribute('data-view')));
			});
			list.querySelectorAll('[data-download]').forEach(btn => {
				btn.addEventListener('click', () => downloadDocument(btn.getAttribute('data-download')));
			});
		}

		// Event listeners for filters
		document.getElementById('subjectFilter').addEventListener('change', applyFilters);
		document.getElementById('typeFilter').addEventListener('change', applyFilters);
		document.getElementById('searchInput').addEventListener('input', applyFilters);

		render();
	}

	function pageDocuments() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const documents = getStore(STORAGE_KEYS.documents, []);
		
		app.innerHTML = `
			<section class="panel">
				<div class="flex">
					<h2>Tài liệu của tôi</h2>
					<span class="right"></span>
					<button class="btn" id="btnUpload">Upload tài liệu</button>
				</div>
				<div class="spacer"></div>
				
				<!-- Upload Form -->
				<div id="uploadForm" class="card" style="display: none;">
					<h4>Upload tài liệu mới</h4>
					<form id="documentUploadForm">
						<div class="row">
							<label>Tên tài liệu</label>
							<input type="text" name="title" required placeholder="Nhập tên tài liệu" />
						</div>
						<div class="row">
							<label>Môn học</label>
							<select name="subject" required>
								<option value="">Chọn môn học</option>
								<option value="toan">Toán</option>
								<option value="ly">Vật lý</option>
								<option value="su">Lịch sử</option>
								<option value="hoa">Hóa học</option>
								<option value="sinh">Sinh học</option>
								<option value="van">Ngữ văn</option>
								<option value="anh">Tiếng Anh</option>
								<option value="khac">Khác</option>
							</select>
						</div>
						<div class="row">
							<label>Loại tài liệu</label>
							<select name="type" required>
								<option value="">Chọn loại</option>
								<option value="bai-giang">Bài giảng</option>
								<option value="de-thi">Đề thi</option>
								<option value="tai-lieu-tham-khao">Tài liệu tham khảo</option>
								<option value="so-do-tu-duy">Sơ đồ tư duy</option>
								<option value="tom-tat">Tóm tắt</option>
								<option value="khac">Khác</option>
							</select>
						</div>
						<div class="row">
							<label>Mô tả (tùy chọn)</label>
							<textarea name="description" placeholder="Mô tả ngắn về tài liệu"></textarea>
						</div>
						<div class="row">
							<label>Chọn file</label>
							<input type="file" name="file" required accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif" />
							<small class="muted">Hỗ trợ: PDF, DOC, DOCX, TXT, JPG, PNG (tối đa 10MB)</small>
						</div>
						<div class="flex">
							<button type="submit" class="btn">Upload</button>
							<button type="button" class="btn secondary" id="cancelUpload">Hủy</button>
						</div>
					</form>
				</div>
				
				<!-- Documents List -->
				<div id="documentsList" class="grid cols-2"></div>
			</section>
		`;

		function render() {
			const list = document.getElementById('documentsList');
			const myDocs = documents.filter(d => d.ownerId === user.id).sort((a,b) => b.createdAt - a.createdAt);
			
			if (myDocs.length === 0) {
				list.innerHTML = `
					<div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
						<h4>Chưa có tài liệu nào</h4>
						<p class="muted">Hãy upload tài liệu đầu tiên của bạn!</p>
						<button class="btn" onclick="document.getElementById('btnUpload').click()">Upload ngay</button>
					</div>
				`;
				return;
			}

			list.innerHTML = myDocs.map(doc => `
				<div class="card">
					<div class="flex">
						<div style="flex: 1;">
							<h4>${doc.title}</h4>
							<p class="muted">Môn: ${getSubjectName(doc.subject)}</p>
							<p class="muted">Loại: ${getTypeName(doc.type)}</p>
							${doc.description ? `<p class="muted">${doc.description}</p>` : ''}
							<p class="muted">Ngày: ${new Date(doc.createdAt).toLocaleDateString('vi-VN')}</p>
							<p class="muted">Kích thước: ${formatFileSize(doc.size)}</p>
						</div>
						<div class="flex" style="flex-direction: column; gap: 4px;">
							<button class="btn secondary" data-view="${doc.id}">Xem</button>
							<button class="btn" data-download="${doc.id}">Tải về</button>
							<button class="btn danger" data-delete="${doc.id}">Xóa</button>
						</div>
					</div>
				</div>
			`).join('');

			// Event listeners
			list.querySelectorAll('[data-view]').forEach(btn => {
				btn.addEventListener('click', () => viewDocument(btn.getAttribute('data-view')));
			});
			list.querySelectorAll('[data-download]').forEach(btn => {
				btn.addEventListener('click', () => downloadDocument(btn.getAttribute('data-download')));
			});
			list.querySelectorAll('[data-delete]').forEach(btn => {
				btn.addEventListener('click', () => deleteDocument(btn.getAttribute('data-delete')));
			});
		}

		function getSubjectName(subject) {
			const subjects = {
				'toan': 'Toán',
				'ly': 'Vật lý', 
				'su': 'Lịch sử',
				'hoa': 'Hóa học',
				'sinh': 'Sinh học',
				'van': 'Ngữ văn',
				'anh': 'Tiếng Anh',
				'khac': 'Khác'
			};
			return subjects[subject] || subject;
		}

		function getTypeName(type) {
			const types = {
				'bai-giang': 'Bài giảng',
				'de-thi': 'Đề thi',
				'tai-lieu-tham-khao': 'Tài liệu tham khảo',
				'so-do-tu-duy': 'Sơ đồ tư duy',
				'tom-tat': 'Tóm tắt',
				'khac': 'Khác'
			};
			return types[type] || type;
		}

		function formatFileSize(bytes) {
			if (bytes === 0) return '0 Bytes';
			const k = 1024;
			const sizes = ['Bytes', 'KB', 'MB', 'GB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
		}

		function viewDocument(docId) {
			const doc = documents.find(d => d.id === docId);
			if (!doc) return;
			
			// Tạo URL để xem file
			const blob = new Blob([doc.content], { type: doc.mimeType });
			const url = URL.createObjectURL(blob);
			
			// Mở trong tab mới
			window.open(url, '_blank');
			
			// Cleanup
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}

		function downloadDocument(docId) {
			const doc = documents.find(d => d.id === docId);
			if (!doc) return;
			
			// Tạo blob và download
			const blob = new Blob([doc.content], { type: doc.mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = doc.filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}

		function deleteDocument(docId) {
			if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
			
			const index = documents.findIndex(d => d.id === docId);
			if (index === -1) return;
			
			documents.splice(index, 1);
			setStore(STORAGE_KEYS.documents, documents);
			render();
		}

		// Upload form handlers
		document.getElementById('btnUpload').addEventListener('click', () => {
			document.getElementById('uploadForm').style.display = 'block';
		});

		document.getElementById('cancelUpload').addEventListener('click', () => {
			document.getElementById('uploadForm').style.display = 'none';
			document.getElementById('documentUploadForm').reset();
		});

		document.getElementById('documentUploadForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const file = formData.get('file');
			
			if (!file || file.size === 0) {
				alert('Vui lòng chọn file');
				return;
			}
			
			if (file.size > 10 * 1024 * 1024) { // 10MB limit
				alert('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
				return;
			}

			try {
				// Convert file to base64 for storage
				const content = await fileToBase64(file);
				
				const newDoc = {
					id: uid(),
					title: formData.get('title').trim(),
					subject: formData.get('subject'),
					type: formData.get('type'),
					description: formData.get('description').trim(),
					filename: file.name,
					mimeType: file.type,
					size: file.size,
					content: content,
					ownerId: user.id,
					createdAt: Date.now()
				};

				documents.push(newDoc);
				setStore(STORAGE_KEYS.documents, documents);
				
				document.getElementById('uploadForm').style.display = 'none';
				document.getElementById('documentUploadForm').reset();
				render();
				
				alert('Upload tài liệu thành công!');
			} catch (error) {
				console.error('Upload error:', error);
				alert('Có lỗi xảy ra khi upload file. Vui lòng thử lại.');
			}
		});

		// Helper function to convert file to base64
		function fileToBase64(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
		}

		render();
	}

	function pageExams() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const exams = getStore(STORAGE_KEYS.exams, []);
		app.innerHTML = `
			<section class="panel">
				<div class="flex">
					<h2>Tạo đề</h2>
					<span class="right"></span>
					<button class="btn" id="btnNewExam">Tạo đề thủ công</button>
					<button class="btn success" id="btnAiExam">Đề bởi ChatGPT</button>
				</div>
				<div class="spacer"></div>
				<div id="examList" class="grid cols-2"></div>
			</section>
		`;
		function render() {
			const list = document.getElementById('examList');
			const mine = exams.filter(e => e.ownerId === user.id);
			list.innerHTML = mine.map(ex => `
				<div class="card">
					<h4>${ex.title}</h4>
					<p class="muted">Câu hỏi: ${ex.questions.length}</p>
					<div class="flex">
						<button class="btn secondary" data-take="${ex.id}">Làm đề</button>
					</div>
				</div>
			`).join('');
			list.querySelectorAll('[data-take]').forEach(b => b.addEventListener('click', () => takeExam(b.getAttribute('data-take'))));
		}
		render();
		document.getElementById('btnNewExam').addEventListener('click', () => {
			const title = prompt('Tiêu đề đề thi?');
			if (!title) return;
			const questions = [];
			let addMore = true;
			while (addMore) {
				const q = prompt('Nhập câu hỏi (bỏ trống để dừng)');
				if (!q) break;
				const a = prompt('Đáp án A');
				const b = prompt('Đáp án B');
				const c = prompt('Đáp án C');
				const d = prompt('Đáp án D');
				const correct = prompt('Đáp án đúng (A/B/C/D)');
				questions.push({ id: uid(), text: q, options: { A: a, B: b, C: c, D: d }, correct: (correct||'').toUpperCase() });
				addMore = confirm('Thêm câu hỏi nữa?');
			}
			exams.push({ id: uid(), title: title.trim(), ownerId: user.id, questions, createdAt: Date.now() });
			setStore(STORAGE_KEYS.exams, exams); render();
		});

		document.getElementById('btnAiExam').addEventListener('click', async () => {
			const ai = getStore(STORAGE_KEYS.ai, { openaiKey: '' });
			if (!ai.openaiKey) { alert('Vào mục AI để nhập OpenAI API key trước.'); return; }
			const subject = prompt('Môn (Toán/Lý/Sử)?', 'Toán'); if (!subject) return;
			const level = '12';
			const topic = prompt('Chủ đề (ví dụ: đạo hàm, điện trường,...)', 'đạo hàm'); if (!topic) return;
			const countStr = prompt('Số câu hỏi?', '5') || '5';
			const num = Math.max(1, Math.min(20, parseInt(countStr, 10) || 5));
			const title = `Đề ${subject} lớp ${level} - ${topic}`;
			try {
				const quiz = await generateQuizWithOpenAI({ key: ai.openaiKey, subject, level, topic, num });
				if (!quiz || !Array.isArray(quiz.questions)) { alert('Không tạo được đề.'); return; }
				exams.push({ id: uid(), title, ownerId: user.id, questions: quiz.questions.map(q => ({ id: uid(), text: q.text, options: q.options, correct: q.answer })), createdAt: Date.now() });
				setStore(STORAGE_KEYS.exams, exams); alert('Đã tạo đề bởi ChatGPT'); render();
			} catch (err) {
				console.error(err);
				alert('Lỗi khi gọi OpenAI. Kiểm tra API key và kết nối mạng.');
			}
		});

		function takeExam(examId) {
			const exam = exams.find(e => e.id === examId); if (!exam) return;
			let score = 0; const answers = [];
			exam.questions.forEach((q, i) => {
				const ans = prompt(`Câu ${i+1}: ${q.text}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\nTrả lời (A/B/C/D)`);
				const pick = (ans||'').toUpperCase();
				answers.push({ qid: q.id, pick });
				if (pick === q.correct) score++;
			});
			const results = getStore(STORAGE_KEYS.results, []);
			results.push({ id: uid(), examId: exam.id, userId: user.id, score, total: exam.questions.length, at: Date.now() });
			setStore(STORAGE_KEYS.results, results);
			alert(`Điểm: ${score}/${exam.questions.length}`);
		}
	}

	async function generateQuizWithOpenAI({ key, subject, level, topic, num }) {
		const system = 'Bạn là trợ lý học tập. Hãy tạo đề trắc nghiệm JSON đúng cú pháp.';
		const user = `Tạo ${num} câu trắc nghiệm ${subject} lớp ${level} về chủ đề ${topic}. Yêu cầu JSON thuần không giải thích, theo cấu trúc: {"questions":[{"text":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A|B|C|D"}]}`;
		const body = {
			model: 'gpt-4o-mini',
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			],
			temperature: 0.4
		};
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error('OpenAI HTTP ' + res.status);
		const data = await res.json();
		const content = data.choices?.[0]?.message?.content || '';
		// Try to extract JSON
		let jsonText = content.trim();
		const codeBlockMatch = jsonText.match(/```json[\s\S]*?```|```[\s\S]*?```/i);
		if (codeBlockMatch) jsonText = codeBlockMatch[0].replace(/```json|```/g, '').trim();
		return JSON.parse(jsonText);
	}

	function pageResults() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const exams = getStore(STORAGE_KEYS.exams, []);
		const results = getStore(STORAGE_KEYS.results, []);
		const myResults = results.filter(r => r.userId === user.id).sort((a,b)=>b.at-a.at);
		const leaderboard = aggregateLeaderboard(results, exams);
		app.innerHTML = `
			<section class="panel">
				<h2>Bảng thành tích</h2>
				<div class="grid cols-2">
					<div>
						<h3>Kết quả của tôi</h3>
						<table class="table">
							<thead><tr><th>Đề</th><th>Điểm</th><th>Thời gian</th></tr></thead>
							<tbody>
								${myResults.map(r => `
									<tr><td>${(exams.find(e=>e.id===r.examId)||{}).title||'Đã xóa'}</td><td>${r.score}/${r.total}</td><td>${new Date(r.at).toLocaleString('vi-VN')}</td></tr>
								`).join('')}
							</tbody>
						</table>
					</div>
					<div>
						<h3>Bảng xếp hạng</h3>
						<table class="table">
							<thead><tr><th>Email</th><th>Điểm TB</th><th>Lần làm</th></tr></thead>
							<tbody>
								${leaderboard.map(row => `
									<tr><td>${row.email}</td><td>${row.avg.toFixed(2)}</td><td>${row.count}</td></tr>
								`).join('')}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		`;
	}

	function pageAI() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const ai = getStore(STORAGE_KEYS.ai, { openaiKey: '' });
		app.innerHTML = `
			<section class="panel" style="max-width:640px;margin:auto;">
				<h2>Cài đặt AI</h2>
				<p class="muted">Nhập OpenAI API key để tạo đề bằng ChatGPT. Lưu ý: key được lưu trong trình duyệt của bạn.</p>
				<form id="aiForm">
					<div class="row">
						<label>OpenAI API Key</label>
						<input name="key" type="password" placeholder="sk-..." value="${ai.openaiKey ? '********' : ''}" />
					</div>
					<button class="btn" type="submit">Lưu</button>
					<button class="btn danger" type="button" id="clearKey">Xóa key</button>
				</form>
			</section>
		`;
		document.getElementById('aiForm').addEventListener('submit', (e) => {
			e.preventDefault();
			const data = new FormData(e.target);
			const key = String(data.get('key')||'').trim();
			if (!key) { alert('Vui lòng nhập key'); return; }
			setStore(STORAGE_KEYS.ai, { openaiKey: key });
			alert('Đã lưu API key');
		});
		document.getElementById('clearKey').addEventListener('click', () => {
			setStore(STORAGE_KEYS.ai, { openaiKey: '' });
			alert('Đã xóa key');
			navigate('home');
		});
	}

	function pageSync() {
		const user = currentUser(); if (!user) { navigate('login'); return; }
		const syncData = getStore(STORAGE_KEYS.sync, {});
		
		app.innerHTML = `
			<section class="panel">
				<h2>🔄 Quản lý đồng bộ dữ liệu</h2>
				<p class="muted">Đồng bộ dữ liệu giữa các thiết bị và tài khoản</p>
				<div class="spacer"></div>
				
				<!-- Sync Status -->
				<div class="card">
					<h4>📊 Trạng thái đồng bộ</h4>
					<div id="syncStatus" class="grid cols-2">
						<!-- Sẽ được cập nhật bằng JavaScript -->
					</div>
				</div>
				<div class="spacer"></div>
				
				<!-- Sync Controls -->
				<div class="card">
					<h4>🎛️ Điều khiển đồng bộ</h4>
					<div class="flex">
						<button class="btn" id="btnSyncAll">🔄 Đồng bộ tất cả</button>
						<button class="btn secondary" id="btnCheckStatus">🔍 Kiểm tra trạng thái</button>
						<button class="btn danger" id="btnResetSync">🗑️ Xóa cache đồng bộ</button>
					</div>
				</div>
				<div class="spacer"></div>
				
				<!-- Manual Sync -->
				<div class="card">
					<h4>📤 Đồng bộ thủ công</h4>
					<div class="grid cols-2">
						<div>
							<h5>📤 Upload lên cloud</h5>
							<div class="flex">
								<button class="btn secondary" data-sync-up="users">👥 Người dùng</button>
								<button class="btn secondary" data-sync-up="exams">📝 Đề thi</button>
								<button class="btn secondary" data-sync-up="documents">📚 Tài liệu</button>
								<button class="btn secondary" data-sync-up="results">🏆 Kết quả</button>
							</div>
						</div>
						<div>
							<h5>📥 Tải từ cloud</h5>
							<div class="flex">
								<button class="btn" data-sync-down="users">👥 Người dùng</button>
								<button class="btn" data-sync-down="exams">📝 Đề thi</button>
								<button class="btn" data-sync-down="documents">📚 Tài liệu</button>
								<button class="btn" data-sync-down="results">🏆 Kết quả</button>
							</div>
						</div>
					</div>
				</div>
				<div class="spacer"></div>
				
				<!-- Instructions -->
				<div class="card">
					<h4>💡 Hướng dẫn sử dụng</h4>
					<ul>
						<li><strong>Đồng bộ tự động:</strong> Dữ liệu được đồng bộ tự động khi bạn tạo/sửa/xóa</li>
						<li><strong>Đồng bộ thủ công:</strong> Sử dụng khi muốn cập nhật dữ liệu ngay lập tức</li>
						<li><strong>Đồng bộ tất cả:</strong> Tải tất cả dữ liệu mới nhất từ cloud</li>
						<li><strong>Lưu ý:</strong> Đồng bộ cần kết nối internet ổn định</li>
					</ul>
				</div>
			</section>
		`;

		function updateSyncStatus() {
			const statusDiv = document.getElementById('syncStatus');
			const keys = ['users', 'exams', 'documents', 'results'];
			
			statusDiv.innerHTML = keys.map(key => {
				const data = syncData[key] || {};
				const lastSync = data.lastSync ? new Date(data.lastSync).toLocaleString('vi-VN') : 'Chưa đồng bộ';
				const status = data.status === 'success' ? '✅' : '❌';
				
				return `
					<div class="card">
						<h5>${getKeyDisplayName(key)} ${status}</h5>
						<p class="muted">Lần cuối: ${lastSync}</p>
						<p class="muted">Trạng thái: ${data.status || 'Chưa biết'}</p>
					</div>
				`;
			}).join('');
		}

		function getKeyDisplayName(key) {
			const names = {
				users: '👥 Người dùng',
				exams: '📝 Đề thi', 
				documents: '📚 Tài liệu',
				results: '🏆 Kết quả'
			};
			return names[key] || key;
		}

		// Event listeners
		document.getElementById('btnSyncAll').addEventListener('click', async () => {
			const btn = document.getElementById('btnSyncAll');
			btn.textContent = '⏳ Đang đồng bộ...';
			btn.disabled = true;
			
			const success = await syncAllData();
			
			btn.textContent = success ? '✅ Hoàn thành' : '❌ Lỗi';
			btn.disabled = false;
			
			setTimeout(() => {
				btn.textContent = '🔄 Đồng bộ tất cả';
			}, 2000);
			
			updateSyncStatus();
		});

		document.getElementById('btnCheckStatus').addEventListener('click', () => {
			updateSyncStatus();
			alert('Đã cập nhật trạng thái đồng bộ!');
		});

		document.getElementById('btnResetSync').addEventListener('click', () => {
			if (confirm('Bạn có chắc muốn xóa cache đồng bộ? Điều này sẽ không ảnh hưởng đến dữ liệu của bạn.')) {
				localStorage.removeItem(STORAGE_KEYS.sync);
				updateSyncStatus();
				alert('Đã xóa cache đồng bộ!');
			}
		});

		// Manual sync buttons
		document.querySelectorAll('[data-sync-up]').forEach(btn => {
			btn.addEventListener('click', async () => {
				const key = btn.getAttribute('data-sync-up');
				const data = getStore(STORAGE_KEYS[key], []);
				
				btn.textContent = '⏳ Đang upload...';
				btn.disabled = true;
				
				await syncToCloud(STORAGE_KEYS[key], data);
				
				btn.textContent = '✅ Hoàn thành';
				setTimeout(() => {
					btn.textContent = getKeyDisplayName(key);
					btn.disabled = false;
				}, 2000);
				
				updateSyncStatus();
			});
		});

		document.querySelectorAll('[data-sync-down]').forEach(btn => {
			btn.addEventListener('click', async () => {
				const key = btn.getAttribute('data-sync-down');
				
				btn.textContent = '⏳ Đang tải...';
				btn.disabled = true;
				
				const data = await syncFromCloud(STORAGE_KEYS[key]);
				
				btn.textContent = data ? '✅ Hoàn thành' : '❌ Lỗi';
				setTimeout(() => {
					btn.textContent = getKeyDisplayName(key);
					btn.disabled = false;
				}, 2000);
				
				updateSyncStatus();
			});
		});

		// Auto sync on page load
		syncAllData();
		updateSyncStatus();
	}

	function aggregateLeaderboard(results, exams) {
		const users = getStore(STORAGE_KEYS.users, []);
		const map = new Map();
		for (const r of results) {
			const user = users.find(u => u.id === r.userId); if (!user) continue;
			const ratio = r.total > 0 ? r.score / r.total : 0;
			const prev = map.get(user.email) || { sum: 0, count: 0 };
			map.set(user.email, { sum: prev.sum + ratio, count: prev.count + 1 });
		}
		return Array.from(map.entries()).map(([email, {sum, count}]) => ({ email, avg: count? (sum/count*10):0, count })).sort((a,b)=>b.avg-a.avg).slice(0, 50);
	}

	const routes = {
		home: pageHome,
		login: pageLogin,
		signup: pageSignup,
		math: pageMath,
		physics: pagePhysics,
		history: pageHistory,
		library: pageLibrary,
		exams: pageExams,
		documents: pageDocuments,
		results: pageResults,
		ai: pageAI,
		sync: pageSync,
	};

	function handleRoute() {
		const hash = (window.location.hash || '#home').slice(1);
		const page = routes[hash] || pageHome;
		page();
	}

	// Nav clicks
	nav.addEventListener('click', (e) => {
		const btn = e.target.closest('button[data-route]');
		if (!btn) return;
		navigate(btn.getAttribute('data-route'));
	});

	logoutBtn.addEventListener('click', () => {
		localStorage.removeItem(STORAGE_KEYS.session);
		updateNavAuthState();
		navigate('home');
	});

	window.addEventListener('hashchange', handleRoute);
	updateNavAuthState();
	handleRoute();
	
	// Auto sync on app start
	window.addEventListener('load', async () => {
		console.log('🔄 Đang đồng bộ dữ liệu...');
		await syncAllData();
		console.log('✅ Hoàn thành đồng bộ dữ liệu');
	});
})();


